import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SecurityConfigService } from '../services/security-config.service';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(private readonly securityConfigService: SecurityConfigService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Apply additional security headers
    const additionalHeaders =
      this.securityConfigService.getAdditionalSecurityHeaders();

    Object.entries(additionalHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Add request ID for tracking
    const requestId = this.generateRequestId();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Add security-related headers
    res.setHeader('X-Powered-By', 'SaaS Boilerplate');
    res.setHeader('X-API-Version', '1.0.0');

    // Validate CORS origin for non-OPTIONS requests
    if (req.method !== 'OPTIONS' && req.headers.origin) {
      const origin = req.headers.origin as string;
      if (!this.securityConfigService.validateCorsOrigin(origin)) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'CORS origin not allowed',
        });
        return;
      }
    }

    // Add security context to request
    req.securityContext = {
      requestId,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: this.getClientIp(req),
      method: req.method,
      path: req.path,
    };

    next();
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
}

// Extend Express Request interface to include security context
declare global {
  namespace Express {
    interface Request {
      securityContext?: {
        requestId: string;
        timestamp: string;
        userAgent: string;
        ip: string;
        method: string;
        path: string;
      };
    }
  }
}
