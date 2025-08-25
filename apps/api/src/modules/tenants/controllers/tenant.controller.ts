import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantService } from '../services/tenant.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantQueryDto,
  UpdateUsageDto,
  UpdateFeatureFlagDto,
  BulkUpdateFeatureFlagsDto,
  PaginationResponseDto,
} from '../dto';
import {
  convertMetricToEnum,
  getValidMetrics,
} from '../utils/metric-converter.util';
import {
  convertFeatureToEnum,
  getValidFeatures,
} from '../utils/feature-converter.util';
import {
  Tenant,
  TenantUsage,
  TenantFeatureFlag,
} from '../entities';
import { TenantFeature } from '../entities/tenant-feature-flag.entity';
import { TenantUsageMetric } from '../entities/tenant-usage.entity';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../../common/guards';
import { Roles } from '../../../common/decorators';
import {
  AuditInterceptor,
  AuditConfigs,
  AuditEvent,
} from '../../audit/interceptors/audit.interceptor';
import { UserRole } from '@app/shared';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @UseInterceptors(AuditInterceptor)
  @AuditEvent(AuditConfigs.TENANT_CREATED)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
    type: Tenant,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - tenant name or domain already exists',
  })
  @HttpCode(HttpStatus.CREATED)
  async createTenant(
    @Body() createTenantDto: CreateTenantDto
  ): Promise<Tenant> {
    return await this.tenantService.createTenant(createTenantDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get all tenants with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Tenants retrieved successfully',
    type: PaginationResponseDto,
  })
  async getTenants(
    @Query() query: TenantQueryDto
  ): Promise<PaginationResponseDto<Tenant>> {
    const { tenants, total } = await this.tenantService.getTenants(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const totalPages = Math.ceil(total / limit);

    return {
      data: tenants,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get tenant statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getTenantStatistics() {
    return await this.tenantService.getTenantStatistics();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Tenant retrieved successfully',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async getTenantById(@Param('id') id: string): Promise<Tenant> {
    return await this.tenantService.getTenantById(id);
  }

  @Get('domain/:domain')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get tenant by domain' })
  @ApiParam({ name: 'domain', description: 'Tenant domain' })
  @ApiResponse({
    status: 200,
    description: 'Tenant retrieved successfully',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async getTenantByDomain(@Param('domain') domain: string): Promise<Tenant> {
    return await this.tenantService.getTenantByDomain(domain);
  }

  @Put(':id')
  @UseInterceptors(AuditInterceptor)
  @AuditEvent(AuditConfigs.TENANT_UPDATED)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - tenant name or domain already exists',
  })
  async updateTenant(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto
  ): Promise<Tenant> {
    return await this.tenantService.updateTenant(id, updateTenantDto);
  }

  @Delete(':id')
  @UseInterceptors(AuditInterceptor)
  @AuditEvent(AuditConfigs.TENANT_DELETED)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tenant (soft delete)' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 204,
    description: 'Tenant deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - tenant has active users',
  })
  async deleteTenant(@Param('id') id: string): Promise<void> {
    await this.tenantService.deleteTenant(id);
  }

  @Post(':id/restore')
  @UseInterceptors(AuditInterceptor)
  @AuditEvent(AuditConfigs.TENANT_RESTORED)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Restore soft deleted tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Tenant restored successfully',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found or not deleted',
  })
  async restoreTenant(@Param('id') id: string): Promise<Tenant> {
    return await this.tenantService.restoreTenant(id);
  }

  @Post(':id/verify')
  @UseInterceptors(AuditInterceptor)
  @AuditEvent(AuditConfigs.TENANT_VERIFIED)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Verify tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Tenant verified successfully',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async verifyTenant(@Param('id') id: string): Promise<Tenant> {
    return await this.tenantService.verifyTenant(id);
  }

  @Get(':id/usage')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get tenant usage summary' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Usage summary retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async getTenantUsage(@Param('id') id: string) {
    return await this.tenantService.getTenantUsageSummary(id);
  }

  @Put(':id/usage/:metric')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update tenant usage' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiParam({
    name: 'metric',
    enum: TenantUsageMetric,
    description:
      'Usage metric (use snake_case format, e.g., api_calls, storage_bytes)',
    examples: {
      api_calls: { value: 'api_calls', summary: 'API Calls' },
      storage_bytes: { value: 'storage_bytes', summary: 'Storage in Bytes' },
      users: { value: 'users', summary: 'Number of Users' },
      emails_sent: { value: 'emails_sent', summary: 'Emails Sent' },
      files_uploaded: { value: 'files_uploaded', summary: 'Files Uploaded' },
      database_queries: {
        value: 'database_queries',
        summary: 'Database Queries',
      },
      websocket_connections: {
        value: 'websocket_connections',
        summary: 'WebSocket Connections',
      },
      background_jobs: { value: 'background_jobs', summary: 'Background Jobs' },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Usage updated successfully',
    type: TenantUsage,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid metric value',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async updateTenantUsage(
    @Param('id') id: string,
    @Param('metric') metric: string,
    @Body() body: UpdateUsageDto
  ): Promise<TenantUsage> {
    // Convert and validate the metric parameter
    const enumMetric = convertMetricToEnum(metric);
    if (!enumMetric) {
      throw new BadRequestException(
        `Invalid metric: "${metric}". Valid metrics are: ${getValidMetrics().join(', ')}`
      );
    }

    return await this.tenantService.updateTenantUsage(
      id,
      enumMetric,
      body.value,
      body.limit
    );
  }

  @Get(':id/features')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get tenant feature flags' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Feature flags retrieved successfully',
    type: [TenantFeatureFlag],
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async getTenantFeatures(
    @Param('id') id: string
  ): Promise<TenantFeatureFlag[]> {
    return await this.tenantService.getTenantFeatures(id);
  }

  @Get(':id/features/:feature')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Check if feature is enabled for tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiParam({
    name: 'feature',
    enum: TenantFeature,
    description:
      'Feature name (use snake_case format, e.g., advanced_analytics, mfa_enforcement)',
    examples: {
      advanced_analytics: {
        value: 'advanced_analytics',
        summary: 'Advanced Analytics',
      },
      mfa_enforcement: { value: 'mfa_enforcement', summary: 'MFA Enforcement' },
      audit_logging: { value: 'audit_logging', summary: 'Audit Logging' },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Feature status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid feature value',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async isFeatureEnabled(
    @Param('id') id: string,
    @Param('feature') feature: string
  ): Promise<{ enabled: boolean }> {
    // Convert and validate the feature parameter
    const enumFeature = convertFeatureToEnum(feature);
    if (!enumFeature) {
      throw new BadRequestException(
        `Invalid feature: "${feature}". Valid features are: ${getValidFeatures().join(', ')}`
      );
    }

    const enabled = await this.tenantService.isFeatureEnabled(id, enumFeature);
    return { enabled };
  }

  @Put(':id/features/:feature')
  @UseInterceptors(AuditInterceptor)
  @AuditEvent(AuditConfigs.FEATURE_FLAG_UPDATED)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update tenant feature flag' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiParam({
    name: 'feature',
    enum: TenantFeature,
    description:
      'Feature name (use snake_case format, e.g., advanced_analytics, mfa_enforcement)',
    examples: {
      advanced_analytics: {
        value: 'advanced_analytics',
        summary: 'Advanced Analytics',
      },
      mfa_enforcement: { value: 'mfa_enforcement', summary: 'MFA Enforcement' },
      audit_logging: { value: 'audit_logging', summary: 'Audit Logging' },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag updated successfully',
    type: TenantFeatureFlag,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid feature value',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async updateFeatureFlag(
    @Param('id') id: string,
    @Param('feature') feature: string,
    @Body() body: UpdateFeatureFlagDto
  ): Promise<TenantFeatureFlag> {
    // Convert and validate the feature parameter
    const enumFeature = convertFeatureToEnum(feature);
    if (!enumFeature) {
      throw new BadRequestException(
        `Invalid feature: "${feature}". Valid features are: ${getValidFeatures().join(', ')}`
      );
    }

    return await this.tenantService.updateFeatureFlag(
      id,
      enumFeature,
      body.enabled,
      body.config
    );
  }

  @Put(':id/features/bulk')
  @UseInterceptors(AuditInterceptor)
  @AuditEvent(AuditConfigs.FEATURE_FLAG_UPDATED)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Bulk update tenant feature flags' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Feature flags updated successfully',
    type: [TenantFeatureFlag],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid feature values or request body',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async bulkUpdateFeatureFlags(
    @Param('id') id: string,
    @Body() body: BulkUpdateFeatureFlagsDto
  ): Promise<TenantFeatureFlag[]> {
    // Convert and validate all feature parameters
    const updates = body.updates.map(update => {
      const enumFeature = convertFeatureToEnum(update.feature);
      if (!enumFeature) {
        throw new BadRequestException(
          `Invalid feature: "${update.feature}". Valid features are: ${getValidFeatures().join(', ')}`
        );
      }
      return {
        feature: enumFeature,
        isEnabled: update.enabled,
        ...(update.config && { config: update.config }),
      };
    });

    return await this.tenantService.bulkUpdateFeatureFlags(id, updates);
  }

  @Get(':id/features/stats')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Get feature flags statistics for tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiResponse({
    status: 200,
    description: 'Feature flags statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        enabled: { type: 'number' },
        disabled: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async getFeatureFlagsStats(
    @Param('id') id: string
  ): Promise<{ total: number; enabled: number; disabled: number }> {
    return await this.tenantService.getFeatureFlagsStats(id);
  }
}
