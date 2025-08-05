import { Injectable, Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { TenantContext } from '@app/shared';

export interface RequestTenantContext {
  tenantId: string;
  tenant: TenantContext;
  userId?: string | undefined;
  userEmail?: string | undefined;
}

@Injectable()
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);
  private readonly asyncLocalStorage =
    new AsyncLocalStorage<RequestTenantContext>();

  /**
   * Set tenant context for the current request
   */
  setTenantContext(context: RequestTenantContext): void {
    this.asyncLocalStorage.enterWith(context);
    this.logger.debug(`Tenant context set: ${context.tenantId}`);
  }

  /**
   * Get tenant context for the current request
   */
  getTenantContext(): RequestTenantContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Get tenant ID for the current request
   */
  getTenantId(): string | undefined {
    const context = this.getTenantContext();
    return context?.tenantId;
  }

  /**
   * Get tenant object for the current request
   */
  getTenant(): TenantContext | undefined {
    const context = this.getTenantContext();
    return context?.tenant;
  }

  /**
   * Get user ID for the current request
   */
  getUserId(): string | undefined {
    const context = this.getTenantContext();
    return context?.userId;
  }

  /**
   * Get user email for the current request
   */
  getUserEmail(): string | undefined {
    const context = this.getTenantContext();
    return context?.userEmail;
  }

  /**
   * Check if tenant context is available
   */
  hasTenantContext(): boolean {
    return this.getTenantContext() !== undefined;
  }

  /**
   * Clear tenant context (useful for testing)
   */
  clearTenantContext(): void {
    this.asyncLocalStorage.disable();
    this.asyncLocalStorage.enterWith(undefined as any);
    this.logger.debug('Tenant context cleared');
  }

  /**
   * Run a function with specific tenant context
   */
  async runWithTenantContext<T>(
    context: RequestTenantContext,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Get tenant context as a string for logging
   */
  getTenantContextString(): string {
    const context = this.getTenantContext();
    if (!context) {
      return 'no-tenant-context';
    }
    return `${context.tenantId}${context.userId ? `:${context.userId}` : ''}`;
  }
}
