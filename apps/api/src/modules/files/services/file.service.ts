import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { StorageManagerService } from './storage-manager.service';
import { FileRepository } from '../repositories/file.repository';
import { File, FileStatus, FileVisibility } from '../entities/file.entity';
import { UploadFileDto } from '../dto/upload-file.dto';
import { FileQueryDto } from '../dto/file-query.dto';
import { FileMetadataResponseDto } from '../dto/file-response.dto';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    private readonly storageManager: StorageManagerService,
    private readonly fileRepository: FileRepository
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    uploadDto: UploadFileDto,
    userId: string,
    tenantId?: string
  ): Promise<FileMetadataResponseDto> {
    this.logger.log(`Uploading file: ${file.originalname} for user: ${userId}`);

    // Validate file
    await this.validateFile(file, uploadDto);

    // Generate file key
    const key = await this.generateFileKey(file, uploadDto);

    // Check if file already exists
    const existingFile = await this.fileRepository.findByKey(key);
    if (existingFile) {
      throw new BadRequestException('File already exists');
    }

    // Calculate checksum
    const checksum = this.calculateChecksum(file.buffer);

    // Create file record
    const fileData: any = {
      key,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      extension: extname(file.originalname),
      status: FileStatus.UPLOADING,
      visibility: uploadDto.visibility || FileVisibility.PRIVATE,
      metadata: uploadDto.metadata,
      isVirusScanned: false,
      checksum,
      uploadedById: userId,
    };

    if (uploadDto.path) fileData.path = uploadDto.path;
    if (uploadDto.uploadSessionId)
      fileData.uploadSessionId = uploadDto.uploadSessionId;
    if (tenantId) fileData.tenantId = tenantId;
    if (uploadDto.permissions) {
      fileData.permissions = {
        read: uploadDto.permissions.read || [],
        write: uploadDto.permissions.write || [],
        delete: uploadDto.permissions.delete || [],
      };
    }
    if (uploadDto.expiresAt) fileData.expiresAt = new Date(uploadDto.expiresAt);

    const fileEntity = await this.fileRepository.create(fileData);

    try {
      // Upload to storage
      const uploadOptions = {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadedBy: userId,
          tenantId: tenantId || '',
          fileId: fileEntity.id,
        },
      };

      this.logger.log(`FileService: Uploading with key: ${key}`);
      this.logger.log(`FileService: File entity ID: ${fileEntity.id}`);

      const storageMetadata = await this.storageManager.upload(
        key,
        file.buffer,
        uploadOptions
      );

      // Update file record with storage info
      const updateData: any = {
        status: FileStatus.PROCESSING,
        storageProvider: 'local', // Default to local for now
        path: key,
      };
      if (storageMetadata.url) updateData.publicUrl = storageMetadata.url;

      const updatedFile = await this.fileRepository.update(
        fileEntity.id,
        updateData
      );

      // Perform virus scan if requested
      if (uploadDto.virusScan !== false) {
        await this.performVirusScan(updatedFile!);
      }

      // Update status to ready
      const finalFile = await this.fileRepository.update(updatedFile!.id, {
        status: FileStatus.READY,
      });

      this.logger.log(`File uploaded successfully: ${key}`);
      return this.mapToResponseDto(finalFile!);
    } catch (error) {
      // Update status to failed
      await this.fileRepository.update(fileEntity.id, {
        status: FileStatus.FAILED,
      });

      this.logger.error(`File upload failed: ${key}`, error);
      throw error;
    }
  }

  async getFile(
    key: string,
    userId: string,
    tenantId?: string
  ): Promise<FileMetadataResponseDto> {
    const file = await this.fileRepository.findByKey(key);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check permissions
    await this.checkFileAccess(file, userId, 'read', tenantId);

    return this.mapToResponseDto(file);
  }

  async downloadFile(
    key: string,
    userId: string,
    tenantId?: string
  ): Promise<Buffer> {
    const file = await this.fileRepository.findByKey(key);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check permissions
    await this.checkFileAccess(file, userId, 'read', tenantId);

    // Check if file is ready
    if (file.status !== FileStatus.READY) {
      throw new BadRequestException('File is not ready for download');
    }

    return this.storageManager.download(key);
  }

  async getFileStream(
    key: string,
    userId: string,
    tenantId?: string
  ): Promise<NodeJS.ReadableStream> {
    const file = await this.fileRepository.findByKey(key);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check permissions
    await this.checkFileAccess(file, userId, 'read', tenantId);

    // Check if file is ready
    if (file.status !== FileStatus.READY) {
      throw new BadRequestException('File is not ready for streaming');
    }

    return this.storageManager.getStream(key);
  }

  async listFiles(
    query: FileQueryDto,
    userId: string,
    tenantId?: string
  ): Promise<{
    files: FileMetadataResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Set default values
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { files, total } = await this.fileRepository.findByQuery(
      { ...query, page, limit },
      tenantId
    );

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      files: files.map(file => this.mapToResponseDto(file)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  async deleteFile(
    key: string,
    userId: string,
    tenantId?: string
  ): Promise<void> {
    const file = await this.fileRepository.findByKey(key);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check permissions
    await this.checkFileAccess(file, userId, 'delete', tenantId);

    // Delete from storage
    await this.storageManager.delete(key);

    // Soft delete from database
    await this.fileRepository.softDelete(file.id);

    this.logger.log(`File deleted successfully: ${key}`);
  }

  async getSignedUrl(
    key: string,
    expiresIn: number = 3600,
    userId: string,
    tenantId?: string
  ): Promise<string> {
    const file = await this.fileRepository.findByKey(key);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check permissions
    await this.checkFileAccess(file, userId, 'read', tenantId);

    return this.storageManager.getSignedUrl(key, expiresIn);
  }

  async copyFile(
    sourceKey: string,
    destinationKey: string,
    userId: string,
    tenantId?: string
  ): Promise<FileMetadataResponseDto> {
    const sourceFile = await this.fileRepository.findByKey(sourceKey);
    if (!sourceFile) {
      throw new NotFoundException('Source file not found');
    }

    // Check permissions
    await this.checkFileAccess(sourceFile, userId, 'read', tenantId);

    // Check if destination already exists
    const existingFile = await this.fileRepository.findByKey(destinationKey);
    if (existingFile) {
      throw new BadRequestException('Destination file already exists');
    }

    // Copy in storage
    const storageMetadata = await this.storageManager.copy(
      sourceKey,
      destinationKey
    );

    // Create new file record
    const newFileData: any = {
      key: destinationKey,
      originalName: sourceFile.originalName,
      mimeType: sourceFile.mimeType,
      size: sourceFile.size,
      extension: sourceFile.extension,
      path: destinationKey,
      storageProvider: sourceFile.storageProvider,
      status: FileStatus.READY,
      visibility: sourceFile.visibility,
      metadata: sourceFile.metadata,
      isVirusScanned: sourceFile.isVirusScanned,
      virusScanResult: sourceFile.virusScanResult,
      checksum: sourceFile.checksum,
      uploadSessionId: sourceFile.uploadSessionId,
      uploadedById: userId,
      permissions: sourceFile.permissions,
      expiresAt: sourceFile.expiresAt,
    };

    if (storageMetadata.url) newFileData.publicUrl = storageMetadata.url;
    if (tenantId) newFileData.tenantId = tenantId;

    const newFile = await this.fileRepository.create(newFileData);

    this.logger.log(
      `File copied successfully: ${sourceKey} -> ${destinationKey}`
    );
    return this.mapToResponseDto(newFile);
  }

  async moveFile(
    sourceKey: string,
    destinationKey: string,
    userId: string,
    tenantId?: string
  ): Promise<FileMetadataResponseDto> {
    const sourceFile = await this.fileRepository.findByKey(sourceKey);
    if (!sourceFile) {
      throw new NotFoundException('Source file not found');
    }

    // Check permissions
    await this.checkFileAccess(sourceFile, userId, 'write', tenantId);

    // Check if destination already exists
    const existingFile = await this.fileRepository.findByKey(destinationKey);
    if (existingFile) {
      throw new BadRequestException('Destination file already exists');
    }

    // Move in storage
    const storageMetadata = await this.storageManager.move(
      sourceKey,
      destinationKey
    );

    // Update file record
    const updateData: any = {
      key: destinationKey,
      path: destinationKey,
    };
    if (storageMetadata.url) updateData.publicUrl = storageMetadata.url;

    const updatedFile = await this.fileRepository.update(
      sourceFile.id,
      updateData
    );

    this.logger.log(
      `File moved successfully: ${sourceKey} -> ${destinationKey}`
    );
    return this.mapToResponseDto(updatedFile!);
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    providers: Array<{
      name: string;
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      lastCheck: Date;
    }>;
  }> {
    const healthStatus = this.storageManager.getHealthStatus();

    // Determine overall status
    const healthyProviders = healthStatus.filter(
      p => p.status === 'healthy'
    ).length;
    const totalProviders = healthStatus.length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyProviders === totalProviders) {
      status = 'healthy';
    } else if (healthyProviders > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      providers: healthStatus.map(p => ({
        name: p.provider,
        status: p.status === 'degraded' ? 'unhealthy' : p.status,
        responseTime: p.responseTime,
        lastCheck: p.lastChecked,
      })),
    };
  }

  async getStorageStats(tenantId?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    filesByStatus: Record<FileStatus, number>;
    filesByVisibility: Record<FileVisibility, number>;
  }> {
    return this.fileRepository.getStorageStats(tenantId);
  }

  private async validateFile(
    file: Express.Multer.File,
    uploadDto: UploadFileDto
  ): Promise<void> {
    // Check file size
    const maxFileSize = uploadDto.maxFileSize || 10485760; // 10MB default
    if (file.size > maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxFileSize} bytes`
      );
    }

    // Check file extension
    const extension = extname(file.originalname).toLowerCase();
    const allowedExtensions = uploadDto.allowedExtensions || [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'pdf',
      'doc',
      'docx',
      'txt',
    ];

    if (!allowedExtensions.includes(extension.replace('.', ''))) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`
      );
    }

    // Check MIME type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `MIME type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`
      );
    }
  }

  private async generateFileKey(
    file: Express.Multer.File,
    uploadDto: UploadFileDto
  ): Promise<string> {
    const uuid = randomUUID();
    const extension = extname(file.originalname);
    const key = `${uploadDto.path || 'uploads'}/${uuid}${extension}`;

    this.logger.log(`Generated file key: ${key}`);
    this.logger.log(`Original filename: ${file.originalname}`);
    this.logger.log(`Extension: ${extension}`);
    this.logger.log(`UUID: ${uuid}`);

    return key;
  }

  private calculateChecksum(buffer: Buffer): string {
    return createHash('md5').update(buffer).digest('hex');
  }

  private async performVirusScan(file: File): Promise<void> {
    // TODO: Implement virus scanning logic
    // This is a placeholder for virus scanning integration
    this.logger.log(`Performing virus scan for file: ${file.key}`);

    // Simulate virus scan
    await new Promise(resolve => setTimeout(resolve, 1000));

    await this.fileRepository.update(file.id, {
      isVirusScanned: true,
      virusScanResult: {
        scanned: true,
        clean: true,
        threats: [],
        scannedAt: new Date(),
      },
    });
  }

  private async checkFileAccess(
    file: File,
    userId: string,
    action: 'read' | 'write' | 'delete',
    tenantId?: string
  ): Promise<void> {
    // Check if user is the owner
    if (file.uploadedById === userId) {
      return;
    }

    // Check explicit permissions first
    if (file.permissions) {
      const allowedUsers = file.permissions[action] || [];
      if (allowedUsers.includes(userId)) {
        return;
      }
    }

    // Check tenant access
    if (tenantId && file.tenantId !== tenantId) {
      throw new ForbiddenException(
        'Access denied: file belongs to different tenant'
      );
    }

    // Check file visibility
    if (file.visibility === FileVisibility.PRIVATE) {
      throw new ForbiddenException('Access denied: file is private');
    }

    if (file.visibility === FileVisibility.PUBLIC) {
      return; // Public files are accessible to everyone
    }

    if (
      file.visibility === FileVisibility.TENANT &&
      file.tenantId !== tenantId
    ) {
      throw new ForbiddenException('Access denied: file is tenant-specific');
    }

    throw new ForbiddenException(
      `Access denied: insufficient ${action} permissions`
    );
  }

  private mapToResponseDto(file: File): FileMetadataResponseDto {
    const response: any = {
      id: file.id,
      key: file.key,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      extension: file.extension,
      status: file.status,
      visibility: file.visibility,
      metadata: file.metadata,
      virusScanResult: file.virusScanResult,
      isVirusScanned: file.isVirusScanned,
      checksum: file.checksum,
      uploadSessionId: file.uploadSessionId,
      uploadedBy: {
        id: file.uploadedBy.id,
        email: file.uploadedBy.email,
        firstName: file.uploadedBy.firstName,
        lastName: file.uploadedBy.lastName,
      },
      permissions: file.permissions,
      expiresAt: file.expiresAt,
      isDeleted: file.isDeleted,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      deletedAt: file.deletedAt,
    };

    if (file.path) response.path = file.path;
    if (file.publicUrl) response.publicUrl = file.publicUrl;
    if (file.storageProvider) response.storageProvider = file.storageProvider;
    if (file.tenant) {
      response.tenant = {
        id: file.tenant.id,
        name: file.tenant.name,
      };
    }

    return response;
  }
}
