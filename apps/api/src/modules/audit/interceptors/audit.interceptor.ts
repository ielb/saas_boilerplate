import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, from } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { Request } from 'express';

import { AuditService } from '../services/audit.service';
import {
  AuditEventType,
  AuditEventStatus,
  AuditEventSeverity,
} from '../entities/audit-log.entity';

// Extend the Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface AuditEventConfig {
  eventType: AuditEventType;
  severity?: AuditEventSeverity;
  extractUserId?: (req: Request, result?: any) => string | undefined;
  extractUserEmail?: (req: Request, result?: any) => string | undefined;
  extractMetadata?: (req: Request, result?: any) => Record<string, any>;
  extractRequestData?: (req: Request) => Record<string, any>;
  extractResponseData?: (result: any) => Record<string, any>;
  shouldLog?: (req: Request, result?: any, error?: any) => boolean;
  onSuccess?: (auditLog: any) => void;
  onError?: (auditLog: any, error: any) => void;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();

    // Get audit configuration from metadata or use default
    const auditConfig = Reflect.getMetadata(
      'audit',
      handler
    ) as AuditEventConfig;

    if (!auditConfig) {
      // No audit configuration, just pass through
      this.logger.debug('No audit configuration found for handler');
      return next.handle();
    }

    this.logger.debug(
      `Audit interceptor active for event: ${auditConfig.eventType}`
    );
    const startTime = Date.now();

    return next.handle().pipe(
      tap(result => {
        // Handle success case
        from(
          this.logAuditEvent(
            request,
            result,
            auditConfig,
            AuditEventStatus.SUCCESS,
            undefined,
            Date.now() - startTime
          )
        ).subscribe({
          error: error => {
            this.logger.error(
              `Failed to log audit event: ${(error as Error).message}`,
              (error as Error).stack
            );
          },
        });
      }),
      catchError(error => {
        // Handle error case
        from(
          this.logAuditEvent(
            request,
            undefined,
            auditConfig,
            AuditEventStatus.FAILURE,
            error,
            Date.now() - startTime
          )
        ).subscribe({
          error: auditError => {
            this.logger.error(
              `Failed to log audit error event: ${(auditError as Error).message}`,
              (auditError as Error).stack
            );
          },
        });

        return throwError(() => error);
      })
    );
  }

  private async logAuditEvent(
    request: Request,
    result: any,
    config: AuditEventConfig,
    status: AuditEventStatus,
    error?: any,
    duration?: number
  ): Promise<void> {
    try {
      // Check if we should log this event
      if (config.shouldLog && !config.shouldLog(request, result, error)) {
        return;
      }

      // Extract user information
      const userId = config.extractUserId
        ? config.extractUserId(request, result)
        : undefined;
      const userEmail = config.extractUserEmail
        ? config.extractUserEmail(request, result)
        : undefined;

      // Build metadata
      const metadata: Record<string, any> = {
        duration,
        method: request.method,
        url: request.url,
        ...(config.extractMetadata
          ? config.extractMetadata(request, result)
          : {}),
      };

      // Add error information if present
      if (error) {
        metadata.errorCode =
          error.code || error.status || error.statusCode || 'UNKNOWN_ERROR';
        metadata.errorMessage = error.message || error.error || 'Unknown error';
        metadata.errorStack = error.stack;

        // Log the error for debugging
        this.logger.debug(`Audit logging error: ${error.message}`, error.stack);
      }

      // Extract request data
      const requestData = config.extractRequestData
        ? config.extractRequestData(request)
        : {
            body: request.body,
            query: request.query,
            params: request.params,
            headers: this.sanitizeHeaders(request.headers),
          };

      // Extract response data
      const responseData = config.extractResponseData
        ? config.extractResponseData(result)
        : {
            status: error ? 'error' : 'success',
            ...(result && typeof result === 'object' ? result : {}),
          };

      // Create audit log
      const auditLog = await this.auditService.logAuthEvent(
        {
          eventType: config.eventType,
          userId: userId || undefined,
          userEmail: userEmail || undefined,
          description: this.generateDescription(
            config.eventType,
            request,
            result,
            error
          ),
          metadata,
          requestData,
          responseData,
          errorCode: error?.code || error?.status || error?.statusCode,
          errorMessage: error?.message || error?.error,
          severity: config.severity || AuditEventSeverity.LOW,
          status,
          source: 'interceptor',
        },
        request
      );

      this.logger.debug(`Audit log created successfully: ${auditLog.id}`);

      // Call success/error callbacks
      if (status === AuditEventStatus.SUCCESS && config.onSuccess) {
        config.onSuccess(auditLog);
      } else if (status === AuditEventStatus.FAILURE && config.onError) {
        config.onError(auditLog, error);
      }
    } catch (auditError) {
      this.logger.error(
        `Failed to create audit log: ${(auditError as Error).message}`,
        (auditError as Error).stack
      );

      // Don't re-throw the audit error as it shouldn't break the main request
      // Just log it and continue
      this.logger.warn(
        'Audit logging failed, but continuing with request processing'
      );
    }
  }

  private generateDescription(
    eventType: AuditEventType,
    request: Request,
    result: any,
    error?: any
  ): string {
    const method = request.method;
    const url = request.url;
    const userEmail = request.body?.email || request.query?.email || 'unknown';

    switch (eventType) {
      case AuditEventType.USER_LOGIN:
        return `Login attempt via ${method} ${url}`;
      case AuditEventType.LOGIN_FAILED:
        return `Failed login attempt for ${userEmail} via ${method} ${url}`;
      case AuditEventType.USER_REGISTERED:
        return `User registration via ${method} ${url}`;
      case AuditEventType.USER_LOGOUT:
        return `User logout via ${method} ${url}`;
      case AuditEventType.PASSWORD_RESET_REQUESTED:
        return `Password reset requested for ${userEmail} via ${method} ${url}`;
      case AuditEventType.PASSWORD_RESET_COMPLETED:
        return `Password reset completed via ${method} ${url}`;
      case AuditEventType.MFA_VERIFIED:
        return `MFA verification via ${method} ${url}`;
      case AuditEventType.MFA_FAILED:
        return `MFA verification failed via ${method} ${url}`;
      case AuditEventType.ACCOUNT_RECOVERY_INITIATED:
        return `Account recovery initiated for ${userEmail} via ${method} ${url}`;
      case AuditEventType.ACCOUNT_RECOVERY_VERIFIED:
        return `Account recovery verified via ${method} ${url}`;
      case AuditEventType.ACCOUNT_RECOVERY_COMPLETED:
        return `Account recovery completed via ${method} ${url}`;
      case AuditEventType.ACCOUNT_RECOVERY_FAILED:
        return `Account recovery failed via ${method} ${url}`;
      case AuditEventType.SESSION_CREATED:
        return `Session created via ${method} ${url}`;
      case AuditEventType.SESSION_REFRESHED:
        return `Session refreshed via ${method} ${url}`;
      case AuditEventType.SESSION_REVOKED:
        return `Session revoked via ${method} ${url}`;
      case AuditEventType.SUSPICIOUS_ACTIVITY:
        return `Suspicious activity detected via ${method} ${url}`;
      case AuditEventType.BRUTE_FORCE_ATTEMPT:
        return `Brute force attempt detected via ${method} ${url}`;
      case AuditEventType.RATE_LIMIT_EXCEEDED:
        return `Rate limit exceeded via ${method} ${url}`;
      case AuditEventType.TENANT_CREATED:
        return `Tenant created via ${method} ${url}`;
      case AuditEventType.TENANT_UPDATED:
        return `Tenant updated via ${method} ${url}`;
      case AuditEventType.TENANT_DELETED:
        return `Tenant deleted via ${method} ${url}`;
      case AuditEventType.TENANT_RESTORED:
        return `Tenant restored via ${method} ${url}`;
      case AuditEventType.TENANT_VERIFIED:
        return `Tenant verified via ${method} ${url}`;
      case AuditEventType.FEATURE_FLAG_UPDATED:
        return `Feature flag updated via ${method} ${url}`;
      default:
        return `${eventType} via ${method} ${url}`;
    }
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }
}

