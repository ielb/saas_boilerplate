import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantContext } from '@app/shared';

@Injectable()
export class TenantIsolationService {
  private readonly logger = new Logger(TenantIsolationService.name);

  constructor(private readonly tenantContextService: TenantContextService) {}

  /**
   * Get the current tenant ID, throwing an error if not available
   */
  getCurrentTenantId(): string {
    const tenantId = this.tenantContextService.getTenantId();
    if (!tenantId) {
      throw new ForbiddenException(
        'Tenant context is required for this operation'
      );
    }
    return tenantId;
  }

  /**
   * Get the current tenant context, throwing an error if not available
   */
  getCurrentTenant(): TenantContext {
    const tenant = this.tenantContextService.getTenant();
    if (!tenant) {
      throw new ForbiddenException(
        'Tenant context is required for this operation'
      );
    }
    return tenant;
  }

  /**
   * Check if the current request has tenant context
   */
  hasTenantContext(): boolean {
    return this.tenantContextService.hasTenantContext();
  }

  /**
   * Ensure tenant context is available for the current request
   */
  ensureTenantContext(): void {
    if (!this.hasTenantContext()) {
      throw new ForbiddenException(
        'Tenant context is required for this operation'
      );
    }
  }

  /**
   * Get tenant-scoped where clause for database queries
   */
  getTenantWhereClause(
    tenantIdField: string = 'tenantId'
  ): Record<string, string> {
    const tenantId = this.getCurrentTenantId();
    return { [tenantIdField]: tenantId };
  }

  /**
   * Validate that a resource belongs to the current tenant
   */
  validateTenantOwnership(resourceTenantId: string): void {
    const currentTenantId = this.getCurrentTenantId();
    if (resourceTenantId !== currentTenantId) {
      this.logger.warn(
        `Tenant ownership validation failed: expected ${currentTenantId}, got ${resourceTenantId}`
      );
      throw new ForbiddenException(
        'Access denied: resource does not belong to current tenant'
      );
    }
  }

  /**
   * Check if a feature is enabled for the current tenant
   */
  isFeatureEnabled(feature: string): boolean {
    const tenant = this.getCurrentTenant();
    return tenant.features.includes(feature);
  }

  /**
   * Ensure a feature is enabled for the current tenant
   */
  ensureFeatureEnabled(feature: string): void {
    if (!this.isFeatureEnabled(feature)) {
      throw new ForbiddenException(
        `Feature '${feature}' is not enabled for this tenant`
      );
    }
  }

  /**
   * Get tenant-specific setting
   */
  getTenantSetting<T>(key: string, defaultValue?: T): T | undefined {
    const tenant = this.getCurrentTenant();
    return (tenant.settings[key] as T) ?? defaultValue;
  }

  /**
   * Set tenant-specific setting (for runtime use only, not persisted)
   */
  setTenantSetting<T>(key: string, value: T): void {
    const tenant = this.getCurrentTenant();
    tenant.settings[key] = value;
  }

  /**
   * Get tenant context string for logging
   */
  getTenantContextString(): string {
    return this.tenantContextService.getTenantContextString();
  }

  /**
   * Run a function with specific tenant context
   */
  async runWithTenantContext<T>(
    tenantId: string,
    tenant: TenantContext,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.tenantContextService.runWithTenantContext(
      { tenantId, tenant },
      fn
    );
  }

  /**
   * Create a tenant-scoped query builder helper
   */
  createTenantScopedQuery<T>(
    queryBuilder: any,
    tenantIdField: string = 'tenantId'
  ): any {
    const tenantId = this.getCurrentTenantId();
    return queryBuilder.where(`${tenantIdField} = :tenantId`, { tenantId });
  }

  /**
   * Validate tenant access for a list of resources
   */
  validateTenantAccessForResources<T extends { tenantId: string }>(
    resources: T[]
  ): T[] {
    const currentTenantId = this.getCurrentTenantId();
    const validResources = resources.filter(
      resource => resource.tenantId === currentTenantId
    );

    if (validResources.length !== resources.length) {
      this.logger.warn(
        `Tenant access validation: ${resources.length - validResources.length} resources filtered out`
      );
    }

    return validResources;
  }

  /**
   * Get tenant-specific cache key
   */
  getTenantCacheKey(baseKey: string): string {
    const tenantId = this.getCurrentTenantId();
    return `tenant:${tenantId}:${baseKey}`;
  }

  /**
   * Get tenant-specific database schema name (for multi-schema approach)
   */
  getTenantSchemaName(): string {
    const tenantId = this.getCurrentTenantId();
    return `tenant_${tenantId}`;
  }
}
