import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { TenantScopingInterceptor } from '../../../common/interceptors/tenant-scoping.interceptor';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { RoleService } from '../services/role.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignPermissionsDto,
  RoleResponseDto,
  RoleListResponseDto,
  AssignUserRoleDto,
  UserRoleListResponseDto,
} from '../dto/rbac.dto';
import { RoleLevel } from '../entities/role.entity';
import { RoleQueryDto } from '../dto/role-query.dto';
import { Request } from 'express';
import {
  Permission,
  PermissionAction,
  PermissionResource,
} from '../entities/permission.entity';
import { Role } from '../entities/role.entity';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(TenantScopingInterceptor)
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  private mapRoleToDto(role: any): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      ...(role.description && { description: role.description }),
      type: role.type,
      level: role.level,
      ...(role.tenantId && { tenantId: role.tenantId }),
      ...(role.parentRoleId && { parentRoleId: role.parentRoleId }),
      isSystem: role.isSystem,
      isActive: role.isActive,
      ...(role.metadata && { metadata: role.metadata }),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions:
        role.permissions?.map((permission: any) => ({
          id: permission.id,
          name: permission.name,
          ...(permission.description && {
            description: permission.description,
          }),
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope,
          isSystem: permission.isSystem,
          ...(permission.conditions && { conditions: permission.conditions }),
          isActive: permission.isActive,
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
          fullName: permission.getFullName(),
        })) || [],
      totalPermissions: role.getAllPermissions().length,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @RequirePermissions({
    resource: PermissionResource.ROLES,
    action: PermissionAction.CREATE,
  })
  async createRole(
    @Body() createRoleDto: CreateRoleDto,
    @Req() req: Request
  ): Promise<RoleResponseDto> {
    const userId = (req.user as any)?.id;

    const role = await this.roleService.createRole(createRoleDto);
    return this.mapRoleToDto(role);
  }

  @Get()
  @ApiOperation({ summary: 'Get all roles with pagination and filtering' })
  @ApiResponse({
    status: 200,
    description: 'List of roles',
    type: RoleListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: RoleLevel,
    description: 'Filter by role level',
  })
  async getAllRoles(
    @Req() req: Request,
    @Query() query: RoleQueryDto
  ): Promise<RoleListResponseDto> {
    return this.roleService.getAllRoles(
      query.page || 1,
      query.limit || 50,
      query.level
    );
  }

  @Get('system')
  @ApiOperation({ summary: 'Get all system roles' })
  @ApiResponse({
    status: 200,
    description: 'List of system roles',
    type: [RoleResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSystemRoles(): Promise<RoleResponseDto[]> {
    const roles = await this.roleService.getSystemRoles();
    return roles.map(role => this.mapRoleToDto(role));
  }

  @Get('custom')
  @ApiOperation({ summary: 'Get all custom roles' })
  @ApiResponse({
    status: 200,
    description: 'List of custom roles',
    type: [RoleResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCustomRoles(@Req() req: Request): Promise<RoleResponseDto[]> {
    const roles = await this.roleService.getCustomRoles();
    return roles.map(role => this.mapRoleToDto(role));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific role by ID' })
  @ApiResponse({
    status: 200,
    description: 'Role details',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRole(@Param('id') id: string): Promise<RoleResponseDto> {
    const role = await this.roleService.getRole(id);
    return this.mapRoleToDto(role);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto
  ): Promise<RoleResponseDto> {
    const role = await this.roleService.updateRole(id, updateRoleDto);
    return this.mapRoleToDto(role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteRole(@Param('id') id: string): Promise<void> {
    await this.roleService.deleteRole(id);
  }

  @Post(':id/permissions')
  @ApiOperation({ summary: 'Assign permissions to a role' })
  @ApiResponse({
    status: 200,
    description: 'Permissions assigned successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async assignPermissionsToRole(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsDto
  ): Promise<RoleResponseDto> {
    const role = await this.roleService.assignPermissionsToRole(
      id,
      assignPermissionsDto
    );
    return this.mapRoleToDto(role);
  }

  @Delete(':id/permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove permissions from a role' })
  @ApiResponse({ status: 204, description: 'Permissions removed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removePermissionsFromRole(
    @Param('id') id: string,
    @Body() permissionIds: string[]
  ): Promise<void> {
    await this.roleService.removePermissionsFromRole(id, permissionIds);
  }

  @Post('users/:userId/roles')
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async assignRoleToUser(
    @Param('userId') userId: string,
    @Body() assignUserRoleDto: AssignUserRoleDto
  ): Promise<void> {
    await this.roleService.assignRoleToUser(userId, assignUserRoleDto);
  }

  @Delete('users/:userId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a role from a user' })
  @ApiResponse({ status: 204, description: 'Role removed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeRoleFromUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string
  ): Promise<void> {
    await this.roleService.removeRoleFromUser(userId, roleId);
  }

  @Get('users/:userId/roles')
  @ApiOperation({ summary: 'Get all roles assigned to a user' })
  @ApiResponse({
    status: 200,
    description: 'User roles',
    type: UserRoleListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserRoles(
    @Param('userId') userId: string
  ): Promise<UserRoleListResponseDto> {
    return this.roleService.getUserRoles(userId);
  }

  @Post('default')
  @ApiOperation({ summary: 'Create default system roles' })
  @ApiResponse({
    status: 200,
    description: 'Default roles created successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Default roles created successfully',
        },
      },
    },
  })
  async createDefaultRoles(@Req() req: Request): Promise<{ message: string }> {
    await this.roleService.createDefaultRoles();
    return { message: 'Default roles created successfully' };
  }

  @Post('super-admin/update-permissions')
  @ApiOperation({
    summary: 'Update Super Admin role with all available permissions',
  })
  @ApiResponse({
    status: 200,
    description: 'Super Admin permissions updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Super Admin permissions updated successfully',
        },
        permissionsCount: {
          type: 'number',
          example: 150,
        },
      },
    },
  })
  async updateSuperAdminPermissions(
    @Req() req: Request
  ): Promise<{ message: string; permissionsCount: number }> {
    await this.roleService.updateSuperAdminPermissions();
    const permissions = await this.roleService.getSuperAdminPermissions();
    return {
      message: 'Super Admin permissions updated successfully',
      permissionsCount: permissions.length,
    };
  }

  @Get('super-admin/permissions')
  @ApiOperation({ summary: 'Get all permissions assigned to Super Admin role' })
  @ApiResponse({
    status: 200,
    description: 'Super Admin permissions retrieved successfully',
    type: [Object],
  })
  async getSuperAdminPermissions(@Req() req: Request): Promise<any[]> {
    const permissions = await this.roleService.getSuperAdminPermissions();
    return permissions.map((permission: Permission) => ({
      id: permission.id,
      name: permission.name,
      description: permission.description,
      resource: permission.resource,
      action: permission.action,
      scope: permission.scope,
      isSystem: permission.isSystem,
      isActive: permission.isActive,
    }));
  }

  @Get('users/:userId/permissions')
  @ApiOperation({ summary: 'Get all permissions for a user' })
  @ApiResponse({
    status: 200,
    description: 'User permissions retrieved successfully',
    type: [String],
  })
  async getUserPermissions(
    @Param('userId') userId: string,
    @Req() req: Request
  ): Promise<string[]> {
    return this.roleService.getUserPermissions(userId);
  }

  @Get('debug/user-permissions')
  @ApiOperation({ summary: 'Debug endpoint to check current user permissions' })
  @ApiResponse({
    status: 200,
    description: 'Current user permissions retrieved successfully',
  })
  async getCurrentUserPermissions(@Req() req: Request): Promise<any> {
    const user = req.user as any;
    const permissions = await this.roleService.getUserPermissions(user.id);
    const userRoles = await this.roleService.getUserRoles(user.id);

    return {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      userRoles: userRoles.userRoles,
      permissions: permissions,
      permissionsCount: permissions.length,
      hasPermissionsRead: permissions.includes('permissions:read'),
      hasPermissionsManage: permissions.includes('permissions:manage'),
    };
  }

  @Post('users/:userId/permissions/check')
  @ApiOperation({ summary: 'Check if a user has a specific permission' })
  @ApiResponse({ status: 200, description: 'Permission check result' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkUserPermission(
    @Param('userId') userId: string,
    @Body() body: { resource: string; action: string; scope?: string }
  ): Promise<{ hasPermission: boolean }> {
    const { resource, action, scope } = body;
    const hasPermission = await this.roleService.checkUserPermission(
      userId,
      resource,
      action,
      scope
    );
    return { hasPermission };
  }

  @Get('debug/user-roles')
  @ApiOperation({ summary: 'Debug endpoint to check user roles loading' })
  @ApiResponse({
    status: 200,
    description: 'User roles debug info retrieved successfully',
  })
  async getUserRolesDebug(@Req() req: Request): Promise<any> {
    const user = req.user as any;

    // Get current tenant context
    const currentTenantId = (req as any).tenantId;

    // Try to find the Super Admin user directly
    const superAdminUser = await this.roleService['userRepository'].findOne({
      where: { email: 'superadmin@example.com' },
      relations: ['roles'],
    });

    return {
      currentUser: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      },
      currentTenantId: currentTenantId,
      superAdminUser: superAdminUser
        ? {
            id: superAdminUser.id,
            email: superAdminUser.email,
            tenantId: superAdminUser.tenantId,
            rolesCount: superAdminUser.roles?.length || 0,
            roles:
              superAdminUser.roles?.map((r: Role) => ({
                id: r.id,
                name: r.name,
              })) || [],
          }
        : null,
      debug: await this.roleService.getUserRolesDebug(user.id),
    };
  }

  @Get('test-permissions')
  @ApiOperation({ summary: 'Test endpoint to verify permissions are working' })
  @ApiResponse({
    status: 200,
    description: 'Permissions test successful',
  })
  async testPermissions(@Req() req: Request): Promise<any> {
    const user = req.user as any;
    const permissions = await this.roleService.getUserPermissions(user.id);

    return {
      message: 'Permissions test successful',
      userId: user.id,
      userEmail: user.email,
      hasPermissionsRead: permissions.includes('permissions:read'),
      hasRolesRead: permissions.includes('roles:read'),
      totalPermissions: permissions.length,
      samplePermissions: permissions.slice(0, 10),
    };
  }
}