// Decorator to mark methods for audit logging
export function AuditEvent(config: AuditEventConfig) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    Reflect.defineMetadata('audit', config, descriptor.value);
    return descriptor;
  };
}

// Predefined audit configurations for common authentication events
export const AuditConfigs = {
  // User registration
  USER_REGISTRATION: {
    eventType: AuditEventType.USER_REGISTERED,
    severity: AuditEventSeverity.MEDIUM,
    extractUserEmail: (req: Request, result: any) =>
      result?.user?.email || req.body?.email,
    extractUserId: (req: Request, result: any) => result?.user?.id,
    extractMetadata: (req: Request, result: any) => ({
      firstName: req.body?.firstName,
      lastName: req.body?.lastName,
      tenantId: result?.user?.tenantId,
    }),
  } as AuditEventConfig,

  // User login
  USER_LOGIN: {
    eventType: AuditEventType.USER_LOGIN,
    severity: AuditEventSeverity.LOW,
    extractUserEmail: (req: Request, result: any) => req.body?.email,
    extractUserId: (req: Request, result: any) => result?.user?.id,
    extractMetadata: (req: Request, result: any) => ({
      tenantId: result?.user?.tenantId,
      lastLoginAt: result?.user?.lastLoginAt,
    }),
  } as AuditEventConfig,

  // Login failure
  LOGIN_FAILED: {
    eventType: AuditEventType.LOGIN_FAILED,
    severity: AuditEventSeverity.MEDIUM,
    extractUserEmail: (req: Request, result: any) => req.body?.email,
    extractMetadata: (req: Request, result: any) => ({
      reason: 'Invalid credentials',
    }),
  } as AuditEventConfig,

  // User logout
  USER_LOGOUT: {
    eventType: AuditEventType.USER_LOGOUT,
    severity: AuditEventSeverity.LOW,
    extractUserId: (req: Request, result: any) => (req.user as any)?.id,
    extractUserEmail: (req: Request, result: any) => (req.user as any)?.email,
  } as AuditEventConfig,

  // Password reset request
  PASSWORD_RESET_REQUEST: {
    eventType: AuditEventType.PASSWORD_RESET_REQUESTED,
    severity: AuditEventSeverity.MEDIUM,
    extractUserEmail: (req: Request, result: any) => req.body?.email,
  } as AuditEventConfig,

  // Password reset completion
  PASSWORD_RESET_COMPLETED: {
    eventType: AuditEventType.PASSWORD_RESET_COMPLETED,
    severity: AuditEventSeverity.HIGH,
    extractUserEmail: (req: Request, result: any) => req.body?.email,
  } as AuditEventConfig,

  // MFA verification
  MFA_VERIFICATION: {
    eventType: AuditEventType.MFA_VERIFIED,
    severity: AuditEventSeverity.LOW,
    extractUserId: (req: Request, result: any) => (req.user as any)?.id,
    extractUserEmail: (req: Request, result: any) => (req.user as any)?.email,
  } as AuditEventConfig,

  // MFA failure
  MFA_FAILURE: {
    eventType: AuditEventType.MFA_FAILED,
    severity: AuditEventSeverity.MEDIUM,
    extractUserId: (req: Request, result: any) => (req.user as any)?.id,
    extractUserEmail: (req: Request, result: any) => (req.user as any)?.email,
  } as AuditEventConfig,

  // Account recovery initiated
  ACCOUNT_RECOVERY_INITIATED: {
    eventType: AuditEventType.ACCOUNT_RECOVERY_INITIATED,
    severity: AuditEventSeverity.MEDIUM,
    extractUserEmail: (req: Request, result: any) => req.body?.email,
  } as AuditEventConfig,

  // Account recovery verified
  ACCOUNT_RECOVERY_VERIFIED: {
    eventType: AuditEventType.ACCOUNT_RECOVERY_VERIFIED,
    severity: AuditEventSeverity.MEDIUM,
    extractUserEmail: (req: Request, result: any) => req.body?.email,
  } as AuditEventConfig,

  // Account recovery completed
  ACCOUNT_RECOVERY_COMPLETED: {
    eventType: AuditEventType.ACCOUNT_RECOVERY_COMPLETED,
    severity: AuditEventSeverity.HIGH,
    extractUserEmail: (req: Request, result: any) => req.body?.email,
  } as AuditEventConfig,

  // Account recovery failed
  ACCOUNT_RECOVERY_FAILED: {
    eventType: AuditEventType.ACCOUNT_RECOVERY_FAILED,
    severity: AuditEventSeverity.HIGH,
    extractUserEmail: (req: Request, result: any) => req.body?.email,
  } as AuditEventConfig,

  // Session events
  SESSION_CREATED: {
    eventType: AuditEventType.SESSION_CREATED,
    severity: AuditEventSeverity.LOW,
    extractUserId: (req: Request, result: any) => (req.user as any)?.id,
    extractUserEmail: (req: Request, result: any) => (req.user as any)?.email,
  } as AuditEventConfig,

  SESSION_REFRESHED: {
    eventType: AuditEventType.SESSION_REFRESHED,
    severity: AuditEventSeverity.LOW,
    extractUserId: (req: Request, result: any) => (req.user as any)?.id,
    extractUserEmail: (req: Request, result: any) => (req.user as any)?.email,
  } as AuditEventConfig,

  SESSION_REVOKED: {
    eventType: AuditEventType.SESSION_REVOKED,
    severity: AuditEventSeverity.LOW,
    extractUserId: (req: Request, result: any) => (req.user as any)?.id,
    extractUserEmail: (req: Request, result: any) => (req.user as any)?.email,
  } as AuditEventConfig,

  // Security events
  SUSPICIOUS_ACTIVITY: {
    eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
    severity: AuditEventSeverity.HIGH,
    extractUserId: (req: Request, result: any) => (req.user as any)?.id,
    extractUserEmail: (req: Request, result: any) => (req.user as any)?.email,
  } as AuditEventConfig,

  BRUTE_FORCE_ATTEMPT: {
    eventType: AuditEventType.BRUTE_FORCE_ATTEMPT,
    severity: AuditEventSeverity.CRITICAL,
    extractUserEmail: (req: Request, result: any) => req.body?.email,
  } as AuditEventConfig,

  RATE_LIMIT_EXCEEDED: {
    eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
    severity: AuditEventSeverity.MEDIUM,
    extractUserEmail: (req: Request, result: any) => req.body?.email,
  } as AuditEventConfig,

  // Tenant events
  TENANT_CREATED: {
    eventType: AuditEventType.TENANT_CREATED,
    severity: AuditEventSeverity.MEDIUM,
    extractUserId: (req: Request, result: any) => (req.user as any)?.id,
    extractUserEmail: (req: Request, result: any) => (req.user as any)?.email,
    extractMetadata: (req: Request, result: any) => ({
      tenantName: req.body?.name,
      tenantDomain: req.body?.domain,
      plan: req.body?.plan,
    }),
  } as AuditEventConfig,

  TENANT_UPDATED: {
    eventType: AuditEventType.TENANT_UPDATED,
    severity: AuditEventSeverity.LOW,
    extractUserId: (req: Request, result: any) => (req.user as any)?.id,
    extractUserEmail: (req: Request, result: any) => (req.user as any)?.email,
    extractMetadata: (req: Request, result: any) => ({
      tenantId: req.params?.id,
      updatedFields: Object.keys(req.body),
    }),
  } as AuditEventConfig,

  TENANT_DELETED: {
    eventType: AuditEventType.TENANT_DELETED,
    severity: AuditEventSeverity.HIGH,
    extractUserId: (req: Request, result: any) => (req.user as any)?.id,
    extractUserEmail: (req: Request, result: any) => (req.user as any)?.email,
    extractMetadata: (req: Request, result: any) => ({
      tenantId: req.params?.id,
    }),
  } as AuditEventConfig,

  TENANT_RESTORED: {
    eventType: AuditEventType.TENANT_RESTORED,
    severity: AuditEventSeverity.MEDIUM,
    extractUserId: (req: Request, result: any) => (req.user as any)?.id,
    extractUserEmail: (req: Request, result: any) => (req.user as any)?.email,
    extractMetadata: (req: Request, result: any) => ({
      tenantId: req.params?.id,
    }),
  } as AuditEventConfig,

  TENANT_VERIFIED: {
    eventType: AuditEventType.TENANT_VERIFIED,
    severity: AuditEventSeverity.MEDIUM,
    extractUserId: (req: Request, result: any) => (req.user as any)?.id,
    extractUserEmail: (req: Request, result: any) => (req.user as any)?.email,
    extractMetadata: (req: Request, result: any) => ({
      tenantId: req.params?.id,
    }),
  } as AuditEventConfig,

  FEATURE_FLAG_UPDATED: {
    eventType: AuditEventType.FEATURE_FLAG_UPDATED,
    severity: AuditEventSeverity.LOW,
    extractUserId: (req: Request, result: any) => (req.user as any)?.id,
    extractUserEmail: (req: Request, result: any) => (req.user as any)?.email,
    extractMetadata: (req: Request, result: any) => ({
      tenantId: req.params?.id,
      feature: req.params?.feature,
      enabled: req.body?.enabled,
    }),
  } as AuditEventConfig,
};
