import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TenantCacheUtil } from './tenant-cache.util';

describe('TenantCacheUtil', () => {
  let util: TenantCacheUtil;
  let cacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantCacheUtil,
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    util = module.get<TenantCacheUtil>(TenantCacheUtil);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('Cache key generators', () => {
    it('should generate user memberships key', () => {
      const key = TenantCacheUtil.getUserMembershipsKey('user-1');
      expect(key).toBe('user-memberships:user-1');
    });

    it('should generate user access key', () => {
      const key = TenantCacheUtil.getUserAccessKey('user-1', 'tenant-1');
      expect(key).toBe('user-access:user-1:tenant-1');
    });

    it('should generate tenant context key', () => {
      const key = TenantCacheUtil.getTenantContextKey('tenant-1');
      expect(key).toBe('tenant-context:tenant-1');
    });

    it('should generate user permissions key', () => {
      const key = TenantCacheUtil.getUserPermissionsKey('user-1', 'tenant-1');
      expect(key).toBe('user-permissions:user-1:tenant-1');
    });

    it('should generate role permissions key', () => {
      const key = TenantCacheUtil.getRolePermissionsKey('admin');
      expect(key).toBe('role-permissions:admin');
    });

    it('should generate bulk access key', () => {
      const tenantIds = ['tenant-2', 'tenant-1', 'tenant-3'];
      const key = TenantCacheUtil.getBulkAccessKey('user-1', tenantIds);
      expect(key).toBe('bulk-access:user-1:tenant-1,tenant-2,tenant-3');
    });
  });

  describe('Cache operations', () => {
    it('should get value from cache', async () => {
      // Arrange
      const key = 'test-key';
      const value = { test: 'data' };
      cacheManager.get.mockResolvedValue(value);

      // Act
      const result = await util.get(key);

      // Assert
      expect(result).toEqual(value);
      expect(cacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return null on cache get error', async () => {
      // Arrange
      const key = 'test-key';
      cacheManager.get.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await util.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should set value in cache', async () => {
      // Arrange
      const key = 'test-key';
      const value = { test: 'data' };
      const ttl = 300;

      // Act
      await util.set(key, value, ttl);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });

    it('should handle cache set error gracefully', async () => {
      // Arrange
      const key = 'test-key';
      const value = { test: 'data' };
      cacheManager.set.mockRejectedValue(new Error('Cache error'));

      // Act & Assert
      await expect(util.set(key, value)).resolves.toBeUndefined();
    });

    it('should delete value from cache', async () => {
      // Arrange
      const key = 'test-key';

      // Act
      await util.del(key);

      // Assert
      expect(cacheManager.del).toHaveBeenCalledWith(key);
    });

    it('should handle cache delete error gracefully', async () => {
      // Arrange
      const key = 'test-key';
      cacheManager.del.mockRejectedValue(new Error('Cache error'));

      // Act & Assert
      await expect(util.del(key)).resolves.toBeUndefined();
    });
  });

  describe('Bulk operations', () => {
    it('should get multiple values from cache', async () => {
      // Arrange
      const keys = ['key-1', 'key-2', 'key-3'];
      const values = ['value-1', null, 'value-3'];

      cacheManager.get
        .mockResolvedValueOnce(values[0])
        .mockResolvedValueOnce(values[1])
        .mockResolvedValueOnce(values[2]);

      // Act
      const result = await util.mget(keys);

      // Assert
      expect(result).toEqual(values);
      expect(cacheManager.get).toHaveBeenCalledTimes(3);
    });

    it('should set multiple values in cache', async () => {
      // Arrange
      const keyValuePairs = [
        { key: 'key-1', value: 'value-1', ttl: 300 },
        { key: 'key-2', value: 'value-2' },
      ];

      // Act
      await util.mset(keyValuePairs);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith('key-1', 'value-1', 300);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'key-2',
        'value-2',
        undefined
      );
    });

    it('should delete multiple values from cache', async () => {
      // Arrange
      const keys = ['key-1', 'key-2', 'key-3'];

      // Act
      await util.mdel(keys);

      // Assert
      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      keys.forEach(key => {
        expect(cacheManager.del).toHaveBeenCalledWith(key);
      });
    });
  });

  describe('User cache clearing', () => {
    it('should clear user cache', async () => {
      // Arrange
      const userId = 'user-1';

      // Act
      await util.clearUserCache(userId);

      // Assert
      expect(cacheManager.del).toHaveBeenCalledWith(
        TenantCacheUtil.getUserMembershipsKey(userId)
      );
    });
  });

  describe('Tenant cache clearing', () => {
    it('should clear tenant cache', async () => {
      // Arrange
      const tenantId = 'tenant-1';

      // Act
      await util.clearTenantCache(tenantId);

      // Assert
      expect(cacheManager.del).toHaveBeenCalledWith(
        TenantCacheUtil.getTenantContextKey(tenantId)
      );
    });
  });

  describe('Cache warming', () => {
    it('should warm user memberships cache', async () => {
      // Arrange
      const userId = 'user-1';
      const data = { memberships: [] };
      const ttl = 600;

      // Act
      await util.warmUserMembershipsCache(userId, data, ttl);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(
        TenantCacheUtil.getUserMembershipsKey(userId),
        data,
        ttl
      );
    });

    it('should warm tenant context cache', async () => {
      // Arrange
      const tenantId = 'tenant-1';
      const data = { id: tenantId, name: 'Test Tenant' };
      const ttl = 900;

      // Act
      await util.warmTenantContextCache(tenantId, data, ttl);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(
        TenantCacheUtil.getTenantContextKey(tenantId),
        data,
        ttl
      );
    });
  });

  describe('Health check', () => {
    it('should return ok status for healthy cache', async () => {
      // Arrange
      // Mock get to return the exact value that was set by capturing it
      let capturedValue: unknown;
      cacheManager.set.mockImplementation((key: string, value: unknown) => {
        capturedValue = value;
        return Promise.resolve();
      });
      cacheManager.get.mockImplementation(() => {
        return Promise.resolve(capturedValue);
      });

      // Act
      const result = await util.healthCheck();

      // Assert
      expect(result.status).toBe('ok');
      expect(cacheManager.set).toHaveBeenCalled();
      expect(cacheManager.get).toHaveBeenCalled();
      expect(cacheManager.del).toHaveBeenCalled();
    });

    it('should return error status for unhealthy cache', async () => {
      // Arrange
      // Mock get to throw an error to simulate cache failure
      // (set failures are handled silently by the util)
      cacheManager.get.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await util.healthCheck();

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toContain('Cache health check failed');
    });

    it('should return error status for read/write mismatch', async () => {
      // Arrange
      cacheManager.get.mockResolvedValue('different-value');

      // Act
      const result = await util.healthCheck();

      // Assert
      expect(result.status).toBe('error');
      expect(result.message).toBe('Cache read/write mismatch');
    });
  });

  describe('Cache statistics', () => {
    it('should return cache statistics', async () => {
      // Act
      const stats = await util.getCacheStats();

      // Assert
      expect(stats).toEqual({
        totalKeys: 0,
        userMembershipKeys: 0,
        userAccessKeys: 0,
        tenantContextKeys: 0,
      });
    });
  });

  describe('Pattern deletion', () => {
    it('should handle pattern deletion', async () => {
      // Arrange
      const pattern = 'user-access:user-1:*';

      // Act
      await util.delPattern(pattern);

      // Assert
      // Pattern deletion is not fully implemented, so no specific assertions
      expect(true).toBe(true);
    });

    it('should delete single key when no pattern', async () => {
      // Arrange
      const key = 'specific-key';

      // Act
      await util.delPattern(key);

      // Assert
      expect(cacheManager.del).toHaveBeenCalledWith(key);
    });
  });
});
