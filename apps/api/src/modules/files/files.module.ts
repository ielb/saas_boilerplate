import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageProviderFactory } from './services/storage-provider.factory';
import { StorageManagerService } from './services/storage-manager.service';
import { StorageProviderStrategy } from './services/storage-provider.interface';
import { File } from './entities/file.entity';
import { FileService } from './services/file.service';
import { FileRepository } from './repositories/file.repository';
import { FilesController } from './controllers/files.controller';
import { AuthJwtModule } from '../auth/jwt.module';

/**
 * Files module configuration
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([File]), AuthJwtModule],
  controllers: [FilesController],
  providers: [
    StorageProviderFactory,
    FileService,
    FileRepository,
    {
      provide: StorageManagerService,
      useFactory: (configService: ConfigService) => {
        const storageConfig = {
          providers: [
            // Local storage provider (for development)
            {
              provider: 'local',
              enabled:
                configService.get('STORAGE_PROVIDER', 'local') === 'local',
              priority: 1,
              config: {
                basePath: configService.get('STORAGE_LOCAL_PATH', './uploads'),
                publicUrl: configService.get('STORAGE_LOCAL_PUBLIC_URL'),
                maxFileSize: parseInt(
                  configService.get('STORAGE_LOCAL_MAX_FILE_SIZE', '10485760')
                ), // 10MB
                allowedExtensions: configService
                  .get('STORAGE_LOCAL_ALLOWED_EXTENSIONS', '')
                  .split(',')
                  .filter(Boolean),
              },
            },
            // AWS S3 provider (MinIO for testing)
            {
              provider: 's3',
              enabled: configService.get('STORAGE_PROVIDER', 'local') === 's3',
              priority: 2,
              config: {
                region: configService.get('MINIO_REGION', 'us-east-1'),
                bucket: configService.get('MINIO_BUCKET', 'saas-files'),
                accessKeyId: configService.get(
                  'MINIO_ACCESS_KEY',
                  'minioadmin'
                ),
                secretAccessKey: configService.get(
                  'MINIO_SECRET_KEY',
                  'minioadmin123'
                ),
                endpoint: `${configService.get('MINIO_USE_SSL', 'false') === 'true' ? 'https' : 'http'}://${configService.get('MINIO_ENDPOINT', 'localhost')}:${configService.get('MINIO_PORT', '9000')}`,
                forcePathStyle:
                  configService.get('MINIO_FORCE_PATH_STYLE', 'true') ===
                  'true',
                publicUrl: configService.get('MINIO_PUBLIC_URL'),
                maxFileSize: parseInt(
                  configService.get('MINIO_MAX_FILE_SIZE', '104857600')
                ), // 100MB
                allowedExtensions: configService
                  .get(
                    'MINIO_ALLOWED_EXTENSIONS',
                    'jpg,jpeg,png,gif,pdf,doc,docx,txt'
                  )
                  .split(',')
                  .filter(Boolean),
              },
            },
            // Google Cloud Storage provider
            {
              provider: 'gcs',
              enabled: configService.get('STORAGE_PROVIDER', 'local') === 'gcs',
              priority: 3,
              config: {
                projectId: configService.get('STORAGE_GCS_PROJECT_ID', ''),
                bucket: configService.get('STORAGE_GCS_BUCKET', ''),
                keyFilename: configService.get('STORAGE_GCS_KEY_FILENAME'),
                credentials: configService.get('STORAGE_GCS_CREDENTIALS')
                  ? JSON.parse(
                      configService.get('STORAGE_GCS_CREDENTIALS') || '{}'
                    )
                  : undefined,
                publicUrl: configService.get('STORAGE_GCS_PUBLIC_URL'),
                maxFileSize: parseInt(
                  configService.get('STORAGE_GCS_MAX_FILE_SIZE', '104857600')
                ), // 100MB
                allowedExtensions: configService
                  .get('STORAGE_GCS_ALLOWED_EXTENSIONS', '')
                  .split(',')
                  .filter(Boolean),
              },
            },
          ],
          strategy: configService.get(
            'STORAGE_STRATEGY',
            StorageProviderStrategy.PRIMARY
          ) as StorageProviderStrategy,
          healthCheckInterval: parseInt(
            configService.get('STORAGE_HEALTH_CHECK_INTERVAL', '30000')
          ), // 30 seconds
          failoverTimeout: parseInt(
            configService.get('STORAGE_FAILOVER_TIMEOUT', '5000')
          ), // 5 seconds
        };

        return new StorageManagerService(
          new StorageProviderFactory(),
          storageConfig
        );
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    StorageManagerService,
    StorageProviderFactory,
    FileService,
    FileRepository,
  ],
})
export class FilesModule {}
