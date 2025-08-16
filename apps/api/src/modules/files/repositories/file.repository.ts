import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { File, FileStatus, FileVisibility } from '../entities/file.entity';
import { FileQueryDto } from '../dto/file-query.dto';

@Injectable()
export class FileRepository {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>
  ) {}

  async create(fileData: Partial<File>): Promise<File> {
    const file = this.fileRepository.create(fileData);
    return this.fileRepository.save(file);
  }

  async findById(id: string): Promise<File | null> {
    return this.fileRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['uploadedBy', 'tenant'],
    });
  }

  async findByKey(key: string): Promise<File | null> {
    return this.fileRepository.findOne({
      where: { key, isDeleted: false },
      relations: ['uploadedBy', 'tenant'],
    });
  }

  async findByQuery(
    query: FileQueryDto,
    tenantId?: string
  ): Promise<{ files: File[]; total: number }> {
    const queryBuilder = this.buildQueryBuilder(query, tenantId);

    // Set default values for pagination
    const page = query.page || 1;
    const limit = query.limit || 20;

    const [files, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { files, total };
  }

  async update(id: string, updateData: Partial<File>): Promise<File | null> {
    await this.fileRepository.update(id, updateData);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.fileRepository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
      status: FileStatus.DELETED,
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.fileRepository.delete(id);
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.fileRepository.count({
      where: { key, isDeleted: false },
    });
    return count > 0;
  }

  async findByUploadSession(sessionId: string): Promise<File[]> {
    return this.fileRepository.find({
      where: { uploadSessionId: sessionId, isDeleted: false },
      relations: ['uploadedBy', 'tenant'],
    });
  }

  async findByUploader(
    uploadedById: string,
    tenantId?: string
  ): Promise<File[]> {
    const where: any = { uploadedById, isDeleted: false };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    return this.fileRepository.find({
      where,
      relations: ['uploadedBy', 'tenant'],
      order: { createdAt: 'DESC' },
    });
  }

  async getStorageStats(tenantId?: string): Promise<{
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    filesByStatus: Record<FileStatus, number>;
    filesByVisibility: Record<FileVisibility, number>;
  }> {
    const where: any = { isDeleted: false };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [totalFiles, totalSize] = await Promise.all([
      this.fileRepository.count({ where }),
      this.fileRepository
        .createQueryBuilder('file')
        .select('SUM(file.size)', 'totalSize')
        .where('file.isDeleted = :isDeleted', { isDeleted: false })
        .andWhere(tenantId ? 'file.tenantId = :tenantId' : '1=1', { tenantId })
        .getRawOne(),
    ]);

    const filesByStatus = await this.fileRepository
      .createQueryBuilder('file')
      .select('file.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('file.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere(tenantId ? 'file.tenantId = :tenantId' : '1=1', { tenantId })
      .groupBy('file.status')
      .getRawMany();

    const filesByVisibility = await this.fileRepository
      .createQueryBuilder('file')
      .select('file.visibility', 'visibility')
      .addSelect('COUNT(*)', 'count')
      .where('file.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere(tenantId ? 'file.tenantId = :tenantId' : '1=1', { tenantId })
      .groupBy('file.visibility')
      .getRawMany();

    const statusMap = filesByStatus.reduce(
      (acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      },
      {} as Record<FileStatus, number>
    );

    const visibilityMap = filesByVisibility.reduce(
      (acc, item) => {
        acc[item.visibility] = parseInt(item.count);
        return acc;
      },
      {} as Record<FileVisibility, number>
    );

    return {
      totalFiles,
      totalSize: parseInt(totalSize.totalSize || '0'),
      averageFileSize:
        totalFiles > 0 ? parseInt(totalSize.totalSize || '0') / totalFiles : 0,
      filesByStatus: statusMap,
      filesByVisibility: visibilityMap,
    };
  }

  private buildQueryBuilder(
    query: FileQueryDto,
    tenantId?: string
  ): SelectQueryBuilder<File> {
    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.uploadedBy', 'uploadedBy')
      .leftJoinAndSelect('file.tenant', 'tenant')
      .where('file.isDeleted = :isDeleted', { isDeleted: query.isDeleted });

    if (tenantId) {
      queryBuilder.andWhere('file.tenantId = :tenantId', { tenantId });
    }

    if (query.prefix) {
      queryBuilder.andWhere('file.key LIKE :prefix', {
        prefix: `${query.prefix}%`,
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(file.originalName ILIKE :search OR file.key ILIKE :search OR file.metadata::text ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    if (query.status) {
      queryBuilder.andWhere('file.status = :status', { status: query.status });
    }

    if (query.visibility) {
      queryBuilder.andWhere('file.visibility = :visibility', {
        visibility: query.visibility,
      });
    }

    if (query.mimeType) {
      queryBuilder.andWhere('file.mimeType = :mimeType', {
        mimeType: query.mimeType,
      });
    }

    if (query.extension) {
      queryBuilder.andWhere('file.extension = :extension', {
        extension: query.extension,
      });
    }

    if (query.extensions && query.extensions.length > 0) {
      queryBuilder.andWhere('file.extension IN (:...extensions)', {
        extensions: query.extensions,
      });
    }

    if (query.minSize) {
      queryBuilder.andWhere('file.size >= :minSize', {
        minSize: query.minSize,
      });
    }

    if (query.maxSize) {
      queryBuilder.andWhere('file.size <= :maxSize', {
        maxSize: query.maxSize,
      });
    }

    if (query.createdAfter) {
      queryBuilder.andWhere('file.createdAt >= :createdAfter', {
        createdAfter: query.createdAfter,
      });
    }

    if (query.createdBefore) {
      queryBuilder.andWhere('file.createdAt <= :createdBefore', {
        createdBefore: query.createdBefore,
      });
    }

    if (query.uploadedBy) {
      queryBuilder.andWhere('uploadedBy.id = :uploadedBy', {
        uploadedBy: query.uploadedBy,
      });
    }

    if (query.isVirusScanned !== undefined) {
      queryBuilder.andWhere('file.isVirusScanned = :isVirusScanned', {
        isVirusScanned: query.isVirusScanned,
      });
    }

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(`file.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    return queryBuilder;
  }
}
