import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  TENANT_SCOPED_KEY,
  TENANT_ISOLATION_KEY,
} from '../decorators/tenant.decorator';
import { TenantIsolationService } from '../services/tenant-isolation.service';

@Injectable()
export class TenantScopedGuard implements CanActivate {
  private readonly logger = new Logger(TenantScopedGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tenantIsolationService: TenantIsolationService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isTenantScoped = this.reflector.getAllAndOverride<boolean>(
      TENANT_SCOPED_KEY,
      [context.getHandler(), context.getClass()]
    );

    const requiresTenantIsolation = this.reflector.getAllAndOverride<boolean>(
      TENANT_ISOLATION_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If not tenant-scoped, allow access
    if (isTenantScoped === false) {
      return true;
    }

    // If tenant-scoped but no tenant context required, allow access
    if (isTenantScoped === undefined) {
      return true;
    }

    // Check if tenant context is available
    if (!this.tenantIsolationService.hasTenantContext()) {
      const request = context.switchToHttp().getRequest();
      this.logger.warn(
        `Tenant context required but not available for ${request.method} ${request.url}`
      );
      throw new ForbiddenException(
        'Tenant context is required for this operation'
      );
    }

    // If strict tenant isolation is required, ensure tenant context is properly set
    if (requiresTenantIsolation) {
      try {
        this.tenantIsolationService.ensureTenantContext();
        this.logger.debug(
          `Tenant isolation enforced for ${context.getClass().name}.${context.getHandler().name}`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Tenant isolation check failed: ${errorMessage}`,
          errorStack
        );
        throw error;
      }
    }

    return true;
  }
}
