import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { BaseStorageProvider } from './base-storage.provider';
import {
  FileMetadata,
  UploadOptions,
  DownloadOptions,
} from './storage-provider.interface';

/**
 * Google Cloud Storage provider configuration
 */
export interface GCSStorageConfig {
  projectId: string;
  bucket: string;
  keyFilename?: string; // Path to service account key file
  credentials?: {
    client_email: string;
    private_key: string;
  };
  publicUrl?: string;
  maxFileSize?: number; // in bytes
  allowedExtensions?: string[];
}

/**
 * Google Cloud Storage provider
 */
@Injectable()
export class GCSStorageProvider extends BaseStorageProvider {
  private config: GCSStorageConfig;
  private storage: any; // Google Cloud Storage client
  private bucket: any; // Bucket instance

  constructor(config: GCSStorageConfig) {
    super('gcs');
    this.config = config;
  }

  /**
   * Check if the provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      this.logger.log(
        `Checking GCS provider availability for bucket: ${this.config.bucket}`
      );
      this.logger.log(`GCS project ID: ${this.config.projectId}`);

      // Check if we have the required configuration
      if (!this.config.projectId || !this.config.bucket) {
        this.logger.error(
          'GCS provider not configured: missing projectId or bucket'
        );
        return false;
      }

      if (!this.config.keyFilename && !this.config.credentials) {
        this.logger.error('GCS provider not configured: missing credentials');
        return false;
      }

      // Try to get bucket metadata to check connectivity
      await this.bucket.getMetadata();
      this.logger.log('GCS provider is available');
      return true;
    } catch (error) {
      this.logger.error('GCS provider not available', error);
      this.logger.error(`Error details: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Upload a file to Google Cloud Storage
   */
  async upload(
    key: string,
    data: Buffer | Readable,
    options?: UploadOptions
  ): Promise<FileMetadata> {
    this.validateKey(key);
    this.validateUploadData(data);

    const file = this.bucket.file(key);
    const uploadOptions: any = {
      metadata: {
        contentType: options?.contentType || this.getMimeType(key),
      },
    };

    if (options?.metadata) {
      uploadOptions.metadata.metadata = options.metadata;
    }

    if (options?.public) {
      uploadOptions.predefinedAcl = 'publicRead';
    }

    try {
      let uploadResult;

      if (data instanceof Buffer) {
        uploadResult = await file.save(data, uploadOptions);
      } else {
        uploadResult = await new Promise((resolve, reject) => {
          const writeStream = file.createWriteStream(uploadOptions);
          (data as Readable).pipe(writeStream);

          writeStream.on('error', reject);
          writeStream.on('finish', () => {
            file.getMetadata().then(resolve).catch(reject);
          });
        });
      }

      const metadata: FileMetadata = {
        key,
        size: data instanceof Buffer ? data.length : uploadResult.size || 0,
        mimeType: uploadOptions.metadata.contentType,
        lastModified: new Date(uploadResult.updated || Date.now()),
        etag: uploadResult.etag,
        url: await this.getPublicUrl(key),
        ...(options?.metadata && { metadata: options.metadata }),
      };

      this.logger.log(`File uploaded successfully to GCS: ${key}`);
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to upload file to GCS: ${key}`, error);
      throw new Error(
        `Failed to upload file to GCS: ${(error as Error).message}`
      );
    }
  }

  /**
   * Download a file from Google Cloud Storage
   */
  async download(key: string, options?: DownloadOptions): Promise<Buffer> {
    this.validateKey(key);

    const file = this.bucket.file(key);

    try {
      const [buffer] = await file.download();
      this.logger.log(`File downloaded successfully from GCS: ${key}`);
      return buffer;
    } catch (error) {
      this.logger.error(`Failed to download file from GCS: ${key}`, error);
      throw new Error(
        `Failed to download file from GCS: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get a readable stream for a file
   */
  async getStream(key: string): Promise<Readable> {
    this.validateKey(key);

    const file = this.bucket.file(key);

    try {
      const stream = file.createReadStream();
      this.logger.log(`File stream created from GCS: ${key}`);
      return stream;
    } catch (error) {
      this.logger.error(
        `Failed to create stream for file from GCS: ${key}`,
        error
      );
      throw new Error(
        `Failed to create stream for file from GCS: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get file metadata from Google Cloud Storage
   */
  async getMetadata(key: string): Promise<FileMetadata> {
    this.validateKey(key);

    const file = this.bucket.file(key);

    try {
      const [metadata] = await file.getMetadata();

      return {
        key,
        size: parseInt(metadata.size) || 0,
        mimeType: metadata.contentType || this.getMimeType(key),
        lastModified: new Date(metadata.updated),
        etag: metadata.etag,
        url: await this.getPublicUrl(key),
        metadata: metadata.metadata,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get metadata for file from GCS: ${key}`,
        error
      );
      throw new Error(
        `Failed to get metadata for file from GCS: ${(error as Error).message}`
      );
    }
  }

  /**
   * Delete a file from Google Cloud Storage
   */
  async delete(key: string): Promise<void> {
    this.validateKey(key);

    const file = this.bucket.file(key);

    try {
      await file.delete();
      this.logger.log(`File deleted successfully from GCS: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from GCS: ${key}`, error);
      throw new Error(
        `Failed to delete file from GCS: ${(error as Error).message}`
      );
    }
  }

  /**
   * Check if a file exists in Google Cloud Storage
   */
  async exists(key: string): Promise<boolean> {
    this.validateKey(key);

    const file = this.bucket.file(key);

    try {
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      this.logger.error(`Failed to check if file exists in GCS: ${key}`, error);
      return false;
    }
  }

  /**
   * Generate a signed URL for file access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    this.validateKey(key);

    const file = this.bucket.file(key);

    try {
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresIn * 1000,
      });

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

    // Return GCS public URL
    return `https://storage.googleapis.com/${this.config.bucket}/${key}`;
  }

  /**
   * Copy a file within Google Cloud Storage (optimized implementation)
   */
  override async copy(
    sourceKey: string,
    destinationKey: string
  ): Promise<FileMetadata> {
    this.validateKey(sourceKey);
    this.validateKey(destinationKey);

    const sourceFile = this.bucket.file(sourceKey);
    const destinationFile = this.bucket.file(destinationKey);

    try {
      await sourceFile.copy(destinationFile);

      // Get metadata of the copied file
      const metadata = await this.getMetadata(destinationKey);

      this.logger.log(
        `File copied successfully in GCS: ${sourceKey} -> ${destinationKey}`
      );
      return metadata;
    } catch (error) {
      this.logger.error(
        `Failed to copy file in GCS: ${sourceKey} -> ${destinationKey}`,
        error
      );
      throw new Error(
        `Failed to copy file in GCS: ${(error as Error).message}`
      );
    }
  }

  /**
   * Move a file within Google Cloud Storage (optimized implementation)
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
        `File moved successfully in GCS: ${sourceKey} -> ${destinationKey}`
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to move file in GCS: ${sourceKey} -> ${destinationKey}`,
        error
      );
      throw new Error(
        `Failed to move file in GCS: ${(error as Error).message}`
      );
    }
  }

  /**
   * List files in Google Cloud Storage with prefix
   */
  async list(prefix?: string, maxKeys: number = 1000): Promise<FileMetadata[]> {
    const options: any = {
      maxResults: maxKeys,
    };

    if (prefix) {
      options.prefix = prefix;
    }

    try {
      const [files] = await this.bucket.getFiles(options);
      const fileMetadata: FileMetadata[] = [];

      for (const file of files) {
        const [metadata] = await file.getMetadata();

        const fileMeta: FileMetadata = {
          key: file.name,
          size: parseInt(metadata.size) || 0,
          mimeType: metadata.contentType || this.getMimeType(file.name),
          lastModified: new Date(metadata.updated),
          etag: metadata.etag,
          url: await this.getPublicUrl(file.name),
        };

        fileMetadata.push(fileMeta);
      }

      this.logger.log(
        `Listed ${fileMetadata.length} files from GCS with prefix: ${prefix || 'root'}`
      );
      return fileMetadata;
    } catch (error) {
      this.logger.error(
        `Failed to list files from GCS with prefix: ${prefix || 'root'}`,
        error
      );
      throw new Error(
        `Failed to list files from GCS: ${(error as Error).message}`
      );
    }
  }

  /**
   * Perform provider-specific initialization
   */
  protected async performInitialization(): Promise<void> {
    try {
      this.logger.log('Initializing GCS storage provider...');
      this.logger.log(
        `Config: ${JSON.stringify(
          {
            projectId: this.config.projectId,
            bucket: this.config.bucket,
            hasKeyFilename: !!this.config.keyFilename,
            hasCredentials: !!this.config.credentials,
          },
          null,
          2
        )}`
      );

      // Dynamically import Google Cloud Storage to avoid dependency issues
      const { Storage } = await import('@google-cloud/storage');

      const storageOptions: any = {
        projectId: this.config.projectId,
      };

      if (this.config.keyFilename) {
        storageOptions.keyFilename = this.config.keyFilename;
        this.logger.log(`Using key file: ${this.config.keyFilename}`);
      } else if (this.config.credentials) {
        storageOptions.credentials = this.config.credentials;
        this.logger.log('Using credentials object');
      } else {
        throw new Error(
          'GCS provider requires either keyFilename or credentials'
        );
      }

      this.logger.log(
        `Creating GCS Storage client with options: ${JSON.stringify(
          {
            projectId: storageOptions.projectId,
            hasKeyFilename: !!storageOptions.keyFilename,
            hasCredentials: !!storageOptions.credentials,
          },
          null,
          2
        )}`
      );

      this.storage = new Storage(storageOptions);
      this.bucket = this.storage.bucket(this.config.bucket);

      this.logger.log(
        `GCS storage initialized with bucket: ${this.config.bucket}`
      );
    } catch (error) {
      this.logger.error(`Failed to initialize GCS storage`, error);
      throw error;
    }
  }

  /**
   * Perform provider-specific cleanup
   */
  protected async performCleanup(): Promise<void> {
    // No specific cleanup needed for GCS
    this.logger.log('GCS storage cleanup completed');
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
