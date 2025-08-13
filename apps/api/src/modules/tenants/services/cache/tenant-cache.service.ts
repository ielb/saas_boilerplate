import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class TenantCacheService {
  private readonly logger = new Logger(TenantCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get user memberships cache key
   */
  getUserMembershipsKey(userId: string): string {
    return `user:memberships:${userId}`;
  }

  /**
   * Get user access cache key
   */
  getUserAccessKey(userId: string, tenantId: string): string {
    return `user:access:${userId}:${tenantId}`;
  }

  /**
   * Get bulk access cache key
   */
  getBulkAccessKey(userId: string, tenantIds: string[]): string {
    const sortedIds = tenantIds.sort().join(',');
    return `bulk-access:${userId}:${sortedIds}`;
  }

  /**
   * Get tenant branding cache key
   */
  getTenantBrandingKey(tenantId: string): string {
    return `tenant:branding:${tenantId}`;
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.cacheManager.get<T>(key);
      return result || null;
    } catch (error) {
      this.logger.warn(
        `Cache get error for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return null;
    }
  }

  /**
   * Set cached data
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.warn(
        `Cache set error for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete cached data
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(
        `Cache del error for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear all user-related cache
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      // Clear user memberships cache
      await this.del(this.getUserMembershipsKey(userId));

      // Note: We can't easily clear all user access keys without knowing the tenant IDs
      // In a production environment, you might want to use a more sophisticated cache invalidation strategy
      this.logger.debug(`Cleared user cache for: ${userId}`);
    } catch (error) {
      this.logger.warn(
        `Cache clear error for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear tenant-related cache
   */
  async clearTenantCache(tenantId: string): Promise<void> {
    try {
      // Clear tenant branding cache
      await this.del(this.getTenantBrandingKey(tenantId));

      this.logger.debug(`Cleared tenant cache for: ${tenantId}`);
    } catch (error) {
      this.logger.warn(
        `Cache clear error for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
