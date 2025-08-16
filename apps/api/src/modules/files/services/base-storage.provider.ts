import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import {
  StorageProvider,
  FileMetadata,
  UploadOptions,
  DownloadOptions,
  StorageHealthStatus,
  StorageOperationResult,
} from './storage-provider.interface';

/**
 * Base storage provider with common functionality
 */
@Injectable()
export abstract class BaseStorageProvider implements StorageProvider {
  protected readonly logger = new Logger(this.constructor.name);
  protected initialized = false;

  constructor(public readonly name: string) {}

  /**
   * Get the provider name
   */
  get providerName(): string {
    return this.name;
  }

  /**
   * Check if the provider is available
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Upload a file to storage
   */
  abstract upload(
    key: string,
    data: Buffer | Readable,
    options?: UploadOptions,
  ): Promise<FileMetadata>;

  /**
   * Download a file from storage
   */
  abstract download(key: string, options?: DownloadOptions): Promise<Buffer>;

  /**
   * Get a readable stream for a file
   */
  abstract getStream(key: string): Promise<Readable>;

  /**
   * Get file metadata
   */
  abstract getMetadata(key: string): Promise<FileMetadata>;

  /**
   * Delete a file from storage
   */
  abstract delete(key: string): Promise<void>;

  /**
   * Check if a file exists
   */
  abstract exists(key: string): Promise<boolean>;

  /**
   * Generate a signed URL for file access
   */
  abstract getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Get a public URL for a file (if supported)
   */
  abstract getPublicUrl(key: string): Promise<string>;

  /**
   * Copy a file from one location to another
   */
  async copy(sourceKey: string, destinationKey: string): Promise<FileMetadata> {
    try {
      // Default implementation: download and re-upload
      const data = await this.download(sourceKey);
      const metadata = await this.getMetadata(sourceKey);
      
      const result = await this.upload(destinationKey, data, {
        contentType: metadata.mimeType,
        ...(metadata.metadata && { metadata: metadata.metadata }),
      });

      this.logger.log(`File copied from ${sourceKey} to ${destinationKey}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to copy file from ${sourceKey} to ${destinationKey}`, error);
      throw error;
    }
  }

  /**
   * Move a file from one location to another
   */
  async move(sourceKey: string, destinationKey: string): Promise<FileMetadata> {
    try {
      // Copy the file first
      const result = await this.copy(sourceKey, destinationKey);
      
      // Delete the original file
      await this.delete(sourceKey);
      
      this.logger.log(`File moved from ${sourceKey} to ${destinationKey}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to move file from ${sourceKey} to ${destinationKey}`, error);
      throw error;
    }
  }

  /**
   * List files in a directory/prefix
   */
  abstract list(prefix?: string, maxKeys?: number): Promise<FileMetadata[]>;

  /**
   * Get storage provider health status
   */
  async getHealthStatus(): Promise<StorageHealthStatus> {
    const startTime = Date.now();
    
    try {
      const isAvailable = await this.isAvailable();
      const responseTime = Date.now() - startTime;
      
      return {
        provider: this.name,
        status: isAvailable ? 'healthy' : 'unhealthy',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        provider: this.name,
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Initialize the storage provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.performInitialization();
      this.initialized = true;
      this.logger.log(`Storage provider ${this.name} initialized successfully`);
    } catch (error) {
      this.logger.error(`Failed to initialize storage provider ${this.name}`, error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.performCleanup();
      this.initialized = false;
      this.logger.log(`Storage provider ${this.name} cleaned up successfully`);
    } catch (error) {
      this.logger.error(`Failed to cleanup storage provider ${this.name}`, error);
      throw error;
    }
  }

  /**
   * Execute operation with timing and error handling
   */
  protected async executeOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<StorageOperationResult<T>> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        data: result,
        provider: this.name,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`Operation ${operationName} failed for provider ${this.name}`, error);
      
      return {
        success: false,
        error: (error as Error).message,
        provider: this.name,
        duration,
      };
    }
  }

  /**
   * Validate file key
   */
  protected validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('File key must be a non-empty string');
    }
    
    if (key.length > 1024) {
      throw new Error('File key must be less than 1024 characters');
    }
    
    // Check for invalid characters
    if (/[<>:"|?*]/.test(key)) {
      throw new Error('File key contains invalid characters');
    }
  }

  /**
   * Validate upload data
   */
  protected validateUploadData(data: Buffer | Readable): void {
    if (!data) {
      throw new Error('Upload data is required');
    }
    
    if (!(data instanceof Buffer) && !(data instanceof Readable)) {
      throw new Error('Upload data must be a Buffer or Readable stream');
    }
  }

  /**
   * Perform provider-specific initialization
   */
  protected abstract performInitialization(): Promise<void>;

  /**
   * Perform provider-specific cleanup
   */
  protected abstract performCleanup(): Promise<void>;
}
