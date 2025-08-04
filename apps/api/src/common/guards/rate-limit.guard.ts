import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { Redis } from 'ioredis';
import { env } from '@app/config';

export interface RateLimitConfig {
  ttl: number; // Time window in milliseconds
  limit: number; // Maximum requests per window
  keyPrefix: string; // Redis key prefix
  blockDuration?: number; // Duration to block IP after limit exceeded
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly redis: Redis;

  constructor() {
    const redisConfig: any = {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    };

    if (env.REDIS_PASSWORD) {
      redisConfig.password = env.REDIS_PASSWORD;
    }

    this.redis = new Redis(redisConfig);
  }

  private getTracker(req: Record<string, any>): string {
    // Use IP address as the primary tracker
    const ip = req.ip || req.connection.remoteAddress;

    // For authentication endpoints, also consider user agent
    if (req.url?.includes('/auth/')) {
      const userAgent = req.headers['user-agent'] || 'unknown';
      return `${ip}:${userAgent}`;
    }

    return ip;
  }

  private async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    keyPrefix: string = 'rate_limit',
    blockDuration?: number
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tracker = this.getTracker(request);
    const key = `${keyPrefix}:${tracker}`;
    const blockKey = `${keyPrefix}:blocked:${tracker}`;

    // Check if IP is blocked
    const isBlocked = await this.redis.get(blockKey);
    if (isBlocked) {
      const retryAfter = await this.redis.ttl(blockKey);
      throw new HttpException(
        {
          error: 'Too many requests',
          message:
            'Your IP has been temporarily blocked due to excessive requests',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Get current request count
    const current = await this.redis.get(key);
    const currentCount = current ? parseInt(current, 10) : 0;

    if (currentCount >= limit) {
      // Block IP if blockDuration is specified
      if (blockDuration) {
        await this.redis.setex(blockKey, blockDuration, 'blocked');
      }

      const retryAfter = await this.redis.ttl(key);
      throw new HttpException(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Maximum ${limit} requests per ${Math.round(ttl / 1000)} seconds`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Increment counter
    if (currentCount === 0) {
      await this.redis.setex(key, Math.ceil(ttl / 1000), '1');
    } else {
      await this.redis.incr(key);
    }

    return true;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const url = request.url;

    // Define rate limit configurations for different endpoints
    const configs: Record<string, RateLimitConfig> = {
      // Authentication endpoints - strict limits
      '/auth/login': {
        ttl: 15 * 60 * 1000, // 15 minutes
        limit: 5, // 5 login attempts per 15 minutes
        keyPrefix: 'auth_login',
        blockDuration: 30 * 60, // Block for 30 minutes after limit exceeded
      },
      '/auth/register': {
        ttl: 60 * 60 * 1000, // 1 hour
        limit: 3, // 3 registration attempts per hour
        keyPrefix: 'auth_register',
        blockDuration: 60 * 60, // Block for 1 hour after limit exceeded
      },
      '/auth/forgot-password': {
        ttl: 60 * 60 * 1000, // 1 hour
        limit: 3, // 3 password reset requests per hour
        keyPrefix: 'auth_forgot_password',
        blockDuration: 60 * 60, // Block for 1 hour after limit exceeded
      },
      '/auth/reset-password': {
        ttl: 5 * 60 * 1000, // 5 minutes
        limit: 5, // 5 password reset attempts per 5 minutes
        keyPrefix: 'auth_reset_password',
        blockDuration: 15 * 60, // Block for 15 minutes after limit exceeded
      },
      '/auth/verify-email': {
        ttl: 5 * 60 * 1000, // 5 minutes
        limit: 10, // 10 email verification attempts per 5 minutes
        keyPrefix: 'auth_verify_email',
      },
      '/auth/mfa/verify': {
        ttl: 5 * 60 * 1000, // 5 minutes
        limit: 10, // 10 MFA verification attempts per 5 minutes
        keyPrefix: 'auth_mfa_verify',
        blockDuration: 15 * 60, // Block for 15 minutes after limit exceeded
      },
      '/auth/refresh': {
        ttl: 60 * 1000, // 1 minute
        limit: 30, // 30 token refresh attempts per minute
        keyPrefix: 'auth_refresh',
      },
    };

    // Find matching configuration
    const config = configs[url];
    if (config) {
      return this.handleRequest(
        context,
        config.limit,
        config.ttl,
        config.keyPrefix,
        config.blockDuration
      );
    }

    // Default rate limiting for other endpoints
    return this.handleRequest(
      context,
      env.RATE_LIMIT_MAX_REQUESTS,
      env.RATE_LIMIT_WINDOW_MS,
      'default'
    );
  }
}
