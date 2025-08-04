import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { SecurityConfigService } from '../services/security-config.service';

@Injectable()
export class SecurityInterceptor implements NestInterceptor {
  constructor(private readonly securityConfigService: SecurityConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    // Apply additional security headers
    const additionalHeaders =
      this.securityConfigService.getAdditionalSecurityHeaders();

    Object.entries(additionalHeaders).forEach(([key, value]) => {
      response.setHeader(key, value);
    });

    // Add security-related response headers
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()'
    );

    // Add HSTS header in production
    if (process.env.NODE_ENV === 'production') {
      const hstsMaxAge = process.env.HSTS_MAX_AGE || '31536000';
      response.setHeader(
        'Strict-Transport-Security',
        `max-age=${hstsMaxAge}; includeSubDomains; preload`
      );
    }

    return next.handle().pipe(
      map(data => {
        // Add security context to response if needed (only for plain objects, not arrays)
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          return {
            ...data,
            _security: {
              timestamp: new Date().toISOString(),
              version: '1.0.0',
            },
          };
        }
        return data;
      })
    );
  }
}
