import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TenantRequest } from '../middleware/tenant-isolation.middleware';

@Injectable()
export class TenantScopingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantScopingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const tenantId = request.tenantId;

    // If no tenant context, proceed without scoping
    if (!tenantId) {
      return next.handle();
    }

    // Set tenant context for TypeORM query builder
    this.setTenantContext(tenantId);

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.debug(
            `Tenant scoping applied for tenant ${tenantId} on ${request.method} ${request.url}`
          );
        },
        error: error => {
          this.logger.error(
            `Error in tenant scoped request for tenant ${tenantId}: ${error.message}`
          );
        },
      })
    );
  }

  private setTenantContext(tenantId: string): void {
    // This method will be used to set tenant context for TypeORM
    // We'll implement this in the next step with a custom repository pattern
    // For now, we'll store it in a way that can be accessed by repositories
    (global as any).__currentTenantId = tenantId;
  }
}

/**
 * Utility function to get current tenant ID from global context
 */
export function getCurrentTenantId(): string | null {
  return (global as any).__currentTenantId || null;
}

/**
 * Utility function to require tenant context
 */
export function requireTenantContext(): string {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new ForbiddenException('Tenant context required');
  }
  return tenantId;
}

/**
 * Utility function to check if tenant context is available
 */
export function hasTenantContext(): boolean {
  return !!getCurrentTenantId();
}
