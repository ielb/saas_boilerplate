import {
  PermissionAction,
  PermissionResource,
  PermissionScope,
} from '../../modules/rbac/entities/permission.entity';
import { SetMetadata } from '@nestjs/common';

export interface PermissionMetadata {
  resource: PermissionResource;
  action: PermissionAction;
  scope?: PermissionScope | undefined;
  conditions?: Record<string, any> | undefined;
}

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: PermissionMetadata[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequirePermission = (
  resource: PermissionResource,
  action: PermissionAction,
  scope?: PermissionScope,
  conditions?: Record<string, any>
) => RequirePermissions({ resource, action, scope, conditions });

// Convenience decorators for common CRUD operations
export const RequireCreate = (
  resource: PermissionResource,
  scope?: PermissionScope
) => RequirePermission(resource, PermissionAction.CREATE, scope);

export const RequireRead = (
  resource: PermissionResource,
  scope?: PermissionScope
) => RequirePermission(resource, PermissionAction.READ, scope);

export const RequireUpdate = (
  resource: PermissionResource,
  scope?: PermissionScope
) => RequirePermission(resource, PermissionAction.UPDATE, scope);

export const RequireDelete = (
  resource: PermissionResource,
  scope?: PermissionScope
) => RequirePermission(resource, PermissionAction.DELETE, scope);

export const RequireManage = (
  resource: PermissionResource,
  scope?: PermissionScope
) => RequirePermission(resource, PermissionAction.MANAGE, scope);

export const RequireApprove = (
  resource: PermissionResource,
  scope?: PermissionScope
) => RequirePermission(resource, PermissionAction.APPROVE, scope);

export const RequireReject = (
  resource: PermissionResource,
  scope?: PermissionScope
) => RequirePermission(resource, PermissionAction.REJECT, scope);

export const RequireExport = (
  resource: PermissionResource,
  scope?: PermissionScope
) => RequirePermission(resource, PermissionAction.EXPORT, scope);

export const RequireImport = (
  resource: PermissionResource,
  scope?: PermissionScope
) => RequirePermission(resource, PermissionAction.IMPORT, scope);

export const RequireAssign = (
  resource: PermissionResource,
  scope?: PermissionScope
) => RequirePermission(resource, PermissionAction.ASSIGN, scope);

export const RequireRevoke = (
  resource: PermissionResource,
  scope?: PermissionScope
) => RequirePermission(resource, PermissionAction.REVOKE, scope);
