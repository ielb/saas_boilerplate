import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { env } from '@app/config';

export interface BruteForceConfig {
  maxAttempts: number; // Maximum failed attempts before lockout
  lockoutDuration: number; // Lockout duration in seconds
  windowMs: number; // Time window for tracking attempts in milliseconds
  keyPrefix: string; // Redis key prefix
}

export type BruteForceType = 'login' | 'register' | 'passwordReset' | 'mfa';

@Injectable()
export class BruteForceProtectionService {
  private readonly logger = new Logger(BruteForceProtectionService.name);
  private readonly redis: Redis;

  // Default configurations for different types of attacks
  private readonly configs: Record<BruteForceType, BruteForceConfig> = {
    login: {
      maxAttempts: 5,
      lockoutDuration: 30 * 60, // 30 minutes
      windowMs: 15 * 60 * 1000, // 15 minutes
      keyPrefix: 'brute_force_login',
    },
    register: {
      maxAttempts: 3,
      lockoutDuration: 60 * 60, // 1 hour
      windowMs: 60 * 60 * 1000, // 1 hour
      keyPrefix: 'brute_force_register',
    },
    passwordReset: {
      maxAttempts: 3,
      lockoutDuration: 60 * 60, // 1 hour
      windowMs: 60 * 60 * 1000, // 1 hour
      keyPrefix: 'brute_force_password_reset',
    },
    mfa: {
      maxAttempts: 10,
      lockoutDuration: 15 * 60, // 15 minutes
      windowMs: 5 * 60 * 1000, // 5 minutes
      keyPrefix: 'brute_force_mfa',
    },
  };

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

  /**
   * Check if an identifier (IP, email, etc.) is currently blocked
   */
  async isBlocked(identifier: string, type: BruteForceType): Promise<boolean> {
    const config = this.configs[type];
    const blockKey = `${config.keyPrefix}:blocked:${identifier}`;

    const isBlocked = await this.redis.get(blockKey);
    return !!isBlocked;
  }

  /**
   * Get remaining lockout time for an identifier
   */
  async getRemainingLockoutTime(
    identifier: string,
    type: BruteForceType
  ): Promise<number> {
    const config = this.configs[type];
    const blockKey = `${config.keyPrefix}:blocked:${identifier}`;

    return await this.redis.ttl(blockKey);
  }

  /**
   * Record a failed attempt
   */
  async recordFailedAttempt(
    identifier: string,
    type: BruteForceType
  ): Promise<void> {
    const config = this.configs[type];
    const attemptKey = `${config.keyPrefix}:attempts:${identifier}`;
    const blockKey = `${config.keyPrefix}:blocked:${identifier}`;

    // Increment failed attempts
    const attempts = await this.redis.incr(attemptKey);

    // Set expiration for the attempts counter
    if (attempts === 1) {
      await this.redis.expire(attemptKey, Math.ceil(config.windowMs / 1000));
    }

    // Check if we should block the identifier
    if (attempts >= config.maxAttempts) {
      await this.redis.setex(blockKey, config.lockoutDuration, 'blocked');

      this.logger.warn(
        `Brute force protection: ${identifier} blocked for ${type} after ${attempts} failed attempts`
      );
    }
  }

  /**
   * Record a successful attempt and reset counters
   */
  async recordSuccessfulAttempt(
    identifier: string,
    type: BruteForceType
  ): Promise<void> {
    const config = this.configs[type];
    const attemptKey = `${config.keyPrefix}:attempts:${identifier}`;
    const blockKey = `${config.keyPrefix}:blocked:${identifier}`;

    // Reset failed attempts counter
    await this.redis.del(attemptKey);

    // Remove block if it exists
    await this.redis.del(blockKey);

    this.logger.debug(
      `Brute force protection: ${identifier} successful attempt for ${type}, counters reset`
    );
  }

  /**
   * Get current failed attempts count
   */
  async getFailedAttempts(
    identifier: string,
    type: BruteForceType
  ): Promise<number> {
    const config = this.configs[type];
    const attemptKey = `${config.keyPrefix}:attempts:${identifier}`;

    const attempts = await this.redis.get(attemptKey);
    return attempts ? parseInt(attempts, 10) : 0;
  }

  /**
   * Manually block an identifier
   */
  async blockIdentifier(
    identifier: string,
    type: BruteForceType,
    duration?: number
  ): Promise<void> {
    const config = this.configs[type];
    const blockKey = `${config.keyPrefix}:blocked:${identifier}`;
    const blockDuration = duration || config.lockoutDuration;

    await this.redis.setex(blockKey, blockDuration, 'blocked');

    this.logger.warn(
      `Brute force protection: ${identifier} manually blocked for ${type} for ${blockDuration} seconds`
    );
  }

  /**
   * Manually unblock an identifier
   */
  async unblockIdentifier(
    identifier: string,
    type: BruteForceType
  ): Promise<void> {
    const config = this.configs[type];
    const blockKey = `${config.keyPrefix}:blocked:${identifier}`;
    const attemptKey = `${config.keyPrefix}:attempts:${identifier}`;

    await this.redis.del(blockKey);
    await this.redis.del(attemptKey);

    this.logger.debug(
      `Brute force protection: ${identifier} manually unblocked for ${type}`
    );
  }

  /**
   * Get brute force statistics
   */
  async getStatistics(type: BruteForceType): Promise<{
    blockedCount: number;
    totalAttempts: number;
  }> {
    const config = this.configs[type];
    const blockedPattern = `${config.keyPrefix}:blocked:*`;
    const attemptsPattern = `${config.keyPrefix}:attempts:*`;

    const [blockedKeys, attemptKeys] = await Promise.all([
      this.redis.keys(blockedPattern),
      this.redis.keys(attemptsPattern),
    ]);

    let totalAttempts = 0;
    for (const key of attemptKeys) {
      const attempts = await this.redis.get(key);
      if (attempts) {
        totalAttempts += parseInt(attempts, 10);
      }
    }

    return {
      blockedCount: blockedKeys.length,
      totalAttempts,
    };
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<void> {
    // This method can be called periodically to clean up expired entries
    // Redis automatically handles expiration, but we can add additional cleanup logic here
    this.logger.debug('Brute force protection cleanup completed');
  }
}
