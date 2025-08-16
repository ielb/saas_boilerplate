import { Injectable } from '@nestjs/common';
import {
  StorageProvider,
  StorageProviderFactory as IStorageProviderFactory,
  StorageProviderConfig,
} from './storage-provider.interface';
import { LocalStorageProvider, LocalStorageConfig } from './local.provider';
import { S3StorageProvider, S3StorageConfig } from './s3.provider';
import { GCSStorageProvider, GCSStorageConfig } from './gcs.provider';

/**
 * Storage provider factory implementation
 */
@Injectable()
export class StorageProviderFactory implements IStorageProviderFactory {
  /**
   * Create a storage provider instance
   */
  createProvider(config: StorageProviderConfig): StorageProvider {
    switch (config.provider.toLowerCase()) {
      case 'local':
        return this.createLocalProvider(config);
      case 's3':
        return this.createS3Provider(config);
      case 'gcs':
        return this.createGCSProvider(config);
      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`);
    }
  }

  /**
   * Get all available provider names
   */
  getAvailableProviders(): string[] {
    return ['local', 's3', 'gcs'];
  }

  /**
   * Validate provider configuration
   */
  validateConfig(config: StorageProviderConfig): boolean {
    try {
      switch (config.provider.toLowerCase()) {
        case 'local':
          return this.validateLocalConfig(config.config);
        case 's3':
          return this.validateS3Config(config.config);
        case 'gcs':
          return this.validateGCSConfig(config.config);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Create local storage provider
   */
  private createLocalProvider(config: StorageProviderConfig): LocalStorageProvider {
    const localConfig: LocalStorageConfig = {
      basePath: config.config.basePath,
      publicUrl: config.config.publicUrl,
      maxFileSize: config.config.maxFileSize,
      allowedExtensions: config.config.allowedExtensions,
    };

    return new LocalStorageProvider(localConfig);
  }

  /**
   * Create S3 storage provider
   */
  private createS3Provider(config: StorageProviderConfig): S3StorageProvider {
    const s3Config: S3StorageConfig = {
      region: config.config.region,
      bucket: config.config.bucket,
      accessKeyId: config.config.accessKeyId,
      secretAccessKey: config.config.secretAccessKey,
      endpoint: config.config.endpoint,
      forcePathStyle: config.config.forcePathStyle,
      publicUrl: config.config.publicUrl,
      maxFileSize: config.config.maxFileSize,
      allowedExtensions: config.config.allowedExtensions,
    };

    return new S3StorageProvider(s3Config);
  }

  /**
   * Create GCS storage provider
   */
  private createGCSProvider(config: StorageProviderConfig): GCSStorageProvider {
    const gcsConfig: GCSStorageConfig = {
      projectId: config.config.projectId,
      bucket: config.config.bucket,
      keyFilename: config.config.keyFilename,
      credentials: config.config.credentials,
      publicUrl: config.config.publicUrl,
      maxFileSize: config.config.maxFileSize,
      allowedExtensions: config.config.allowedExtensions,
    };

    return new GCSStorageProvider(gcsConfig);
  }

  /**
   * Validate local storage configuration
   */
  private validateLocalConfig(config: any): boolean {
    return !!(
      config &&
      typeof config.basePath === 'string' &&
      config.basePath.length > 0
    );
  }

  /**
   * Validate S3 storage configuration
   */
  private validateS3Config(config: any): boolean {
    return !!(
      config &&
      typeof config.region === 'string' &&
      config.region.length > 0 &&
      typeof config.bucket === 'string' &&
      config.bucket.length > 0 &&
      typeof config.accessKeyId === 'string' &&
      config.accessKeyId.length > 0 &&
      typeof config.secretAccessKey === 'string' &&
      config.secretAccessKey.length > 0
    );
  }

  /**
   * Validate GCS storage configuration
   */
  private validateGCSConfig(config: any): boolean {
    return !!(
      config &&
      typeof config.projectId === 'string' &&
      config.projectId.length > 0 &&
      typeof config.bucket === 'string' &&
      config.bucket.length > 0 &&
      (config.keyFilename || config.credentials)
    );
  }
}
