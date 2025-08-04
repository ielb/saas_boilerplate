import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  ttl: number; // Time window in milliseconds
  limit: number; // Maximum requests per window
  keyPrefix?: string; // Redis key prefix
  blockDuration?: number; // Duration to block IP after limit exceeded
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
}

export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Decorator to apply rate limiting to a specific endpoint
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Decorator to skip rate limiting for an endpoint
 */
export const SkipRateLimit = () => SetMetadata(RATE_LIMIT_KEY, null);

/**
 * Predefined rate limit configurations for common scenarios
 */
export const RateLimitConfigs = {
  // Authentication endpoints
  LOGIN: {
    ttl: 15 * 60 * 1000, // 15 minutes
    limit: 5, // 5 attempts per 15 minutes
    keyPrefix: 'auth_login',
    blockDuration: 30 * 60, // Block for 30 minutes
  },
  REGISTER: {
    ttl: 60 * 60 * 1000, // 1 hour
    limit: 3, // 3 attempts per hour
    keyPrefix: 'auth_register',
    blockDuration: 60 * 60, // Block for 1 hour
  },
  FORGOT_PASSWORD: {
    ttl: 60 * 60 * 1000, // 1 hour
    limit: 3, // 3 attempts per hour
    keyPrefix: 'auth_forgot_password',
    blockDuration: 60 * 60, // Block for 1 hour
  },
  RESET_PASSWORD: {
    ttl: 5 * 60 * 1000, // 5 minutes
    limit: 5, // 5 attempts per 5 minutes
    keyPrefix: 'auth_reset_password',
    blockDuration: 15 * 60, // Block for 15 minutes
  },
  MFA_VERIFY: {
    ttl: 5 * 60 * 1000, // 5 minutes
    limit: 10, // 10 attempts per 5 minutes
    keyPrefix: 'auth_mfa_verify',
    blockDuration: 15 * 60, // Block for 15 minutes
  },
  REFRESH_TOKEN: {
    ttl: 60 * 1000, // 1 minute
    limit: 30, // 30 attempts per minute
    keyPrefix: 'auth_refresh',
  },

  // API endpoints
  API_STRICT: {
    ttl: 60 * 1000, // 1 minute
    limit: 30, // 30 requests per minute
    keyPrefix: 'api_strict',
  },
  API_NORMAL: {
    ttl: 60 * 1000, // 1 minute
    limit: 100, // 100 requests per minute
    keyPrefix: 'api_normal',
  },
  API_RELAXED: {
    ttl: 60 * 1000, // 1 minute
    limit: 300, // 300 requests per minute
    keyPrefix: 'api_relaxed',
  },

  // File upload endpoints
  FILE_UPLOAD: {
    ttl: 60 * 1000, // 1 minute
    limit: 10, // 10 uploads per minute
    keyPrefix: 'file_upload',
  },

  // Search endpoints
  SEARCH: {
    ttl: 60 * 1000, // 1 minute
    limit: 50, // 50 searches per minute
    keyPrefix: 'search',
  },
} as const;
