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
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantScopingInterceptor } from '../../../common/interceptors/tenant-scoping.interceptor';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import {
  PermissionAction,
  PermissionResource,
} from '../../rbac/entities/permission.entity';
import { TenantId } from '../../../common/decorators/tenant.decorator';

import { DelegationService } from '../services/delegation.service';
import {
  CreateDelegationDto,
  UpdateDelegationDto,
  ApproveDelegationDto,
  RejectDelegationDto,
  RevokeDelegationDto,
  ActivateDelegationDto,
  DelegationQueryDto,
  DelegationResponseDto,
  DelegationStatsDto,
  DelegationAuditLogResponseDto,
} from '../dto/delegation.dto';
import { CurrentUser, RequirePermissions } from '@/common/decorators';

@ApiTags('Delegations')
@Controller('delegations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(TenantScopingInterceptor)
@ApiBearerAuth()
export class DelegationController {
  constructor(private readonly delegationService: DelegationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.CREATE,
  })
  @ApiOperation({ summary: 'Create a new delegation request' })
  @ApiResponse({
    status: 201,
    description: 'Delegation created successfully',
    type: DelegationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createDelegation(
    @Body() createDelegationDto: CreateDelegationDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Request() req: any
  ): Promise<DelegationResponseDto> {
    return this.delegationService.createDelegation(
      createDelegationDto,
      user.id,
      tenantId,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );
  }

  @Get()
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get delegations with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Delegations retrieved successfully',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected', 'expired', 'revoked', 'active'],
  })
  @ApiQuery({
    name: 'delegationType',
    required: false,
    enum: ['permission_based', 'role_based', 'full_access'],
  })
  @ApiQuery({ name: 'delegatorId', required: false })
  @ApiQuery({ name: 'delegateId', required: false })
  @ApiQuery({ name: 'approverId', required: false })
  @ApiQuery({ name: 'isEmergency', required: false, type: Boolean })
  @ApiQuery({ name: 'isExpired', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getDelegations(
    @Query() query: DelegationQueryDto,
    @TenantId() tenantId: string
  ) {
    return this.delegationService.getDelegations(query, tenantId);
  }

  @Get('stats')
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get delegation statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: DelegationStatsDto,
  })
  async getDelegationStats(
    @TenantId() tenantId: string
  ): Promise<DelegationStatsDto> {
    return this.delegationService.getDelegationStats(tenantId);
  }

  @Get('my-active')
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get active delegations for current user' })
  @ApiResponse({
    status: 200,
    description: 'Active delegations retrieved successfully',
    type: [DelegationResponseDto],
  })
  async getMyActiveDelegations(
    @TenantId() tenantId: string,
    @CurrentUser() user: any
  ): Promise<DelegationResponseDto[]> {
    return this.delegationService.getActiveDelegationsForUser(
      user.id,
      tenantId
    );
  }

  @Get('pending-approvals')
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.APPROVE,
  })
  @ApiOperation({ summary: 'Get pending approvals for current user' })
  @ApiResponse({
    status: 200,
    description: 'Pending approvals retrieved successfully',
    type: [DelegationResponseDto],
  })
  async getPendingApprovals(
    @TenantId() tenantId: string,
    @CurrentUser() user: any
  ): Promise<DelegationResponseDto[]> {
    return this.delegationService.getPendingApprovalsForUser(user.id, tenantId);
  }

  @Get(':id')
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get delegation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Delegation retrieved successfully',
    type: DelegationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Delegation not found' })
  @ApiParam({ name: 'id', description: 'Delegation ID' })
  async getDelegationById(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<DelegationResponseDto> {
    return this.delegationService.getDelegationById(id, tenantId);
  }

  @Put(':id/approve')
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.APPROVE,
  })
  @ApiOperation({ summary: 'Approve a delegation request' })
  @ApiResponse({
    status: 200,
    description: 'Delegation approved successfully',
    type: DelegationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Delegation not found' })
  @ApiParam({ name: 'id', description: 'Delegation ID' })
  async approveDelegation(
    @Param('id') id: string,
    @Body() approveDto: ApproveDelegationDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Request() req: any
  ): Promise<DelegationResponseDto> {
    return this.delegationService.approveDelegation(
      id,
      user.id,
      tenantId,
      approveDto,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );
  }

  @Put(':id/reject')
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.REJECT,
  })
  @ApiOperation({ summary: 'Reject a delegation request' })
  @ApiResponse({
    status: 200,
    description: 'Delegation rejected successfully',
    type: DelegationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Delegation not found' })
  @ApiParam({ name: 'id', description: 'Delegation ID' })
  async rejectDelegation(
    @Param('id') id: string,
    @Body() rejectDto: RejectDelegationDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Request() req: any
  ): Promise<DelegationResponseDto> {
    return this.delegationService.rejectDelegation(
      id,
      user.id,
      tenantId,
      rejectDto,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );
  }

  @Put(':id/activate')
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.UPDATE,
  })
  @ApiOperation({ summary: 'Activate a delegation' })
  @ApiResponse({
    status: 200,
    description: 'Delegation activated successfully',
    type: DelegationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Delegation not found' })
  @ApiParam({ name: 'id', description: 'Delegation ID' })
  async activateDelegation(
    @Param('id') id: string,
    @Body() activateDto: ActivateDelegationDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Request() req: any
  ): Promise<DelegationResponseDto> {
    return this.delegationService.activateDelegation(
      id,
      user.id,
      tenantId,
      activateDto,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );
  }

  @Put(':id/revoke')
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.REVOKE,
  })
  @ApiOperation({ summary: 'Revoke a delegation' })
  @ApiResponse({
    status: 200,
    description: 'Delegation revoked successfully',
    type: DelegationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Delegation not found' })
  @ApiParam({ name: 'id', description: 'Delegation ID' })
  async revokeDelegation(
    @Param('id') id: string,
    @Body() revokeDto: RevokeDelegationDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Request() req: any
  ): Promise<DelegationResponseDto> {
    return this.delegationService.revokeDelegation(
      id,
      user.id,
      tenantId,
      revokeDto,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );
  }

  @Get(':id/audit-logs')
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get delegation audit logs' })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    type: [DelegationAuditLogResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Delegation not found' })
  @ApiParam({ name: 'id', description: 'Delegation ID' })
  async getDelegationAuditLogs(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<DelegationAuditLogResponseDto[]> {
    return this.delegationService.getDelegationAuditLogs(id, tenantId);
  }

  @Get('delegator/:delegatorId')
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get delegations by delegator' })
  @ApiResponse({
    status: 200,
    description: 'Delegations retrieved successfully',
    type: [DelegationResponseDto],
  })
  @ApiParam({ name: 'delegatorId', description: 'Delegator user ID' })
  async getDelegationsByDelegator(
    @Param('delegatorId') delegatorId: string,
    @TenantId() tenantId: string
  ): Promise<DelegationResponseDto[]> {
    const delegations = await this.delegationService[
      'delegationRepository'
    ].findDelegationsByDelegator(delegatorId, tenantId);
    return delegations.map(delegation =>
      this.delegationService['mapToResponseDto'](delegation)
    );
  }

  @Get('delegate/:delegateId')
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.READ,
  })
  @ApiOperation({ summary: 'Get delegations by delegate' })
  @ApiResponse({
    status: 200,
    description: 'Delegations retrieved successfully',
    type: [DelegationResponseDto],
  })
  @ApiParam({ name: 'delegateId', description: 'Delegate user ID' })
  async getDelegationsByDelegate(
    @Param('delegateId') delegateId: string,
    @TenantId() tenantId: string
  ): Promise<DelegationResponseDto[]> {
    const delegations = await this.delegationService[
      'delegationRepository'
    ].findDelegationsByDelegate(delegateId, tenantId);
    return delegations.map(delegation =>
      this.delegationService['mapToResponseDto'](delegation)
    );
  }

  @Post('check-permissions')
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.READ,
  })
  @ApiOperation({
    summary: 'Check if user has active delegation for specific permissions',
  })
  @ApiResponse({ status: 200, description: 'Permission check completed' })
  async checkDelegationPermissions(
    @Body() body: { userId: string; permissionIds: string[] },
    @TenantId() tenantId: string
  ): Promise<{ hasDelegation: boolean }> {
    const hasDelegation = await this.delegationService.hasActiveDelegation(
      body.userId,
      tenantId,
      body.permissionIds
    );
    return { hasDelegation };
  }
}
