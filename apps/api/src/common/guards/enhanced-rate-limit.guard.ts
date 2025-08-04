import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Redis } from 'ioredis';
import { env } from '@app/config';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';
import { BruteForceProtectionService } from '../services/brute-force-protection.service';

@Injectable()
export class EnhancedRateLimitGuard implements CanActivate {
  private readonly redis: Redis;

  constructor(
    private readonly reflector: Reflector,
    private readonly bruteForceService: BruteForceProtectionService
  ) {
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

  private async handleRateLimit(
    context: ExecutionContext,
    options: RateLimitOptions
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tracker = this.getTracker(request);
    const key = `${options.keyPrefix || 'rate_limit'}:${tracker}`;
    const blockKey = `${options.keyPrefix || 'rate_limit'}:blocked:${tracker}`;

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

    if (currentCount >= options.limit) {
      // Block IP if blockDuration is specified
      if (options.blockDuration) {
        await this.redis.setex(blockKey, options.blockDuration, 'blocked');
      }

      const retryAfter = await this.redis.ttl(key);
      throw new HttpException(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Maximum ${options.limit} requests per ${Math.round(options.ttl / 1000)} seconds`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Increment counter
    if (currentCount === 0) {
      await this.redis.setex(key, Math.ceil(options.ttl / 1000), '1');
    } else {
      await this.redis.incr(key);
    }

    return true;
  }

  private async handleBruteForceProtection(
    context: ExecutionContext,
    type: 'login' | 'register' | 'passwordReset' | 'mfa'
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || request.connection.remoteAddress;
    const userAgent = request.headers['user-agent'] || 'unknown';
    const identifier = `${ip}:${userAgent}`;

    // Check if identifier is blocked
    const isBlocked = await this.bruteForceService.isBlocked(identifier, type);
    if (isBlocked) {
      const remainingTime =
        await this.bruteForceService.getRemainingLockoutTime(identifier, type);
      throw new HttpException(
        {
          error: 'Account temporarily locked',
          message: 'Too many failed attempts. Please try again later.',
          retryAfter: remainingTime,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const url = request.url;

    // Check for rate limit decorator
    const rateLimitOptions = this.reflector.get<RateLimitOptions | null>(
      RATE_LIMIT_KEY,
      context.getHandler()
    );

    // If rate limiting is explicitly skipped, allow the request
    if (rateLimitOptions === null) {
      return true;
    }

    // If custom rate limit options are provided, use them
    if (rateLimitOptions) {
      return this.handleRateLimit(context, rateLimitOptions);
    }

    // Apply brute force protection for authentication endpoints
    if (url === '/auth/login') {
      await this.handleBruteForceProtection(context, 'login');
    } else if (url === '/auth/register') {
      await this.handleBruteForceProtection(context, 'register');
    } else if (url === '/auth/forgot-password') {
      await this.handleBruteForceProtection(context, 'passwordReset');
    } else if (url === '/auth/mfa/verify') {
      await this.handleBruteForceProtection(context, 'mfa');
    }

    // Default rate limiting for other endpoints
    return this.handleRateLimit(context, {
      ttl: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX_REQUESTS,
      keyPrefix: 'default',
    });
  }
}
