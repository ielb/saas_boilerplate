import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, dirname, extname } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { Readable } from 'stream';
import { BaseStorageProvider } from './base-storage.provider';
import {
  FileMetadata,
  UploadOptions,
  DownloadOptions,
} from './storage-provider.interface';

/**
 * Local storage provider configuration
 */
export interface LocalStorageConfig {
  basePath: string;
  publicUrl?: string;
  maxFileSize?: number; // in bytes
  allowedExtensions?: string[];
}

/**
 * Local storage provider for file system storage
 */
@Injectable()
export class LocalStorageProvider extends BaseStorageProvider {
  private config: LocalStorageConfig;
  private basePath: string;

  constructor(config: LocalStorageConfig) {
    super('local');
    this.config = config;
    this.basePath = config.basePath;
  }

  /**
   * Check if the provider is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await fs.access(this.basePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Upload a file to local storage
   */
  async upload(
    key: string,
    data: Buffer | Readable,
    options?: UploadOptions
  ): Promise<FileMetadata> {
    this.logger.log(`LocalStorage: Uploading file with key: ${key}`);
    this.validateKey(key);
    this.validateUploadData(data);

    const filePath = this.getFilePath(key);
    const directory = dirname(filePath);
    this.logger.log(`LocalStorage: File path: ${filePath}`);
    this.logger.log(`LocalStorage: Directory: ${directory}`);

    try {
      // Ensure directory exists
      await fs.mkdir(directory, { recursive: true });

      // Write file
      if (data instanceof Buffer) {
        await fs.writeFile(filePath, data);
      } else {
        await this.writeStreamToFile(data as Readable, filePath);
      }

      // Get file stats
      const stats = await fs.stat(filePath);
      const mimeType = options?.contentType || this.getMimeType(key);

      const metadata: FileMetadata = {
        key,
        size: stats.size,
        mimeType,
        lastModified: stats.mtime,
        url: await this.getPublicUrl(key),
        ...(options?.metadata && { metadata: options.metadata }),
      };

      this.logger.log(`File uploaded successfully: ${key}`);
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${key}`, error);
      throw new Error(`Failed to upload file: ${(error as Error).message}`);
    }
  }

  /**
   * Download a file from local storage
   */
  async download(key: string, options?: DownloadOptions): Promise<Buffer> {
    this.validateKey(key);

    const filePath = this.getFilePath(key);

    try {
      const buffer = await fs.readFile(filePath);
      this.logger.log(`File downloaded successfully: ${key}`);
      return buffer;
    } catch (error) {
      this.logger.error(`Failed to download file: ${key}`, error);
      throw new Error(`Failed to download file: ${(error as Error).message}`);
    }
  }

  /**
   * Get a readable stream for a file
   */
  async getStream(key: string): Promise<Readable> {
    this.validateKey(key);

    const filePath = this.getFilePath(key);

    try {
      const stream = createReadStream(filePath);
      this.logger.log(`File stream created: ${key}`);
      return stream;
    } catch (error) {
      this.logger.error(`Failed to create stream for file: ${key}`, error);
      throw new Error(
        `Failed to create stream for file: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<FileMetadata> {
    this.validateKey(key);

    const filePath = this.getFilePath(key);

    try {
      const stats = await fs.stat(filePath);
      const mimeType = this.getMimeType(key);

      return {
        key,
        size: stats.size,
        mimeType,
        lastModified: stats.mtime,
        url: await this.getPublicUrl(key),
      };
    } catch (error) {
      this.logger.error(`Failed to get metadata for file: ${key}`, error);
      throw new Error(
        `Failed to get metadata for file: ${(error as Error).message}`
      );
    }
  }

  /**
   * Delete a file from local storage
   */
  async delete(key: string): Promise<void> {
    this.validateKey(key);

    const filePath = this.getFilePath(key);

    try {
      await fs.unlink(filePath);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${key}`, error);
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    this.validateKey(key);

    const filePath = this.getFilePath(key);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a signed URL for file access (not applicable for local storage)
   */
  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    // For local storage, we return the public URL
    return this.getPublicUrl(key);
  }

  /**
   * Get a public URL for a file
   */
  async getPublicUrl(key: string): Promise<string> {
    if (this.config.publicUrl) {
      return `${this.config.publicUrl}/${key}`;
    }

    // Return file:// URL for local access
    const filePath = this.getFilePath(key);
    return `file://${filePath}`;
  }

  /**
   * List files in a directory/prefix
   */
  async list(prefix?: string, maxKeys?: number): Promise<FileMetadata[]> {
    const directory = this.getFilePath(prefix || '');
    const files: FileMetadata[] = [];

    try {
      const items = await fs.readdir(directory, { withFileTypes: true });

      for (const item of items) {
        if (item.isFile()) {
          const key = prefix ? `${prefix}/${item.name}` : item.name;
          const metadata = await this.getMetadata(key);
          files.push(metadata);

          if (maxKeys && files.length >= maxKeys) {
            break;
          }
        }
      }

      this.logger.log(
        `Listed ${files.length} files in directory: ${prefix || 'root'}`
      );
      return files;
    } catch (error) {
      this.logger.error(
        `Failed to list files in directory: ${prefix || 'root'}`,
        error
      );
      throw new Error(`Failed to list files: ${(error as Error).message}`);
    }
  }

  /**
   * Perform provider-specific initialization
   */
  protected async performInitialization(): Promise<void> {
    try {
      // Ensure base directory exists
      await fs.mkdir(this.basePath, { recursive: true });
      this.logger.log(
        `Local storage initialized with base path: ${this.basePath}`
      );
    } catch (error) {
      this.logger.error(`Failed to initialize local storage`, error);
      throw error;
    }
  }

  /**
   * Perform provider-specific cleanup
   */
  protected async performCleanup(): Promise<void> {
    // No specific cleanup needed for local storage
    this.logger.log('Local storage cleanup completed');
  }

  /**
   * Get the full file path for a given key
   */
  private getFilePath(key: string): string {
    return join(this.basePath, key);
  }

  /**
   * Write a stream to a file
   */
  private async writeStreamToFile(
    stream: Readable,
    filePath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filePath);

      stream.pipe(writeStream);

      writeStream.on('finish', () => {
        resolve();
      });

      writeStream.on('error', error => {
        reject(error);
      });

      stream.on('error', error => {
        reject(error);
      });
    });
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(key: string): string {
    const ext = extname(key).toLowerCase();

    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.csv': 'text/csv',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx':
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.zip': 'application/zip',
      '.rar': 'application/vnd.rar',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
