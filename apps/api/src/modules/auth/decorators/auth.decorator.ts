import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@app/shared';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const SKIP_AUTH_KEY = 'skipAuth';
export const TENANT_REQUIRED_KEY = 'tenantRequired';
export const MFA_REQUIRED_KEY = 'mfaRequired';

/**
 * Decorator to mark a route as public (no authentication required)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Decorator to skip authentication for a specific route
 */
export const SkipAuth = () => SetMetadata(SKIP_AUTH_KEY, true);

/**
 * Decorator to require specific roles for access
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Decorator to require a specific role for access
 */
export const Role = (role: UserRole) => SetMetadata(ROLES_KEY, [role]);

/**
 * Decorator to require tenant context for the route
 */
export const RequireTenant = () => SetMetadata(TENANT_REQUIRED_KEY, true);

/**
 * Decorator to require MFA for the route
 */
export const RequireMfa = () => SetMetadata(MFA_REQUIRED_KEY, true);

/**
 * Convenience decorators for common role requirements
 */
export const RequireOwner = () => Role(UserRole.OWNER);
export const RequireAdmin = () => Role(UserRole.ADMIN);
export const RequireManager = () => Role(UserRole.MANAGER);
export const RequireMember = () => Role(UserRole.MEMBER);
export const RequireViewer = () => Role(UserRole.VIEWER);

/**
 * Decorator to require admin or owner role
 */
export const RequireAdminOrOwner = () => Roles(UserRole.ADMIN, UserRole.OWNER);

/**
 * Decorator to require manager or higher role
 */
export const RequireManagerOrHigher = () =>
  Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER);

/**
 * Decorator to require member or higher role
 */
export const RequireMemberOrHigher = () =>
  Roles(UserRole.MEMBER, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER);
