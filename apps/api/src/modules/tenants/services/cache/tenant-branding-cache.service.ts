import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TenantCacheUtil } from '../../utils/tenant-cache.util';
import { GetTenantBrandingResponseDto } from '../../dto/tenant-branding.dto';

@Injectable()
export class TenantBrandingCacheService {
  private readonly logger = new Logger(TenantBrandingCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async getBranding(
    tenantId: string
  ): Promise<GetTenantBrandingResponseDto | null> {
    const cacheKey = TenantCacheUtil.getTenantBrandingKey(tenantId);
    const cached =
      await this.cacheManager.get<GetTenantBrandingResponseDto>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for tenant branding: ${tenantId}`);
    }

    return cached || null;
  }

  async setBranding(
    tenantId: string,
    branding: GetTenantBrandingResponseDto
  ): Promise<void> {
    const cacheKey = TenantCacheUtil.getTenantBrandingKey(tenantId);
    await this.cacheManager.set(cacheKey, branding, 3600000); // 1 hour TTL
    this.logger.debug(`Cached branding for tenant: ${tenantId}`);
  }

  async clearBranding(tenantId: string): Promise<void> {
    const cacheKey = TenantCacheUtil.getTenantBrandingKey(tenantId);
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`Cleared branding cache for tenant: ${tenantId}`);
  }
}
