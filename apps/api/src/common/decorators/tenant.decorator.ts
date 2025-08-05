import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantRequest } from '../middleware/tenant-isolation.middleware';

/**
 * Decorator to extract tenant ID from request
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    return request.tenantId;
  }
);

/**
 * Decorator to extract tenant object from request
 */
export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    return request.tenant;
  }
);

/**
 * Decorator to extract tenant context from request
 */
export const TenantContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    return request.tenantContext;
  }
);

/**
 * Decorator to extract specific tenant field from request
 */
export const TenantField = (field: string) =>
  createParamDecorator((data: unknown, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    return request.tenant?.[field];
  });

/**
 * Decorator to extract tenant name from request
 */
export const TenantName = TenantField('name');

/**
 * Decorator to extract tenant domain from request
 */
export const TenantDomain = TenantField('domain');

/**
 * Decorator to extract tenant plan from request
 */
export const TenantPlan = TenantField('plan');

/**
 * Decorator to extract tenant features from request
 */
export const TenantFeatures = TenantField('features');
