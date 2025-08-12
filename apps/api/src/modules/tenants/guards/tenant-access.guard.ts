import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantSwitchingService } from '../services/tenant-switching.service';

// Decorator metadata keys
export const TENANT_ACCESS_KEY = 'tenant-access';
export const REQUIRED_PERMISSIONS_KEY = 'required-permissions';

// Decorator for requiring tenant access
export const RequireTenantAccess = (permissions?: string[]) => {
  return (
    target: any,
    propertyName?: string,
    descriptor?: PropertyDescriptor
  ) => {
    Reflect.defineMetadata(
      TENANT_ACCESS_KEY,
      true,
      descriptor?.value ?? target
    );
    if (permissions?.length) {
      Reflect.defineMetadata(
        REQUIRED_PERMISSIONS_KEY,
        permissions,
        descriptor?.value ?? target
      );
    }
  };
};

@Injectable()
export class TenantAccessGuard implements CanActivate {
  private readonly logger = new Logger(TenantAccessGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => TenantSwitchingService))
    private readonly tenantSwitchingService: TenantSwitchingService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if tenant access is required for this route
    const requireTenantAccess = this.reflector.getAllAndOverride<boolean>(
      TENANT_ACCESS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requireTenantAccess) {
      return true; // No tenant access requirement
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('TenantAccessGuard: No user in request context');
      throw new ForbiddenException('Authentication required');
    }

    // Get tenant ID from different sources
    const tenantId = this.extractTenantId(request);

    if (!tenantId) {
      this.logger.warn(
        `TenantAccessGuard: No tenant ID found for user ${user.id}`
      );
      throw new ForbiddenException('Tenant context required');
    }

    try {
      // Verify user has access to the tenant
      const accessResult = await this.tenantSwitchingService.verifyTenantAccess(
        user.id,
        {
          tenantId,
        }
      );

      if (!accessResult.hasAccess) {
        this.logger.warn(
          `TenantAccessGuard: User ${user.id} denied access to tenant ${tenantId}. Reason: ${accessResult.reason}`
        );
        throw new ForbiddenException(
          accessResult.reason || 'Access denied to this tenant'
        );
      }

      // Check specific permissions if required
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
        REQUIRED_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()]
      );

      if (requiredPermissions?.length) {
        const hasAllPermissions = requiredPermissions.every(permission =>
          accessResult.permissions.includes(permission)
        );

        if (!hasAllPermissions) {
          const missingPermissions = requiredPermissions.filter(
            permission => !accessResult.permissions.includes(permission)
          );

          this.logger.warn(
            `TenantAccessGuard: User ${user.id} missing permissions for tenant ${tenantId}: ${missingPermissions.join(', ')}`
          );

          throw new ForbiddenException(
            `Missing required permissions: ${missingPermissions.join(', ')}`
          );
        }
      }

      // Add tenant access info to request context
      request.tenantAccess = {
        tenantId,
        role: accessResult.role,
        status: accessResult.status,
        permissions: accessResult.permissions,
        tenant: accessResult.tenant,
      };

      this.logger.debug(
        `TenantAccessGuard: User ${user.id} granted access to tenant ${tenantId} with role ${accessResult.role}`
      );

      return true;
    } catch (error: any) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `TenantAccessGuard: Error verifying tenant access for user ${user.id} to tenant ${tenantId}: ${error.message}`,
        error.stack
      );

      throw new ForbiddenException('Unable to verify tenant access');
    }
  }

  /**
   * Extract tenant ID from request in order of preference:
   * 1. Route parameter (:tenantId)
   * 2. Query parameter (?tenantId)
   * 3. Request body (tenantId field)
   * 4. User's current tenant (from JWT)
   * 5. Header (x-tenant-id)
   */
  private extractTenantId(request: any): string | null {
    // 1. Route parameter
    if (request.params?.tenantId) {
      return request.params.tenantId;
    }

    // 2. Query parameter
    if (request.query?.tenantId) {
      return request.query.tenantId;
    }

    // 3. Request body
    if (request.body?.tenantId) {
      return request.body.tenantId;
    }

    // 4. User's current tenant from JWT
    if (request.user?.tenantId) {
      return request.user.tenantId;
    }

    // 5. Header
    if (request.headers['x-tenant-id']) {
      return request.headers['x-tenant-id'];
    }

    return null;
  }
}

// Type augmentation for request object
declare global {
  namespace Express {
    interface Request {
      tenantAccess?: {
        tenantId: string;
        role: string;
        status: string;
        permissions: string[];
        tenant?: {
          id: string;
          name: string;
          domain?: string;
          plan: string;
          features: string[];
        };
      };
    }
  }
}
