import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserLifecycleService } from '../services/user-lifecycle.service';
import {
  RegisterUserDto,
  ActivateUserDto,
  SuspendUserDto,
  ReactivateUserDto,
  DeleteUserDto,
  UserLifecycleResponseDto,
  UserLifecycleInfoResponseDto,
  BulkUserOperationDto,
  BulkUserOperationResponseDto,
} from '../dto/user-lifecycle.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { Roles } from '../../auth/decorators/auth.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { UserRole } from '@app/shared';
import { TenantContextInterceptor } from '../../../common/interceptors/tenant-context.interceptor';
import {
  PermissionResource,
  PermissionAction,
} from '../../rbac/entities/permission.entity';

@ApiTags('User Lifecycle Management')
@Controller('users/lifecycle')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor, TenantContextInterceptor)
@ApiBearerAuth()
export class UserLifecycleController {
  constructor(private readonly userLifecycleService: UserLifecycleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions({
    resource: PermissionResource.USERS,
    action: PermissionAction.CREATE,
  })
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Register a new user with proper lifecycle management',
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: UserLifecycleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data or user already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async registerUser(
    @Body() registerUserDto: RegisterUserDto
  ): Promise<UserLifecycleResponseDto> {
    const user = await this.userLifecycleService.registerUser(registerUserDto, {
      sendEmailVerification: registerUserDto.sendEmailVerification ?? true,
      sendWelcomeEmail: registerUserDto.sendWelcomeEmail ?? false,
      auditEvent: 'user.registered_by_admin',
    });

    return this.mapUserToResponseDto(user);
  }

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions({
    resource: PermissionResource.USERS,
    action: PermissionAction.UPDATE,
  })
  @ApiOperation({
    summary: 'Bulk activate users',
    description: 'Activate multiple users at once',
  })
  @ApiBody({ type: BulkUserOperationDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk activation completed',
    type: BulkUserOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid user IDs',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async bulkActivateUsers(
    @Body() bulkOperationDto: BulkUserOperationDto
  ): Promise<BulkUserOperationResponseDto> {
    return this.performBulkOperation(
      bulkOperationDto,
      'activate',
      'user.bulk_activated_by_admin'
    );
  }

  @Post('suspend')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions({
    resource: PermissionResource.USERS,
    action: PermissionAction.UPDATE,
  })
  @ApiOperation({
    summary: 'Bulk suspend users',
    description: 'Suspend multiple users at once',
  })
  @ApiBody({ type: BulkUserOperationDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk suspension completed',
    type: BulkUserOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid user IDs',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async bulkSuspendUsers(
    @Body() bulkOperationDto: BulkUserOperationDto
  ): Promise<BulkUserOperationResponseDto> {
    return this.performBulkOperation(
      bulkOperationDto,
      'suspend',
      'user.bulk_suspended_by_admin'
    );
  }

  @Post('reactivate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions({
    resource: PermissionResource.USERS,
    action: PermissionAction.UPDATE,
  })
  @ApiOperation({
    summary: 'Bulk reactivate users',
    description: 'Reactivate multiple suspended users at once',
  })
  @ApiBody({ type: BulkUserOperationDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk reactivation completed',
    type: BulkUserOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid user IDs',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async bulkReactivateUsers(
    @Body() bulkOperationDto: BulkUserOperationDto
  ): Promise<BulkUserOperationResponseDto> {
    return this.performBulkOperation(
      bulkOperationDto,
      'reactivate',
      'user.bulk_reactivated_by_admin'
    );
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions({
    resource: PermissionResource.USERS,
    action: PermissionAction.DELETE,
  })
  @ApiOperation({
    summary: 'Bulk delete users',
    description: 'Delete multiple users at once (cannot delete tenant owners)',
  })
  @ApiBody({ type: BulkUserOperationDto })
  @ApiResponse({
    status: 200,
    description: 'Bulk deletion completed',
    type: BulkUserOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid user IDs',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async bulkDeleteUsers(
    @Body() bulkOperationDto: BulkUserOperationDto
  ): Promise<BulkUserOperationResponseDto> {
    return this.performBulkOperation(
      bulkOperationDto,
      'delete',
      'user.bulk_deleted_by_admin'
    );
  }

  @Put(':id/activate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions({
    resource: PermissionResource.USERS,
    action: PermissionAction.UPDATE,
  })
  @ApiOperation({
    summary: 'Activate a user account',
    description: 'Activate a pending or suspended user account',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: ActivateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User activated successfully',
    type: UserLifecycleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - User is already active or deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async activateUser(
    @Param('id') userId: string,
    @Body() activateUserDto: ActivateUserDto
  ): Promise<UserLifecycleResponseDto> {
    const user = await this.userLifecycleService.activateUser(userId, {
      skipEmailVerification: activateUserDto.skipEmailVerification ?? false,
      auditEvent: activateUserDto.auditEvent || 'user.activated_by_admin',
    });

    return this.mapUserToResponseDto(user);
  }

  @Put(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions({
    resource: PermissionResource.USERS,
    action: PermissionAction.UPDATE,
  })
  @ApiOperation({
    summary: 'Suspend a user account',
    description: 'Suspend an active user account with optional duration',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: SuspendUserDto })
  @ApiResponse({
    status: 200,
    description: 'User suspended successfully',
    type: UserLifecycleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - User is already suspended or is owner',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async suspendUser(
    @Param('id') userId: string,
    @Body() suspendUserDto: SuspendUserDto
  ): Promise<UserLifecycleResponseDto> {
    const user = await this.userLifecycleService.suspendUser(userId, {
      reason: suspendUserDto.reason,
      duration: suspendUserDto.duration,
      auditEvent: suspendUserDto.auditEvent || 'user.suspended_by_admin',
    });

    return this.mapUserToResponseDto(user);
  }

  @Put(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions({
    resource: PermissionResource.USERS,
    action: PermissionAction.UPDATE,
  })
  @ApiOperation({
    summary: 'Reactivate a suspended user account',
    description: 'Reactivate a suspended user account',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: ReactivateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User reactivated successfully',
    type: UserLifecycleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - User is not suspended',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async reactivateUser(
    @Param('id') userId: string,
    @Body() reactivateUserDto: ReactivateUserDto
  ): Promise<UserLifecycleResponseDto> {
    const user = await this.userLifecycleService.reactivateUser(userId, {
      auditEvent: reactivateUserDto.auditEvent || 'user.reactivated_by_admin',
    });

    return this.mapUserToResponseDto(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions({
    resource: PermissionResource.USERS,
    action: PermissionAction.DELETE,
  })
  @ApiOperation({
    summary: 'Delete a user account',
    description: 'Soft delete a user account (cannot delete tenant owner)',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: DeleteUserDto })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Cannot delete tenant owner',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async deleteUser(
    @Param('id') userId: string,
    @Body() deleteUserDto: DeleteUserDto
  ): Promise<void> {
    await this.userLifecycleService.deleteUser(
      userId,
      deleteUserDto.auditEvent || 'user.deleted_by_admin'
    );
  }

  @Get(':id/lifecycle')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @RequirePermissions({
    resource: PermissionResource.USERS,
    action: PermissionAction.READ,
  })
  @ApiOperation({
    summary: 'Get user lifecycle information',
    description:
      'Get detailed user lifecycle information including suspension details',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User lifecycle information retrieved successfully',
    type: UserLifecycleInfoResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getUserLifecycleInfo(
    @Param('id') userId: string
  ): Promise<UserLifecycleInfoResponseDto> {
    const lifecycleInfo =
      await this.userLifecycleService.getUserLifecycleInfo(userId);

    return {
      ...this.mapUserToResponseDto(lifecycleInfo.user),
      isActive: lifecycleInfo.isActive,
      isSuspended: lifecycleInfo.isSuspended,
      isDeleted: lifecycleInfo.isDeleted,
      suspensionInfo: lifecycleInfo.suspensionInfo,
    } as UserLifecycleInfoResponseDto;
  }

  /**
   * Perform bulk operations on users
   */
  private async performBulkOperation(
    bulkOperationDto: BulkUserOperationDto,
    operation: 'activate' | 'suspend' | 'reactivate' | 'delete',
    defaultAuditEvent: string
  ): Promise<BulkUserOperationResponseDto> {
    const { userIds, auditEvent } = bulkOperationDto;
    const successfulUserIds: string[] = [];
    const errors: Array<{ userId: string; error: string }> = [];

    for (const userId of userIds) {
      try {
        switch (operation) {
          case 'activate':
            await this.userLifecycleService.activateUser(userId, {
              auditEvent: auditEvent || defaultAuditEvent,
            });
            break;
          case 'suspend':
            await this.userLifecycleService.suspendUser(userId, {
              auditEvent: auditEvent || defaultAuditEvent,
            });
            break;
          case 'reactivate':
            await this.userLifecycleService.reactivateUser(userId, {
              auditEvent: auditEvent || defaultAuditEvent,
            });
            break;
          case 'delete':
            await this.userLifecycleService.deleteUser(
              userId,
              auditEvent || defaultAuditEvent
            );
            break;
        }
        successfulUserIds.push(userId);
      } catch (error: any) {
        errors.push({
          userId,
          error: error.message || 'Unknown error',
        });
      }
    }

    return {
      successCount: successfulUserIds.length,
      failureCount: errors.length,
      successfulUserIds,
      errors,
    };
  }

  /**
   * Map user entity to response DTO
   */
  private mapUserToResponseDto(user: any): UserLifecycleResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      emailVerified: user.emailVerified,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
    };
  }
}
