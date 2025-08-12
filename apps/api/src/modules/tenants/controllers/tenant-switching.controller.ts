import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { AuthGuard } from '../../auth/guards/auth.guard';
import {
  TenantAccessGuard,
  RequireTenantAccess,
} from '../guards/tenant-access.guard';
import { TenantSwitchingService } from '../services/tenant-switching.service';
import {
  TenantSwitchDto,
  TenantSwitchResponseDto,
  UserTenantMembershipsResponseDto,
  TenantAccessVerificationDto,
  TenantAccessResponseDto,
  BulkTenantAccessDto,
  BulkTenantAccessResponseDto,
} from '../dto';

@ApiTags('Tenant Switching')
@Controller('tenants')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class TenantSwitchingController {
  private readonly logger = new Logger(TenantSwitchingController.name);

  constructor(
    private readonly tenantSwitchingService: TenantSwitchingService
  ) {}

  @Get('user/memberships')
  @ApiOperation({
    summary: 'Get user tenant memberships',
    description: 'Retrieve all tenant memberships for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User tenant memberships retrieved successfully',
    type: UserTenantMembershipsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserTenantMemberships(
    @Request() req: any
  ): Promise<UserTenantMembershipsResponseDto> {
    const userId = req.user.id;
    this.logger.debug(`Getting tenant memberships for user: ${userId}`);

    return await this.tenantSwitchingService.getUserTenantMemberships(userId);
  }

  @Post('switch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Switch tenant context',
    description:
      "Switch the user's current tenant context to another tenant they have access to",
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant switched successfully',
    type: TenantSwitchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid tenant ID or request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - User does not have access to the specified tenant',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found or user not found',
  })
  async switchTenant(
    @Request() req: any,
    @Body() switchDto: TenantSwitchDto
  ): Promise<TenantSwitchResponseDto> {
    const userId = req.user.id;
    this.logger.debug(
      `User ${userId} switching to tenant: ${switchDto.tenantId}`
    );

    return await this.tenantSwitchingService.switchTenant(userId, switchDto);
  }

  @Get('current')
  @ApiOperation({
    summary: 'Get current tenant context',
    description: 'Get the current tenant context for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Current tenant context retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 404,
    description: 'No current tenant context found',
  })
  async getCurrentTenantContext(@Request() req: any) {
    const userId = req.user.id;
    this.logger.debug(`Getting current tenant context for user: ${userId}`);

    const { tenant, membership } =
      await this.tenantSwitchingService.getCurrentTenantContext(userId);

    return {
      success: true,
      tenantContext: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        plan: tenant.plan,
        features: tenant.features || [],
        settings: tenant.settings || {},
      },
      membership: {
        id: membership.id,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt,
        lastAccessedAt: membership.lastAccessedAt,
        permissions: membership.permissions?.map(p => p.getFullName()) || [],
      },
    };
  }

  @Post(':tenantId/verify-access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify tenant access',
    description:
      'Verify if the user has access to a specific tenant and optionally check specific permissions',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The ID of the tenant to verify access for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant access verification completed',
    type: TenantAccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid tenant ID or request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  async verifyTenantAccess(
    @Request() req: any,
    @Param('tenantId') tenantId: string,
    @Body() verificationDto?: Partial<TenantAccessVerificationDto>
  ): Promise<TenantAccessResponseDto> {
    const userId = req.user.id;
    this.logger.debug(
      `Verifying tenant access for user ${userId} to tenant: ${tenantId}`
    );

    const dto: TenantAccessVerificationDto = {
      tenantId,
      ...(verificationDto?.permissions && {
        permissions: verificationDto.permissions,
      }),
      ...(verificationDto?.resource && { resource: verificationDto.resource }),
    };

    return await this.tenantSwitchingService.verifyTenantAccess(userId, dto);
  }

  @Post('verify-access/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk verify tenant access',
    description: 'Verify user access to multiple tenants at once',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk tenant access verification completed',
    type: BulkTenantAccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  async bulkVerifyTenantAccess(
    @Request() req: any,
    @Body() bulkDto: BulkTenantAccessDto
  ): Promise<BulkTenantAccessResponseDto> {
    const userId = req.user.id;
    this.logger.debug(
      `Bulk verifying tenant access for user ${userId} to ${bulkDto.tenantIds.length} tenants`
    );

    return await this.tenantSwitchingService.bulkVerifyTenantAccess(
      userId,
      bulkDto
    );
  }

  @Get('memberships/:membershipId')
  @UseGuards(TenantAccessGuard)
  @RequireTenantAccess(['memberships:read'])
  @ApiOperation({
    summary: 'Get membership details',
    description: 'Get detailed information about a specific tenant membership',
  })
  @ApiParam({
    name: 'membershipId',
    description: 'The ID of the membership to retrieve',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Membership details retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Membership not found',
  })
  async getMembershipDetails(
    @Request() req: any,
    @Param('membershipId') membershipId: string
  ) {
    // This would be implemented to get detailed membership information
    // For now, returning a placeholder response
    return {
      success: true,
      message: 'Membership details endpoint - to be implemented',
      membershipId,
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Check the health of the tenant switching service',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
  })
  async healthCheck() {
    return {
      status: 'ok',
      service: 'tenant-switching',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  @Post('cache/clear')
  @ApiOperation({
    summary: 'Clear user cache',
    description: 'Clear tenant switching cache for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache cleared successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  async clearUserCache(@Request() req: any) {
    const userId = req.user.id;
    this.logger.debug(`Clearing tenant switching cache for user: ${userId}`);

    await this.tenantSwitchingService.clearUserCache(userId);

    return {
      success: true,
      message: 'User tenant switching cache cleared successfully',
      timestamp: new Date().toISOString(),
    };
  }

  // Admin endpoints (would require admin permissions)
  @Post('admin/memberships')
  @UseGuards(TenantAccessGuard)
  @RequireTenantAccess(['admin:memberships:write'])
  @ApiOperation({
    summary: 'Add user to tenant (Admin)',
    description:
      'Add a user to a tenant with specified role (requires admin permissions)',
  })
  @ApiResponse({
    status: 201,
    description: 'User added to tenant successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - User already member or invalid data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient admin permissions',
  })
  async addUserToTenant(
    @Request() req: any,
    @Body()
    body: {
      userId: string;
      tenantId: string;
      role: string;
    }
  ) {
    const inviterId = req.user.id;
    this.logger.debug(
      `Admin ${inviterId} adding user ${body.userId} to tenant ${body.tenantId}`
    );

    const membership = await this.tenantSwitchingService.addUserToTenant(
      body.userId,
      body.tenantId,
      body.role as any,
      inviterId
    );

    return {
      success: true,
      message: 'User added to tenant successfully',
      membership: {
        id: membership.id,
        userId: membership.userId,
        tenantId: membership.tenantId,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt,
      },
    };
  }

  @Post('admin/memberships/:userId/:tenantId/remove')
  @UseGuards(TenantAccessGuard)
  @RequireTenantAccess(['admin:memberships:write'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove user from tenant (Admin)',
    description: 'Remove a user from a tenant (requires admin permissions)',
  })
  @ApiParam({
    name: 'userId',
    description: 'The ID of the user to remove',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The ID of the tenant to remove user from',
    example: '987fcdeb-51a2-43d1-b789-123456789abc',
  })
  @ApiResponse({
    status: 200,
    description: 'User removed from tenant successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient admin permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User membership not found',
  })
  async removeUserFromTenant(
    @Request() req: any,
    @Param('userId') userId: string,
    @Param('tenantId') tenantId: string
  ) {
    const adminId = req.user.id;
    this.logger.debug(
      `Admin ${adminId} removing user ${userId} from tenant ${tenantId}`
    );

    await this.tenantSwitchingService.removeUserFromTenant(userId, tenantId);

    return {
      success: true,
      message: 'User removed from tenant successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
