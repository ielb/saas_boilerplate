import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { TenantCacheUtil } from '../utils/tenant-cache.util';

// Decorator to mark methods for caching
export const TENANT_CACHE_KEY = 'tenant-cache';
export const TenantCache = (options: {
  key: string;
  ttl?: number;
  invalidateOn?: string[];
}) => {
  return (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) => {
    Reflect.defineMetadata(TENANT_CACHE_KEY, options, descriptor.value);
  };
};

@Injectable()
export class TenantCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantCacheInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly cacheUtil: TenantCacheUtil
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const cacheOptions = this.reflector.get<{
      key: string;
      ttl?: number;
      invalidateOn?: string[];
    }>(TENANT_CACHE_KEY, context.getHandler());

    if (!cacheOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const cacheKey = this.buildCacheKey(cacheOptions.key, request);

    try {
      // Try to get from cache first
      const cachedResult = await this.cacheUtil.get(cacheKey);
      if (cachedResult) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        return new Observable(observer => {
          observer.next(cachedResult);
          observer.complete();
        });
      }

      // Execute the method and cache the result
      return next.handle().pipe(
        tap(async result => {
          if (result && !result.error) {
            await this.cacheUtil.set(cacheKey, result, cacheOptions.ttl);
            this.logger.debug(`Cached result for key: ${cacheKey}`);
          }
        })
      );
    } catch (error) {
      this.logger.warn(
        `Cache interceptor error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return next.handle();
    }
  }

  private buildCacheKey(template: string, request: any): string {
    let cacheKey = template;

    // Replace placeholders with actual values
    const replacements = {
      '{userId}': request.user?.id || 'unknown',
      '{tenantId}':
        request.params?.tenantId ||
        request.body?.tenantId ||
        request.user?.tenantId ||
        'unknown',
      '{membershipId}': request.params?.membershipId || 'unknown',
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      cacheKey = cacheKey.replace(placeholder, value);
    });

    return cacheKey;
  }
}

// Cache invalidation interceptor
@Injectable()
export class TenantCacheInvalidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantCacheInvalidationInterceptor.name);

  constructor(private readonly cacheUtil: TenantCacheUtil) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(async result => {
        if (result && result.success !== false) {
          await this.invalidateRelevantCaches(context);
        }
      })
    );
  }

  private async invalidateRelevantCaches(
    context: ExecutionContext
  ): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const methodName = context.getHandler().name;
    const userId = request.user?.id;
    const tenantId = request.params?.tenantId || request.body?.tenantId;

    try {
      // Invalidate based on method name
      switch (methodName) {
        case 'switchTenant':
          if (userId) {
            await this.cacheUtil.clearUserCache(userId);
          }
          break;

        case 'addUserToTenant':
        case 'removeUserFromTenant':
          if (userId) {
            await this.cacheUtil.clearUserCache(userId);
          }
          if (tenantId) {
            await this.cacheUtil.clearTenantCache(tenantId);
          }
          break;

        case 'updateMembership':
          if (userId && tenantId) {
            const accessKey = TenantCacheUtil.getUserAccessKey(
              userId,
              tenantId
            );
            await this.cacheUtil.del(accessKey);
            await this.cacheUtil.clearUserCache(userId);
          }
          break;

        default:
          // For other methods, clear user cache if available
          if (userId) {
            const membershipKey = TenantCacheUtil.getUserMembershipsKey(userId);
            await this.cacheUtil.del(membershipKey);
          }
          break;
      }

      this.logger.debug(
        `Cache invalidation completed for method: ${methodName}`
      );
    } catch (error) {
      this.logger.warn(
        `Cache invalidation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

