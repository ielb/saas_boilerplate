import { Injectable, Logger } from '@nestjs/common';
import { TenantScoped, TenantIsolation } from '../decorators/tenant.decorator';
import { TenantIsolationService } from '../services/tenant-isolation.service';

@Injectable()
export class TenantUsageExampleService {
  private readonly logger = new Logger(TenantUsageExampleService.name);

  constructor(
    private readonly tenantIsolationService: TenantIsolationService
  ) {}

  /**
   * Example of a tenant-scoped method that requires tenant context
   */
  @TenantScoped()
  async getTenantSpecificData(): Promise<any> {
    // Get current tenant ID
    const tenantId = this.tenantIsolationService.getCurrentTenantId();

    // Get tenant context
    const tenant = this.tenantIsolationService.getCurrentTenant();

    this.logger.log(`Getting data for tenant: ${tenantId}`);

    return {
      tenantId,
      tenantName: tenant.name,
      features: tenant.features,
      settings: tenant.settings,
    };
  }

  /**
   * Example of a method with strict tenant isolation
   */
  @TenantIsolation()
  async createTenantResource(data: any): Promise<any> {
    // This method automatically ensures tenant context is available
    const tenantId = this.tenantIsolationService.getCurrentTenantId();

    // Get tenant-scoped where clause for database queries
    const whereClause = this.tenantIsolationService.getTenantWhereClause();

    this.logger.log(`Creating resource for tenant: ${tenantId}`);

    // Example database operation with tenant isolation
    // const result = await this.repository.create({
    //   ...data,
    //   ...whereClause, // This ensures the resource belongs to the current tenant
    // });

    return {
      success: true,
      tenantId,
      data,
    };
  }

  /**
   * Example of checking feature availability
   */
  @TenantScoped()
  async checkFeatureAvailability(feature: string): Promise<boolean> {
    const isEnabled = this.tenantIsolationService.isFeatureEnabled(feature);

    this.logger.log(
      `Feature ${feature} is ${isEnabled ? 'enabled' : 'disabled'} for current tenant`
    );

    return isEnabled;
  }

  /**
   * Example of ensuring a feature is enabled before proceeding
   */
  @TenantScoped()
  async performFeatureSpecificOperation(
    feature: string,
    operation: () => Promise<any>
  ): Promise<any> {
    // Ensure the feature is enabled
    this.tenantIsolationService.ensureFeatureEnabled(feature);

    this.logger.log(`Performing operation for feature: ${feature}`);

    // Perform the operation
    return await operation();
  }

  /**
   * Example of getting tenant-specific settings
   */
  @TenantScoped()
  async getTenantSetting<T>(
    key: string,
    defaultValue?: T
  ): Promise<T | undefined> {
    const value = this.tenantIsolationService.getTenantSetting<T>(
      key,
      defaultValue
    );

    this.logger.log(`Getting setting ${key} for tenant: ${value}`);

    return value;
  }

  /**
   * Example of validating tenant ownership of a resource
   */
  @TenantScoped()
  async validateResourceOwnership(
    resourceId: string,
    resourceTenantId: string
  ): Promise<void> {
    // Validate that the resource belongs to the current tenant
    this.tenantIsolationService.validateTenantOwnership(resourceTenantId);

    this.logger.log(
      `Resource ${resourceId} ownership validated for current tenant`
    );
  }

  /**
   * Example of filtering resources by tenant access
   */
  @TenantScoped()
  async getTenantResources<T extends { tenantId: string }>(
    resources: T[]
  ): Promise<T[]> {
    // Filter resources to only include those belonging to the current tenant
    const validResources =
      this.tenantIsolationService.validateTenantAccessForResources(resources);

    this.logger.log(
      `Filtered ${resources.length} resources to ${validResources.length} for current tenant`
    );

    return validResources;
  }

  /**
   * Example of using tenant-specific cache keys
   */
  @TenantScoped()
  async getCachedData(key: string): Promise<any> {
    const tenantCacheKey = this.tenantIsolationService.getTenantCacheKey(key);

    this.logger.log(`Getting cached data with key: ${tenantCacheKey}`);

    // Example cache operation
    // return await this.cacheService.get(tenantCacheKey);

    return {
      cacheKey: tenantCacheKey,
      data: 'cached-data',
    };
  }

  /**
   * Example of running operations with specific tenant context
   */
  async runWithSpecificTenant<T>(
    tenantId: string,
    tenant: any,
    operation: () => Promise<T>
  ): Promise<T> {
    return this.tenantIsolationService.runWithTenantContext(
      tenantId,
      tenant,
      operation
    );
  }

  /**
   * Example of a method that doesn't require tenant context (global operation)
   */
  async getGlobalData(): Promise<any> {
    this.logger.log('Getting global data (no tenant context required)');

    return {
      global: true,
      data: 'global-data',
    };
  }
}
