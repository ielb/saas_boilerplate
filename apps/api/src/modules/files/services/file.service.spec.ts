import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FileService } from './file.service';
import { StorageManagerService } from './storage-manager.service';
import { FileRepository } from '../repositories/file.repository';
import { File, FileStatus, FileVisibility } from '../entities/file.entity';
import { UploadFileDto } from '../dto/upload-file.dto';
import { FileQueryDto } from '../dto/file-query.dto';
import { FileMetadata } from './storage-provider.interface';

describe('FileService', () => {
  let service: FileService;
  let storageManager: jest.Mocked<StorageManagerService>;
  let fileRepository: jest.Mocked<FileRepository>;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 1024, // 1MB
    buffer: Buffer.from('test file content'),
    stream: {} as any,
    destination: '',
    filename: '',
    path: '',
  };

  const mockFileEntity: File = {
    id: 'file-id-1',
    key: 'uploads/test-image_123456_abc123.jpg',
    originalName: 'test-image.jpg',
    mimeType: 'image/jpeg',
    size: 1024 * 1024,
    extension: '.jpg',
    path: 'uploads/',
    publicUrl: 'http://localhost:3001/uploads/test-image.jpg',
    storageProvider: 'local',
    status: FileStatus.READY,
    visibility: FileVisibility.PRIVATE,
    metadata: { description: 'Test image' },
    virusScanResult: {
      scanned: true,
      clean: true,
      threats: [],
      scannedAt: new Date(),
    },
    isVirusScanned: true,
    checksum: 'md5-hash',
    uploadSessionId: 'session-123',
    uploadedById: 'user-id-1',
    uploadedBy: {
      id: 'user-id-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    } as any,
    tenantId: 'tenant-id-1',
    tenant: {
      id: 'tenant-id-1',
      name: 'Test Tenant',
    } as any,
    permissions: {
      read: ['user-id-1'],
      write: ['user-id-1'],
      delete: ['user-id-1'],
    },
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        {
          provide: StorageManagerService,
          useValue: {
            upload: jest.fn(),
            download: jest.fn(),
            getStream: jest.fn(),
            getMetadata: jest.fn(),
            delete: jest.fn(),
            exists: jest.fn(),
            getSignedUrl: jest.fn(),
            getPublicUrl: jest.fn(),
            copy: jest.fn(),
            move: jest.fn(),
            list: jest.fn(),
            getHealthStatus: jest.fn(),
          },
        },
        {
          provide: FileRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByKey: jest.fn(),
            findByQuery: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            hardDelete: jest.fn(),
            exists: jest.fn(),
            findByUploadSession: jest.fn(),
            findByUploader: jest.fn(),
            getStorageStats: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    storageManager = module.get(StorageManagerService);
    fileRepository = module.get(FileRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    const uploadDto: UploadFileDto = {
      path: 'uploads',
      visibility: FileVisibility.PRIVATE,
      metadata: { description: 'Test file' },
    };

    it('should upload a file successfully', async () => {
      const storageMetadata: FileMetadata = {
        key: 'uploads/test-image_123456_abc123.jpg',
        size: 1024 * 1024,
        mimeType: 'image/jpeg',
        lastModified: new Date(),
        etag: 'etag-123',
        url: 'http://localhost:3001/uploads/test-image.jpg',
      };

      fileRepository.findByKey.mockResolvedValue(null);
      fileRepository.create.mockResolvedValue(mockFileEntity);
      storageManager.upload.mockResolvedValue(storageMetadata);
      const processingFile = {
        ...mockFileEntity,
        status: FileStatus.PROCESSING,
      };
      const readyFile = { ...mockFileEntity, status: FileStatus.READY };

      fileRepository.update
        .mockResolvedValueOnce(processingFile)
        .mockResolvedValueOnce(readyFile)
        .mockResolvedValue(readyFile); // For any additional calls

      const result = await service.uploadFile(
        mockFile,
        uploadDto,
        'user-id-1',
        'tenant-id-1'
      );

      expect(result).toBeDefined();
      expect(result.key).toBe(mockFileEntity.key);
      expect(result.status).toBe(FileStatus.READY);
      expect(storageManager.upload).toHaveBeenCalledWith(
        expect.any(String),
        mockFile.buffer,
        expect.objectContaining({
          contentType: 'image/jpeg',
          metadata: expect.objectContaining({
            originalName: 'test-image.jpg',
            uploadedBy: 'user-id-1',
            tenantId: 'tenant-id-1',
          }),
        })
      );
    });

    it('should throw BadRequestException if file already exists', async () => {
      fileRepository.findByKey.mockResolvedValue(mockFileEntity);

      await expect(
        service.uploadFile(mockFile, uploadDto, 'user-id-1', 'tenant-id-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file size exceeds limit', async () => {
      const largeFile = { ...mockFile, size: 20 * 1024 * 1024 }; // 20MB
      const uploadDtoWithSizeLimit = {
        ...uploadDto,
        maxFileSize: 10 * 1024 * 1024,
      }; // 10MB limit

      await expect(
        service.uploadFile(
          largeFile,
          uploadDtoWithSizeLimit,
          'user-id-1',
          'tenant-id-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file type not allowed', async () => {
      const invalidFile = {
        ...mockFile,
        originalname: 'test.exe',
        mimetype: 'application/x-executable',
      };
      const uploadDtoWithExtensions = {
        ...uploadDto,
        allowedExtensions: ['jpg', 'png'],
      };

      await expect(
        service.uploadFile(
          invalidFile,
          uploadDtoWithExtensions,
          'user-id-1',
          'tenant-id-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle upload failure and update status to failed', async () => {
      fileRepository.findByKey.mockResolvedValue(null);
      fileRepository.create.mockResolvedValue(mockFileEntity);
      storageManager.upload.mockRejectedValue(new Error('Upload failed'));

      await expect(
        service.uploadFile(mockFile, uploadDto, 'user-id-1', 'tenant-id-1')
      ).rejects.toThrow('Upload failed');

      expect(fileRepository.update).toHaveBeenCalledWith(mockFileEntity.id, {
        status: FileStatus.FAILED,
      });
    });
  });

  describe('getFile', () => {
    it('should return file metadata if user has access', async () => {
      fileRepository.findByKey.mockResolvedValue(mockFileEntity);

      const result = await service.getFile(
        'file-key',
        'user-id-1',
        'tenant-id-1'
      );

      expect(result).toBeDefined();
      expect(result.key).toBe(mockFileEntity.key);
      expect(result.uploadedBy.id).toBe('user-id-1');
    });

    it('should throw NotFoundException if file not found', async () => {
      fileRepository.findByKey.mockResolvedValue(null);

      await expect(
        service.getFile('non-existent-key', 'user-id-1', 'tenant-id-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access', async () => {
      const privateFile = {
        ...mockFileEntity,
        uploadedById: 'other-user-id',
        permissions: { read: [], write: [], delete: [] },
      };
      fileRepository.findByKey.mockResolvedValue(privateFile);

      await expect(
        service.getFile('file-key', 'user-id-1', 'tenant-id-1')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('downloadFile', () => {
    it('should download file if user has access and file is ready', async () => {
      fileRepository.findByKey.mockResolvedValue(mockFileEntity);
      storageManager.download.mockResolvedValue(Buffer.from('file content'));

      const result = await service.downloadFile(
        'file-key',
        'user-id-1',
        'tenant-id-1'
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(storageManager.download).toHaveBeenCalledWith('file-key');
    });

    it('should throw BadRequestException if file is not ready', async () => {
      const processingFile = {
        ...mockFileEntity,
        status: FileStatus.PROCESSING,
      };
      fileRepository.findByKey.mockResolvedValue(processingFile);

      await expect(
        service.downloadFile('file-key', 'user-id-1', 'tenant-id-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listFiles', () => {
    const query: FileQueryDto = {
      page: 1,
      limit: 20,
      prefix: 'uploads',
    };

    it('should return paginated file list', async () => {
      const mockFiles = [mockFileEntity];
      fileRepository.findByQuery.mockResolvedValue({
        files: mockFiles,
        total: 1,
      });

      const result = await service.listFiles(query, 'user-id-1', 'tenant-id-1');

      expect(result.files).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });

  describe('deleteFile', () => {
    it('should delete file if user has access', async () => {
      fileRepository.findByKey.mockResolvedValue(mockFileEntity);
      storageManager.delete.mockResolvedValue(undefined);
      fileRepository.softDelete.mockResolvedValue(undefined);

      await service.deleteFile('file-key', 'user-id-1', 'tenant-id-1');

      expect(storageManager.delete).toHaveBeenCalledWith('file-key');
      expect(fileRepository.softDelete).toHaveBeenCalledWith('file-id-1');
    });

    it('should throw ForbiddenException if user has no delete permission', async () => {
      const fileWithoutDeletePermission = {
        ...mockFileEntity,
        uploadedById: 'other-user-id',
        permissions: { read: ['user-id-1'], write: ['user-id-1'], delete: [] },
      };
      fileRepository.findByKey.mockResolvedValue(fileWithoutDeletePermission);

      await expect(
        service.deleteFile('file-key', 'user-id-1', 'tenant-id-1')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSignedUrl', () => {
    it('should return signed URL if user has access', async () => {
      fileRepository.findByKey.mockResolvedValue(mockFileEntity);
      storageManager.getSignedUrl.mockResolvedValue(
        'https://signed-url.com/file'
      );

      const result = await service.getSignedUrl(
        'file-key',
        3600,
        'user-id-1',
        'tenant-id-1'
      );

      expect(result).toBe('https://signed-url.com/file');
      expect(storageManager.getSignedUrl).toHaveBeenCalledWith(
        'file-key',
        3600
      );
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      const storageMetadata: FileMetadata = {
        key: 'uploads/copied-file.jpg',
        size: 1024 * 1024,
        mimeType: 'image/jpeg',
        lastModified: new Date(),
        etag: 'etag-123',
        url: 'http://localhost:3001/uploads/copied-file.jpg',
      };

      fileRepository.findByKey
        .mockResolvedValueOnce(mockFileEntity) // source file
        .mockResolvedValueOnce(null); // destination file doesn't exist
      storageManager.copy.mockResolvedValue(storageMetadata);
      fileRepository.create.mockResolvedValue({
        ...mockFileEntity,
        key: 'copied-file-key',
      });

      const result = await service.copyFile(
        'source-key',
        'destination-key',
        'user-id-1',
        'tenant-id-1'
      );

      expect(result).toBeDefined();
      expect(result.key).toBe('copied-file-key');
      expect(storageManager.copy).toHaveBeenCalledWith(
        'source-key',
        'destination-key'
      );
    });

    it('should throw BadRequestException if destination file already exists', async () => {
      fileRepository.findByKey
        .mockResolvedValueOnce(mockFileEntity) // source file
        .mockResolvedValueOnce(mockFileEntity); // destination file exists

      await expect(
        service.copyFile(
          'source-key',
          'destination-key',
          'user-id-1',
          'tenant-id-1'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('moveFile', () => {
    it('should move file successfully', async () => {
      const storageMetadata: FileMetadata = {
        key: 'uploads/moved-file.jpg',
        size: 1024 * 1024,
        mimeType: 'image/jpeg',
        lastModified: new Date(),
        etag: 'etag-123',
        url: 'http://localhost:3001/uploads/moved-file.jpg',
      };

      fileRepository.findByKey
        .mockResolvedValueOnce(mockFileEntity) // source file
        .mockResolvedValueOnce(null); // destination file doesn't exist
      storageManager.move.mockResolvedValue(storageMetadata);
      fileRepository.update.mockResolvedValue({
        ...mockFileEntity,
        key: 'moved-file-key',
      });

      const result = await service.moveFile(
        'source-key',
        'destination-key',
        'user-id-1',
        'tenant-id-1'
      );

      expect(result).toBeDefined();
      expect(result.key).toBe('moved-file-key');
      expect(storageManager.move).toHaveBeenCalledWith(
        'source-key',
        'destination-key'
      );
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status of storage providers', async () => {
      const mockHealthStatus = [
        {
          provider: 'local',
          status: 'healthy' as const,
          responseTime: 50,
          lastChecked: new Date(),
        },
      ];

      storageManager.getHealthStatus.mockReturnValue(mockHealthStatus);

      const result = await service.getHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.providers).toHaveLength(1);
      expect(result.providers[0]?.name).toBe('local');
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      const mockStats = {
        totalFiles: 10,
        totalSize: 1024 * 1024 * 100, // 100MB
        averageFileSize: 1024 * 1024 * 10, // 10MB
        filesByStatus: {
          [FileStatus.READY]: 8,
          [FileStatus.PROCESSING]: 2,
          [FileStatus.UPLOADING]: 0,
          [FileStatus.FAILED]: 0,
          [FileStatus.DELETED]: 0,
        },
        filesByVisibility: {
          [FileVisibility.PRIVATE]: 6,
          [FileVisibility.PUBLIC]: 4,
          [FileVisibility.TENANT]: 0,
          [FileVisibility.TEAM]: 0,
        },
      };

      fileRepository.getStorageStats.mockResolvedValue(mockStats);

      const result = await service.getStorageStats('tenant-id-1');

      expect(result.totalFiles).toBe(10);
      expect(result.totalSize).toBe(1024 * 1024 * 100);
      expect(result.averageFileSize).toBe(1024 * 1024 * 10);
    });
  });

  describe('checkFileAccess', () => {
    it('should allow access if user is the owner', async () => {
      const file = { ...mockFileEntity, uploadedById: 'user-id-1' };

      // Should not throw
      await expect(
        service['checkFileAccess'](file, 'user-id-1', 'read', 'tenant-id-1')
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException if file belongs to different tenant', async () => {
      const file = {
        ...mockFileEntity,
        uploadedById: 'other-user-id',
        tenantId: 'other-tenant-id',
        permissions: { read: [], write: [], delete: [] },
      };

      await expect(
        service['checkFileAccess'](file, 'user-id-1', 'read', 'tenant-id-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if file is private and user is not owner', async () => {
      const privateFile = {
        ...mockFileEntity,
        uploadedById: 'other-user-id',
        visibility: FileVisibility.PRIVATE,
        permissions: { read: [], write: [], delete: [] },
      };

      await expect(
        service['checkFileAccess'](
          privateFile,
          'user-id-1',
          'read',
          'tenant-id-1'
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow access if user has explicit permissions', async () => {
      const fileWithPermissions = {
        ...mockFileEntity,
        uploadedById: 'other-user-id',
        permissions: { read: ['user-id-1'], write: [], delete: [] },
      };

      // Should not throw
      await expect(
        service['checkFileAccess'](
          fileWithPermissions,
          'user-id-1',
          'read',
          'tenant-id-1'
        )
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException if user has no required permission', async () => {
      const fileWithPermissions = {
        ...mockFileEntity,
        uploadedById: 'other-user-id',
        permissions: { read: [], write: [], delete: [] },
      };

      await expect(
        service['checkFileAccess'](
          fileWithPermissions,
          'user-id-1',
          'read',
          'tenant-id-1'
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
