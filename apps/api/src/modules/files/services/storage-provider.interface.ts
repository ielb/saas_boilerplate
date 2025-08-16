import { Readable } from 'stream';

/**
 * File metadata information
 */
export interface FileMetadata {
  key: string;
  size: number;
  mimeType: string;
  lastModified: Date;
  etag?: string;
  url?: string;
  metadata?: Record<string, string>;
}

/**
 * Upload options for file operations
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  public?: boolean;
  expiresIn?: number; // seconds
}

/**
 * Download options for file operations
 */
export interface DownloadOptions {
  expiresIn?: number; // seconds for signed URLs
  responseContentType?: string;
  responseContentDisposition?: string;
}

/**
 * Storage provider health status
 */
export interface StorageHealthStatus {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastChecked: Date;
  error?: string;
}

/**
 * Storage provider configuration
 */
export interface StorageProviderConfig {
  provider: string;
  enabled: boolean;
  priority: number;
  config: Record<string, any>;
}

/**
 * Common interface for all storage providers
 */
export interface StorageProvider {
  /**
   * Get the provider name
   */
  readonly name: string;

  /**
   * Check if the provider is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Upload a file to storage
   */
  upload(
    key: string,
    data: Buffer | Readable,
    options?: UploadOptions,
  ): Promise<FileMetadata>;

  /**
   * Download a file from storage
   */
  download(key: string, options?: DownloadOptions): Promise<Buffer>;

  /**
   * Get a readable stream for a file
   */
  getStream(key: string): Promise<Readable>;

  /**
   * Get file metadata
   */
  getMetadata(key: string): Promise<FileMetadata>;

  /**
   * Delete a file from storage
   */
  delete(key: string): Promise<void>;

  /**
   * Check if a file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Generate a signed URL for file access
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Get a public URL for a file (if supported)
   */
  getPublicUrl(key: string): Promise<string>;

  /**
   * Copy a file from one location to another
   */
  copy(sourceKey: string, destinationKey: string): Promise<FileMetadata>;

  /**
   * Move a file from one location to another
   */
  move(sourceKey: string, destinationKey: string): Promise<FileMetadata>;

  /**
   * List files in a directory/prefix
   */
  list(prefix?: string, maxKeys?: number): Promise<FileMetadata[]>;

  /**
   * Get storage provider health status
   */
  getHealthStatus(): Promise<StorageHealthStatus>;

  /**
   * Initialize the storage provider
   */
  initialize(): Promise<void>;

  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}

/**
 * Storage provider factory interface
 */
export interface StorageProviderFactory {
  /**
   * Create a storage provider instance
   */
  createProvider(config: StorageProviderConfig): StorageProvider;

  /**
   * Get all available provider names
   */
  getAvailableProviders(): string[];

  /**
   * Validate provider configuration
   */
  validateConfig(config: StorageProviderConfig): boolean;
}

/**
 * Storage operation result
 */
export interface StorageOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  provider: string;
  duration: number;
}

/**
 * Storage provider selection strategy
 */
export enum StorageProviderStrategy {
  PRIMARY = 'primary',
  FAILOVER = 'failover',
  LOAD_BALANCE = 'load_balance',
  ROUND_ROBIN = 'round_robin',
}
