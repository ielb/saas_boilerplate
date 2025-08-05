import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from '../services/tenant-context.service';
import { TenantContext } from '@app/shared';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private readonly tenantContextService: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Extract tenant context from request
    const tenantContext = this.extractTenantContext(req);

    if (tenantContext) {
      // Set tenant context for the current request
      this.tenantContextService.setTenantContext(tenantContext);

      this.logger.debug(
        `Tenant middleware: context set for ${req.method} ${req.url} - Tenant: ${tenantContext.tenantId}`
      );
    } else {
      this.logger.debug(
        `Tenant middleware: no context found for ${req.method} ${req.url}`
      );
    }

    next();
  }

  private extractTenantContext(req: Request): {
    tenantId: string;
    tenant: TenantContext;
    userId?: string;
    userEmail?: string;
  } | null {
    // Method 1: Extract from authenticated user (if already set by auth middleware)
    if (req.user && (req.user as any).tenantId) {
      const user = req.user as any;
      return {
        tenantId: user.tenantId,
        tenant: this.createTenantContextFromUser(user),
        userId: user.id,
        userEmail: user.email,
      };
    }

    // Method 2: Extract from headers (for API access)
    const tenantIdFromHeader = req.headers['x-tenant-id'] as string;
    if (tenantIdFromHeader) {
      const userId = req.headers['x-user-id'] as string;
      const userEmail = req.headers['x-user-email'] as string;
      return {
        tenantId: tenantIdFromHeader,
        tenant: this.createBasicTenantContext(tenantIdFromHeader),
        ...(userId && { userId }),
        ...(userEmail && { userEmail }),
      };
    }

    // Method 3: Extract from subdomain
    const tenantIdFromSubdomain = this.extractTenantFromSubdomain(req);
    if (tenantIdFromSubdomain) {
      return {
        tenantId: tenantIdFromSubdomain,
        tenant: this.createBasicTenantContext(tenantIdFromSubdomain),
      };
    }

    // Method 4: Extract from query parameters (for development/testing)
    const tenantIdFromQuery = req.query.tenantId as string;
    if (tenantIdFromQuery && process.env.NODE_ENV === 'development') {
      return {
        tenantId: tenantIdFromQuery,
        tenant: this.createBasicTenantContext(tenantIdFromQuery),
      };
    }

    return null;
  }

  private extractTenantFromSubdomain(req: Request): string | null {
    const host = req.get('host');
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
