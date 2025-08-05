import { Test, TestingModule } from '@nestjs/testing';
import { TenantScopedRepository } from './tenant-scoped.repository';
import {
  getCurrentTenantId,
  requireTenantContext,
} from '../interceptors/tenant-scoping.interceptor';

// Create a concrete implementation for testing
class TestEntity {
  id!: string;
  name!: string;
  tenantId!: string;
}

class TestTenantScopedRepository extends TenantScopedRepository<TestEntity> {
  protected getTenantIdField(): string {
    return 'tenantId';
  }

  // Expose protected methods for testing
  public testApplyTenantScopeToWhere(where: any): any {
    return this.applyTenantScopeToWhere(where);
  }

  public testShouldScopeByTenant(): boolean {
    return this.shouldScopeByTenant();
  }

  public testGetTenantIdField(): string {
    return this.getTenantIdField();
  }
}

describe('TenantScopedRepository', () => {
  let repository: TestTenantScopedRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestTenantScopedRepository],
    }).compile();

    repository = module.get<TestTenantScopedRepository>(
      TestTenantScopedRepository
    );
  });

  afterEach(() => {
    // Clean up global tenant context
    delete (global as any).__currentTenantId;
  });

  describe('applyTenantScopeToWhere', () => {
    it('should apply tenant scoping when tenant context exists', () => {
      (global as any).__currentTenantId = 'tenant-123';
      const where = { name: 'test' };

      const result = repository.testApplyTenantScopeToWhere(where);

      expect(result).toEqual({
        name: 'test',
        tenantId: 'tenant-123',
      });
    });

    it('should not apply tenant scoping when no tenant context', () => {
      const where = { name: 'test' };

      const result = repository.testApplyTenantScopeToWhere(where);

      expect(result).toEqual(where);
    });

    it('should handle empty where clause', () => {
      (global as any).__currentTenantId = 'tenant-123';
      const where = {};

      const result = repository.testApplyTenantScopeToWhere(where);

      expect(result).toEqual({
        tenantId: 'tenant-123',
      });
    });
  });

  describe('shouldScopeByTenant', () => {
    it('should return true by default', () => {
      const result = repository.testShouldScopeByTenant();
      expect(result).toBe(true);
    });
  });

  describe('getTenantIdField', () => {
    it('should return the correct tenant field name', () => {
      const result = repository.testGetTenantIdField();
      expect(result).toBe('tenantId');
    });
  });

  describe('utility functions', () => {
    it('should get current tenant ID when set', () => {
      (global as any).__currentTenantId = 'tenant-123';
      const result = getCurrentTenantId();
      expect(result).toBe('tenant-123');
    });

    it('should return null when no tenant context', () => {
      delete (global as any).__currentTenantId;
      const result = getCurrentTenantId();
      expect(result).toBeNull();
    });

    it('should require tenant context when available', () => {
      (global as any).__currentTenantId = 'tenant-123';
      const result = requireTenantContext();
      expect(result).toBe('tenant-123');
    });

    it('should throw error when no tenant context available', () => {
      delete (global as any).__currentTenantId;
      expect(() => requireTenantContext()).toThrow('Tenant context required');
    });
  });

  describe('tenant scoping logic', () => {
    it('should merge tenant ID with existing where conditions', () => {
      (global as any).__currentTenantId = 'tenant-123';
      const where = {
        name: 'test',
        status: 'active',
      };

      const result = repository.testApplyTenantScopeToWhere(where);

      expect(result).toEqual({
        name: 'test',
        status: 'active',
        tenantId: 'tenant-123',
      });
    });

    it('should preserve existing tenant ID if already present', () => {
      (global as any).__currentTenantId = 'tenant-123';
      const where = {
        name: 'test',
        tenantId: 'existing-tenant',
      };

      const result = repository.testApplyTenantScopeToWhere(where);

      expect(result).toEqual({
        name: 'test',
        tenantId: 'tenant-123', // Current tenant context takes precedence for security
      });
    });

    it('should handle nested where conditions', () => {
      (global as any).__currentTenantId = 'tenant-123';
      const where = {
        name: 'test',
        metadata: {
          type: 'user',
        },
      };

      const result = repository.testApplyTenantScopeToWhere(where);

      expect(result).toEqual({
        name: 'test',
        metadata: {
          type: 'user',
        },
        tenantId: 'tenant-123',
      });
    });
  });
});
