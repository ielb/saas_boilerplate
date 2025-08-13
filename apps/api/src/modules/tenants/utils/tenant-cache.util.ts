import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class TenantCacheUtil {
  private readonly logger = new Logger(TenantCacheUtil.name);
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache
  ) {}

  // Cache key generators
  static getUserMembershipsKey(userId: string): string {
    return `user-memberships:${userId}`;
  }

  static getUserAccessKey(userId: string, tenantId: string): string {
    return `user-access:${userId}:${tenantId}`;
  }

  static getTenantContextKey(tenantId: string): string {
    return `tenant-context:${tenantId}`;
  }

  static getUserPermissionsKey(userId: string, tenantId: string): string {
    return `user-permissions:${userId}:${tenantId}`;
  }

  static getRolePermissionsKey(role: string): string {
    return `role-permissions:${role}`;
  }

  static getBulkAccessKey(userId: string, tenantIds: string[]): string {
    const sortedIds = tenantIds.sort().join(',');
    return `bulk-access:${userId}:${sortedIds}`;
  }

  static getTenantBrandingKey(tenantId: string): string {
    return `tenant:branding:${tenantId}`;
  }

  // Cache operations
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.cacheManager.get<T>(key);
      return result ?? null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    // Note: This is a simplified pattern deletion
    // In production, you might want to use Redis SCAN for better performance
    try {
      if (pattern.includes('*')) {
        this.logger.error(
          `Pattern deletion not fully implemented for: ${pattern}`
        );
        // For now, we'll skip pattern deletion
        // In a real implementation, you'd use Redis SCAN or similar
      } else {
        await this.del(pattern);
      }
    } catch (error) {
      this.logger.error(
        `Cache pattern delete error for pattern ${pattern}:`,
        error
      );
    }
  }

  // Bulk operations
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    for (const key of keys) {
      results.push(await this.get<T>(key));
    }
    return results;
  }

  async mset(
    keyValuePairs: Array<{ key: string; value: any; ttl?: number }>
  ): Promise<void> {
    for (const { key, value, ttl } of keyValuePairs) {
      await this.set(key, value, ttl);
    }
  }

  async mdel(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.del(key);
    }
  }

  // User-specific cache clearing
  async clearUserCache(userId: string): Promise<void> {
    const keysToDelete = [
      TenantCacheUtil.getUserMembershipsKey(userId),
      // Note: We can't easily clear all user-access keys without pattern matching
      // In production, consider using Redis with SCAN
    ];

    await this.mdel(keysToDelete);
  }

  // Tenant-specific cache clearing
  async clearTenantCache(tenantId: string): Promise<void> {
    const keysToDelete = [
      TenantCacheUtil.getTenantContextKey(tenantId),
      // Note: Pattern-based clearing would be implemented here in production
    ];

    await this.mdel(keysToDelete);
  }

  // Cache warming strategies
  async warmUserMembershipsCache(
    userId: string,
    data: any,
    ttl: number = 300
  ): Promise<void> {
    const key = TenantCacheUtil.getUserMembershipsKey(userId);
    await this.set(key, data, ttl);
  }

  async warmTenantContextCache(
    tenantId: string,
    data: any,
    ttl: number = 600
  ): Promise<void> {
    const key = TenantCacheUtil.getTenantContextKey(tenantId);
    await this.set(key, data, ttl);
  }

  // Cache statistics (for monitoring)
  async getCacheStats(): Promise<{
    totalKeys: number;
    userMembershipKeys: number;
    userAccessKeys: number;
    tenantContextKeys: number;
  }> {
    // This is a simplified implementation
    // In production with Redis, you'd use INFO or SCAN commands
    return {
      totalKeys: 0, // Would be implemented with proper cache backend
      userMembershipKeys: 0,
      userAccessKeys: 0,
      tenantContextKeys: 0,
    };
  }

  // Cache health check
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      const testKey = 'cache-health-check';
      const testValue = Date.now().toString();

      // Test basic cache operations directly to detect failures
      try {
        await this.cacheManager.set(testKey, testValue, 10);
        const retrieved = await this.cacheManager.get<string>(testKey);
        await this.cacheManager.del(testKey);

        if (retrieved === testValue) {
          return { status: 'ok' };
        } else {
          return { status: 'error', message: 'Cache read/write mismatch' };
        }
      } catch (cacheError) {
        return {
          status: 'error',
          message: `Cache health check failed: ${cacheError instanceof Error ? cacheError.message : 'Unknown cache error'}`,
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Cache health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
