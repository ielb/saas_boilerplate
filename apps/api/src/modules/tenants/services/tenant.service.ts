import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate as validateUUID } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Like,
  In,
  Between,
  IsNull,
  Not,
  DataSource,
} from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import {
  TenantUsage,
  TenantUsageMetric,
} from '../entities/tenant-usage.entity';
import {
  TenantFeatureFlag,
  TenantFeature,
} from '../entities/tenant-feature-flag.entity';
import { CreateTenantDto, UpdateTenantDto, TenantQueryDto } from '../dto';

export interface TenantStatistics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  verifiedTenants: number;
  tenantsByPlan: Record<string, number>;
  recentTenants: number;
  growthRate: number;
}

export interface TenantUsageSummary {
  tenantId: string;
  tenantName: string;
  currentUsage: Record<TenantUsageMetric, number>;
  limits: Record<TenantUsageMetric, number>;
  usagePercentage: Record<TenantUsageMetric, number>;
  isOverLimit: Record<TenantUsageMetric, boolean>;
}

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantUsage)
    private readonly tenantUsageRepository: Repository<TenantUsage>,
    @InjectRepository(TenantFeatureFlag)
    private readonly tenantFeatureFlagRepository: Repository<TenantFeatureFlag>,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Create a new tenant
   */
  async createTenant(createTenantDto: CreateTenantDto): Promise<Tenant> {
    this.logger.log(`Creating new tenant: ${createTenantDto.name}`);

    // Check for name uniqueness (excluding soft-deleted tenants)
    const existingTenantByName = await this.tenantRepository.findOne({
      where: { name: createTenantDto.name, deletedAt: IsNull() },
    });

    if (existingTenantByName) {
      throw new ConflictException(
        `Tenant with name "${createTenantDto.name}" already exists`
      );
    }

    // Check for domain uniqueness if provided (excluding soft-deleted tenants)
    if (createTenantDto.domain) {
      const existingTenantByDomain = await this.tenantRepository.findOne({
        where: { domain: createTenantDto.domain, deletedAt: IsNull() },
      });

      if (existingTenantByDomain) {
        throw new ConflictException(
          `Tenant with domain "${createTenantDto.domain}" already exists`
        );
      }
    }

    // Use transaction to ensure data consistency
    return await this.dataSource.transaction(async manager => {
      // Create tenant
      const tenant = manager.create(Tenant, {
        ...createTenantDto,
        isActive: createTenantDto.isActive ?? true,
        plan: createTenantDto.plan ?? 'free',
        maxUsers: createTenantDto.maxUsers ?? 0,
        maxStorage: createTenantDto.maxStorage ?? 0,
        features: createTenantDto.features ?? [],
        settings: createTenantDto.settings ?? {},
        metadata: createTenantDto.metadata ?? {},
      });

      let savedTenant: Tenant;
      try {
        savedTenant = await manager.save(Tenant, tenant);
      } catch (error: any) {
        // Handle database constraint violations
        if (error.code === '23505') {
          // Unique violation
          if (error.constraint?.includes('name')) {
            throw new ConflictException(
              `Tenant with name "${createTenantDto.name}" already exists`
            );
          } else if (error.constraint?.includes('domain')) {
            throw new ConflictException(
              `Tenant with domain "${createTenantDto.domain}" already exists`
            );
          } else {
            throw new ConflictException(
              'Tenant with this name or domain already exists'
            );
          }
        }
        throw error; // Re-throw other errors
      }

      // Initialize default feature flags
      await this.initializeDefaultFeatureFlagsWithManager(
        savedTenant.id,
        manager
      );

      this.logger.log(`Tenant created successfully: ${savedTenant.id}`);
      return savedTenant;
    });
  }

  /**
   * Get all tenants with filtering and pagination
   */
  async getTenants(
    query: TenantQueryDto
  ): Promise<{ tenants: Tenant[]; total: number }> {
    const {
      search,
      plan,
      isActive,
      isVerified,
      isInTrial,
      sortBy,
      sortOrder,
      page,
      limit,
      includeDeleted,
    } = query;

    const queryBuilder = this.tenantRepository.createQueryBuilder('tenant');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(tenant.name ILIKE :search OR tenant.domain ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (plan) {
      queryBuilder.andWhere('tenant.plan = :plan', { plan });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('tenant.isActive = :isActive', { isActive });
    }

    if (isVerified !== undefined) {
      queryBuilder.andWhere('tenant.isVerified = :isVerified', { isVerified });
    }

    if (isInTrial !== undefined) {
      if (isInTrial) {
        queryBuilder.andWhere('tenant.trialEndsAt > :now', { now: new Date() });
      } else {
        queryBuilder.andWhere(
          '(tenant.trialEndsAt IS NULL OR tenant.trialEndsAt <= :now)',
          { now: new Date() }
        );
      }
    }

    // Handle soft deleted records
    if (!includeDeleted) {
      queryBuilder.andWhere('tenant.deletedAt IS NULL');
    }

    // Apply sorting
    queryBuilder.orderBy(`tenant.${sortBy}`, sortOrder);

    // Apply safe pagination
    const safeLimit = Math.min(Math.max(1, limit ?? 10), 100);
    const safePage = Math.max(1, page ?? 1);
    const offset = (safePage - 1) * safeLimit;
    queryBuilder.skip(offset).take(safeLimit);

    // Execute query
    const [tenants, total] = await queryBuilder.getManyAndCount();

    return { tenants, total };
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string): Promise<Tenant> {
    if (!validateUUID(id)) {
      throw new BadRequestException(`Invalid tenant ID format: "${id}"`);
    }

    try {
      const tenant = await this.tenantRepository.findOne({
        where: { id },
        relations: ['users'],
      });

      if (!tenant) {
        throw new NotFoundException(`Tenant with ID "${id}" not found`);
      }

      return tenant;
    } catch (error: any) {
      this.logger.error(`Failed to get tenant ${id}:`, error);

      // Handle TypeORM relationship errors
      if (error.message?.includes('joinColumns')) {
        this.logger.error('TypeORM relationship error in getTenantById');
        throw new BadRequestException(
          'Invalid entity relationship configuration'
        );
      }

      throw error;
    }
  }

  /**
   * Get tenant by domain
   */
  async getTenantByDomain(domain: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { domain },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with domain "${domain}" not found`);
    }

    return tenant;
  }

  /**
   * Get tenant by ID without relations (for update operations)
   */
  async getTenantByIdWithoutRelations(id: string): Promise<Tenant> {
    if (!validateUUID(id)) {
      throw new BadRequestException(`Invalid tenant ID format: "${id}"`);
    }

    try {
      const tenant = await this.tenantRepository.findOne({
        where: { id },
      });

      if (!tenant) {
        throw new NotFoundException(`Tenant with ID "${id}" not found`);
      }

      return tenant;
    } catch (error: any) {
      this.logger.error(`Failed to get tenant ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(
    id: string,
    updateTenantDto: UpdateTenantDto
  ): Promise<Tenant> {
    this.logger.log(`Updating tenant: ${id}`);

    if (!validateUUID(id)) {
      throw new BadRequestException(`Invalid tenant ID format: "${id}"`);
    }

    const tenant = await this.getTenantByIdWithoutRelations(id);

    // Check for name uniqueness if name is being updated (excluding soft-deleted tenants)
    if (updateTenantDto.name && updateTenantDto.name !== tenant.name) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { name: updateTenantDto.name, deletedAt: IsNull() },
      });

      if (existingTenant) {
        throw new ConflictException(
          `Tenant with name "${updateTenantDto.name}" already exists`
        );
      }
    }

    // Check for domain uniqueness if domain is being updated (excluding soft-deleted tenants)
    if (updateTenantDto.domain && updateTenantDto.domain !== tenant.domain) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { domain: updateTenantDto.domain, deletedAt: IsNull() },
      });

      if (existingTenant) {
        throw new ConflictException(
          `Tenant with domain "${updateTenantDto.domain}" already exists`
        );
      }
    }

    // Update tenant
    Object.assign(tenant, updateTenantDto);

    let updatedTenant: Tenant;
    try {
      updatedTenant = await this.tenantRepository.save(tenant);
    } catch (error: any) {
      this.logger.error(`Failed to update tenant ${id}:`, error);

      // Handle database constraint violations
      if (error.code === '23505') {
        // Unique violation
        if (error.constraint?.includes('name')) {
          throw new ConflictException(
            `Tenant with name "${updateTenantDto.name}" already exists`
          );
        } else if (error.constraint?.includes('domain')) {
          throw new ConflictException(
            `Tenant with domain "${updateTenantDto.domain}" already exists`
          );
        } else {
          throw new ConflictException(
            'Tenant with this name or domain already exists'
          );
        }
      }

      // Handle TypeORM relationship errors
      if (error.message?.includes('joinColumns')) {
        this.logger.error('TypeORM relationship error detected');
        throw new BadRequestException(
          'Invalid entity relationship configuration'
        );
      }

      throw error; // Re-throw other errors
    }

    this.logger.log(`Tenant updated successfully: ${id}`);
    return updatedTenant;
  }

  /**
   * Delete tenant (soft delete)
   */
  async deleteTenant(id: string): Promise<void> {
    this.logger.log(`Deleting tenant: ${id}`);

    const tenant = await this.getTenantById(id);

    // Check if tenant has active users
    if (tenant.users && tenant.users.length > 0) {
      const activeUsers = tenant.users.filter(user => user.isActive);
      if (activeUsers.length > 0) {
        throw new BadRequestException(
          `Cannot delete tenant with ${activeUsers.length} active users`
        );
      }
    }

    await this.tenantRepository.softDelete(id);
    this.logger.log(`Tenant deleted successfully: ${id}`);
  }

  /**
   * Restore soft deleted tenant
   */
  async restoreTenant(id: string): Promise<Tenant> {
    this.logger.log(`Restoring tenant: ${id}`);

    const result = await this.tenantRepository.restore(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Tenant with ID "${id}" not found or not deleted`
      );
    }

    const tenant = await this.getTenantById(id);
    this.logger.log(`Tenant restored successfully: ${id}`);
    return tenant;
  }

  /**
   * Verify tenant
   */
  async verifyTenant(id: string): Promise<Tenant> {
    this.logger.log(`Verifying tenant: ${id}`);

    const tenant = await this.getTenantById(id);
    tenant.isVerified = true;
    tenant.verifiedAt = new Date();

    const verifiedTenant = await this.tenantRepository.save(tenant);
    this.logger.log(`Tenant verified successfully: ${id}`);
    return verifiedTenant;
  }

  /**
   * Get tenant statistics
   */
  async getTenantStatistics(): Promise<TenantStatistics> {
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      verifiedTenants,
      tenantsByPlan,
      recentTenants,
    ] = await Promise.all([
      this.tenantRepository.count({ where: { deletedAt: IsNull() } }),
      this.tenantRepository.count({
        where: { isActive: true, deletedAt: IsNull() },
      }),
      this.tenantRepository.count({
        where: {
          trialEndsAt: Not(IsNull()),
          deletedAt: IsNull(),
        },
      }),
      this.tenantRepository.count({
        where: { isVerified: true, deletedAt: IsNull() },
      }),
      this.tenantRepository
        .createQueryBuilder('tenant')
        .select('tenant.plan', 'plan')
        .addSelect('COUNT(*)', 'count')
        .where('tenant.deletedAt IS NULL')
        .groupBy('tenant.plan')
        .getRawMany(),
      this.tenantRepository.count({
        where: {
          createdAt: Between(
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            new Date()
          ),
          deletedAt: IsNull(),
        },
      }),
    ]);

    // Calculate growth rate (comparing last 30 days to previous 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const previousPeriodTenants = await this.tenantRepository.count({
      where: {
        createdAt: Between(sixtyDaysAgo, thirtyDaysAgo),
        deletedAt: IsNull(),
      },
    });

    const growthRate =
      previousPeriodTenants > 0
        ? ((recentTenants - previousPeriodTenants) / previousPeriodTenants) *
          100
        : 0;

    // Convert tenantsByPlan to Record format
    const planStats: Record<string, number> = {};
    tenantsByPlan.forEach((item: any) => {
      planStats[item.plan] = parseInt(item.count);
    });

    return {
      totalTenants,
      activeTenants,
      trialTenants,
      verifiedTenants,
      tenantsByPlan: planStats,
      recentTenants,
      growthRate: Math.round(growthRate * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Get tenant usage summary
   */
  async getTenantUsageSummary(tenantId: string): Promise<TenantUsageSummary> {
    const tenant = await this.getTenantById(tenantId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usageRecords = await this.tenantUsageRepository.find({
      where: {
        tenantId,
        date: today,
      },
    });

    const currentUsage: Record<TenantUsageMetric, number> = {
      [TenantUsageMetric.API_CALLS]: 0,
      [TenantUsageMetric.STORAGE_BYTES]: 0,
      [TenantUsageMetric.USERS]: 0,
      [TenantUsageMetric.EMAILS_SENT]: 0,
      [TenantUsageMetric.FILES_UPLOADED]: 0,
      [TenantUsageMetric.DATABASE_QUERIES]: 0,
      [TenantUsageMetric.WEBSOCKET_CONNECTIONS]: 0,
      [TenantUsageMetric.BACKGROUND_JOBS]: 0,
    };

    const limits: Record<TenantUsageMetric, number> = {
      [TenantUsageMetric.API_CALLS]: 0,
      [TenantUsageMetric.STORAGE_BYTES]: tenant.maxStorage,
      [TenantUsageMetric.USERS]: tenant.maxUsers,
      [TenantUsageMetric.EMAILS_SENT]: 0,
      [TenantUsageMetric.FILES_UPLOADED]: 0,
      [TenantUsageMetric.DATABASE_QUERIES]: 0,
      [TenantUsageMetric.WEBSOCKET_CONNECTIONS]: 0,
      [TenantUsageMetric.BACKGROUND_JOBS]: 0,
    };

    // Populate usage data
    usageRecords.forEach(record => {
      currentUsage[record.metric] = record.value;
      limits[record.metric] = record.limit;
    });

    // Calculate usage percentages and over-limit status
    const usagePercentage: Record<TenantUsageMetric, number> = {} as Record<
      TenantUsageMetric,
      number
    >;
    const isOverLimit: Record<TenantUsageMetric, boolean> = {} as Record<
      TenantUsageMetric,
      boolean
    >;

    Object.values(TenantUsageMetric).forEach(metric => {
      const limit = limits[metric];
      const usage = currentUsage[metric];

      usagePercentage[metric] =
        limit > 0 ? Math.round((usage / limit) * 100) : 0;
      isOverLimit[metric] = limit > 0 && usage > limit;
    });

    return {
      tenantId,
      tenantName: tenant.name,
      currentUsage,
      limits,
      usagePercentage,
      isOverLimit,
    };
  }

  /**
   * Update tenant usage
   */
  async updateTenantUsage(
    tenantId: string,
    metric: TenantUsageMetric,
    value: number,
    limit?: number
  ): Promise<TenantUsage> {
    // Validate UUID
    if (!validateUUID(tenantId)) {
      throw new BadRequestException(`Invalid tenant ID format: "${tenantId}"`);
    }

    // Validate metric enum
    if (!Object.values(TenantUsageMetric).includes(metric)) {
      throw new BadRequestException(
        `Invalid metric: "${metric}". Valid metrics are: ${Object.values(TenantUsageMetric).join(', ')}`
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      let usageRecord = await this.tenantUsageRepository.findOne({
        where: {
          tenantId,
          date: today,
          metric,
        },
      });

      if (!usageRecord) {
        usageRecord = this.tenantUsageRepository.create({
          tenantId,
          date: today,
          metric,
          value: 0,
          limit: limit ?? 0,
        });
      }

      usageRecord.value = value;
      if (limit !== undefined) {
        usageRecord.limit = limit;
      }

      return await this.tenantUsageRepository.save(usageRecord);
    } catch (error: any) {
      this.logger.error(
        `Failed to update tenant usage: ${error.message}`,
        error
      );

      // Handle enum validation errors
      if (error.message?.includes('tenant_usage_metric_enum')) {
        throw new BadRequestException(
          `Invalid metric value: "${metric}". Valid values are: ${Object.values(TenantUsageMetric).join(', ')}. Please use snake_case format (e.g., 'api_calls' not 'apiCalls').`
        );
      }

      throw error;
    }
  }

  /**
   * Get feature flag for tenant
   */
  async getFeatureFlag(
    tenantId: string,
    feature: TenantFeature
  ): Promise<TenantFeatureFlag | null> {
    try {
      return await this.tenantFeatureFlagRepository.findOne({
        where: { tenantId, feature },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to get feature flag ${feature} for tenant ${tenantId}:`,
        error
      );

      // Handle enum validation errors
      if (error.message?.includes('tenant_feature_flags_feature_enum')) {
        throw new BadRequestException(
          `Invalid feature value: "${feature}". Valid values are: ${Object.values(TenantFeature).join(', ')}. Please use snake_case format (e.g., 'advanced_analytics' not 'ADVANCED_ANALYTICS').`
        );
      }

      throw error;
    }
  }

  /**
   * Check if feature is enabled for tenant
   */
  async isFeatureEnabled(
    tenantId: string,
    feature: TenantFeature
  ): Promise<boolean> {
    try {
      const featureFlag = await this.getFeatureFlag(tenantId, feature);
      return featureFlag?.isEnabled ?? false;
    } catch (error: any) {
      this.logger.error(
        `Failed to check feature ${feature} for tenant ${tenantId}:`,
        error
      );

      // Handle enum validation errors
      if (error.message?.includes('tenant_feature_flags_feature_enum')) {
        throw new BadRequestException(
          `Invalid feature value: "${feature}". Valid values are: ${Object.values(TenantFeature).join(', ')}. Please use snake_case format (e.g., 'advanced_analytics' not 'ADVANCED_ANALYTICS').`
        );
      }

      throw error;
    }
  }

  /**
   * Update feature flag
   */
  async updateFeatureFlag(
    tenantId: string,
    feature: TenantFeature,
    isEnabled: boolean,
    config?: Record<string, any>
  ): Promise<TenantFeatureFlag> {
    try {
      let featureFlag = await this.getFeatureFlag(tenantId, feature);

      if (!featureFlag) {
        featureFlag = this.tenantFeatureFlagRepository.create({
          tenantId,
          feature,
          isEnabled,
          ...(config && { config }),
        });
      } else {
        featureFlag.isEnabled = isEnabled;
        if (config) {
          featureFlag.config = config;
        }
      }

      return await this.tenantFeatureFlagRepository.save(featureFlag);
    } catch (error: any) {
      this.logger.error(
        `Failed to update feature flag ${feature} for tenant ${tenantId}:`,
        error
      );

      // Handle enum validation errors
      if (error.message?.includes('tenant_feature_flags_feature_enum')) {
        throw new BadRequestException(
          `Invalid feature value: "${feature}". Valid values are: ${Object.values(TenantFeature).join(', ')}. Please use snake_case format (e.g., 'advanced_analytics' not 'ADVANCED_ANALYTICS').`
        );
      }

      throw error;
    }
  }

  /**
   * Get all feature flags for a tenant
   */
  async getTenantFeatures(tenantId: string): Promise<TenantFeatureFlag[]> {
    await this.getTenantById(tenantId); // Verify tenant exists

    return await this.tenantFeatureFlagRepository.find({
      where: { tenantId },
      order: { feature: 'ASC' },
    });
  }

  /**
   * Bulk update feature flags for a tenant
   */
  async bulkUpdateFeatureFlags(
    tenantId: string,
    updates: Array<{
      feature: TenantFeature;
      isEnabled: boolean;
      config?: Record<string, any>;
    }>
  ): Promise<TenantFeatureFlag[]> {
    try {
      await this.getTenantById(tenantId); // Verify tenant exists

      const updatedFlags: TenantFeatureFlag[] = [];

      for (const update of updates) {
        const featureFlag = await this.updateFeatureFlag(
          tenantId,
          update.feature,
          update.isEnabled,
          update.config
        );
        updatedFlags.push(featureFlag);
      }

      return updatedFlags;
    } catch (error: any) {
      this.logger.error(
        `Failed to bulk update feature flags for tenant ${tenantId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get feature flags statistics for a tenant
   */
  async getFeatureFlagsStats(tenantId: string): Promise<{
    total: number;
    enabled: number;
    disabled: number;
  }> {
    await this.getTenantById(tenantId); // Verify tenant exists

    const [total, enabled] = await Promise.all([
      this.tenantFeatureFlagRepository.count({ where: { tenantId } }),
      this.tenantFeatureFlagRepository.count({
        where: { tenantId, isEnabled: true },
      }),
    ]);

    return {
      total,
      enabled,
      disabled: total - enabled,
    };
  }

  /**
   * Initialize default feature flags for a new tenant
   */
  private async initializeDefaultFeatureFlags(tenantId: string): Promise<void> {
    const defaultFeatures = [
      TenantFeature.MFA_ENFORCEMENT,
      TenantFeature.EMAIL_TEMPLATES,
      TenantFeature.AUDIT_LOGGING,
    ];

    const featureFlags = defaultFeatures.map(feature =>
      this.tenantFeatureFlagRepository.create({
        tenantId,
        feature,
        isEnabled: true,
        config: {},
      })
    );

    await this.tenantFeatureFlagRepository.save(featureFlags);
  }

  /**
   * Initialize default feature flags for a new tenant with transaction manager
   */
  private async initializeDefaultFeatureFlagsWithManager(
    tenantId: string,
    manager: any
  ): Promise<void> {
    const defaultFeatures = [
      TenantFeature.MFA_ENFORCEMENT,
      TenantFeature.EMAIL_TEMPLATES,
      TenantFeature.AUDIT_LOGGING,
    ];

    const featureFlags = defaultFeatures.map(feature =>
      manager.create(TenantFeatureFlag, {
        tenantId,
        feature,
        isEnabled: true,
        config: {},
      })
    );

    await manager.save(TenantFeatureFlag, featureFlags);
  }
}
