import { SetMetadata } from '@nestjs/common';

export const TENANT_SCOPED_KEY = 'tenantScoped';
export const TENANT_ISOLATION_KEY = 'tenantIsolation';

/**
 * Decorator to mark a method as tenant-scoped (requires tenant context)
 */
export const TenantScoped = () => SetMetadata(TENANT_SCOPED_KEY, true);

/**
 * Decorator to mark a method as requiring strict tenant isolation
 * This ensures that all database operations are automatically scoped to the current tenant
 */
export const TenantIsolation = () => SetMetadata(TENANT_ISOLATION_KEY, true);

/**
 * Decorator to mark a method as requiring tenant context but allowing cross-tenant operations
 * Use this for admin operations that need to work across tenants
 */
export const RequireTenantContext = () => SetMetadata(TENANT_SCOPED_KEY, true);

/**
 * Decorator to mark a method as not requiring tenant context
 * Use this for global operations that should work regardless of tenant
 */
export const GlobalOperation = () => SetMetadata(TENANT_SCOPED_KEY, false);
