import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { BaseStorageProvider } from './base-storage.provider';
import {
  FileMetadata,
  UploadOptions,
  DownloadOptions,
} from './storage-provider.interface';

/**
 * AWS S3 storage provider configuration
 */
export interface S3StorageConfig {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string; // For S3-compatible services like MinIO
  forcePathStyle?: boolean;
  publicUrl?: string;
  maxFileSize?: number; // in bytes
  allowedExtensions?: string[];
}

/**
 * AWS S3 storage provider
 */
@Injectable()
export class S3StorageProvider extends BaseStorageProvider {
  private config: S3StorageConfig;
  private s3Client: any; // AWS SDK S3 client

  constructor(config: S3StorageConfig) {
    super('s3');
    this.config = config;
  }

  /**
   * Check if the provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      this.logger.log(
        `Checking S3 provider availability for bucket: ${this.config.bucket}`
      );
      this.logger.log(`S3 endpoint: ${this.config.endpoint}`);
      this.logger.log(`S3 client initialized: ${!!this.s3Client}`);

      // Try to list objects to check connectivity
      await this.s3Client
        .listObjectsV2({
          Bucket: this.config.bucket,
          MaxKeys: 1,
        })
        .promise();

      this.logger.log('S3 provider is available');
      return true;
    } catch (error) {
      this.logger.error('S3 provider not available', error);
      this.logger.error(`Error details: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Upload a file to S3
   */
  async upload(
    key: string,
    data: Buffer | Readable,
    options?: UploadOptions
  ): Promise<FileMetadata> {
    this.validateKey(key);
    this.validateUploadData(data);

    const params: any = {
      Bucket: this.config.bucket,
      Key: key,
      Body: data,
      ContentType: options?.contentType || this.getMimeType(key),
    };

    if (options?.metadata) {
      params.Metadata = options.metadata;
    }

    if (options?.public) {
      params.ACL = 'public-read';
    }

    try {
      const result = await this.s3Client.upload(params).promise();

      const metadata: FileMetadata = {
        key,
        size: data instanceof Buffer ? data.length : 0, // S3 doesn't return size for streams
        mimeType: params.ContentType,
        lastModified: new Date(),
        etag: result.ETag?.replace(/"/g, ''),
        url: result.Location,
        ...(options?.metadata && { metadata: options.metadata }),
      };

      this.logger.log(`File uploaded successfully to S3: ${key}`);
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${key}`, error);
      throw new Error(
        `Failed to upload file to S3: ${(error as Error).message}`
      );
    }
  }

  /**
   * Download a file from S3
   */
  async download(key: string, options?: DownloadOptions): Promise<Buffer> {
    this.validateKey(key);

    const params: any = {
      Bucket: this.config.bucket,
      Key: key,
    };

    if (options?.responseContentType) {
      params.ResponseContentType = options.responseContentType;
    }

    if (options?.responseContentDisposition) {
      params.ResponseContentDisposition = options.responseContentDisposition;
    }

    try {
      const result = await this.s3Client.getObject(params).promise();
      this.logger.log(`File downloaded successfully from S3: ${key}`);
      return result.Body;
    } catch (error) {
      this.logger.error(`Failed to download file from S3: ${key}`, error);
      throw new Error(
        `Failed to download file from S3: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get a readable stream for a file
   */
  async getStream(key: string): Promise<Readable> {
    this.validateKey(key);

    const params = {
      Bucket: this.config.bucket,
      Key: key,
    };

    try {
      const stream = this.s3Client.getObject(params).createReadStream();
      this.logger.log(`File stream created from S3: ${key}`);
      return stream;
    } catch (error) {
      this.logger.error(
        `Failed to create stream for file from S3: ${key}`,
        error
      );
      throw new Error(
        `Failed to create stream for file from S3: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get file metadata from S3
   */
  async getMetadata(key: string): Promise<FileMetadata> {
    this.validateKey(key);

    const params = {
      Bucket: this.config.bucket,
      Key: key,
    };

    try {
      const result = await this.s3Client.headObject(params).promise();

      return {
        key,
        size: result.ContentLength || 0,
        mimeType: result.ContentType || this.getMimeType(key),
        lastModified: result.LastModified || new Date(),
        etag: result.ETag?.replace(/"/g, ''),
        url: await this.getPublicUrl(key),
        metadata: result.Metadata,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get metadata for file from S3: ${key}`,
        error
      );
      throw new Error(
        `Failed to get metadata for file from S3: ${(error as Error).message}`
      );
    }
  }

  /**
   * Delete a file from S3
   */
  async delete(key: string): Promise<void> {
    this.validateKey(key);

    const params = {
      Bucket: this.config.bucket,
      Key: key,
    };

    try {
      await this.s3Client.deleteObject(params).promise();
      this.logger.log(`File deleted successfully from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${key}`, error);
      throw new Error(
        `Failed to delete file from S3: ${(error as Error).message}`
      );
    }
  }

  /**
   * Check if a file exists in S3
   */
  async exists(key: string): Promise<boolean> {
    this.validateKey(key);

    const params = {
      Bucket: this.config.bucket,
      Key: key,
    };

    try {
      await this.s3Client.headObject(params).promise();
      return true;
    } catch (error) {
      if (
        (error as any).code === 'NotFound' ||
        (error as any).statusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Generate a signed URL for file access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    this.validateKey(key);

    const params = {
      Bucket: this.config.bucket,
      Key: key,
      Expires: expiresIn,
    };

    try {
      const url = await this.s3Client.getSignedUrlPromise('getObject', params);
      this.logger.log(`Signed URL generated for file: ${key}`);
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate signed URL for file: ${key}`,
        error
      );
      throw new Error(
        `Failed to generate signed URL: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get a public URL for a file
   */
  async getPublicUrl(key: string): Promise<string> {
    if (this.config.publicUrl) {
      return `${this.config.publicUrl}/${key}`;
    }

    // Return S3 public URL
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  /**
   * Copy a file within S3 (optimized implementation)
   */
  override async copy(
    sourceKey: string,
    destinationKey: string
  ): Promise<FileMetadata> {
    this.validateKey(sourceKey);
    this.validateKey(destinationKey);

    const params = {
      Bucket: this.config.bucket,
      CopySource: `${this.config.bucket}/${sourceKey}`,
      Key: destinationKey,
    };

    try {
      const result = await this.s3Client.copyObject(params).promise();

      // Get metadata of the copied file
      const metadata = await this.getMetadata(destinationKey);

      this.logger.log(
        `File copied successfully in S3: ${sourceKey} -> ${destinationKey}`
      );
      return metadata;
    } catch (error) {
      this.logger.error(
        `Failed to copy file in S3: ${sourceKey} -> ${destinationKey}`,
        error
      );
      throw new Error(`Failed to copy file in S3: ${(error as Error).message}`);
    }
  }

  /**
   * Move a file within S3 (optimized implementation)
   */
  override async move(
    sourceKey: string,
    destinationKey: string
  ): Promise<FileMetadata> {
    this.validateKey(sourceKey);
    this.validateKey(destinationKey);

    try {
      // Copy the file first
      const result = await this.copy(sourceKey, destinationKey);

      // Delete the original file
      await this.delete(sourceKey);

      this.logger.log(
        `File moved successfully in S3: ${sourceKey} -> ${destinationKey}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to move file in S3: ${sourceKey} -> ${destinationKey}`,
        error
      );
      throw new Error(`Failed to move file in S3: ${(error as Error).message}`);
    }
  }

  /**
   * List files in S3 with prefix
   */
  async list(prefix?: string, maxKeys: number = 1000): Promise<FileMetadata[]> {
    const params: any = {
      Bucket: this.config.bucket,
      MaxKeys: maxKeys,
    };

    if (prefix) {
      params.Prefix = prefix;
    }

    try {
      const result = await this.s3Client.listObjectsV2(params).promise();
      const files: FileMetadata[] = [];

      for (const item of result.Contents || []) {
        const metadata: FileMetadata = {
          key: item.Key!,
          size: item.Size || 0,
          mimeType: this.getMimeType(item.Key!),
          lastModified: item.LastModified || new Date(),
          etag: item.ETag?.replace(/"/g, ''),
          url: await this.getPublicUrl(item.Key!),
        };
        files.push(metadata);
      }

      this.logger.log(
        `Listed ${files.length} files from S3 with prefix: ${prefix || 'root'}`
      );
      return files;
    } catch (error) {
      this.logger.error(
        `Failed to list files from S3 with prefix: ${prefix || 'root'}`,
        error
      );
      throw new Error(
        `Failed to list files from S3: ${(error as Error).message}`
      );
    }
  }

  /**
   * Perform provider-specific initialization
   */
  protected async performInitialization(): Promise<void> {
    try {
      this.logger.log('Initializing S3 storage provider...');
      this.logger.log(
        `Config: ${JSON.stringify(
          {
            region: this.config.region,
            bucket: this.config.bucket,
            endpoint: this.config.endpoint,
            forcePathStyle: this.config.forcePathStyle,
            accessKeyId: this.config.accessKeyId ? '***' : 'undefined',
          },
          null,
          2
        )}`
      );

      // Dynamically import AWS SDK to avoid dependency issues
      const AWS = await import('aws-sdk');

      const s3Config: any = {
        region: this.config.region,
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      };

      if (this.config.endpoint) {
        s3Config.endpoint = this.config.endpoint;
      }

      if (this.config.forcePathStyle !== undefined) {
        s3Config.s3ForcePathStyle = this.config.forcePathStyle;
      }

      this.logger.log(
        `Creating S3 client with config: ${JSON.stringify(
          {
            region: s3Config.region,
            endpoint: s3Config.endpoint,
            s3ForcePathStyle: s3Config.s3ForcePathStyle,
          },
          null,
          2
        )}`
      );

      this.s3Client = new AWS.S3(s3Config);

      this.logger.log(
        `S3 storage initialized with bucket: ${this.config.bucket}`
      );
    } catch (error) {
      this.logger.error(`Failed to initialize S3 storage`, error);
      throw error;
    }
  }

  /**
   * Perform provider-specific cleanup
   */
  protected async performCleanup(): Promise<void> {
    // No specific cleanup needed for S3
    this.logger.log('S3 storage cleanup completed');
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      txt: 'text/plain',
      json: 'application/json',
      xml: 'application/xml',
      csv: 'text/csv',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      zip: 'application/zip',
      rar: 'application/vnd.rar',
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
