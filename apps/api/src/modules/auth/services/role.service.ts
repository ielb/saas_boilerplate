import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role, RoleType, RoleLevel } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { User } from '../entities/user.entity';
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
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async createRole(
    createRoleDto: CreateRoleDto,
    tenantId?: string
  ): Promise<Role> {
    const { name, level, parentRoleId, permissionIds } = createRoleDto;

    // Check if role already exists in the tenant
    const whereCondition: any = { name };
    if (tenantId) {
      whereCondition.tenantId = tenantId;
    }
    const existingRole = await this.roleRepository.findOne({
      where: whereCondition,
    });

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
    if (tenantId) {
      roleData.tenantId = tenantId;
    }
    const role = this.roleRepository.create(roleData);

    const savedRole = (await this.roleRepository.save(role)) as unknown as Role;

    // Assign permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      await this.assignPermissionsToRole(savedRole.id, { permissionIds });
    }

    this.logger.log(`Created role: ${savedRole.name} for tenant: ${tenantId}`);
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

    Object.assign(role, updateRoleDto);
    const updatedRole = await this.roleRepository.save(role);
    this.logger.log(`Updated role: ${updatedRole.name}`);
    return updatedRole;
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.getRole(id);

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    // Check if role has users assigned
    const userCount = await this.userRepository.count({
      relations: ['roles'],
      where: { roles: { id } },
    });

    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot delete role with ${userCount} assigned users`
      );
    }

    await this.roleRepository.remove(role);
    this.logger.log(`Deleted role: ${role.name}`);
  }

  async getRole(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions', 'parentRole', 'childRoles', 'users'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    return role;
  }

  async getRoleByName(name: string, tenantId?: string): Promise<Role | null> {
    const whereCondition: any = { name };
    if (tenantId) {
      whereCondition.tenantId = tenantId;
    }
    return this.roleRepository.findOne({
      where: whereCondition,
      relations: ['permissions', 'parentRole', 'childRoles'],
    });
  }

  async getAllRoles(
    tenantId?: string,
    page: number = 1,
    limit: number = 50,
    level?: RoleLevel
  ): Promise<RoleListResponseDto> {
    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .leftJoinAndSelect('role.parentRole', 'parentRole')
      .leftJoinAndSelect('role.childRoles', 'childRoles');

    if (tenantId) {
      queryBuilder.andWhere('role.tenantId = :tenantId', { tenantId });
    }

    if (level !== undefined) {
      queryBuilder.andWhere('role.level = :level', { level });
    }

    const [roles, total] = await queryBuilder
      .orderBy('role.level', 'ASC')
      .addOrderBy('role.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      roles: roles.map(this.mapToResponseDto),
      total,
      page,
      limit,
    };
  }

  async getSystemRoles(): Promise<Role[]> {
    return this.roleRepository.find({
      where: { isSystem: true },
      relations: ['permissions'],
      order: { level: 'ASC' },
    });
  }

  async getCustomRoles(tenantId?: string): Promise<Role[]> {
    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('role.isSystem = :isSystem', { isSystem: false });

    if (tenantId) {
      queryBuilder.andWhere('role.tenantId = :tenantId', { tenantId });
    }

    return queryBuilder.orderBy('role.level', 'ASC').getMany();
  }

  async assignPermissionsToRole(
    roleId: string,
    assignPermissionsDto: AssignPermissionsDto
  ): Promise<Role> {
    const role = await this.getRole(roleId);
    const { permissionIds } = assignPermissionsDto;

    const permissions = await this.permissionRepository.find({
      where: { id: In(permissionIds) },
    });

    if (permissions.length !== permissionIds.length) {
      const foundIds = permissions.map(p => p.id);
      const missingIds = permissionIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(
        `Permissions not found: ${missingIds.join(', ')}`
      );
    }

    role.permissions = permissions;
    const updatedRole = await this.roleRepository.save(role);
    this.logger.log(
      `Assigned ${permissions.length} permissions to role: ${role.name}`
    );
    return updatedRole;
  }

  async removePermissionsFromRole(
    roleId: string,
    permissionIds: string[]
  ): Promise<Role> {
    const role = await this.getRole(roleId);

    role.permissions = role.permissions.filter(
      permission => !permissionIds.includes(permission.id)
    );

    const updatedRole = await this.roleRepository.save(role);
    this.logger.log(
      `Removed ${permissionIds.length} permissions from role: ${role.name}`
    );
    return updatedRole;
  }

  async assignRoleToUser(
    userId: string,
    assignUserRoleDto: AssignUserRoleDto
  ): Promise<void> {
    const { roleId } = assignUserRoleDto;

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const role = await this.getRole(roleId);

    // Check if user already has this role
    const hasRole = user.roles.some(userRole => userRole.id === roleId);
    if (hasRole) {
      throw new BadRequestException(`User already has role: ${role.name}`);
    }

    user.roles.push(role);
    await this.userRepository.save(user);
    this.logger.log(`Assigned role ${role.name} to user: ${user.email}`);
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const role = await this.getRole(roleId);

    // Check if user has this role
    const hasRole = user.roles.some(userRole => userRole.id === roleId);
    if (!hasRole) {
      throw new BadRequestException(`User does not have role: ${role.name}`);
    }

    user.roles = user.roles.filter(userRole => userRole.id !== roleId);
    await this.userRepository.save(user);
    this.logger.log(`Removed role ${role.name} from user: ${user.email}`);
  }

  async getUserRoles(userId: string): Promise<UserRoleListResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const userRoles = user.roles.map(role => ({
      userId: user.id,
      roleId: role.id,
      roleName: role.name,
      roleLevel: role.level,
      assignedAt: role.createdAt, // This would ideally come from a junction table
      metadata: role.metadata,
    }));

    return {
      userRoles,
      total: userRoles.length,
    };
  }

  async createDefaultRoles(tenantId?: string): Promise<void> {
    const defaultRoles = this.generateDefaultRoles();

    for (const roleData of defaultRoles) {
      const existingRole = await this.getRoleByName(roleData.name!, tenantId);

      if (!existingRole) {
        const roleDataWithTenant: any = {
          ...roleData,
          isSystem: true,
        };
        if (tenantId) {
          roleDataWithTenant.tenantId = tenantId;
        }
        const role = this.roleRepository.create(roleDataWithTenant);

        const savedRole = (await this.roleRepository.save(
          role
        )) as unknown as Role;
        this.logger.log(`Created default role: ${savedRole.name}`);

        // Assign default permissions to the role
        await this.assignDefaultPermissionsToRole(savedRole);
      }
    }

    this.logger.log('Default roles creation completed');
  }

  private async assignDefaultPermissionsToRole(role: Role): Promise<void> {
    const permissionNames = this.getDefaultPermissionsForRole(role.name);
    const permissions = await this.permissionRepository.find({
      where: { name: In(permissionNames) },
    });

    if (permissions && permissions.length > 0) {
      role.permissions = permissions;
      await this.roleRepository.save(role);
      this.logger.log(
        `Assigned ${permissions.length} permissions to role: ${role.name}`
      );
    } else {
      this.logger.warn(`No permissions found for role: ${role.name}`);
    }
  }

  private getDefaultPermissionsForRole(roleName: string): string[] {
    switch (roleName) {
      case 'Owner':
        return [
          'users:manage',
          'roles:manage',
          'permissions:manage',
          'tenants:manage',
          'teams:manage',
          'sessions:manage',
          'billing:manage',
          'subscriptions:manage',
          'files:manage',
          'notifications:manage',
          'reports:manage',
          'system_settings:manage',
        ];
      case 'Admin':
        return [
          'users:manage',
          'roles:manage',
          'permissions:manage',
          'teams:manage',
          'sessions:manage',
          'billing:manage',
          'subscriptions:manage',
          'files:manage',
          'notifications:manage',
          'reports:manage',
        ];
      case 'Manager':
        return [
          'users:read',
          'users:create',
          'users:update',
          'teams:manage',
          'files:manage',
          'notifications:manage',
          'reports:read',
          'reports:create',
        ];
      case 'Member':
        return [
          'users:read',
          'files:create',
          'files:read',
          'files:update',
          'notifications:read',
          'notifications:create',
        ];
      case 'Viewer':
        return ['users:read', 'files:read', 'notifications:read'];
      default:
        return [];
    }
  }

  private generateDefaultRoles(): Partial<Role>[] {
    return [
      {
        name: 'Owner',
        description: 'Full system access with ownership privileges',
        type: RoleType.SYSTEM,
        level: RoleLevel.OWNER,
        metadata: {
          canManageAll: true,
          canDeleteTenant: true,
          canManageBilling: true,
        },
      },
      {
        name: 'Admin',
        description: 'Administrative access with full tenant management',
        type: RoleType.SYSTEM,
        level: RoleLevel.ADMIN,
        metadata: {
          canManageUsers: true,
          canManageRoles: true,
          canManageSettings: true,
        },
      },
      {
        name: 'Manager',
        description: 'Team management with limited administrative access',
        type: RoleType.SYSTEM,
        level: RoleLevel.MANAGER,
        metadata: {
          canManageTeam: true,
          canViewReports: true,
          canManageFiles: true,
        },
      },
      {
        name: 'Member',
        description: 'Standard user with basic access',
        type: RoleType.SYSTEM,
        level: RoleLevel.MEMBER,
        metadata: {
          canCreateContent: true,
          canViewTeam: true,
          canUploadFiles: true,
        },
      },
      {
        name: 'Viewer',
        description: 'Read-only access with minimal permissions',
        type: RoleType.SYSTEM,
        level: RoleLevel.VIEWER,
        metadata: {
          canViewContent: true,
          canViewReports: false,
          canDownloadFiles: true,
        },
      },
    ];
  }

  private mapToResponseDto(role: Role): RoleResponseDto {
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

  async checkUserPermission(
    userId: string,
    resource: string,
    action: string,
    scope?: string
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      return false;
    }

    return user.roles.some(role => role.hasPermission(resource, action));
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      return [];
    }

    const permissions = new Set<string>();

    user.roles.forEach(role => {
      role.getAllPermissions().forEach(permission => {
        permissions.add(permission.getFullName());
      });
    });

    return Array.from(permissions);
  }
}
