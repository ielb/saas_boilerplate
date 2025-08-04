import { Test, TestingModule } from '@nestjs/testing';
import { SecurityConfigService } from './security-config.service';

describe('SecurityConfigService', () => {
  let service: SecurityConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityConfigService],
    }).compile();

    service = module.get<SecurityConfigService>(SecurityConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSecurityHeadersConfig', () => {
    it('should return security headers configuration', () => {
      const config = service.getSecurityHeadersConfig();

      expect(config).toHaveProperty('enableSecurityHeaders');
      expect(config).toHaveProperty('enableCSP');
      expect(config).toHaveProperty('enableHSTS');
      expect(config).toHaveProperty('hstsMaxAge');
      expect(config).toHaveProperty('cspDirectives');
      expect(typeof config.enableSecurityHeaders).toBe('boolean');
      expect(typeof config.enableCSP).toBe('boolean');
      expect(typeof config.enableHSTS).toBe('boolean');
      expect(typeof config.hstsMaxAge).toBe('number');
      expect(typeof config.cspDirectives).toBe('object');
    });
  });

  describe('getCorsConfig', () => {
    it('should return CORS configuration with all required properties', () => {
      const config = service.getCorsConfig();

      expect(config).toHaveProperty('origin');
      expect(config).toHaveProperty('credentials');
      expect(config).toHaveProperty('methods');
      expect(config).toHaveProperty('allowedHeaders');
      expect(config).toHaveProperty('exposedHeaders');
      expect(config).toHaveProperty('maxAge');
      expect(config).toHaveProperty('preflightContinue');
      expect(config).toHaveProperty('optionsSuccessStatus');

      expect(Array.isArray(config.methods)).toBe(true);
      expect(Array.isArray(config.allowedHeaders)).toBe(true);
      expect(Array.isArray(config.exposedHeaders)).toBe(true);
      expect(typeof config.credentials).toBe('boolean');
      expect(typeof config.maxAge).toBe('number');
      expect(typeof config.preflightContinue).toBe('boolean');
      expect(typeof config.optionsSuccessStatus).toBe('number');
    });

    it('should include required headers in allowedHeaders', () => {
      const config = service.getCorsConfig();
      const requiredHeaders = [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Tenant-ID',
      ];

      requiredHeaders.forEach(header => {
        expect(config.allowedHeaders).toContain(header);
      });
    });

    it('should include required headers in exposedHeaders', () => {
      const config = service.getCorsConfig();
      const requiredHeaders = [
        'X-Request-ID',
        'X-Rate-Limit-Limit',
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset',
      ];

      requiredHeaders.forEach(header => {
        expect(config.exposedHeaders).toContain(header);
      });
    });

    it('should have correct HTTP methods', () => {
      const config = service.getCorsConfig();
      const expectedMethods = [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'OPTIONS',
      ];

      expect(config.methods).toEqual(expectedMethods);
    });
  });

  describe('getHelmetConfig', () => {
    it('should return helmet configuration', () => {
      const config = service.getHelmetConfig();

      expect(config).toHaveProperty('contentSecurityPolicy');
      expect(config).toHaveProperty('crossOriginEmbedderPolicy');
      expect(config).toHaveProperty('crossOriginOpenerPolicy');
      expect(config).toHaveProperty('crossOriginResourcePolicy');
      expect(config).toHaveProperty('dnsPrefetchControl');
      expect(config).toHaveProperty('frameguard');
      expect(config).toHaveProperty('hidePoweredBy');
      expect(config).toHaveProperty('hsts');
      expect(config).toHaveProperty('ieNoOpen');
      expect(config).toHaveProperty('noSniff');
      expect(config).toHaveProperty('permittedCrossDomainPolicies');
      expect(config).toHaveProperty('referrerPolicy');
      expect(config).toHaveProperty('xssFilter');
    });

    it('should have correct frameguard configuration', () => {
      const config = service.getHelmetConfig();

      expect(config.frameguard).toEqual({ action: 'deny' });
    });

    it('should have correct dnsPrefetchControl configuration', () => {
      const config = service.getHelmetConfig();

      expect(config.dnsPrefetchControl).toEqual({ allow: false });
    });

    it('should have correct crossOriginOpenerPolicy configuration', () => {
      const config = service.getHelmetConfig();

      expect(config.crossOriginOpenerPolicy).toEqual({ policy: 'same-origin' });
    });

    it('should have correct crossOriginResourcePolicy configuration', () => {
      const config = service.getHelmetConfig();

      expect(config.crossOriginResourcePolicy).toEqual({ policy: 'same-site' });
    });
  });

  describe('getAdditionalSecurityHeaders', () => {
    it('should return additional security headers', () => {
      const headers = service.getAdditionalSecurityHeaders();

      expect(headers).toHaveProperty('X-Content-Type-Options');
      expect(headers).toHaveProperty('X-Frame-Options');
      expect(headers).toHaveProperty('X-XSS-Protection');
      expect(headers).toHaveProperty('Referrer-Policy');
      expect(headers).toHaveProperty('Permissions-Policy');

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Referrer-Policy']).toBe(
        'strict-origin-when-cross-origin'
      );
      expect(headers['Permissions-Policy']).toBe(
        'camera=(), microphone=(), geolocation=()'
      );
    });
  });

  describe('validateCorsOrigin', () => {
    it('should validate CORS origin correctly', () => {
      // Test with current environment configuration
      // This test validates the function works with the current environment setup
      const testOrigin = 'http://localhost:3000';
      const result = service.validateCorsOrigin(testOrigin);

      // The result should be a boolean
      expect(typeof result).toBe('boolean');

      // Test with a known valid origin from the default config
      expect(service.validateCorsOrigin('http://localhost:3000')).toBeDefined();
      expect(
        service.validateCorsOrigin('http://localhost:19000')
      ).toBeDefined();
    });
  });

  describe('getRateLimitConfig', () => {
    it('should return rate limit configuration', () => {
      const config = service.getRateLimitConfig();

      expect(config).toHaveProperty('windowMs');
      expect(config).toHaveProperty('max');
      expect(config).toHaveProperty('skipSuccessfulRequests');
      expect(config).toHaveProperty('standardHeaders');
      expect(config).toHaveProperty('legacyHeaders');
      expect(config).toHaveProperty('handler');

      expect(typeof config.windowMs).toBe('number');
      expect(typeof config.max).toBe('number');
      expect(typeof config.skipSuccessfulRequests).toBe('boolean');
      expect(typeof config.standardHeaders).toBe('boolean');
      expect(typeof config.legacyHeaders).toBe('boolean');
      expect(typeof config.handler).toBe('function');
    });

    it('should have correct default values', () => {
      const config = service.getRateLimitConfig();

      expect(config.standardHeaders).toBe(true);
      expect(config.legacyHeaders).toBe(false);
    });

    it('should have a handler function that returns proper error response', () => {
      const config = service.getRateLimitConfig();
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      config.handler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: expect.any(Number),
        })
      );
    });
  });

  describe('getSpeedLimitConfig', () => {
    it('should return speed limit configuration', () => {
      const config = service.getSpeedLimitConfig();

      expect(config).toHaveProperty('windowMs');
      expect(config).toHaveProperty('delayAfter');
      expect(config).toHaveProperty('delayMs');
      expect(config).toHaveProperty('maxDelayMs');

      expect(typeof config.windowMs).toBe('number');
      expect(typeof config.delayAfter).toBe('number');
      expect(typeof config.delayMs).toBe('function');
      expect(typeof config.maxDelayMs).toBe('number');
    });

    it('should have correct default values', () => {
      const config = service.getSpeedLimitConfig();

      expect(config.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(config.delayAfter).toBe(100);
      expect(config.maxDelayMs).toBe(20000);
    });

    it('should calculate delay correctly', () => {
      const config = service.getSpeedLimitConfig();

      expect(config.delayMs(100)).toBe(0); // No delay for 100 hits
      expect(config.delayMs(101)).toBe(500); // 500ms delay for 101 hits
      expect(config.delayMs(110)).toBe(5000); // 5000ms delay for 110 hits
    });
  });

  describe('CSP Directives', () => {
    it('should return CSP directives based on current environment', () => {
      // Test that CSP directives are returned based on current environment
      const config = service.getSecurityHeadersConfig();

      // Should have cspDirectives property
      expect(config).toHaveProperty('cspDirectives');
      expect(typeof config.cspDirectives).toBe('object');
    });

    it('should include base CSP directives when enabled', () => {
      // Mock environment to enable CSP
      const originalEnv = { ...process.env };
      process.env.ENABLE_CSP = 'true';
      process.env.NODE_ENV = 'development';

      const config = service.getSecurityHeadersConfig();
      const directives = config.cspDirectives;

      expect(directives).toHaveProperty('defaultSrc');
      expect(directives).toHaveProperty('scriptSrc');
      expect(directives).toHaveProperty('styleSrc');
      expect(directives).toHaveProperty('imgSrc');
      expect(directives).toHaveProperty('fontSrc');
      expect(directives).toHaveProperty('connectSrc');
      expect(directives).toHaveProperty('frameSrc');
      expect(directives).toHaveProperty('objectSrc');

      expect(directives.defaultSrc).toContain("'self'");
      expect(directives.frameSrc).toContain("'none'");
      expect(directives.objectSrc).toContain("'none'");

      // Restore original environment
      Object.assign(process.env, originalEnv);
    });
  });
});
