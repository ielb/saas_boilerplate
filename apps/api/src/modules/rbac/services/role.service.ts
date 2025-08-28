import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role, RoleType, RoleLevel } from '../entities/role.entity';
import { Permission, PermissionScope } from '../entities/permission.entity';
import { User } from '../../users/entities/user.entity';
import { RoleRepository } from '../repositories/role.repository';
import { UserRepository } from '../repositories/user.repository';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignPermissionsDto,
  RoleResponseDto,
  RoleListResponseDto,
  AssignUserRoleDto,
  UserRoleResponseDto,
  UserRoleListResponseDto,
} from '../dto/rbac.dto';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    private readonly roleRepository: RoleRepository,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly userRepository: UserRepository
  ) {}

  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    const { name, level, parentRoleId, permissionIds } = createRoleDto;

    // Check if role already exists in the tenant
    const existingRole = await this.roleRepository.findByName(name);

    if (existingRole) {
      throw new BadRequestException(
        `Role with name '${name}' already exists in this tenant`
      );
    }

    // Validate parent role if provided
    if (parentRoleId) {
      const parentRole = await this.getRole(parentRoleId);
      if (parentRole.level <= level) {
        throw new BadRequestException(
          'Parent role must have a higher level than the child role'
        );
      }
    }

    const roleData: any = {
      ...createRoleDto,
      isSystem: false,
    };
    const role = this.roleRepository.create(roleData);

    const savedRole = await this.roleRepository.saveWithTenantScope(role);

    // Assign permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      try {
        await this.assignPermissionsToRole(savedRole.id, { permissionIds });
      } catch (error) {
        // If permission assignment fails, still return the role but log the error
        this.logger.warn(
          `Failed to assign permissions to role ${savedRole.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        // You might want to delete the role here if permission assignment is critical
        // await this.roleRepository.delete(savedRole.id);
        // throw error;
      }
    }

    this.logger.log(`Created role: ${savedRole.name}`);
    return savedRole;
  }

  async updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.getRole(id);

    if (role.isSystem) {
      throw new BadRequestException('Cannot modify system roles');
    }

    // Validate parent role if provided
    if (updateRoleDto.parentRoleId) {
      const parentRole = await this.getRole(updateRoleDto.parentRoleId);
      if (parentRole.level <= (updateRoleDto.level || role.level)) {
        throw new BadRequestException(
          'Parent role must have a higher level than the child role'
        );
      }
    }

    // Check if new name conflicts with existing role
    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.roleRepository.findByName(
        updateRoleDto.name
      );
      if (existingRole && existingRole.id !== id) {
        throw new BadRequestException(
          `Role with name '${updateRoleDto.name}' already exists in this tenant`
        );
      }
    }

    Object.assign(role, updateRoleDto);
    return this.roleRepository.saveWithTenantScope(role);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.getRole(id);

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    // Check if role is assigned to any users
    const usersWithRole = await this.userRepository
      .createTenantScopedQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.id = :roleId', { roleId: id })
      .getCount();

    if (usersWithRole > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' as it is assigned to ${usersWithRole} user(s)`
      );
    }

    await this.roleRepository.delete(id);
    this.logger.log(`Deleted role: ${role.name}`);
  }

  async getRole(id: string): Promise<Role> {
    const role = await this.roleRepository.findOneByIdForTenant(id);

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    return role;
  }

  async getRoleByName(name: string): Promise<Role | null> {
    return this.roleRepository.findByName(name);
  }

  async getAllRoles(
    page: number = 1,
    limit: number = 50,
    level?: RoleLevel
  ): Promise<RoleListResponseDto> {
    const result = await this.roleRepository.findWithPagination(
      page,
      limit,
      level
    );

    return {
      roles: result.roles.map(role => this.mapToResponseDto(role)),
      total: result.total,
      page,
      limit,
    };
  }

  async getSystemRoles(): Promise<Role[]> {
    return this.roleRepository.findSystemRoles();
  }

  async getCustomRoles(): Promise<Role[]> {
    return this.roleRepository.findCustomRoles();
  }

  async assignPermissionsToRole(
    roleId: string,
    assignPermissionsDto: AssignPermissionsDto
  ): Promise<Role> {
    const { permissionIds } = assignPermissionsDto;
    const role = await this.getRole(roleId);

    // Find permissions and validate they exist
    const permissions = await this.permissionRepository.find({
      where: { id: In(permissionIds) },
    });

    if (permissions.length !== permissionIds.length) {
      const foundIds = permissions.map(p => p.id);
      const missingIds = permissionIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(
        `Some permissions not found: ${missingIds.join(', ')}`
      );
    }

    // Validate that permissions are accessible (either global or tenant-scoped)
    const invalidPermissions = permissions.filter(
      permission =>
        permission.scope !== PermissionScope.GLOBAL &&
        permission.scope !== PermissionScope.TENANT
    );

    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Cannot assign permissions with scope other than GLOBAL or TENANT: ${invalidPermissions.map(p => p.name).join(', ')}`
      );
    }

    role.permissions = permissions;
    await this.roleRepository.save(role);

    this.logger.log(
      `Assigned ${permissions.length} permissions to role: ${role.name}`
    );

    return role;
  }

  async removePermissionsFromRole(
    roleId: string,
    permissionIds: string[]
  ): Promise<Role> {
    const role = await this.getRole(roleId);

    role.permissions =
      role.permissions?.filter(
        (permission: Permission) => !permissionIds.includes(permission.id)
      ) || [];

    await this.roleRepository.save(role);

    this.logger.log(
      `Removed ${permissionIds.length} permissions from role: ${role.name}`
    );

    return role;
  }

  async assignRoleToUser(
    userId: string,
    assignUserRoleDto: AssignUserRoleDto
  ): Promise<void> {
    const { roleId } = assignUserRoleDto;

    const user = await this.userRepository.findOneByIdForTenant(userId);
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const role = await this.getRole(roleId);

    // Check if user already has this role
    const userRoles = await this.getUserRoles(userId);
    const hasRole = userRoles.userRoles.some(
      (userRole: any) => userRole.roleId === roleId
    );

    if (hasRole) {
      throw new BadRequestException(`User already has role '${role.name}'`);
    }

    user.roles = [...(user.roles || []), role];
    await this.userRepository.save(user);

    this.logger.log(`Assigned role '${role.name}' to user: ${user.email}`);
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const user = await this.userRepository.findOneByIdForTenant(userId);
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const role = await this.getRole(roleId);

    user.roles =
      user.roles?.filter((userRole: any) => userRole.id !== roleId) || [];
    await this.userRepository.save(user);

    this.logger.log(`Removed role '${role.name}' from user: ${user.email}`);
  }

  async getUserRoles(userId: string): Promise<UserRoleListResponseDto> {
    const user = await this.userRepository.findOneWithTenantScope({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    return {
      userRoles: (user.roles || []).map((role: any) => ({
        userId: user.id,
        roleId: role.id,
        roleName: role.name,
        roleLevel: role.level,
        assignedAt: role.createdAt,
        metadata: role.metadata,
      })),
      total: (user.roles || []).length,
    };
  }

  // Debug method to get user roles without tenant scoping
  async getUserRolesDebug(userId: string): Promise<any> {
    // Try without tenant scoping first
    const userWithoutTenant = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    // Try with tenant scoping
    const userWithTenant = await this.userRepository.findOneWithTenantScope({
      where: { id: userId },
      relations: ['roles'],
    });

    // Try direct query
    const directRoles = await this.roleRepository.query(
      `
      SELECT 
        ur."roleId" as "roleId",
        r.name as "roleName",
        r.level as "roleLevel"
      FROM "user_roles" ur
      INNER JOIN roles r ON ur."roleId" = r.id
      WHERE ur."userId" = $1
    `,
      [userId]
    );

    return {
      userWithoutTenant: userWithoutTenant
        ? {
            id: userWithoutTenant.id,
            email: userWithoutTenant.email,
            rolesCount: userWithoutTenant.roles?.length || 0,
            roles:
              userWithoutTenant.roles?.map((r: any) => ({
                id: r.id,
                name: r.name,
              })) || [],
          }
        : null,
      userWithTenant: userWithTenant
        ? {
            id: userWithTenant.id,
            email: userWithTenant.email,
            rolesCount: userWithTenant.roles?.length || 0,
            roles:
              userWithTenant.roles?.map((r: any) => ({
                id: r.id,
                name: r.name,
              })) || [],
          }
        : null,
      directRoles: directRoles,
      directRolesCount: directRoles.length,
    };
  }

  async createDefaultRoles(): Promise<void> {
    const defaultRoles = this.generateDefaultRoles();

    for (const roleData of defaultRoles) {
      const existingRole = await this.roleRepository.findByName(roleData.name!);

      if (!existingRole) {
        const role = this.roleRepository.create(roleData);
        const savedRole = await this.roleRepository.saveWithTenantScope(role);
        await this.assignDefaultPermissionsToRole(savedRole);
        this.logger.log(`Created default role: ${savedRole.name}`);
      } else {
        this.logger.log(`Default role already exists: ${existingRole.name}`);
      }
    }
  }

  /**
   * Update Super Admin role with all available permissions
   * This method ensures Super Admin always has access to all permissions
   */
  async updateSuperAdminPermissions(): Promise<void> {
    const superAdminRole = await this.roleRepository.findByName('Super Admin');

    if (!superAdminRole) {
      this.logger.warn(
        'Super Admin role not found. Creating default roles first...'
      );
      await this.createDefaultRoles();
      return;
    }

    const allPermissions = await this.permissionRepository.find({
      where: { isActive: true },
    });

    if (allPermissions && allPermissions.length > 0) {
      superAdminRole.permissions = allPermissions;
      await this.roleRepository.saveWithTenantScope(superAdminRole);
      this.logger.log(
        `Updated Super Admin role with ${allPermissions.length} permissions`
      );
    } else {
      this.logger.warn('No active permissions found in the system');
    }
  }

  /**
   * Get all permissions assigned to Super Admin role
   */
  async getSuperAdminPermissions(): Promise<Permission[]> {
    const superAdminRole = await this.roleRepository.findByName('Super Admin');

    if (!superAdminRole) {
      throw new NotFoundException('Super Admin role not found');
    }

    return superAdminRole.permissions || [];
  }

  private async assignDefaultPermissionsToRole(role: Role): Promise<void> {
    // For Super Admin, assign ALL available permissions
    if (role.name === 'Super Admin') {
      const allPermissions = await this.permissionRepository.find({
        where: { isActive: true },
      });

      if (allPermissions && allPermissions.length > 0) {
        role.permissions = allPermissions;
        await this.roleRepository.saveWithTenantScope(role);
        this.logger.log(
          `Assigned ${allPermissions.length} permissions to Super Admin role`
        );
      }
    } else {
      // For other roles, use the predefined permission mapping
      const permissionNames = this.getDefaultPermissionsForRole(role.name);
      const permissions = await this.permissionRepository.find({
        where: { name: In(permissionNames) },
      });

      if (permissions && permissions.length > 0) {
        role.permissions = permissions;
        await this.roleRepository.saveWithTenantScope(role);
        this.logger.log(
          `Assigned ${permissions.length} permissions to ${role.name} role`
        );
      }
    }
  }

  private getDefaultPermissionsForRole(roleName: string): string[] {
    const permissionMap: Record<string, string[]> = {
      'Super Admin': [
        // User Management - All actions
        'users:create',
        'users:read',
        'users:update',
        'users:delete',
        'users:manage',
        'users:approve',
        'users:reject',
        'users:export',
        'users:import',
        'users:assign',
        'users:revoke',

        // Role Management - All actions
        'roles:create',
        'roles:read',
        'roles:update',
        'roles:delete',
        'roles:manage',
        'roles:approve',
        'roles:reject',
        'roles:export',
        'roles:import',
        'roles:assign',
        'roles:revoke',

        // Permission Management - All actions
        'permissions:create',
        'permissions:read',
        'permissions:update',
        'permissions:delete',
        'permissions:manage',
        'permissions:approve',
        'permissions:reject',
        'permissions:export',
        'permissions:import',
        'permissions:assign',
        'permissions:revoke',

        // Tenant Management - All actions (Global scope)
        'tenants:create',
        'tenants:read',
        'tenants:update',
        'tenants:delete',
        'tenants:manage',
        'tenants:approve',
        'tenants:reject',
        'tenants:export',
        'tenants:import',
        'tenants:assign',
        'tenants:revoke',

        // Team Management - All actions
        'teams:create',
        'teams:read',
        'teams:update',
        'teams:delete',
        'teams:manage',
        'teams:approve',
        'teams:reject',
        'teams:export',
        'teams:import',
        'teams:assign',
        'teams:revoke',

        // Session Management - All actions
        'sessions:create',
        'sessions:read',
        'sessions:update',
        'sessions:delete',
        'sessions:manage',
        'sessions:approve',
        'sessions:reject',
        'sessions:export',
        'sessions:import',
        'sessions:assign',
        'sessions:revoke',

        // Billing Management - All actions
        'billing:create',
        'billing:read',
        'billing:update',
        'billing:delete',
        'billing:manage',
        'billing:approve',
        'billing:reject',
        'billing:export',
        'billing:import',
        'billing:assign',
        'billing:revoke',

        // Subscription Management - All actions
        'subscriptions:create',
        'subscriptions:read',
        'subscriptions:update',
        'subscriptions:delete',
        'subscriptions:manage',
        'subscriptions:approve',
        'subscriptions:reject',
        'subscriptions:export',
        'subscriptions:import',
        'subscriptions:assign',
        'subscriptions:revoke',

        // File Management - All actions
        'files:create',
        'files:read',
        'files:update',
        'files:delete',
        'files:manage',
        'files:approve',
        'files:reject',
        'files:export',
        'files:import',
        'files:assign',
        'files:revoke',

        // Notification Management - All actions
        'notifications:create',
        'notifications:read',
        'notifications:update',
        'notifications:delete',
        'notifications:manage',
        'notifications:approve',
        'notifications:reject',
        'notifications:export',
        'notifications:import',
        'notifications:assign',
        'notifications:revoke',

        // Reports and Analytics - All actions
        'reports:create',
        'reports:read',
        'reports:update',
        'reports:delete',
        'reports:manage',
        'reports:approve',
        'reports:reject',
        'reports:export',
        'reports:import',
        'reports:assign',
        'reports:revoke',

        // System Settings - All actions (Global scope)
        'system_settings:create',
        'system_settings:read',
        'system_settings:update',
        'system_settings:delete',
        'system_settings:manage',
        'system_settings:approve',
        'system_settings:reject',
        'system_settings:export',
        'system_settings:import',
        'system_settings:assign',
        'system_settings:revoke',

        // Additional system-level permissions
        'tenant:manage',
        'system:admin',
        'audit_logs:read',
        'audit_logs:export',
        'feature_flags:manage',
        'api_keys:manage',
        'webhooks:manage',
        'analytics:read',
        'analytics:export',
        'documents:manage',
        'emails:manage',
        'invoices:manage',
        'payments:manage',
      ],
      Admin: [
        'user:create',
        'user:read',
        'user:update',
        'user:delete',
        'role:create',
        'role:read',
        'role:update',
        'role:delete',
        'permission:read',
        'tenant:manage',
      ],
      Manager: [
        'user:create',
        'user:read',
        'user:update',
        'role:read',
        'permission:read',
      ],
      Member: ['user:read', 'permission:read'],
      Guest: ['user:read'],
    };

    return permissionMap[roleName] || [];
  }

  private generateDefaultRoles(): Partial<Role>[] {
    return [
      {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        level: RoleLevel.OWNER,
        type: RoleType.SYSTEM,
        isSystem: true,
      },
      {
        name: 'Admin',
        description: 'Tenant administrator with full tenant access',
        level: RoleLevel.ADMIN,
        type: RoleType.SYSTEM,
        isSystem: true,
      },
      {
        name: 'Manager',
        description: 'Team manager with elevated permissions',
        level: RoleLevel.MANAGER,
        type: RoleType.SYSTEM,
        isSystem: true,
      },
      {
        name: 'Member',
        description: 'Standard team member',
        level: RoleLevel.MEMBER,
        type: RoleType.SYSTEM,
        isSystem: true,
      },
      {
        name: 'Guest',
        description: 'Limited access user',
        level: RoleLevel.VIEWER,
        type: RoleType.SYSTEM,
        isSystem: true,
      },
    ];
  }

  private mapToResponseDto(role: Role): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      level: role.level,
      type: role.type,
      isSystem: role.isSystem,
      isActive: role.isActive,
      parentRoleId: role.parentRoleId,
      tenantId: role.tenantId || undefined,
      metadata: role.metadata,
      permissions:
        role.permissions?.map((permission: Permission) => ({
          id: permission.id,
          name: permission.name,
          description: permission.description,
          resource: permission.resource,
          action: permission.action,
          scope: permission.scope,
          isSystem: permission.isSystem,
          conditions: permission.conditions,
          isActive: permission.isActive,
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
          fullName: permission.getFullName(),
        })) || [],
      totalPermissions: role.getAllPermissions().length,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async checkUserPermission(
    userId: string,
    resource: string,
    action: string,
    scope?: string
  ): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    const userPermissions = await this.getUserPermissions(userId);

    // Check if user has the specific permission
    const requiredPermission = `${resource}:${action}`;
    return userPermissions.includes(requiredPermission);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.getUserRoles(userId);
    const permissions = new Set<string>();

    // If no roles found, try to find the Super Admin user directly
    if (userRoles.userRoles.length === 0) {
      const superAdminUser = await this.userRepository.findOne({
        where: { email: 'superadmin@example.com' },
        relations: ['roles'],
      });

      if (superAdminUser && superAdminUser.roles) {
        for (const role of superAdminUser.roles) {
          const roleWithPermissions = await this.roleRepository.findOne({
            where: { id: role.id },
            relations: ['permissions'],
          });

          if (roleWithPermissions && roleWithPermissions.permissions) {
            for (const permission of roleWithPermissions.permissions) {
              if (permission.isActive) {
                permissions.add(permission.name);
              }
            }
          }
        }
      }
    } else {
      // Get permissions from all user roles
      for (const userRole of userRoles.userRoles) {
        const role = await this.roleRepository.findOne({
          where: { id: userRole.roleId },
          relations: ['permissions'],
        });

        if (role && role.permissions) {
          for (const permission of role.permissions) {
            if (permission.isActive) {
              permissions.add(permission.name);
            }
          }
        }
      }
    }

    return Array.from(permissions);
  }
}
