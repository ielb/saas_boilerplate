import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TenantFeatureFlag,
  TenantFeature,
} from '../entities/tenant-feature-flag.entity';
import { TenantScopedRepository } from '../../../common/repositories/tenant-scoped.repository';

@Injectable()
export class TenantFeatureFlagRepository extends TenantScopedRepository<TenantFeatureFlag> {
  constructor(
    @InjectRepository(TenantFeatureFlag)
    private readonly tenantFeatureFlagRepository: Repository<TenantFeatureFlag>
  ) {
    super(
      tenantFeatureFlagRepository.target,
      tenantFeatureFlagRepository.manager,
      tenantFeatureFlagRepository.queryRunner
    );
  }

  protected getTenantIdField(): string {
    return 'tenantId';
  }

  protected override shouldScopeByTenant(): boolean {
    return true;
  }

  /**
   * Find feature flag by feature name within current tenant
   */
  async findByFeature(
    feature: TenantFeature
  ): Promise<TenantFeatureFlag | null> {
    return this.findOneWithTenantScope({
      where: { feature },
    });
  }

  /**
   * Find all enabled feature flags within current tenant
   */
  async findEnabled(): Promise<TenantFeatureFlag[]> {
    return this.findWithTenantScope({
      where: { isEnabled: true },
    });
  }

  /**
   * Find all disabled feature flags within current tenant
   */
  async findDisabled(): Promise<TenantFeatureFlag[]> {
    return this.findWithTenantScope({
      where: { isEnabled: false },
    });
  }

  /**
   * Check if a feature is enabled within current tenant
   */
  async isFeatureEnabled(feature: TenantFeature): Promise<boolean> {
    const flag = await this.findByFeature(feature);
    return flag?.isEnabled ?? false;
  }

  /**
   * Enable a feature within current tenant
   */
  async enableFeature(
    feature: TenantFeature,
    config?: Record<string, any>
  ): Promise<TenantFeatureFlag> {
    const existingFlag = await this.findByFeature(feature);

    if (existingFlag) {
      existingFlag.isEnabled = true;
      if (config) {
        existingFlag.config = { ...existingFlag.config, ...config };
      }
      return this.saveWithTenantScope(existingFlag);
    } else {
      const newFlag = this.create({
        feature,
        isEnabled: true,
        ...(config && { config }),
      });
      return this.saveWithTenantScope(newFlag);
    }
  }

  /**
   * Disable a feature within current tenant
   */
  async disableFeature(feature: TenantFeature): Promise<TenantFeatureFlag> {
    const existingFlag = await this.findByFeature(feature);

    if (existingFlag) {
      existingFlag.isEnabled = false;
      return this.saveWithTenantScope(existingFlag);
    } else {
      const newFlag = this.create({
        feature,
        isEnabled: false,
      });
      return this.saveWithTenantScope(newFlag);
    }
  }

  /**
   * Update feature configuration within current tenant
   */
  async updateFeatureConfig(
    feature: TenantFeature,
    config: Record<string, any>
  ): Promise<TenantFeatureFlag> {
    const existingFlag = await this.findByFeature(feature);

    if (existingFlag) {
      existingFlag.config = { ...existingFlag.config, ...config };
      return this.saveWithTenantScope(existingFlag);
    } else {
      const newFlag = this.create({
        feature,
        isEnabled: false,
        config,
      });
      return this.saveWithTenantScope(newFlag);
    }
  }

  /**
   * Get feature flags summary within current tenant
   */
  async getFeatureFlagsSummary(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    byFeature: Record<TenantFeature, boolean>;
  }> {
    const flags = await this.findWithTenantScope();

    const byFeature = {} as Record<TenantFeature, boolean>;
    let enabled = 0;
    let disabled = 0;

    for (const flag of flags) {
      byFeature[flag.feature] = flag.isEnabled;
      if (flag.isEnabled) {
        enabled++;
      } else {
        disabled++;
      }
    }

    return {
      total: flags.length,
      enabled,
      disabled,
      byFeature,
    };
  }

  /**
   * Get feature flags statistics within current tenant
   */
  async getFeatureFlagsStats(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
  }> {
    const flags = await this.findWithTenantScope();

    let enabled = 0;
    let disabled = 0;

    for (const flag of flags) {
      if (flag.isEnabled) {
        enabled++;
      } else {
        disabled++;
      }
    }

    return {
      total: flags.length,
      enabled,
      disabled,
    };
  }

  /**
   * Bulk update feature flags within current tenant
   */
  async bulkUpdateFeatureFlags(
    updates: Array<{
      feature: TenantFeature;
      isEnabled: boolean;
      config?: Record<string, any>;
    }>
  ): Promise<TenantFeatureFlag[]> {
    const updatedFlags: TenantFeatureFlag[] = [];

    for (const update of updates) {
      const existingFlag = await this.findByFeature(update.feature);

      if (existingFlag) {
        existingFlag.isEnabled = update.isEnabled;
        if (update.config) {
          existingFlag.config = { ...existingFlag.config, ...update.config };
        }
        updatedFlags.push(await this.saveWithTenantScope(existingFlag));
      } else {
        const newFlag = this.create({
          feature: update.feature,
          isEnabled: update.isEnabled,
          ...(update.config && { config: update.config }),
        });
        updatedFlags.push(await this.saveWithTenantScope(newFlag));
      }
    }

    return updatedFlags;
  }
}
