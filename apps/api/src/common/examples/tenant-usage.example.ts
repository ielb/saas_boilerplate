import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  TenantId,
  Tenant,
  TenantContext,
  TenantName,
  TenantPlan,
} from '../decorators/tenant.decorator';
import { RequireTenant } from '../decorators/auth.decorator';
import { TenantGuard } from '../guards/tenant.guard';
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor';
import { TenantScopingInterceptor } from '../interceptors/tenant-scoping.interceptor';

// Example DTOs
class CreateResourceDto {
  name!: string;
  description?: string;
}

class UpdateResourceDto {
  name?: string;
  description?: string;
}

class ResourceQueryDto {
  page?: number = 1;
  limit?: number = 10;
  search?: string;
}

// Example entity (this would normally be in a separate file)
class Resource {
  id!: string;
  name!: string;
  description?: string;
  tenantId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * Example controller demonstrating tenant isolation usage
 *
 * This controller shows how to:
 * 1. Use tenant decorators to extract tenant information
 * 2. Apply tenant guards to require tenant context
 * 3. Use tenant interceptors for automatic scoping and context injection
 * 4. Handle tenant-specific operations
 */
@Controller('example-resources')
@UseGuards(TenantGuard)
@UseInterceptors(TenantContextInterceptor, TenantScopingInterceptor)
@RequireTenant()
export class TenantExampleController {
  /**
   * Get all resources for the current tenant
   * Demonstrates:
   * - Tenant context injection in response
   * - Automatic tenant scoping of database queries
   * - Tenant decorators for extracting tenant information
   */
  @Get()
  async getResources(
    @Query() query: ResourceQueryDto,
    @TenantId() tenantId: string,
    @TenantName() tenantName: string,
    @TenantPlan() tenantPlan: string
  ) {
    // The tenant context is automatically injected into the response
    // Database queries are automatically scoped to the current tenant
    // Tenant information is available via decorators

    console.log(
      `Getting resources for tenant: ${tenantName} (${tenantId}) on plan: ${tenantPlan}`
    );

    // Simulate database query (in real implementation, this would use a tenant-scoped repository)
    const resources: Resource[] = [
      {
        id: '1',
        name: 'Resource 1',
        description: 'First resource for tenant',
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Resource 2',
        description: 'Second resource for tenant',
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    return {
      resources,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: resources.length,
      },
      tenant: {
        id: tenantId,
        name: tenantName,
        plan: tenantPlan,
      },
    };
  }

  /**
   * Get a specific resource by ID for the current tenant
   * Demonstrates:
   * - Tenant-scoped resource access
   * - Tenant context decorator usage
   */
  @Get(':id')
  async getResource(
    @Param('id') id: string,
    @TenantContext() tenantContext: any
  ) {
    // The resource is automatically scoped to the current tenant
    // Tenant context provides access to all tenant information

    console.log(`Getting resource ${id} for tenant: ${tenantContext.name}`);

    // Simulate database query (in real implementation, this would use a tenant-scoped repository)
    const resource: Resource = {
      id,
      name: `Resource ${id}`,
      description: `Description for resource ${id}`,
      tenantId: tenantContext.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return resource;
  }

  /**
   * Create a new resource for the current tenant
   * Demonstrates:
   * - Automatic tenant ID assignment
   * - Tenant validation
   */
  @Post()
  async createResource(
    @Body() createResourceDto: CreateResourceDto,
    @TenantId() tenantId: string
  ) {
    // The tenant ID is automatically assigned to the new resource
    // Tenant validation ensures the resource belongs to the correct tenant

    console.log(`Creating resource for tenant: ${tenantId}`);

    // Simulate database insert (in real implementation, this would use a tenant-scoped repository)
    const resource: Resource = {
      id: Date.now().toString(),
      name: createResourceDto.name,
      ...(createResourceDto.description && {
        description: createResourceDto.description,
      }),
      tenantId, // Automatically set by tenant scoping
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return resource;
  }

  /**
   * Update a resource for the current tenant
   * Demonstrates:
   * - Tenant-scoped updates
   * - Tenant decorator for extracting specific tenant field
   */
  @Put(':id')
  async updateResource(
    @Param('id') id: string,
    @Body() updateResourceDto: UpdateResourceDto,
    @TenantName() tenantName: string
  ) {
    // The update is automatically scoped to the current tenant
    // Only resources belonging to the current tenant can be updated

    console.log(`Updating resource ${id} for tenant: ${tenantName}`);

    // Simulate database update (in real implementation, this would use a tenant-scoped repository)
    const resource: Resource = {
      id,
      name: updateResourceDto.name || `Resource ${id}`,
      ...(updateResourceDto.description && {
        description: updateResourceDto.description,
      }),
      tenantId: 'tenant-123', // Would be set by tenant scoping
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return resource;
  }

  /**
   * Delete a resource for the current tenant
   * Demonstrates:
   * - Tenant-scoped deletions
   * - Tenant guard protection
   */
  @Delete(':id')
  async deleteResource(@Param('id') id: string, @TenantId() tenantId: string) {
    // The deletion is automatically scoped to the current tenant
    // Only resources belonging to the current tenant can be deleted

    console.log(`Deleting resource ${id} for tenant: ${tenantId}`);

    // Simulate database delete (in real implementation, this would use a tenant-scoped repository)
    return {
      success: true,
      message: `Resource ${id} deleted successfully`,
      tenantId,
    };
  }

  /**
   * Get tenant-specific statistics
   * Demonstrates:
   * - Tenant context usage without database operations
   * - Tenant decorator combinations
   */
  @Get('stats/tenant')
  async getTenantStats(
    @TenantContext() tenantContext: any,
    @TenantPlan() plan: string
  ) {
    // This endpoint shows how to use tenant context for business logic
    // without requiring database operations

    const stats = {
      tenantId: tenantContext.id,
      tenantName: tenantContext.name,
      plan,
      resourceCount: 42, // Would be calculated from database
      lastActivity: new Date(),
      features: tenantContext.features || [],
    };

    return stats;
  }

  /**
   * Example of a route that doesn't require tenant context
   * Demonstrates:
   * - How to bypass tenant requirements when needed
   */
  @Get('public/info')
  async getPublicInfo() {
    // This endpoint doesn't require tenant context
    // It can be accessed without tenant isolation

    return {
      message: 'This is public information',
      timestamp: new Date(),
    };
  }
}
