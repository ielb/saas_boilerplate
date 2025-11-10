'use client';

import { useAuth } from '@/hooks/use-auth';
import type { UserRole } from '@shared/types/auth.types';

interface PermissionGateProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: string | string[];
  fallback?: React.ReactNode;
}

/**
 * Permission-based component rendering
 * Conditionally renders children based on user permissions
 */
export function PermissionGate({
  children,
  requiredRole,
  requiredPermission,
  fallback = null,
}: PermissionGateProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  // Check role-based access
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role as any)) {
      return <>{fallback}</>;
    }
  }

  // Check permission-based access
  // Note: This would require permissions to be loaded from the user object
  // For now, we'll just check roles. Permissions can be added later when the API provides them.
  if (requiredPermission) {
    // TODO: Implement permission checking when permissions are available in user object
    // const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    // const userPermissions = user.permissions || [];
    // const hasPermission = permissions.some(perm => userPermissions.includes(perm));
    // if (!hasPermission) {
    //   return <>{fallback}</>;
    // }
  }

  return <>{children}</>;
}

