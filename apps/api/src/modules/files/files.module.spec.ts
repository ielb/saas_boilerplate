import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageManagerService } from './services/storage-manager.service';
import { StorageProviderFactory } from './services/storage-provider.factory';
import { StorageProviderStrategy } from './services/storage-provider.interface';

describe('Storage Components', () => {
  let module: TestingModule;
  let storageManager: StorageManagerService;
  let factory: StorageProviderFactory;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              STORAGE_LOCAL_ENABLED: 'true',
              STORAGE_LOCAL_PATH: './test-uploads',
              STORAGE_S3_ENABLED: 'false',
              STORAGE_GCS_ENABLED: 'false',
              STORAGE_STRATEGY: 'primary',
            }),
          ],
        }),
      ],
      providers: [
        StorageProviderFactory,
        {
          provide: StorageManagerService,
          useFactory: (configService: ConfigService) => {
            const storageConfig = {
              providers: [
                {
                  provider: 'local',
                  enabled: true,
                  priority: 1,
                  config: {
                    basePath: './test-uploads',
                    maxFileSize: 10485760,
                    allowedExtensions: [],
                  },
                },
              ],
              strategy: StorageProviderStrategy.PRIMARY,
              healthCheckInterval: 30000,
              failoverTimeout: 5000,
            };

            return new StorageManagerService(
              new StorageProviderFactory(),
              storageConfig
            );
          },
          inject: [ConfigService],
        },
      ],
    }).compile();

    storageManager = module.get<StorageManagerService>(StorageManagerService);
    factory = module.get<StorageProviderFactory>(StorageProviderFactory);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have StorageManagerService', () => {
    expect(storageManager).toBeDefined();
  });

  it('should have StorageProviderFactory', () => {
    expect(factory).toBeDefined();
  });

  it('should get available providers', () => {
    const providers = factory.getAvailableProviders();
    expect(providers).toContain('local');
    expect(providers).toContain('s3');
    expect(providers).toContain('gcs');
  });

  it('should validate local storage config', () => {
    const config = {
      provider: 'local',
      enabled: true,
      priority: 1,
      config: {
        basePath: './test-uploads',
      },
    };

    const isValid = factory.validateConfig(config);
    expect(isValid).toBe(true);
  });

  it('should reject invalid local storage config', () => {
    const config = {
      provider: 'local',
      enabled: true,
      priority: 1,
      config: {
        // Missing basePath
      },
    };

    const isValid = factory.validateConfig(config);
    expect(isValid).toBe(false);
  });
});
