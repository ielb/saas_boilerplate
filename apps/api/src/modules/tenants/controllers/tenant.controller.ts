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
import { CreateTenantDto, UpdateTenantDto, TenantQueryDto } from '../dto';
import { Tenant, TenantUsage, TenantFeatureFlag } from '../../auth/entities';
import { TenantFeature } from '../../auth/entities/tenant-feature-flag.entity';
import { TenantUsageMetric } from '../../auth/entities/tenant-usage.entity';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../../common/guards';
import { Roles } from '../../../common/decorators';
import {
  AuditInterceptor,
  AuditConfigs,
  AuditEvent,
} from '../../auth/interceptors/audit.interceptor';
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
    schema: {
      type: 'object',
      properties: {
        tenants: {
          type: 'array',
          items: { $ref: '#/components/schemas/Tenant' },
        },
        total: { type: 'number' },
      },
    },
  })
  async getTenants(@Query() query: TenantQueryDto): Promise<{
    tenants: Tenant[];
    total: number;
  }> {
    return await this.tenantService.getTenants(query);
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
    description: 'Usage metric',
  })
  @ApiResponse({
    status: 200,
    description: 'Usage updated successfully',
    type: TenantUsage,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async updateTenantUsage(
    @Param('id') id: string,
    @Param('metric') metric: TenantUsageMetric,
    @Body() body: { value: number; limit?: number }
  ): Promise<TenantUsage> {
    return await this.tenantService.updateTenantUsage(
      id,
      metric,
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
    // This would need to be implemented in the service
    // For now, return empty array
    return [];
  }

  @Get(':id/features/:feature')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Check if feature is enabled for tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID' })
  @ApiParam({
    name: 'feature',
    enum: TenantFeature,
    description: 'Feature name',
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
    status: 404,
    description: 'Tenant not found',
  })
  async isFeatureEnabled(
    @Param('id') id: string,
    @Param('feature') feature: TenantFeature
  ): Promise<{ enabled: boolean }> {
    const enabled = await this.tenantService.isFeatureEnabled(id, feature);
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
    description: 'Feature name',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag updated successfully',
    type: TenantFeatureFlag,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async updateFeatureFlag(
    @Param('id') id: string,
    @Param('feature') feature: TenantFeature,
    @Body() body: { enabled: boolean; config?: Record<string, any> }
  ): Promise<TenantFeatureFlag> {
    return await this.tenantService.updateFeatureFlag(
      id,
      feature,
      body.enabled,
      body.config
    );
  }
}
