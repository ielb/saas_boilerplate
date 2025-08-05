import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TenantIsolationService } from './tenant-isolation.service';
import { TenantContextService } from './tenant-context.service';
import { TenantContext } from '@app/shared';

describe('TenantIsolationService', () => {
  let service: TenantIsolationService;
  let tenantContextService: TenantContextService;

  const mockTenant: TenantContext = {
    id: 'test-tenant',
    name: 'Test Tenant',
    settings: {
      theme: 'dark',
      language: 'en',
    },
    features: ['feature1', 'feature2', 'feature3'],
  };

  const mockContext = {
    tenantId: 'test-tenant',
    tenant: mockTenant,
    userId: 'user-123',
    userEmail: 'user@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantIsolationService, TenantContextService],
    }).compile();

    service = module.get<TenantIsolationService>(TenantIsolationService);
    tenantContextService =
      module.get<TenantContextService>(TenantContextService);
  });

  afterEach(() => {
    tenantContextService.clearTenantContext();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentTenantId', () => {
    it('should return tenant ID when context is available', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(service.getCurrentTenantId()).toBe('test-tenant');
    });

    it('should throw ForbiddenException when no tenant context is available', () => {
      expect(() => service.getCurrentTenantId()).toThrow(ForbiddenException);
      expect(() => service.getCurrentTenantId()).toThrow(
        'Tenant context is required for this operation'
      );
    });
  });

  describe('getCurrentTenant', () => {
    it('should return tenant when context is available', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(service.getCurrentTenant()).toEqual(mockTenant);
    });

    it('should throw ForbiddenException when no tenant context is available', () => {
      expect(() => service.getCurrentTenant()).toThrow(ForbiddenException);
      expect(() => service.getCurrentTenant()).toThrow(
        'Tenant context is required for this operation'
      );
    });
  });

  describe('hasTenantContext', () => {
    it('should return true when tenant context is available', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(service.hasTenantContext()).toBe(true);
    });

    it('should return false when no tenant context is available', () => {
      expect(service.hasTenantContext()).toBe(false);
    });
  });

  describe('ensureTenantContext', () => {
    it('should not throw when tenant context is available', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(() => service.ensureTenantContext()).not.toThrow();
    });

    it('should throw ForbiddenException when no tenant context is available', () => {
      expect(() => service.ensureTenantContext()).toThrow(ForbiddenException);
      expect(() => service.ensureTenantContext()).toThrow(
        'Tenant context is required for this operation'
      );
    });
  });

  describe('getTenantWhereClause', () => {
    it('should return tenant-scoped where clause with default field name', () => {
      tenantContextService.setTenantContext(mockContext);
      const whereClause = service.getTenantWhereClause();
      expect(whereClause).toEqual({ tenantId: 'test-tenant' });
    });

    it('should return tenant-scoped where clause with custom field name', () => {
      tenantContextService.setTenantContext(mockContext);
      const whereClause = service.getTenantWhereClause('customTenantId');
      expect(whereClause).toEqual({ customTenantId: 'test-tenant' });
    });

    it('should throw ForbiddenException when no tenant context is available', () => {
      expect(() => service.getTenantWhereClause()).toThrow(ForbiddenException);
    });
  });

  describe('validateTenantOwnership', () => {
    it('should not throw when resource belongs to current tenant', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(() =>
        service.validateTenantOwnership('test-tenant')
      ).not.toThrow();
    });

    it('should throw ForbiddenException when resource does not belong to current tenant', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(() => service.validateTenantOwnership('different-tenant')).toThrow(
        ForbiddenException
      );
      expect(() => service.validateTenantOwnership('different-tenant')).toThrow(
        'Access denied: resource does not belong to current tenant'
      );
    });

    it('should throw ForbiddenException when no tenant context is available', () => {
      expect(() => service.validateTenantOwnership('test-tenant')).toThrow(
        ForbiddenException
      );
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true when feature is enabled', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(service.isFeatureEnabled('feature1')).toBe(true);
      expect(service.isFeatureEnabled('feature2')).toBe(true);
    });

    it('should return false when feature is not enabled', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(service.isFeatureEnabled('feature4')).toBe(false);
      expect(service.isFeatureEnabled('nonexistent')).toBe(false);
    });

    it('should throw ForbiddenException when no tenant context is available', () => {
      expect(() => service.isFeatureEnabled('feature1')).toThrow(
        ForbiddenException
      );
    });
  });

  describe('ensureFeatureEnabled', () => {
    it('should not throw when feature is enabled', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(() => service.ensureFeatureEnabled('feature1')).not.toThrow();
    });

    it('should throw ForbiddenException when feature is not enabled', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(() => service.ensureFeatureEnabled('feature4')).toThrow(
        ForbiddenException
      );
      expect(() => service.ensureFeatureEnabled('feature4')).toThrow(
        "Feature 'feature4' is not enabled for this tenant"
      );
    });

    it('should throw ForbiddenException when no tenant context is available', () => {
      expect(() => service.ensureFeatureEnabled('feature1')).toThrow(
        ForbiddenException
      );
    });
  });

  describe('getTenantSetting', () => {
    it('should return setting value when it exists', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(service.getTenantSetting('theme')).toBe('dark');
      expect(service.getTenantSetting('language')).toBe('en');
    });

    it('should return undefined when setting does not exist', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(service.getTenantSetting('nonexistent')).toBeUndefined();
    });

    it('should return default value when setting does not exist', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(service.getTenantSetting('nonexistent', 'default')).toBe(
        'default'
      );
    });

    it('should throw ForbiddenException when no tenant context is available', () => {
      expect(() => service.getTenantSetting('theme')).toThrow(
        ForbiddenException
      );
    });
  });

  describe('setTenantSetting', () => {
    it('should set tenant setting', () => {
      tenantContextService.setTenantContext(mockContext);
      service.setTenantSetting('newSetting', 'newValue');
      expect(service.getTenantSetting('newSetting')).toBe('newValue');
    });

    it('should override existing setting', () => {
      tenantContextService.setTenantContext(mockContext);
      service.setTenantSetting('theme', 'light');
      expect(service.getTenantSetting('theme')).toBe('light');
    });

    it('should throw ForbiddenException when no tenant context is available', () => {
      expect(() => service.setTenantSetting('theme', 'light')).toThrow(
        ForbiddenException
      );
    });
  });

  describe('getTenantContextString', () => {
    it('should return tenant context string', () => {
      tenantContextService.setTenantContext(mockContext);
      expect(service.getTenantContextString()).toBe('test-tenant:user-123');
    });

    it('should return no-tenant-context when no context is available', () => {
      expect(service.getTenantContextString()).toBe('no-tenant-context');
    });
  });

  describe('runWithTenantContext', () => {
    it('should run function with specific tenant context', async () => {
      const result = await service.runWithTenantContext(
        'specific-tenant',
        {
          id: 'specific-tenant',
          name: 'Specific Tenant',
          settings: {},
          features: [],
        },
        async () => {
          expect(service.getCurrentTenantId()).toBe('specific-tenant');
          return 'test-result';
        }
      );

      expect(result).toBe('test-result');
      expect(service.hasTenantContext()).toBe(false); // Context should be cleared after function execution
    });

    it('should handle errors in function execution', async () => {
      await expect(
        service.runWithTenantContext(
          'specific-tenant',
          {
            id: 'specific-tenant',
            name: 'Specific Tenant',
            settings: {},
            features: [],
          },
          async () => {
            throw new Error('Test error');
          }
        )
      ).rejects.toThrow('Test error');

      expect(service.hasTenantContext()).toBe(false); // Context should be cleared even after error
    });
  });

  describe('createTenantScopedQuery', () => {
    it('should create tenant-scoped query with default field name', () => {
      tenantContextService.setTenantContext(mockContext);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
      };

      const result = service.createTenantScopedQuery(mockQueryBuilder);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'tenantId = :tenantId',
        { tenantId: 'test-tenant' }
      );
      expect(result).toBe(mockQueryBuilder);
    });

    it('should create tenant-scoped query with custom field name', () => {
      tenantContextService.setTenantContext(mockContext);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
      };

      const result = service.createTenantScopedQuery(
        mockQueryBuilder,
        'customTenantId'
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'customTenantId = :tenantId',
        { tenantId: 'test-tenant' }
      );
      expect(result).toBe(mockQueryBuilder);
    });

    it('should throw ForbiddenException when no tenant context is available', () => {
      const mockQueryBuilder = {
        where: jest.fn(),
      };

      expect(() => service.createTenantScopedQuery(mockQueryBuilder)).toThrow(
        ForbiddenException
      );
    });
  });

  describe('validateTenantAccessForResources', () => {
    it('should return all resources when they belong to current tenant', () => {
      tenantContextService.setTenantContext(mockContext);
      const resources = [
        { id: '1', tenantId: 'test-tenant' },
        { id: '2', tenantId: 'test-tenant' },
      ];

      const result = service.validateTenantAccessForResources(resources);

      expect(result).toEqual(resources);
    });

    it('should filter out resources that do not belong to current tenant', () => {
      tenantContextService.setTenantContext(mockContext);
      const resources = [
        { id: '1', tenantId: 'test-tenant' },
        { id: '2', tenantId: 'different-tenant' },
        { id: '3', tenantId: 'test-tenant' },
      ];

      const result = service.validateTenantAccessForResources(resources);

      expect(result).toEqual([
        { id: '1', tenantId: 'test-tenant' },
        { id: '3', tenantId: 'test-tenant' },
      ]);
    });

    it('should throw ForbiddenException when no tenant context is available', () => {
      const resources = [{ id: '1', tenantId: 'test-tenant' }];
      expect(() => service.validateTenantAccessForResources(resources)).toThrow(
        ForbiddenException
      );
    });
  });

  describe('getTenantCacheKey', () => {
    it('should return tenant-specific cache key', () => {
      tenantContextService.setTenantContext(mockContext);
      const cacheKey = service.getTenantCacheKey('user-data');
      expect(cacheKey).toBe('tenant:test-tenant:user-data');
    });

    it('should throw ForbiddenException when no tenant context is available', () => {
      expect(() => service.getTenantCacheKey('user-data')).toThrow(
        ForbiddenException
      );
    });
  });

  describe('getTenantSchemaName', () => {
    it('should return tenant-specific schema name', () => {
      tenantContextService.setTenantContext(mockContext);
      const schemaName = service.getTenantSchemaName();
      expect(schemaName).toBe('tenant_test-tenant');
    });

    it('should throw ForbiddenException when no tenant context is available', () => {
      expect(() => service.getTenantSchemaName()).toThrow(ForbiddenException);
    });
  });
});
