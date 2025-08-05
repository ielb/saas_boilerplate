import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import {
  TenantContextService,
  RequestTenantContext,
} from '../services/tenant-context.service';
import { TenantContext } from '@app/shared';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantInterceptor.name);

  constructor(private readonly tenantContextService: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract tenant context from request
    const tenantContext = this.extractTenantContext(request);

    if (tenantContext) {
      // Set tenant context for the current request
      this.tenantContextService.setTenantContext(tenantContext);

      this.logger.debug(
        `Tenant context set for request: ${request.method} ${request.url} - Tenant: ${tenantContext.tenantId}`
      );
    } else {
      this.logger.debug(
        `No tenant context found for request: ${request.method} ${request.url}`
      );
    }

    return next.handle().pipe(
      tap(() => {
        // Log request completion with tenant context
        const contextString =
          this.tenantContextService.getTenantContextString();
        this.logger.debug(
          `Request completed: ${request.method} ${request.url} - Context: ${contextString}`
        );
      })
    );
  }

  private extractTenantContext(request: Request): RequestTenantContext | null {
    // Method 1: Extract from authenticated user
    if (request.user && (request.user as any).tenantId) {
      const user = request.user as any;
      return {
        tenantId: user.tenantId,
        tenant: this.createTenantContextFromUser(user),
        userId: user.id,
        userEmail: user.email,
      };
    }

    // Method 2: Extract from headers (for API access)
    const tenantIdFromHeader = request.headers['x-tenant-id'] as string;
    if (tenantIdFromHeader) {
      const userId = request.headers['x-user-id'] as string;
      const userEmail = request.headers['x-user-email'] as string;
      return {
        tenantId: tenantIdFromHeader,
        tenant: this.createBasicTenantContext(tenantIdFromHeader),
        ...(userId && { userId }),
        ...(userEmail && { userEmail }),
      };
    }

    // Method 3: Extract from subdomain
    const tenantIdFromSubdomain = this.extractTenantFromSubdomain(request);
    if (tenantIdFromSubdomain) {
      return {
        tenantId: tenantIdFromSubdomain,
        tenant: this.createBasicTenantContext(tenantIdFromSubdomain),
      };
    }

    // Method 4: Extract from query parameters (for development/testing)
    const tenantIdFromQuery = request.query.tenantId as string;
    if (tenantIdFromQuery && process.env.NODE_ENV === 'development') {
      return {
        tenantId: tenantIdFromQuery,
        tenant: this.createBasicTenantContext(tenantIdFromQuery),
      };
    }

    return null;
  }

  private extractTenantFromSubdomain(request: Request): string | null {
    const host = request.get('host');
    if (!host) return null;

    // Extract subdomain from host
    // Example: tenant1.example.com -> tenant1
    const subdomain = host.split('.')[0];

    if (!subdomain) return null;

    // Skip common subdomains
    const commonSubdomains = [
      'www',
      'api',
      'admin',
      'app',
      'dev',
      'staging',
      'prod',
    ];
    if (commonSubdomains.includes(subdomain)) {
      return null;
    }

    // Validate subdomain format (alphanumeric and hyphens only)
    if (/^[a-z0-9-]+$/.test(subdomain)) {
      return subdomain;
    }

    return null;
  }

  private createTenantContextFromUser(user: any): TenantContext {
    return {
      id: user.tenantId,
      name: user.tenant?.name || 'Unknown Tenant',
      domain: user.tenant?.domain,
      settings: user.tenant?.settings || {},
      features: user.tenant?.features || [],
    };
  }

  private createBasicTenantContext(tenantId: string): TenantContext {
    return {
      id: tenantId,
      name: `Tenant ${tenantId}`,
      settings: {},
      features: [],
    };
  }
}
