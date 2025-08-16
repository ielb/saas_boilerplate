import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

export interface FileRateLimitOptions {
  maxUploads: number;
  windowMs: number;
  maxFileSize: number;
  maxTotalSize: number;
}

@Injectable()
export class FileRateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any;
    const tenantId = request.headers['x-tenant-id'] as string;

    // Get rate limit options from decorator or use defaults
    const options = this.reflector.get<FileRateLimitOptions>(
      'fileRateLimit',
      context.getHandler()
    ) || {
      maxUploads: 10,
      windowMs: 60 * 1000, // 1 minute
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxTotalSize: 100 * 1024 * 1024, // 100MB
    };

    // Check if this is a file upload request
    if (request.method === 'POST' && request.url.includes('/files/upload')) {
      return this.checkFileUploadLimits(request, user, tenantId, options);
    }

    // For non-upload requests, allow access
    return true;
  }

  private async checkFileUploadLimits(
    request: Request,
    user: any,
    tenantId: string,
    options: FileRateLimitOptions
  ): Promise<boolean> {
    const userId = user?.id;
    const key = `file_upload:${userId}:${tenantId || 'global'}`;

    // Check file size limit
    const file = request.file as Express.Multer.File;
    if (file && file.size > options.maxFileSize) {
      throw new HttpException(
        {
          success: false,
          message: `File size exceeds maximum allowed size of ${this.formatBytes(options.maxFileSize)}`,
          error: 'FILE_SIZE_LIMIT_EXCEEDED',
        },
        HttpStatus.BAD_REQUEST
      );
    }

    // Check upload frequency limit
    const uploadCount = await this.getUploadCount(key, options.windowMs);
    if (uploadCount >= options.maxUploads) {
      throw new HttpException(
        {
          success: false,
          message: `Upload limit exceeded. Maximum ${options.maxUploads} uploads per ${options.windowMs / 1000} seconds`,
          error: 'UPLOAD_RATE_LIMIT_EXCEEDED',
          retryAfter: options.windowMs / 1000,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Check total size limit
    const totalSize = await this.getTotalUploadSize(key, options.windowMs);
    if (totalSize + (file?.size || 0) > options.maxTotalSize) {
      throw new HttpException(
        {
          success: false,
          message: `Total upload size limit exceeded. Maximum ${this.formatBytes(options.maxTotalSize)} per ${options.windowMs / 1000} seconds`,
          error: 'TOTAL_SIZE_LIMIT_EXCEEDED',
          retryAfter: options.windowMs / 1000,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Increment counters
    await this.incrementUploadCount(key, options.windowMs);
    if (file?.size) {
      await this.incrementTotalSize(key, file.size, options.windowMs);
    }

    return true;
  }

  private async getUploadCount(key: string, windowMs: number): Promise<number> {
    // This is a simplified implementation
    // In a real application, you would use Redis or a similar store
    // For now, we'll use a simple in-memory store
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;

    // This is a placeholder - in production, use Redis
    return 0;
  }

  private async getTotalUploadSize(
    key: string,
    windowMs: number
  ): Promise<number> {
    // This is a simplified implementation
    // In a real application, you would use Redis or a similar store
    const now = Date.now();
    const windowKey = `${key}:size:${Math.floor(now / windowMs)}`;

    // This is a placeholder - in production, use Redis
    return 0;
  }

  private async incrementUploadCount(
    key: string,
    windowMs: number
  ): Promise<void> {
    // This is a simplified implementation
    // In a real application, you would use Redis or a similar store
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;

    // This is a placeholder - in production, use Redis
  }

  private async incrementTotalSize(
    key: string,
    size: number,
    windowMs: number
  ): Promise<void> {
    // This is a simplified implementation
    // In a real application, you would use Redis or a similar store
    const now = Date.now();
    const windowKey = `${key}:size:${Math.floor(now / windowMs)}`;

    // This is a placeholder - in production, use Redis
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
