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
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { InvitationService } from '../services/invitation.service';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import {
  RequirePermissions,
  RequireCreate,
  RequireRead,
  RequireUpdate,
  RequireDelete,
  RequireManage,
} from '../../../common/decorators/permissions.decorator';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../../common/decorators/auth.decorator';
import { PermissionResource } from '../../rbac/entities/permission.entity';
import {
  CreateInvitationDto,
  UpdateInvitationDto,
  InvitationQueryDto,
  AcceptInvitationDto,
  InvitationResponseDto,
  InvitationStatsDto,
} from '../dto/invitation.dto';
import { User } from '../../users/entities/user.entity';
import { PaginationResponseDto } from '../../../common/dto/pagination.dto';

@ApiTags('Invitations')
@Controller('invitations')
@UseGuards(AuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @RequireCreate(PermissionResource.USERS)
  @ApiOperation({ summary: 'Create and send invitation' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created and sent successfully',
    type: InvitationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Invitation already exists' })
  async createInvitation(
    @Body() createDto: CreateInvitationDto,
    @CurrentUser() currentUser: User,
    @TenantId() tenantId: string,
    @Req() request: Request
  ): Promise<InvitationResponseDto> {
    const requestInfo: { ipAddress?: string; userAgent?: string } = {};
    if (request.ip) requestInfo.ipAddress = request.ip;
    const userAgent = request.get('User-Agent');
    if (userAgent) requestInfo.userAgent = userAgent;

    return this.invitationService.createInvitation(
      createDto,
      currentUser,
      tenantId,
      requestInfo
    );
  }

  @Get()
  @RequireRead(PermissionResource.USERS)
  @ApiOperation({ summary: 'Get paginated list of invitations' })
  @ApiResponse({
    status: 200,
    description: 'Invitations retrieved successfully',
    type: PaginationResponseDto,
  })
  async getInvitations(
    @Query() query: InvitationQueryDto,
    @TenantId() tenantId: string
  ): Promise<PaginationResponseDto<InvitationResponseDto>> {
    const result = await this.invitationService.getInvitations(query, tenantId);

    return new PaginationResponseDto(
      result.invitations,
      result.total,
      result.page,
      result.limit
    );
  }

  @Get('stats')
  @RequireRead(PermissionResource.USERS)
  @ApiOperation({ summary: 'Get invitation statistics' })
  @ApiResponse({
    status: 200,
    description: 'Invitation statistics retrieved successfully',
    type: InvitationStatsDto,
  })
  async getInvitationStats(
    @TenantId() tenantId: string
  ): Promise<InvitationStatsDto> {
    return this.invitationService.getInvitationStats(tenantId);
  }

  @Get(':id')
  @RequireRead(PermissionResource.USERS)
  @ApiOperation({ summary: 'Get invitation by ID' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation retrieved successfully',
    type: InvitationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async getInvitationById(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<InvitationResponseDto> {
    return this.invitationService.getInvitationById(id, tenantId);
  }

  @Put(':id')
  @RequireUpdate(PermissionResource.USERS)
  @ApiOperation({ summary: 'Update invitation' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation updated successfully',
    type: InvitationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateInvitation(
    @Param('id') id: string,
    @Body() updateDto: UpdateInvitationDto,
    @TenantId() tenantId: string
  ): Promise<InvitationResponseDto> {
    return this.invitationService.updateInvitation(id, updateDto, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireDelete(PermissionResource.USERS)
  @ApiOperation({ summary: 'Revoke invitation' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({ status: 204, description: 'Invitation revoked successfully' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async revokeInvitation(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() currentUser: User
  ): Promise<void> {
    await this.invitationService.revokeInvitation(id, tenantId, currentUser);
  }

  @Post(':id/resend')
  @RequireUpdate(PermissionResource.USERS)
  @ApiOperation({ summary: 'Resend invitation email' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation resent successfully',
    type: InvitationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async resendInvitation(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() currentUser: User
  ): Promise<InvitationResponseDto> {
    return this.invitationService.resendInvitation(id, tenantId, currentUser);
  }

  @Post('accept/:token')
  @ApiOperation({ summary: 'Accept invitation' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
        },
        invitation: { $ref: '#/components/schemas/InvitationResponseDto' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Invalid invitation token' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists in tenant' })
  async acceptInvitation(
    @Param('token') token: string,
    @Body() acceptDto: AcceptInvitationDto,
    @Req() request: Request
  ): Promise<{ user: User; invitation: InvitationResponseDto }> {
    const requestInfo: { ipAddress?: string; userAgent?: string } = {};
    if (request.ip) requestInfo.ipAddress = request.ip;
    const userAgent = request.get('User-Agent');
    if (userAgent) requestInfo.userAgent = userAgent;

    return this.invitationService.acceptInvitation(
      token,
      acceptDto,
      requestInfo
    );
  }

  @Post('cleanup/expired')
  @RequireManage(PermissionResource.USERS)
  @ApiOperation({ summary: 'Clean up expired invitations (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed successfully',
    schema: {
      type: 'object',
      properties: {
        expired: {
          type: 'number',
          description: 'Number of invitations marked as expired',
        },
        deleted: {
          type: 'number',
          description: 'Number of old invitations deleted',
        },
      },
    },
  })
  async cleanupExpiredInvitations(): Promise<{
    expired: number;
    deleted: number;
  }> {
    return this.invitationService.cleanupExpiredInvitations();
  }
}
