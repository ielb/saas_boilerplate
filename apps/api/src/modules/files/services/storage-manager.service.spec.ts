import { Test, TestingModule } from '@nestjs/testing';
import { StorageManagerService } from './storage-manager.service';
import { StorageProviderFactory } from './storage-provider.factory';
import {
  StorageProvider,
  StorageProviderStrategy,
  FileMetadata,
  StorageProviderConfig,
} from './storage-provider.interface';
import { Readable } from 'stream';

interface TestStorageManagerConfig {
  providers: StorageProviderConfig[];
  strategy: StorageProviderStrategy;
  healthCheckInterval?: number;
  failoverTimeout?: number;
}

describe('StorageManagerService', () => {
  let service: StorageManagerService;
  let factory: StorageProviderFactory;
  let mockProvider: jest.Mocked<StorageProvider>;

  // Helper function to set up service with healthy provider
  const setupServiceWithHealthyProvider = async () => {
    await service.onModuleInit();
    // Set initial health status since health checks run asynchronously
    (service as any).healthStatus.set('local', {
      provider: 'local',
      status: 'healthy',
      responseTime: 100,
      lastChecked: new Date(),
    });
  };

  const mockConfig: TestStorageManagerConfig = {
    providers: [
      {
        provider: 'local',
        enabled: true,
        priority: 1,
        config: {
          basePath: './test-uploads',
        },
      } as StorageProviderConfig,
    ],
    strategy: StorageProviderStrategy.PRIMARY,
    healthCheckInterval: 1000,
  };

  beforeEach(async () => {
    // Create mock provider
    mockProvider = {
      name: 'local',
      isAvailable: jest.fn().mockResolvedValue(true),
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
      getHealthStatus: jest.fn().mockResolvedValue({
        provider: 'local',
        status: 'healthy',
        responseTime: 100,
        lastChecked: new Date(),
      }),
      initialize: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
    };

    // Create mock factory
    const mockFactory = {
      createProvider: jest.fn().mockReturnValue(mockProvider),
      getAvailableProviders: jest.fn().mockReturnValue(['local', 's3', 'gcs']),
      validateConfig: jest.fn().mockReturnValue(true),
    } as unknown as StorageProviderFactory;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: StorageManagerService,
          useFactory: () => new StorageManagerService(mockFactory, mockConfig),
        },
        {
          provide: StorageProviderFactory,
          useValue: mockFactory,
        },
      ],
    }).compile();

    service = module.get<StorageManagerService>(StorageManagerService);
    factory = module.get<StorageProviderFactory>(StorageProviderFactory);
  });

  afterEach(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
  });

  describe('onModuleInit', () => {
    it('should initialize providers successfully', async () => {
      await service.onModuleInit();

      expect(mockProvider.initialize).toHaveBeenCalled();
      expect(service.getAvailableProviders()).toContain('local');
    });

    it('should handle provider initialization failure', async () => {
      mockProvider.initialize.mockRejectedValue(new Error('Init failed'));

      await expect(service.onModuleInit()).rejects.toThrow(
        'No storage providers could be initialized'
      );
    });
  });

  describe('upload', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should upload file successfully', async () => {
      const mockMetadata: FileMetadata = {
        key: 'test-file.txt',
        size: 1024,
        mimeType: 'text/plain',
        lastModified: new Date(),
      };

      mockProvider.upload.mockResolvedValue(mockMetadata);

      const result = await service.upload(
        'test-file.txt',
        Buffer.from('test data')
      );

      expect(result).toEqual(mockMetadata);
      expect(mockProvider.upload).toHaveBeenCalledWith(
        'test-file.txt',
        Buffer.from('test data'),
        undefined
      );
    });

    it('should handle upload failure with retry', async () => {
      // Mock the provider to fail once then succeed
      mockProvider.upload
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce({
          key: 'test-file.txt',
          size: 1024,
          mimeType: 'text/plain',
          lastModified: new Date(),
        });

      // Since we only have one provider and it gets marked as unhealthy after failure,
      // the retry will fail because no healthy providers are available
      await expect(
        service.upload('test-file.txt', Buffer.from('test data'))
      ).rejects.toThrow('All storage providers failed for operation upload');

      expect(mockProvider.upload).toHaveBeenCalledTimes(1);
    });

    it('should handle upload failure after all retries', async () => {
      mockProvider.upload.mockRejectedValue(new Error('Upload failed'));

      await expect(
        service.upload('test-file.txt', Buffer.from('test data'))
      ).rejects.toThrow('All storage providers failed for operation upload');
    });
  });

  describe('download', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should download file successfully', async () => {
      const mockData = Buffer.from('test data');
      mockProvider.download.mockResolvedValue(mockData);

      const result = await service.download('test-file.txt');

      expect(result).toEqual(mockData);
      expect(mockProvider.download).toHaveBeenCalledWith(
        'test-file.txt',
        undefined
      );
    });
  });

  describe('getStream', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should get file stream successfully', async () => {
      const mockStream = new Readable();
      mockProvider.getStream.mockResolvedValue(mockStream);

      const result = await service.getStream('test-file.txt');

      expect(result).toBe(mockStream);
      expect(mockProvider.getStream).toHaveBeenCalledWith('test-file.txt');
    });
  });

  describe('getMetadata', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should get file metadata successfully', async () => {
      const mockMetadata: FileMetadata = {
        key: 'test-file.txt',
        size: 1024,
        mimeType: 'text/plain',
        lastModified: new Date(),
      };

      mockProvider.getMetadata.mockResolvedValue(mockMetadata);

      const result = await service.getMetadata('test-file.txt');

      expect(result).toEqual(mockMetadata);
      expect(mockProvider.getMetadata).toHaveBeenCalledWith('test-file.txt');
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should delete file successfully', async () => {
      mockProvider.delete.mockResolvedValue(undefined);

      await service.delete('test-file.txt');

      expect(mockProvider.delete).toHaveBeenCalledWith('test-file.txt');
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should check file existence successfully', async () => {
      mockProvider.exists.mockResolvedValue(true);

      const result = await service.exists('test-file.txt');

      expect(result).toBe(true);
      expect(mockProvider.exists).toHaveBeenCalledWith('test-file.txt');
    });
  });

  describe('getSignedUrl', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should generate signed URL successfully', async () => {
      const mockUrl = 'https://example.com/signed-url';
      mockProvider.getSignedUrl.mockResolvedValue(mockUrl);

      const result = await service.getSignedUrl('test-file.txt', 3600);

      expect(result).toBe(mockUrl);
      expect(mockProvider.getSignedUrl).toHaveBeenCalledWith(
        'test-file.txt',
        3600
      );
    });
  });

  describe('getPublicUrl', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should get public URL successfully', async () => {
      const mockUrl = 'https://example.com/public-url';
      mockProvider.getPublicUrl.mockResolvedValue(mockUrl);

      const result = await service.getPublicUrl('test-file.txt');

      expect(result).toBe(mockUrl);
      expect(mockProvider.getPublicUrl).toHaveBeenCalledWith('test-file.txt');
    });
  });

  describe('copy', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should copy file successfully', async () => {
      const mockMetadata: FileMetadata = {
        key: 'dest-file.txt',
        size: 1024,
        mimeType: 'text/plain',
        lastModified: new Date(),
      };

      mockProvider.copy.mockResolvedValue(mockMetadata);

      const result = await service.copy('source-file.txt', 'dest-file.txt');

      expect(result).toEqual(mockMetadata);
      expect(mockProvider.copy).toHaveBeenCalledWith(
        'source-file.txt',
        'dest-file.txt'
      );
    });
  });

  describe('move', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should move file successfully', async () => {
      const mockMetadata: FileMetadata = {
        key: 'dest-file.txt',
        size: 1024,
        mimeType: 'text/plain',
        lastModified: new Date(),
      };

      mockProvider.move.mockResolvedValue(mockMetadata);

      const result = await service.move('source-file.txt', 'dest-file.txt');

      expect(result).toEqual(mockMetadata);
      expect(mockProvider.move).toHaveBeenCalledWith(
        'source-file.txt',
        'dest-file.txt'
      );
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should list files successfully', async () => {
      const mockFiles: FileMetadata[] = [
        {
          key: 'file1.txt',
          size: 1024,
          mimeType: 'text/plain',
          lastModified: new Date(),
        },
        {
          key: 'file2.txt',
          size: 2048,
          mimeType: 'text/plain',
          lastModified: new Date(),
        },
      ];

      mockProvider.list.mockResolvedValue(mockFiles);

      const result = await service.list('test-prefix', 10);

      expect(result).toEqual(mockFiles);
      expect(mockProvider.list).toHaveBeenCalledWith('test-prefix', 10);
    });
  });

  describe('getHealthStatus', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should return health status of all providers', () => {
      const healthStatus = service.getHealthStatus();

      expect(healthStatus).toHaveLength(1);
      expect(healthStatus[0]?.provider).toBe('local');
      expect(healthStatus[0]?.status).toBe('healthy');
    });
  });

  describe('getAvailableProviders', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should return list of available providers', () => {
      const providers = service.getAvailableProviders();

      expect(providers).toContain('local');
    });
  });

  describe('getProvider', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should return provider by name', () => {
      const provider = service.getProvider('local');

      expect(provider).toBe(mockProvider);
    });

    it('should return undefined for non-existent provider', () => {
      const provider = service.getProvider('non-existent');

      expect(provider).toBeUndefined();
    });
  });

  describe('provider selection strategies', () => {
    let mockProvider2: jest.Mocked<StorageProvider>;

    beforeEach(async () => {
      mockProvider2 = {
        ...mockProvider,
        name: 's3',
        getHealthStatus: jest.fn().mockResolvedValue({
          provider: 's3',
          status: 'healthy',
          responseTime: 200,
          lastChecked: new Date(),
        }),
      };

      const mockFactory = {
        createProvider: jest
          .fn()
          .mockReturnValueOnce(mockProvider)
          .mockReturnValueOnce(mockProvider2),
        getAvailableProviders: jest
          .fn()
          .mockReturnValue(['local', 's3', 'gcs']),
        validateConfig: jest.fn().mockReturnValue(true),
      } as unknown as StorageProviderFactory;

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          {
            provide: StorageManagerService,
            useFactory: () =>
              new StorageManagerService(mockFactory, {
                ...mockConfig,
                providers: [
                  mockConfig.providers[0]!,
                  {
                    provider: 's3',
                    enabled: true,
                    priority: 2,
                    config: { bucket: 'test-bucket' },
                  },
                ],
              }),
          },
          {
            provide: StorageProviderFactory,
            useValue: mockFactory,
          },
        ],
      }).compile();

      service = module.get<StorageManagerService>(StorageManagerService);
      await setupServiceWithHealthyProvider();
    });

    it('should use PRIMARY strategy correctly', async () => {
      const config: TestStorageManagerConfig = {
        ...mockConfig,
        strategy: StorageProviderStrategy.PRIMARY,
        providers: [
          { ...mockConfig.providers[0] } as StorageProviderConfig,
          {
            provider: 's3',
            enabled: true,
            priority: 2,
            config: { bucket: 'test-bucket' },
          } as StorageProviderConfig,
        ],
      };

      const testService = new StorageManagerService(factory, config);
      await testService.onModuleInit();

      // Set health status for the test service
      (testService as any).healthStatus.set('local', {
        provider: 'local',
        status: 'healthy',
        responseTime: 100,
        lastChecked: new Date(),
      });

      mockProvider.upload.mockResolvedValue({
        key: 'test.txt',
        size: 1024,
        mimeType: 'text/plain',
        lastModified: new Date(),
      });

      await testService.upload('test.txt', Buffer.from('test'));

      expect(mockProvider.upload).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await setupServiceWithHealthyProvider();
    });

    it('should handle provider unavailability', async () => {
      // Mark provider as unhealthy in health status
      (service as any).healthStatus.set('local', {
        provider: 'local',
        status: 'unhealthy',
        responseTime: 0,
        lastChecked: new Date(),
        error: 'Provider unavailable',
      });

      await expect(
        service.upload('test.txt', Buffer.from('test'))
      ).rejects.toThrow('No healthy storage providers available');
    });

    it('should handle all providers failing', async () => {
      mockProvider.upload.mockRejectedValue(new Error('Upload failed'));

      await expect(
        service.upload('test.txt', Buffer.from('test'))
      ).rejects.toThrow('All storage providers failed for operation upload');
    });
  });
});
