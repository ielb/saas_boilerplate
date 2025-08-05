import { Test, TestingModule } from '@nestjs/testing';
import {
  TenantContextService,
  RequestTenantContext,
} from './tenant-context.service';
import { TenantContext } from '@app/shared';

describe('TenantContextService', () => {
  let service: TenantContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantContextService],
    }).compile();

    service = module.get<TenantContextService>(TenantContextService);
  });

  afterEach(() => {
    // Clear tenant context after each test
    service.clearTenantContext();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setTenantContext', () => {
    it('should set tenant context', () => {
      const context: RequestTenantContext = {
        tenantId: 'test-tenant-1',
        tenant: {
          id: 'test-tenant-1',
          name: 'Test Tenant 1',
          settings: {},
          features: [],
        },
        userId: 'user-1',
        userEmail: 'user1@example.com',
      };

      service.setTenantContext(context);

      expect(service.getTenantContext()).toEqual(context);
      expect(service.getTenantId()).toBe('test-tenant-1');
      expect(service.getTenant()).toEqual(context.tenant);
      expect(service.getUserId()).toBe('user-1');
      expect(service.getUserEmail()).toBe('user1@example.com');
    });

    it('should handle context without user information', () => {
      const context: RequestTenantContext = {
        tenantId: 'test-tenant-2',
        tenant: {
          id: 'test-tenant-2',
          name: 'Test Tenant 2',
          settings: {},
          features: [],
        },
      };

      service.setTenantContext(context);

      expect(service.getTenantContext()).toEqual(context);
      expect(service.getTenantId()).toBe('test-tenant-2');
      expect(service.getUserId()).toBeUndefined();
      expect(service.getUserEmail()).toBeUndefined();
    });
  });

  describe('getTenantContext', () => {
    it('should return undefined when no context is set', () => {
      expect(service.getTenantContext()).toBeUndefined();
    });

    it('should return the set context', () => {
      const context: RequestTenantContext = {
        tenantId: 'test-tenant',
        tenant: {
          id: 'test-tenant',
          name: 'Test Tenant',
          settings: {},
          features: [],
        },
      };

      service.setTenantContext(context);
      expect(service.getTenantContext()).toEqual(context);
    });
  });

  describe('getTenantId', () => {
    it('should return undefined when no context is set', () => {
      expect(service.getTenantId()).toBeUndefined();
    });

    it('should return tenant ID from context', () => {
      const context: RequestTenantContext = {
        tenantId: 'test-tenant',
        tenant: {
          id: 'test-tenant',
          name: 'Test Tenant',
          settings: {},
          features: [],
        },
      };

      service.setTenantContext(context);
      expect(service.getTenantId()).toBe('test-tenant');
    });
  });

  describe('getTenant', () => {
    it('should return undefined when no context is set', () => {
      expect(service.getTenant()).toBeUndefined();
    });

    it('should return tenant from context', () => {
      const tenant: TenantContext = {
        id: 'test-tenant',
        name: 'Test Tenant',
        settings: { theme: 'dark' },
        features: ['feature1', 'feature2'],
      };

      const context: RequestTenantContext = {
        tenantId: 'test-tenant',
        tenant,
      };

      service.setTenantContext(context);
      expect(service.getTenant()).toEqual(tenant);
    });
  });

  describe('getUserId', () => {
    it('should return undefined when no context is set', () => {
      expect(service.getUserId()).toBeUndefined();
    });

    it('should return user ID from context', () => {
      const context: RequestTenantContext = {
        tenantId: 'test-tenant',
        tenant: {
          id: 'test-tenant',
          name: 'Test Tenant',
          settings: {},
          features: [],
        },
        userId: 'user-123',
      };

      service.setTenantContext(context);
      expect(service.getUserId()).toBe('user-123');
    });
  });

  describe('getUserEmail', () => {
    it('should return undefined when no context is set', () => {
      expect(service.getUserEmail()).toBeUndefined();
    });

    it('should return user email from context', () => {
      const context: RequestTenantContext = {
        tenantId: 'test-tenant',
        tenant: {
          id: 'test-tenant',
          name: 'Test Tenant',
          settings: {},
          features: [],
        },
        userEmail: 'user@example.com',
      };

      service.setTenantContext(context);
      expect(service.getUserEmail()).toBe('user@example.com');
    });
  });

  describe('hasTenantContext', () => {
    it('should return false when no context is set', () => {
      expect(service.hasTenantContext()).toBe(false);
    });

    it('should return true when context is set', () => {
      const context: RequestTenantContext = {
        tenantId: 'test-tenant',
        tenant: {
          id: 'test-tenant',
          name: 'Test Tenant',
          settings: {},
          features: [],
        },
      };

      service.setTenantContext(context);
      expect(service.hasTenantContext()).toBe(true);
    });
  });

  describe('clearTenantContext', () => {
    it('should clear tenant context', () => {
      const context: RequestTenantContext = {
        tenantId: 'test-tenant',
        tenant: {
          id: 'test-tenant',
          name: 'Test Tenant',
          settings: {},
          features: [],
        },
      };

      service.setTenantContext(context);
      expect(service.hasTenantContext()).toBe(true);

      service.clearTenantContext();
      expect(service.hasTenantContext()).toBe(false);
      expect(service.getTenantContext()).toBeUndefined();
    });
  });

  describe('runWithTenantContext', () => {
    it('should run function with specific tenant context', async () => {
      const context: RequestTenantContext = {
        tenantId: 'test-tenant',
        tenant: {
          id: 'test-tenant',
          name: 'Test Tenant',
          settings: {},
          features: [],
        },
      };

      const result = await service.runWithTenantContext(context, async () => {
        expect(service.getTenantId()).toBe('test-tenant');
        return 'test-result';
      });

      expect(result).toBe('test-result');
      expect(service.hasTenantContext()).toBe(false); // Context should be cleared after function execution
    });

    it('should handle errors in function execution', async () => {
      const context: RequestTenantContext = {
        tenantId: 'test-tenant',
        tenant: {
          id: 'test-tenant',
          name: 'Test Tenant',
          settings: {},
          features: [],
        },
      };

      await expect(
        service.runWithTenantContext(context, async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      expect(service.hasTenantContext()).toBe(false); // Context should be cleared even after error
    });
  });

  describe('getTenantContextString', () => {
    it('should return no-tenant-context when no context is set', () => {
      expect(service.getTenantContextString()).toBe('no-tenant-context');
    });

    it('should return tenant ID when only tenant context is set', () => {
      const context: RequestTenantContext = {
        tenantId: 'test-tenant',
        tenant: {
          id: 'test-tenant',
          name: 'Test Tenant',
          settings: {},
          features: [],
        },
      };

      service.setTenantContext(context);
      expect(service.getTenantContextString()).toBe('test-tenant');
    });

    it('should return tenant ID and user ID when both are set', () => {
      const context: RequestTenantContext = {
        tenantId: 'test-tenant',
        tenant: {
          id: 'test-tenant',
          name: 'Test Tenant',
          settings: {},
          features: [],
        },
        userId: 'user-123',
      };

      service.setTenantContext(context);
      expect(service.getTenantContextString()).toBe('test-tenant:user-123');
    });
  });
});
