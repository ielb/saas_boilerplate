import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Permission,
  PermissionScope,
  PermissionAction,
  PermissionResource,
} from '../entities/permission.entity';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
  PermissionListResponseDto,
} from '../dto/rbac.dto';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>
  ) {}

  async createPermission(
    createPermissionDto: CreatePermissionDto
  ): Promise<Permission> {
    const {
      name,
      resource,
      action,
      scope = PermissionScope.TENANT,
    } = createPermissionDto;

    // Check if permission already exists
    const existingPermission = await this.permissionRepository.findOne({
      where: { name },
    });

    if (existingPermission) {
      throw new BadRequestException(
        `Permission with name '${name}' already exists`
      );
    }

    const permission = this.permissionRepository.create({
      ...createPermissionDto,
      scope,
      isSystem: false,
      isActive: true,
    });

    const savedPermission = await this.permissionRepository.save(permission);
    this.logger.log(`Created permission: ${savedPermission.name}`);
    return savedPermission;
  }

  async updatePermission(
    id: string,
    updatePermissionDto: UpdatePermissionDto
  ): Promise<Permission> {
    const permission = await this.getPermission(id);

    if (permission.isSystem) {
      throw new BadRequestException('Cannot modify system permissions');
    }

    Object.assign(permission, updatePermissionDto);
    const updatedPermission = await this.permissionRepository.save(permission);
    this.logger.log(`Updated permission: ${updatedPermission.name}`);
    return updatedPermission;
  }

  async deletePermission(id: string): Promise<void> {
    const permission = await this.getPermission(id);

    if (permission.isSystem) {
      throw new BadRequestException('Cannot delete system permissions');
    }

    await this.permissionRepository.remove(permission);
    this.logger.log(`Deleted permission: ${permission.name}`);
  }

  async getPermission(id: string): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID '${id}' not found`);
    }

    return permission;
  }

  async getPermissionByName(name: string): Promise<Permission | null> {
    return this.permissionRepository.findOne({
      where: { name },
      relations: ['roles'],
    });
  }

  async getAllPermissions(
    page: number = 1,
    limit: number = 50,
    scope?: PermissionScope,
    resource?: PermissionResource
  ): Promise<PermissionListResponseDto> {
    const queryBuilder =
      this.permissionRepository.createQueryBuilder('permission');

    if (scope) {
      queryBuilder.andWhere('permission.scope = :scope', { scope });
    }

    if (resource) {
      queryBuilder.andWhere('permission.resource = :resource', { resource });
    }

    // Apply safe pagination
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    const [permissions, total] = await queryBuilder
      .orderBy('permission.name', 'ASC')
      .skip(offset)
      .take(safeLimit)
      .getManyAndCount();

    return {
      permissions: permissions.map(this.mapToResponseDto),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async getPermissionsByIds(ids: string[]): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { id: In(ids) },
    });
  }

  async getPermissionsByResource(
    resource: PermissionResource
  ): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { resource },
      order: { action: 'ASC' },
    });
  }

  async getPermissionsByScope(scope: PermissionScope): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { scope },
      order: { name: 'ASC' },
    });
  }

  async getSystemPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { isSystem: true },
      order: { name: 'ASC' },
    });
  }

  async getCustomPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { isSystem: false },
      order: { name: 'ASC' },
    });
  }

  async createDefaultPermissions(): Promise<void> {
    const defaultPermissions = this.generateDefaultPermissions();

    for (const permissionData of defaultPermissions) {
      const existingPermission = await this.getPermissionByName(
        permissionData.name!
      );

      if (!existingPermission) {
        const permission = this.permissionRepository.create({
          ...permissionData,
          isSystem: true,
          isActive: true,
        });

        await this.permissionRepository.save(permission);
        this.logger.log(`Created default permission: ${permission.name}`);
      }
    }

    this.logger.log('Default permissions creation completed');
  }

  private generateDefaultPermissions(): Partial<Permission>[] {
    const permissions: Partial<Permission>[] = [];

    // User Management Permissions
    Object.values(PermissionAction).forEach(action => {
      permissions.push({
        name: `users:${action}`,
        description: `Can ${action} users`,
        resource: PermissionResource.USERS,
        action: action as PermissionAction,
        scope: PermissionScope.TENANT,
      });
    });

    // Role Management Permissions
    Object.values(PermissionAction).forEach(action => {
      permissions.push({
        name: `roles:${action}`,
        description: `Can ${action} roles`,
        resource: PermissionResource.ROLES,
        action: action as PermissionAction,
        scope: PermissionScope.TENANT,
      });
    });

    // Permission Management Permissions
    Object.values(PermissionAction).forEach(action => {
      permissions.push({
        name: `permissions:${action}`,
        description: `Can ${action} permissions`,
        resource: PermissionResource.PERMISSIONS,
        action: action as PermissionAction,
        scope: PermissionScope.TENANT,
      });
    });

    // Tenant Management Permissions
    Object.values(PermissionAction).forEach(action => {
      permissions.push({
        name: `tenants:${action}`,
        description: `Can ${action} tenants`,
        resource: PermissionResource.TENANTS,
        action: action as PermissionAction,
        scope: PermissionScope.GLOBAL,
      });
    });

    // Team Management Permissions
    Object.values(PermissionAction).forEach(action => {
      permissions.push({
        name: `teams:${action}`,
        description: `Can ${action} teams`,
        resource: PermissionResource.TEAMS,
        action: action as PermissionAction,
        scope: PermissionScope.TENANT,
      });
    });

    // Session Management Permissions
    Object.values(PermissionAction).forEach(action => {
      permissions.push({
        name: `sessions:${action}`,
        description: `Can ${action} sessions`,
        resource: PermissionResource.SESSIONS,
        action: action as PermissionAction,
        scope: PermissionScope.TENANT,
      });
    });

    // Billing Permissions
    Object.values(PermissionAction).forEach(action => {
      permissions.push({
        name: `billing:${action}`,
        description: `Can ${action} billing`,
        resource: PermissionResource.BILLING,
        action: action as PermissionAction,
        scope: PermissionScope.TENANT,
      });
    });

    // Subscription Permissions
    Object.values(PermissionAction).forEach(action => {
      permissions.push({
        name: `subscriptions:${action}`,
        description: `Can ${action} subscriptions`,
        resource: PermissionResource.SUBSCRIPTIONS,
        action: action as PermissionAction,
        scope: PermissionScope.TENANT,
      });
    });

    // File Management Permissions
    Object.values(PermissionAction).forEach(action => {
      permissions.push({
        name: `files:${action}`,
        description: `Can ${action} files`,
        resource: PermissionResource.FILES,
        action: action as PermissionAction,
        scope: PermissionScope.TENANT,
      });
    });

    // Notification Permissions
    Object.values(PermissionAction).forEach(action => {
      permissions.push({
        name: `notifications:${action}`,
        description: `Can ${action} notifications`,
        resource: PermissionResource.NOTIFICATIONS,
        action: action as PermissionAction,
        scope: PermissionScope.TENANT,
      });
    });

    // Reports and Analytics Permissions
    Object.values(PermissionAction).forEach(action => {
      permissions.push({
        name: `reports:${action}`,
        description: `Can ${action} reports`,
        resource: PermissionResource.REPORTS,
        action: action as PermissionAction,
        scope: PermissionScope.TENANT,
      });
    });

    // System Settings Permissions (Global scope)
    Object.values(PermissionAction).forEach(action => {
      permissions.push({
        name: `system_settings:${action}`,
        description: `Can ${action} system settings`,
        resource: PermissionResource.SYSTEM_SETTINGS,
        action: action as PermissionAction,
        scope: PermissionScope.GLOBAL,
      });
    });

    return permissions;
  }

  public mapToResponseDto(permission: Permission): PermissionResponseDto {
    return {
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
    };
  }

  async validatePermission(
    resource: string,
    action: string,
    scope?: PermissionScope
  ): Promise<boolean> {
    const permission = await this.permissionRepository.findOne({
      where: {
        resource: resource as PermissionResource,
        action: action as PermissionAction,
        ...(scope && { scope }),
      },
    });

    return !!permission;
  }

  async getPermissionScopes(): Promise<PermissionScope[]> {
    return Object.values(PermissionScope);
  }

  async getPermissionResources(): Promise<PermissionResource[]> {
    return Object.values(PermissionResource);
  }

  async getPermissionActions(): Promise<PermissionAction[]> {
    return Object.values(PermissionAction);
  }
}
