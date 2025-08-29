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
  Request,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { PermissionService } from '../services/permission.service';
import { PermissionCheckerService } from '../../../common/services/permission-checker.service';
import {
  RequirePermissions,
  RequireCreate,
  RequireRead,
  RequireUpdate,
  RequireDelete,
  RequireManage,
} from '../../../common/decorators/permissions.decorator';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
  PermissionListResponseDto,
  CheckPermissionDto,
  PermissionCheckResponseDto,
} from '../dto/rbac.dto';
import {
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '../entities/permission.entity';
import { PermissionQueryDto } from '../dto/permission-query.dto';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly permissionChecker: PermissionCheckerService
  ) {}

  @Post()
  @RequireCreate(PermissionResource.PERMISSIONS)
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({
    status: 201,
    description: 'Permission created successfully',
    type: PermissionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async createPermission(
    @Body() createPermissionDto: CreatePermissionDto,
    @Request() req: any
  ): Promise<PermissionResponseDto> {
    // Additional permission check using the service
    await this.permissionChecker.assertPermission(
      req.user.id,
      PermissionResource.PERMISSIONS,
      PermissionAction.CREATE
    );

    const permission =
      await this.permissionService.createPermission(createPermissionDto);
    return this.permissionService.mapToResponseDto(permission);
  }

  @Get()
  @RequireRead(PermissionResource.PERMISSIONS)
  @ApiOperation({ summary: 'Get all permissions with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
    type: PermissionListResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getAllPermissions(
    @Query() query: PermissionQueryDto
  ): Promise<PermissionListResponseDto> {
    return this.permissionService.getAllPermissions(
      query.page || 1,
      query.limit || 50,
      query.scope,
      query.resource
    );
  }

  @Get('system')
  @RequireRead(PermissionResource.PERMISSIONS)
  @ApiOperation({ summary: 'Get all system permissions' })
  @ApiResponse({
    status: 200,
    description: 'System permissions retrieved successfully',
    type: [PermissionResponseDto],
  })
  async getSystemPermissions(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionService.getSystemPermissions();
    return permissions.map(p => this.permissionService.mapToResponseDto(p));
  }

  @Get('custom')
  @RequireRead(PermissionResource.PERMISSIONS)
  @ApiOperation({ summary: 'Get all custom permissions' })
  @ApiResponse({
    status: 200,
    description: 'Custom permissions retrieved successfully',
    type: [PermissionResponseDto],
  })
  async getCustomPermissions(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionService.getCustomPermissions();
    return permissions.map(p => this.permissionService.mapToResponseDto(p));
  }

  @Get('scopes')
  @RequireRead(PermissionResource.PERMISSIONS)
  @ApiOperation({ summary: 'Get all available permission scopes' })
  @ApiResponse({
    status: 200,
    description: 'Permission scopes retrieved successfully',
    type: [String],
  })
  async getPermissionScopes(): Promise<PermissionScope[]> {
    return this.permissionService.getPermissionScopes();
  }

  @Get('resources')
  @RequireRead(PermissionResource.PERMISSIONS)
  @ApiOperation({ summary: 'Get all available permission resources' })
  @ApiResponse({
    status: 200,
    description: 'Permission resources retrieved successfully',
    type: [String],
  })
  async getPermissionResources(): Promise<PermissionResource[]> {
    return this.permissionService.getPermissionResources();
  }

  @Get('actions')
  @RequireRead(PermissionResource.PERMISSIONS)
  @ApiOperation({ summary: 'Get all available permission actions' })
  @ApiResponse({
    status: 200,
    description: 'Permission actions retrieved successfully',
    type: [String],
  })
  async getPermissionActions(): Promise<PermissionAction[]> {
    return this.permissionService.getPermissionActions();
  }

  @Get(':id')
  @RequireRead(PermissionResource.PERMISSIONS)
  @ApiOperation({ summary: 'Get a permission by ID' })
  @ApiResponse({
    status: 200,
    description: 'Permission retrieved successfully',
    type: PermissionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async getPermission(@Param('id') id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionService.getPermission(id);
    return this.permissionService.mapToResponseDto(permission);
  }

  @Put(':id')
  @RequireUpdate(PermissionResource.PERMISSIONS)
  @ApiOperation({ summary: 'Update a permission' })
  @ApiResponse({
    status: 200,
    description: 'Permission updated successfully',
    type: PermissionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async updatePermission(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
    @Request() req: any
  ): Promise<PermissionResponseDto> {
    // Additional permission check using the service
    await this.permissionChecker.assertPermission(
      req.user.id,
      PermissionResource.PERMISSIONS,
      PermissionAction.UPDATE
    );

    const permission = await this.permissionService.updatePermission(
      id,
      updatePermissionDto
    );
    return this.permissionService.mapToResponseDto(permission);
  }

  @Delete(':id')
  @RequireDelete(PermissionResource.PERMISSIONS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a permission' })
  @ApiResponse({ status: 204, description: 'Permission deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async deletePermission(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<void> {
    // Additional permission check using the service
    await this.permissionChecker.assertPermission(
      req.user.id,
      PermissionResource.PERMISSIONS,
      PermissionAction.DELETE
    );

    await this.permissionService.deletePermission(id);
  }

  @Post('check')
  @RequireRead(PermissionResource.PERMISSIONS)
  @ApiOperation({ summary: 'Check if current user has a specific permission' })
  @ApiResponse({
    status: 200,
    description: 'Permission check completed',
    type: PermissionCheckResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async checkPermission(
    @Body() checkPermissionDto: CheckPermissionDto,
    @Request() req: any
  ): Promise<PermissionCheckResponseDto> {
    const hasPermission = await this.permissionChecker.hasPermission(
      req.user.id,
      checkPermissionDto.resource as PermissionResource,
      checkPermissionDto.action as PermissionAction,
      checkPermissionDto.scope
    );

    // Get user roles to show which roles grant this permission
    const userPermissions = await this.permissionChecker.getUserPermissions(
      req.user.id
    );
    const grantedByRoles: string[] = [];

    // This is a simplified implementation - in a real scenario, you'd want to
    // check which specific roles grant this permission
    if (hasPermission) {
      grantedByRoles.push('User has this permission');
    }

    const response: PermissionCheckResponseDto = {
      hasPermission,
      resource: checkPermissionDto.resource,
      action: checkPermissionDto.action,
      userId: req.user.id,
      grantedByRoles,
    };

    if (checkPermissionDto.scope) {
      response.scope = checkPermissionDto.scope;
    }

    return response;
  }

  @Post('initialize')
  @RequireManage(PermissionResource.PERMISSIONS)
  @ApiOperation({ summary: 'Initialize default permissions (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Default permissions created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async initializeDefaultPermissions(): Promise<{ message: string }> {
    await this.permissionService.createDefaultPermissions();
    return { message: 'Default permissions initialized successfully' };
  }
}
