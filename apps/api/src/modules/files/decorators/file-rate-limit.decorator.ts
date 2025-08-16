import { SetMetadata } from '@nestjs/common';
import { FileRateLimitOptions } from '../guards/file-rate-limit.guard';

export const FILE_RATE_LIMIT_KEY = 'fileRateLimit';

export const FileRateLimit = (options: Partial<FileRateLimitOptions> = {}) =>
  SetMetadata(FILE_RATE_LIMIT_KEY, {
    maxUploads: 10,
    windowMs: 60 * 1000, // 1 minute
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxTotalSize: 100 * 1024 * 1024, // 100MB
    ...options,
  });

// Predefined rate limit configurations
export const FileRateLimitConfigs = {
  // Standard upload limits
  STANDARD: {
    maxUploads: 10,
    windowMs: 60 * 1000,
    maxFileSize: 10 * 1024 * 1024,
    maxTotalSize: 100 * 1024 * 1024,
  },

  // High-frequency upload limits
  HIGH_FREQUENCY: {
    maxUploads: 50,
    windowMs: 60 * 1000,
    maxFileSize: 5 * 1024 * 1024,
    maxTotalSize: 250 * 1024 * 1024,
  },

  // Large file upload limits
  LARGE_FILES: {
    maxUploads: 5,
    windowMs: 60 * 1000,
    maxFileSize: 100 * 1024 * 1024,
    maxTotalSize: 500 * 1024 * 1024,
  },

  // Bulk upload limits
  BULK_UPLOAD: {
    maxUploads: 100,
    windowMs: 300 * 1000, // 5 minutes
    maxFileSize: 2 * 1024 * 1024,
    maxTotalSize: 200 * 1024 * 1024,
  },

  // Admin upload limits
  ADMIN: {
    maxUploads: 1000,
    windowMs: 60 * 1000,
    maxFileSize: 500 * 1024 * 1024,
    maxTotalSize: 10 * 1024 * 1024 * 1024, // 10GB
  },
};
