import { Test, TestingModule } from '@nestjs/testing';
import { SecurityInterceptor } from './security.interceptor';
import { SecurityConfigService } from '../services/security-config.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('SecurityInterceptor', () => {
  let interceptor: SecurityInterceptor;
  let securityConfigService: SecurityConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityInterceptor,
        {
          provide: SecurityConfigService,
          useValue: {
            getAdditionalSecurityHeaders: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<SecurityInterceptor>(SecurityInterceptor);
    securityConfigService = module.get<SecurityConfigService>(
      SecurityConfigService
    );
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    let mockExecutionContext: ExecutionContext;
    let mockCallHandler: CallHandler;
    let mockResponse: any;

    beforeEach(() => {
      mockResponse = {
        setHeader: jest.fn(),
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as any;

      mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'test' })),
      };

      // Mock security config service
      jest
        .spyOn(securityConfigService, 'getAdditionalSecurityHeaders')
        .mockReturnValue({
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
        });
    });

    it('should apply additional security headers from config service', () => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      expect(
        securityConfigService.getAdditionalSecurityHeaders
      ).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Frame-Options',
        'DENY'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block'
      );
    });

    it('should apply standard security headers', () => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Frame-Options',
        'DENY'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=()'
      );
    });

    it('should add HSTS header in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.HSTS_MAX_AGE = '31536000';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not add HSTS header in non-production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.any(String)
      );

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should use default HSTS max age when not set', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      delete process.env.HSTS_MAX_AGE;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should add security context to response data', () => {
      const testData = { message: 'Hello World' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(testData));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe(result => {
          expect(result).toHaveProperty('message', 'Hello World');
          expect(result).toHaveProperty('_security');
          expect(result._security).toHaveProperty('timestamp');
          expect(result._security).toHaveProperty('version', '1.0.0');
          expect(typeof result._security.timestamp).toBe('string');
        });
    });

    it('should not modify non-object responses', () => {
      const testData = 'Hello World';
      mockCallHandler.handle = jest.fn().mockReturnValue(of(testData));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe(result => {
          expect(result).toBe('Hello World');
          expect(result).not.toHaveProperty('_security');
        });
    });

    it('should not modify null responses', () => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe(result => {
          expect(result).toBeNull();
        });
    });

    it('should not modify undefined responses', () => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of(undefined));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe(result => {
          expect(result).toBeUndefined();
        });
    });

    it('should handle empty object responses', () => {
      const testData = {};
      mockCallHandler.handle = jest.fn().mockReturnValue(of(testData));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe(result => {
          expect(result).toHaveProperty('_security');
          expect(result._security).toHaveProperty('timestamp');
          expect(result._security).toHaveProperty('version', '1.0.0');
        });
    });

    it('should handle array responses', () => {
      const testData = [1, 2, 3];
      mockCallHandler.handle = jest.fn().mockReturnValue(of(testData));

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe(result => {
          expect(Array.isArray(result)).toBe(true);
          expect(result).toEqual([1, 2, 3]);
          // Arrays don't have properties like objects, so we can't test _security property
        });
    });

    it('should call the next handler', () => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should handle errors from the call handler', () => {
      // Test that the interceptor properly handles errors
      const error = new Error('Test error');
      mockCallHandler.handle = jest.fn().mockImplementation(() => {
        throw error;
      });

      expect(() => {
        interceptor
          .intercept(mockExecutionContext, mockCallHandler)
          .subscribe();
      }).toThrow('Test error');
    });
  });
});
