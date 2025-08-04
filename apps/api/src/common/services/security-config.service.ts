import { Injectable } from '@nestjs/common';
import { env, isProduction, isDevelopment } from '@app/config';

export interface SecurityHeadersConfig {
  enableSecurityHeaders: boolean;
  enableCSP: boolean;
  enableHSTS: boolean;
  hstsMaxAge: number;
  cspDirectives: Record<string, string[]>;
}

export interface CorsConfig {
  origin: string | string[] | boolean;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
}

@Injectable()
export class SecurityConfigService {
  /**
   * Get security headers configuration
   */
  getSecurityHeadersConfig(): SecurityHeadersConfig {
    return {
      enableSecurityHeaders: env.ENABLE_SECURITY_HEADERS,
      enableCSP: env.ENABLE_CSP,
      enableHSTS: env.ENABLE_HSTS,
      hstsMaxAge: env.HSTS_MAX_AGE,
      cspDirectives: this.getCSPDirectives(),
    };
  }

  /**
   * Get CORS configuration
   */
  getCorsConfig(): CorsConfig {
    const origins = env.CORS_ORIGIN.split(',').map(origin => origin.trim());

    return {
      origin: isDevelopment() ? origins : origins,
      credentials: env.CORS_CREDENTIALS,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Tenant-ID',
        'X-API-Key',
        'X-Request-ID',
        'X-Client-Version',
        'X-Device-ID',
        'X-Session-ID',
      ],
      exposedHeaders: [
        'X-Request-ID',
        'X-Rate-Limit-Limit',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset',
        'X-Total-Count',
        'X-Page-Count',
      ],
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
  }

  /**
   * Get Content Security Policy directives
   */
  private getCSPDirectives(): Record<string, string[]> {
    if (!env.ENABLE_CSP) {
      return {};
    }

    const baseDirectives = {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
    };

    if (isDevelopment()) {
      // Allow more permissive settings for development
      baseDirectives.scriptSrc.push("'unsafe-eval'");
      baseDirectives.connectSrc.push('ws:', 'wss:');
    }

    if (isProduction()) {
      // Stricter settings for production
      baseDirectives.styleSrc = ["'self'"]; // Remove unsafe-inline in production
      baseDirectives.connectSrc.push('https://api.stripe.com');
    }

    return baseDirectives;
  }

  /**
   * Get Helmet configuration
   */
  getHelmetConfig() {
    const securityConfig = this.getSecurityHeadersConfig();

    return {
      contentSecurityPolicy: securityConfig.enableCSP
        ? {
            directives: securityConfig.cspDirectives,
            reportOnly: false,
          }
        : false,
      crossOriginEmbedderPolicy: isProduction(),
      crossOriginOpenerPolicy: { policy: 'same-origin' as const },
      crossOriginResourcePolicy: { policy: 'same-site' as const },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' as const },
      hidePoweredBy: true,
      hsts: securityConfig.enableHSTS
        ? {
            maxAge: securityConfig.hstsMaxAge,
            includeSubDomains: true,
            preload: true,
          }
        : false,
      ieNoOpen: true,
      noSniff: true,
      permittedCrossDomainPolicies: { permittedPolicies: 'none' as const },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
      xssFilter: true,
    };
  }

  /**
   * Get additional security headers
   */
  getAdditionalSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };

    if (isProduction()) {
      headers['Strict-Transport-Security'] =
        `max-age=${env.HSTS_MAX_AGE}; includeSubDomains; preload`;
    }

    return headers;
  }

  /**
   * Validate CORS origin
   */
  validateCorsOrigin(origin: string): boolean {
    const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());

    if (isDevelopment()) {
      return true; // Allow all origins in development
    }

    return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig() {
    return {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX_REQUESTS,
      skipSuccessfulRequests: env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: any, res: any) => {
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000),
        });
      },
    };
  }

  /**
   * Get speed limiting configuration
   */
  getSpeedLimitConfig() {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 100, // allow 100 requests per 15 minutes, then...
      delayMs: (hits: number) => Math.max(0, (hits - 100) * 500), // begin adding 500ms of delay per request above 100
      maxDelayMs: 20000, // maximum delay of 20 seconds
    };
  }
}
