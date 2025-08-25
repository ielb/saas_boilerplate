import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PermissionService } from '../../modules/rbac/services/permission.service';
import { RoleService } from '../../modules/rbac/services/role.service';
import {
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '../../modules/rbac/entities/permission.entity';

@Injectable()
export class PermissionCheckerService {
  private readonly logger = new Logger(PermissionCheckerService.name);

  constructor(
    private readonly permissionService: PermissionService,
    private readonly roleService: RoleService
  ) {}

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(
    userId: string,
    resource: PermissionResource,
    action: PermissionAction,
    scope?: PermissionScope
  ): Promise<boolean> {
    const userPermissions = await this.roleService.getUserPermissions(userId);
    const permissionName = `${resource}:${action}`;
    const managePermissionName = `${resource}:manage`;

    return (
      userPermissions.includes(permissionName) ||
      userPermissions.includes(managePermissionName)
    );
  }

  /**
   * Check if a user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    permissions: Array<{
      resource: PermissionResource;
      action: PermissionAction;
      scope?: PermissionScope;
    }>
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (
        await this.hasPermission(
          userId,
          permission.resource,
          permission.action,
          permission.scope
        )
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a user has all of the specified permissions
   */
  async hasAllPermissions(
    userId: string,
    permissions: Array<{
      resource: PermissionResource;
      action: PermissionAction;
      scope?: PermissionScope;
    }>
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (
        !(await this.hasPermission(
          userId,
          permission.resource,
          permission.action,
          permission.scope
        ))
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Assert that a user has a specific permission, throw ForbiddenException if not
   */
  async assertPermission(
    userId: string,
    resource: PermissionResource,
    action: PermissionAction,
    scope?: PermissionScope
  ): Promise<void> {
    if (!(await this.hasPermission(userId, resource, action, scope))) {
      this.logger.warn(`User ${userId} denied access to ${resource}:${action}`);
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${resource}:${action}`
      );
    }
  }

  /**
   * Assert that a user has any of the specified permissions
   */
  async assertAnyPermission(
    userId: string,
    permissions: Array<{
      resource: PermissionResource;
      action: PermissionAction;
      scope?: PermissionScope;
    }>
  ): Promise<void> {
    if (!(await this.hasAnyPermission(userId, permissions))) {
      const permissionNames = permissions
        .map(p => `${p.resource}:${p.action}`)
        .join(' OR ');
      this.logger.warn(
        `User ${userId} denied access. Required permissions: ${permissionNames}`
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${permissionNames}`
      );
    }
  }

  /**
   * Assert that a user has all of the specified permissions
   */
  async assertAllPermissions(
    userId: string,
    permissions: Array<{
      resource: PermissionResource;
      action: PermissionAction;
      scope?: PermissionScope;
    }>
  ): Promise<void> {
    if (!(await this.hasAllPermissions(userId, permissions))) {
      const permissionNames = permissions
        .map(p => `${p.resource}:${p.action}`)
        .join(' AND ');
      this.logger.warn(
        `User ${userId} denied access. Required permissions: ${permissionNames}`
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${permissionNames}`
      );
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    return this.roleService.getUserPermissions(userId);
  }

  /**
   * Check if a user has permission for a specific resource and action combination
   */
  async canPerformAction(
    userId: string,
    resource: PermissionResource,
    action: PermissionAction
  ): Promise<boolean> {
    return this.hasPermission(userId, resource, action);
  }

  /**
   * Check if a user can create a specific resource
   */
  async canCreate(
    userId: string,
    resource: PermissionResource
  ): Promise<boolean> {
    return this.hasPermission(userId, resource, PermissionAction.CREATE);
  }

  /**
   * Check if a user can read a specific resource
   */
  async canRead(
    userId: string,
    resource: PermissionResource
  ): Promise<boolean> {
    return this.hasPermission(userId, resource, PermissionAction.READ);
  }

  /**
   * Check if a user can update a specific resource
   */
  async canUpdate(
    userId: string,
    resource: PermissionResource
  ): Promise<boolean> {
    return this.hasPermission(userId, resource, PermissionAction.UPDATE);
  }

  /**
   * Check if a user can delete a specific resource
   */
  async canDelete(
    userId: string,
    resource: PermissionResource
  ): Promise<boolean> {
    return this.hasPermission(userId, resource, PermissionAction.DELETE);
  }

  /**
   * Check if a user can manage a specific resource
   */
  async canManage(
    userId: string,
    resource: PermissionResource
  ): Promise<boolean> {
    return this.hasPermission(userId, resource, PermissionAction.MANAGE);
  }
}
