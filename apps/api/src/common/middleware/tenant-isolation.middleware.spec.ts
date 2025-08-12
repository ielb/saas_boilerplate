import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  TenantIsolationMiddleware,
  TenantRequest,
} from './tenant-isolation.middleware';
import { TenantService } from '../../modules/tenants/services/tenant.service';
import { TenantSwitchingService } from '../../modules/tenants/services/tenant-switching.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

// Create a partial mock type for testing
type MockTenantRequest = Partial<TenantRequest> & {
  headers: Record<string, any>;
  method: string;
  url: string;
  get: jest.Mock;
  user?: any;
};

describe('TenantIsolationMiddleware', () => {
  let middleware: TenantIsolationMiddleware;
  let jwtService: JwtService;
  let tenantService: TenantService;

  const mockTenant = {
    id: 'tenant-123',
    name: 'Test Tenant',
    domain: 'test.example.com',
    plan: 'pro',
    features: ['feature1', 'feature2'],
    settings: { setting1: 'value1' },
    isActive: true,
  };

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockTenantService = {
    getTenantById: jest.fn(),
    getTenantByDomain: jest.fn(),
  };

  const mockTenantSwitchingService = {
    getUserTenantMemberships: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantIsolationMiddleware,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
        {
          provide: TenantSwitchingService,
          useValue: mockTenantSwitchingService,
        },
      ],
    }).compile();

    middleware = module.get<TenantIsolationMiddleware>(
      TenantIsolationMiddleware
    );
    jwtService = module.get<JwtService>(JwtService);
    tenantService = module.get<TenantService>(TenantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should set tenant context when tenant ID is found via header', async () => {
      const req: MockTenantRequest = {
        headers: { 'x-tenant-id': 'tenant-123' },
        method: 'GET',
        url: '/api/test',
        get: jest.fn(),
      };
      const res = {} as any;
      const next = jest.fn();

      mockTenantService.getTenantById.mockResolvedValue(mockTenant);

      await middleware.use(req, res, next);

      expect(req.tenantId).toBe('tenant-123');
      expect(req.tenant).toEqual(mockTenant);
      expect(req.tenantContext).toEqual({
        id: mockTenant.id,
        name: mockTenant.name,
        domain: mockTenant.domain,
        plan: mockTenant.plan,
        features: mockTenant.features,
        settings: mockTenant.settings,
      });
      expect(next).toHaveBeenCalled();
    });

    it('should set tenant context when tenant is found via subdomain', async () => {
      const req: MockTenantRequest = {
        headers: {},
        get: jest.fn().mockReturnValue('test.example.com'),
        method: 'GET',
        url: '/api/test',
      };
      const res = {} as any;
      const next = jest.fn();

      mockTenantService.getTenantByDomain.mockResolvedValue(mockTenant);

      await middleware.use(req, res, next);

      expect(req.tenantId).toBe('tenant-123');
      expect(req.tenant).toEqual(mockTenant);
      expect(next).toHaveBeenCalled();
    });

    it('should set tenant context when tenant is found via JWT token', async () => {
      const req: MockTenantRequest = {
        headers: { authorization: 'Bearer valid-token' },
        method: 'GET',
        url: '/api/test',
        get: jest.fn(),
      };
      const res = {} as any;
      const next = jest.fn();

      mockJwtService.verify.mockReturnValue({ tenantId: 'tenant-123' });
      mockTenantService.getTenantById.mockResolvedValue(mockTenant);

      await middleware.use(req, res, next);

      expect(req.tenantId).toBe('tenant-123');
      expect(req.tenant).toEqual(mockTenant);
      expect(next).toHaveBeenCalled();
    });

    it('should set tenant context when user has tenant ID', async () => {
      const req: MockTenantRequest = {
        headers: {},
        user: { id: 'user-123', tenantId: 'tenant-123' },
        method: 'GET',
        url: '/api/test',
        get: jest.fn(),
      };
      const res = {} as any;
      const next = jest.fn();

      mockTenantService.getTenantById.mockResolvedValue(mockTenant);

      await middleware.use(req, res, next);

      expect(req.tenantId).toBe('tenant-123');
      expect(req.tenant).toEqual(mockTenant);
      expect(next).toHaveBeenCalled();
    });

    it('should not set tenant context when no tenant is found', async () => {
      const req: MockTenantRequest = {
        headers: {},
        method: 'GET',
        url: '/api/test',
        get: jest.fn(),
      };
      const res = {} as any;
      const next = jest.fn();

      await middleware.use(req, res, next);

      expect(req.tenantId).toBeUndefined();
      expect(req.tenant).toBeUndefined();
      expect(req.tenantContext).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should throw BadRequestException when tenant is not found', async () => {
      const req: MockTenantRequest = {
        headers: { 'x-tenant-id': 'invalid-tenant' },
        method: 'GET',
        url: '/api/test',
        get: jest.fn(),
      };
      const res = {} as any;
      const next = jest.fn();

      mockTenantService.getTenantById.mockResolvedValue(null);

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid tenant context',
        })
      );
    });

    it('should throw UnauthorizedException when tenant is inactive', async () => {
      const inactiveTenant = { ...mockTenant, isActive: false };
      const req: MockTenantRequest = {
        headers: { 'x-tenant-id': 'tenant-123' },
        method: 'GET',
        url: '/api/test',
        get: jest.fn(),
      };
      const res = {} as any;
      const next = jest.fn();

      mockTenantService.getTenantById.mockResolvedValue(inactiveTenant);

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Tenant is inactive',
        })
      );
    });

    it('should handle errors gracefully and call next with error', async () => {
      const req: MockTenantRequest = {
        headers: { 'x-tenant-id': 'tenant-123' },
        method: 'GET',
        url: '/api/test',
        get: jest.fn(),
      };
      const res = {} as any;
      const next = jest.fn();

      mockTenantService.getTenantById.mockRejectedValue(
        new Error('Database error')
      );

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database error',
        })
      );
    });
  });

  describe('extractSubdomain', () => {
    it('should extract subdomain from hostname', () => {
      const req = {
        get: jest.fn().mockReturnValue('subdomain.example.com'),
      } as any;

      const result = (middleware as any).extractSubdomain(req);
      expect(result).toBe('subdomain');
    });

    it('should handle localhost development with x-forwarded-host', () => {
      const req = {
        get: jest
          .fn()
          .mockReturnValueOnce('localhost:3000')
          .mockReturnValueOnce('subdomain.localhost:3000'),
      } as any;

      const result = (middleware as any).extractSubdomain(req);
      expect(result).toBe('subdomain');
    });

    it('should handle localhost development with x-subdomain', () => {
      const req = {
        get: jest
          .fn()
          .mockReturnValueOnce('localhost:3000')
          .mockReturnValueOnce(null)
          .mockReturnValueOnce('subdomain'),
      } as any;

      const result = (middleware as any).extractSubdomain(req);
      expect(result).toBe('subdomain');
    });

    it('should return null for invalid hostnames', () => {
      const req = {
        get: jest.fn().mockReturnValue('example.com'),
      } as any;

      const result = (middleware as any).extractSubdomain(req);
      expect(result).toBeNull();
    });

    it('should return null when host is not available', () => {
      const req = {
        get: jest.fn().mockReturnValue(null),
      } as any;

      const result = (middleware as any).extractSubdomain(req);
      expect(result).toBeNull();
    });
  });

  describe('extractTenantFromToken', () => {
    it('should extract tenant ID from valid JWT token', async () => {
      const req = {
        headers: { authorization: 'Bearer valid-token' },
      } as any;

      mockJwtService.verify.mockReturnValue({ tenantId: 'tenant-123' });

      const result = await (middleware as any).extractTenantFromToken(req);
      expect(result).toBe('tenant-123');
    });

    it('should return null when no authorization header', async () => {
      const req = {
        headers: {},
      } as any;

      const result = await (middleware as any).extractTenantFromToken(req);
      expect(result).toBeNull();
    });

    it('should return null when authorization header is not Bearer', async () => {
      const req = {
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
      } as any;

      const result = await (middleware as any).extractTenantFromToken(req);
      expect(result).toBeNull();
    });

    it('should return null when JWT verification fails', async () => {
      const req = {
        headers: { authorization: 'Bearer invalid-token' },
      } as any;

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await (middleware as any).extractTenantFromToken(req);
      expect(result).toBeNull();
    });

    it('should return null when token has no tenant ID', async () => {
      const req = {
        headers: { authorization: 'Bearer valid-token' },
      } as any;

      mockJwtService.verify.mockReturnValue({ userId: 'user-123' });

      const result = await (middleware as any).extractTenantFromToken(req);
      expect(result).toBeNull();
    });
  });
});
