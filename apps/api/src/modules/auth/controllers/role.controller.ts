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
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
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
import { Request } from 'express';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard)
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
  async createRole(
    @Body() createRoleDto: CreateRoleDto,
    @Req() req: Request
  ): Promise<RoleResponseDto> {
    const userId = (req.user as any)?.id;
    const tenantId = (req.user as any)?.tenantId;

    const role = await this.roleService.createRole(createRoleDto, tenantId);
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
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('level') level?: RoleLevel
  ): Promise<RoleListResponseDto> {
    const tenantId = (req.user as any)?.tenantId;
    return this.roleService.getAllRoles(tenantId, page, limit, level);
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
    return roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      type: role.type,
      level: role.level,
      tenantId: role.tenantId || undefined,
      parentRoleId: role.parentRoleId || undefined,
      isSystem: role.isSystem,
      isActive: role.isActive,
      metadata: role.metadata || undefined,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions:
        role.permissions?.map(permission => ({
          id: permission.id,
          name: permission.name,
          description: permission.description || undefined,
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope,
          isSystem: permission.isSystem,
          conditions: permission.conditions || undefined,
          isActive: permission.isActive,
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
          fullName: permission.getFullName(),
        })) || [],
      totalPermissions: role.getAllPermissions().length,
    }));
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
    const tenantId = (req.user as any)?.tenantId;
    const roles = await this.roleService.getCustomRoles(tenantId);
    return roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      type: role.type,
      level: role.level,
      tenantId: role.tenantId || undefined,
      parentRoleId: role.parentRoleId || undefined,
      isSystem: role.isSystem,
      isActive: role.isActive,
      metadata: role.metadata || undefined,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions:
        role.permissions?.map(permission => ({
          id: permission.id,
          name: permission.name,
          description: permission.description || undefined,
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope,
          isSystem: permission.isSystem,
          conditions: permission.conditions || undefined,
          isActive: permission.isActive,
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
          fullName: permission.getFullName(),
        })) || [],
      totalPermissions: role.getAllPermissions().length,
    }));
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
    return {
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      type: role.type,
      level: role.level,
      tenantId: role.tenantId || undefined,
      parentRoleId: role.parentRoleId || undefined,
      isSystem: role.isSystem,
      isActive: role.isActive,
      metadata: role.metadata || undefined,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions:
        role.permissions?.map(permission => ({
          id: permission.id,
          name: permission.name,
          description: permission.description || undefined,
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope,
          isSystem: permission.isSystem,
          conditions: permission.conditions || undefined,
          isActive: permission.isActive,
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
          fullName: permission.getFullName(),
        })) || [],
      totalPermissions: role.getAllPermissions().length,
    };
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
    return {
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      type: role.type,
      level: role.level,
      tenantId: role.tenantId || undefined,
      parentRoleId: role.parentRoleId || undefined,
      isSystem: role.isSystem,
      isActive: role.isActive,
      metadata: role.metadata || undefined,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions:
        role.permissions?.map(permission => ({
          id: permission.id,
          name: permission.name,
          description: permission.description || undefined,
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope,
          isSystem: permission.isSystem,
          conditions: permission.conditions || undefined,
          isActive: permission.isActive,
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
          fullName: permission.getFullName(),
        })) || [],
      totalPermissions: role.getAllPermissions().length,
    };
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
    return {
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      type: role.type,
      level: role.level,
      tenantId: role.tenantId || undefined,
      parentRoleId: role.parentRoleId || undefined,
      isSystem: role.isSystem,
      isActive: role.isActive,
      metadata: role.metadata || undefined,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions:
        role.permissions?.map(permission => ({
          id: permission.id,
          name: permission.name,
          description: permission.description || undefined,
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope,
          isSystem: permission.isSystem,
          conditions: permission.conditions || undefined,
          isActive: permission.isActive,
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
          fullName: permission.getFullName(),
        })) || [],
      totalPermissions: role.getAllPermissions().length,
    };
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

  @Post('defaults')
  @ApiOperation({ summary: 'Create default system roles' })
  @ApiResponse({
    status: 201,
    description: 'Default roles created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createDefaultRoles(@Req() req: Request): Promise<{ message: string }> {
    const tenantId = (req.user as any)?.tenantId;
    await this.roleService.createDefaultRoles(tenantId);
    return { message: 'Default roles created successfully' };
  }

  @Get('users/:userId/permissions')
  @ApiOperation({ summary: 'Get all permissions for a user' })
  @ApiResponse({ status: 200, description: 'User permissions', type: [String] })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserPermissions(@Param('userId') userId: string): Promise<string[]> {
    return this.roleService.getUserPermissions(userId);
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
}
