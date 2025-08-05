import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TenantRequest } from '../middleware/tenant-isolation.middleware';

export interface TenantContextResponse<T = any> {
  data: T;
  tenant?: {
    id: string;
    name: string;
    domain?: string;
    plan: string;
    features?: string[];
  };
  meta?: {
    tenantId: string;
    timestamp: string;
  };
}

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantContextInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const tenantContext = request.tenantContext;

    return next.handle().pipe(
      map(data => {
        // If no tenant context, return data as-is
        if (!tenantContext) {
          return data;
        }

        // If data is already wrapped in a response format, preserve it
        if (data && typeof data === 'object' && 'data' in data) {
          return {
            ...data,
            tenant: {
              id: tenantContext.id,
              name: tenantContext.name,
              ...(tenantContext.domain && { domain: tenantContext.domain }),
              plan: tenantContext.plan,
              ...(tenantContext.features && {
                features: tenantContext.features,
              }),
            },
            meta: {
              ...data.meta,
              tenantId: tenantContext.id,
              timestamp: new Date().toISOString(),
            },
          };
        }

        // Wrap data in tenant context response
        const response: TenantContextResponse = {
          data,
          tenant: {
            id: tenantContext.id,
            name: tenantContext.name,
            ...(tenantContext.domain && { domain: tenantContext.domain }),
            plan: tenantContext.plan,
            ...(tenantContext.features && { features: tenantContext.features }),
          },
          meta: {
            tenantId: tenantContext.id,
            timestamp: new Date().toISOString(),
          },
        };

        this.logger.debug(
          `Tenant context injected for ${request.method} ${request.url}`
        );

        return response;
      })
    );
  }
}
