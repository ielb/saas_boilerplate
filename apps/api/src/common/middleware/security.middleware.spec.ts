import { Test, TestingModule } from '@nestjs/testing';
import { SecurityMiddleware } from './security.middleware';
import { SecurityConfigService } from '../services/security-config.service';

describe('SecurityMiddleware', () => {
  let middleware: SecurityMiddleware;
  let securityConfigService: SecurityConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityMiddleware,
        {
          provide: SecurityConfigService,
          useValue: {
            getAdditionalSecurityHeaders: jest.fn(),
            validateCorsOrigin: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get<SecurityMiddleware>(SecurityMiddleware);
    securityConfigService = module.get<SecurityConfigService>(
      SecurityConfigService
    );
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {
        method: 'GET',
        path: '/api/test',
        headers: {
          'user-agent': 'test-agent',
          'x-forwarded-for': '192.168.1.1',
        },
        connection: {
          remoteAddress: '192.168.1.1',
        },
        socket: {
          remoteAddress: '192.168.1.1',
        },
      };

      mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockNext = jest.fn();

      // Mock security config service
      jest
        .spyOn(securityConfigService, 'getAdditionalSecurityHeaders')
        .mockReturnValue({
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
        });

      jest
        .spyOn(securityConfigService, 'validateCorsOrigin')
        .mockReturnValue(true);
    });

    it('should apply additional security headers', () => {
      middleware.use(mockReq, mockRes, mockNext);

      expect(
        securityConfigService.getAdditionalSecurityHeaders
      ).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block'
      );
    });

    it('should add request ID to headers and response', () => {
      middleware.use(mockReq, mockRes, mockNext);

      expect(mockReq.headers['x-request-id']).toBeDefined();
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        mockReq.headers['x-request-id']
      );
      expect(mockReq.headers['x-request-id']).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should add security-related headers', () => {
      middleware.use(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Powered-By',
        'SaaS Boilerplate'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-API-Version', '1.0.0');
    });

    it('should add security context to request', () => {
      middleware.use(mockReq, mockRes, mockNext);

      expect(mockReq.securityContext).toBeDefined();
      expect(mockReq.securityContext).toHaveProperty('requestId');
      expect(mockReq.securityContext).toHaveProperty('timestamp');
      expect(mockReq.securityContext).toHaveProperty('userAgent');
      expect(mockReq.securityContext).toHaveProperty('ip');
      expect(mockReq.securityContext).toHaveProperty('method');
      expect(mockReq.securityContext).toHaveProperty('path');

      expect(mockReq.securityContext.userAgent).toBe('test-agent');
      expect(mockReq.securityContext.ip).toBe('192.168.1.1');
      expect(mockReq.securityContext.method).toBe('GET');
      expect(mockReq.securityContext.path).toBe('/api/test');
    });

    it('should call next() when CORS origin is valid', () => {
      middleware.use(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate CORS origin for non-OPTIONS requests with origin header', () => {
      mockReq.method = 'POST';
      mockReq.headers.origin = 'http://localhost:3000';

      middleware.use(mockReq, mockRes, mockNext);

      expect(securityConfigService.validateCorsOrigin).toHaveBeenCalledWith(
        'http://localhost:3000'
      );
    });

    it('should not validate CORS origin for OPTIONS requests', () => {
      mockReq.method = 'OPTIONS';
      mockReq.headers.origin = 'http://localhost:3000';

      middleware.use(mockReq, mockRes, mockNext);

      expect(securityConfigService.validateCorsOrigin).not.toHaveBeenCalled();
    });

    it('should not validate CORS origin when no origin header is present', () => {
      mockReq.method = 'POST';
      delete mockReq.headers.origin;

      middleware.use(mockReq, mockRes, mockNext);

      expect(securityConfigService.validateCorsOrigin).not.toHaveBeenCalled();
    });

    it('should return 403 when CORS origin is invalid', () => {
      mockReq.method = 'POST';
      mockReq.headers.origin = 'http://malicious-site.com';
      jest
        .spyOn(securityConfigService, 'validateCorsOrigin')
        .mockReturnValue(false);

      middleware.use(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'CORS origin not allowed',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing user-agent header', () => {
      delete mockReq.headers['user-agent'];

      middleware.use(mockReq, mockRes, mockNext);

      expect(mockReq.securityContext.userAgent).toBe('unknown');
    });

    it('should get client IP from x-forwarded-for header', () => {
      mockReq.headers['x-forwarded-for'] = '203.0.113.1, 192.168.1.1';

      middleware.use(mockReq, mockRes, mockNext);

      expect(mockReq.securityContext.ip).toBe('203.0.113.1');
    });

    it('should get client IP from x-real-ip header', () => {
      delete mockReq.headers['x-forwarded-for'];
      mockReq.headers['x-real-ip'] = '203.0.113.1';

      middleware.use(mockReq, mockRes, mockNext);

      expect(mockReq.securityContext.ip).toBe('203.0.113.1');
    });

    it('should get client IP from connection.remoteAddress', () => {
      delete mockReq.headers['x-forwarded-for'];
      delete mockReq.headers['x-real-ip'];
      mockReq.connection.remoteAddress = '203.0.113.1';

      middleware.use(mockReq, mockRes, mockNext);

      expect(mockReq.securityContext.ip).toBe('203.0.113.1');
    });

    it('should get client IP from socket.remoteAddress', () => {
      delete mockReq.headers['x-forwarded-for'];
      delete mockReq.headers['x-real-ip'];
      delete mockReq.connection.remoteAddress;
      mockReq.socket.remoteAddress = '203.0.113.1';

      middleware.use(mockReq, mockRes, mockNext);

      expect(mockReq.securityContext.ip).toBe('203.0.113.1');
    });

    it('should return unknown when no IP address is available', () => {
      delete mockReq.headers['x-forwarded-for'];
      delete mockReq.headers['x-real-ip'];
      delete mockReq.connection.remoteAddress;
      delete mockReq.socket.remoteAddress;

      middleware.use(mockReq, mockRes, mockNext);

      expect(mockReq.securityContext.ip).toBe('unknown');
    });

    it('should generate unique request IDs', () => {
      middleware.use(mockReq, mockRes, mockNext);
      const firstRequestId = mockReq.headers['x-request-id'];

      // Reset for second call
      mockReq.headers['x-request-id'] = undefined;
      mockRes.setHeader.mockClear();

      middleware.use(mockReq, mockRes, mockNext);
      const secondRequestId = mockReq.headers['x-request-id'];

      expect(firstRequestId).not.toBe(secondRequestId);
      expect(firstRequestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(secondRequestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should handle IPv6 addresses', () => {
      mockReq.headers['x-forwarded-for'] = '2001:db8::1';

      middleware.use(mockReq, mockRes, mockNext);

      expect(mockReq.securityContext.ip).toBe('2001:db8::1');
    });

    it('should handle multiple IPs in x-forwarded-for', () => {
      mockReq.headers['x-forwarded-for'] = '203.0.113.1, 192.168.1.1, 10.0.0.1';

      middleware.use(mockReq, mockRes, mockNext);

      expect(mockReq.securityContext.ip).toBe('203.0.113.1');
    });
  });
});
