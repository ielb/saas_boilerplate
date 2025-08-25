import { Test, TestingModule } from '@nestjs/testing';
import { TenantController } from './tenant.controller';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto, UpdateTenantDto, TenantQueryDto } from '../dto';
import { TenantFeature } from '../entities/tenant-feature-flag.entity';
import { TenantUsageMetric } from '../entities/tenant-usage.entity';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../../common/guards';
import { AuditInterceptor } from '../../audit/interceptors/audit.interceptor';

describe('TenantController', () => {
  let controller: TenantController;
  let tenantService: TenantService;

  const mockTenantService = {
    createTenant: jest.fn(),
    getTenants: jest.fn(),
    getTenantById: jest.fn(),
    getTenantByDomain: jest.fn(),
    updateTenant: jest.fn(),
    deleteTenant: jest.fn(),
    restoreTenant: jest.fn(),
    verifyTenant: jest.fn(),
    getTenantStatistics: jest.fn(),
    getTenantUsageSummary: jest.fn(),
    updateTenantUsage: jest.fn(),
    getFeatureFlag: jest.fn(),
    isFeatureEnabled: jest.fn(),
    updateFeatureFlag: jest.fn(),
    getTenantFeatures: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantController],
      providers: [
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(AuditInterceptor)
      .useValue({ intercept: () => true })
      .compile();

    controller = module.get<TenantController>(TenantController);
    tenantService = module.get<TenantService>(TenantService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTenant', () => {
    it('should create a tenant successfully', async () => {
      const createTenantDto: CreateTenantDto = {
        name: 'Test Tenant',
        domain: 'test.com',
        plan: 'basic',
        maxUsers: 10,
        maxStorage: 1024,
        isActive: true,
      };

      const mockTenant = {
        id: '1',
        ...createTenantDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTenantService.createTenant.mockResolvedValue(mockTenant);

      const result = await controller.createTenant(createTenantDto);

      expect(mockTenantService.createTenant).toHaveBeenCalledWith(
        createTenantDto
      );
      expect(result).toEqual(mockTenant);
    });

    it('should handle tenant creation error', async () => {
      const createTenantDto: CreateTenantDto = {
        name: 'Test Tenant',
        domain: 'test.com',
        plan: 'basic',
        maxUsers: 10,
        maxStorage: 1024,
        isActive: true,
      };

      mockTenantService.createTenant.mockRejectedValue(
        new Error('Creation failed')
      );

      await expect(controller.createTenant(createTenantDto)).rejects.toThrow(
        'Creation failed'
      );
    });
  });

  describe('getTenants', () => {
    it('should return paginated tenants', async () => {
      const queryDto: TenantQueryDto = {};

      const mockServiceResponse = {
        tenants: [
          { id: '1', name: 'Tenant 1', domain: 'tenant1.com' },
          { id: '2', name: 'Tenant 2', domain: 'tenant2.com' },
        ],
        total: 2,
      };

      const expectedResponse = {
        data: [
          { id: '1', name: 'Tenant 1', domain: 'tenant1.com' },
          { id: '2', name: 'Tenant 2', domain: 'tenant2.com' },
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockTenantService.getTenants.mockResolvedValue(mockServiceResponse);

      const result = await controller.getTenants(queryDto);

      expect(mockTenantService.getTenants).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle empty results', async () => {
      const queryDto: TenantQueryDto = {};

      const mockServiceResponse = {
        tenants: [],
        total: 0,
      };

      const expectedResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      mockTenantService.getTenants.mockResolvedValue(mockServiceResponse);

      const result = await controller.getTenants(queryDto);

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getTenantById', () => {
    it('should return a tenant by ID', async () => {
      const tenantId = '1';
      const mockTenant = {
        id: tenantId,
        name: 'Test Tenant',
        domain: 'test.com',
        plan: 'basic',
        maxUsers: 10,
        maxStorage: 1024,
        isActive: true,
      };

      mockTenantService.getTenantById.mockResolvedValue(mockTenant);

      const result = await controller.getTenantById(tenantId);

      expect(mockTenantService.getTenantById).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(mockTenant);
    });

    it('should handle tenant not found', async () => {
      const tenantId = '999';

      mockTenantService.getTenantById.mockResolvedValue(null);

      const result = await controller.getTenantById(tenantId);

      expect(result).toBeNull();
    });
  });

  describe('updateTenant', () => {
    it('should update a tenant successfully', async () => {
      const tenantId = '1';
      const updateTenantDto: UpdateTenantDto = {
        name: 'Updated Tenant',
        plan: 'premium',
      };

      const mockTenant = {
        id: tenantId,
        ...updateTenantDto,
        domain: 'test.com',
        maxUsers: 10,
        maxStorage: 1024,
        isActive: true,
      };

      mockTenantService.updateTenant.mockResolvedValue(mockTenant);

      const result = await controller.updateTenant(tenantId, updateTenantDto);

      expect(mockTenantService.updateTenant).toHaveBeenCalledWith(
        tenantId,
        updateTenantDto
      );
      expect(result).toEqual(mockTenant);
    });

    it('should handle tenant update error', async () => {
      const tenantId = '999';
      const updateTenantDto: UpdateTenantDto = { name: 'Updated Tenant' };

      mockTenantService.updateTenant.mockRejectedValue(
        new Error('Tenant not found')
      );

      await expect(
        controller.updateTenant(tenantId, updateTenantDto)
      ).rejects.toThrow('Tenant not found');
    });
  });

  describe('deleteTenant', () => {
    it('should delete a tenant successfully', async () => {
      const tenantId = '1';

      mockTenantService.deleteTenant.mockResolvedValue(undefined);

      const result = await controller.deleteTenant(tenantId);

      expect(mockTenantService.deleteTenant).toHaveBeenCalledWith(tenantId);
      expect(result).toBeUndefined();
    });

    it('should handle tenant deletion error', async () => {
      const tenantId = '999';

      mockTenantService.deleteTenant.mockRejectedValue(
        new Error('Tenant not found')
      );

      await expect(controller.deleteTenant(tenantId)).rejects.toThrow(
        'Tenant not found'
      );
    });
  });

  describe('getTenantStatistics', () => {
    it('should return tenant statistics', async () => {
      const mockStats = {
        totalTenants: 10,
        activeTenants: 8,
        inactiveTenants: 2,
        totalUsers: 150,
        totalStorage: 5120,
        averageUsersPerTenant: 15,
        averageStoragePerTenant: 512,
      };

      mockTenantService.getTenantStatistics.mockResolvedValue(mockStats);

      const result = await controller.getTenantStatistics();

      expect(mockTenantService.getTenantStatistics).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('getTenantByDomain', () => {
    it('should return a tenant by domain', async () => {
      const domain = 'test.com';
      const mockTenant = {
        id: '1',
        name: 'Test Tenant',
        domain,
        plan: 'basic',
        maxUsers: 10,
        maxStorage: 1024,
        isActive: true,
      };

      mockTenantService.getTenantByDomain.mockResolvedValue(mockTenant);

      const result = await controller.getTenantByDomain(domain);

      expect(mockTenantService.getTenantByDomain).toHaveBeenCalledWith(domain);
      expect(result).toEqual(mockTenant);
    });
  });

  describe('restoreTenant', () => {
    it('should restore a tenant successfully', async () => {
      const tenantId = '1';
      const mockTenant = {
        id: tenantId,
        name: 'Restored Tenant',
        domain: 'test.com',
        plan: 'basic',
        maxUsers: 10,
        maxStorage: 1024,
        isActive: true,
      };

      mockTenantService.restoreTenant.mockResolvedValue(mockTenant);

      const result = await controller.restoreTenant(tenantId);

      expect(mockTenantService.restoreTenant).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(mockTenant);
    });
  });

  describe('verifyTenant', () => {
    it('should verify a tenant successfully', async () => {
      const tenantId = '1';
      const mockTenant = {
        id: tenantId,
        name: 'Verified Tenant',
        domain: 'test.com',
        plan: 'basic',
        maxUsers: 10,
        maxStorage: 1024,
        isActive: true,
        isVerified: true,
      };

      mockTenantService.verifyTenant.mockResolvedValue(mockTenant);

      const result = await controller.verifyTenant(tenantId);

      expect(mockTenantService.verifyTenant).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(mockTenant);
    });
  });

  describe('getTenantUsage', () => {
    it('should return tenant usage summary', async () => {
      const tenantId = '1';
      const mockUsageSummary = {
        tenantId,
        tenantName: 'Test Tenant',
        currentUsage: { apiCalls: 100, storageUsed: 512, activeUsers: 5 },
        limits: { apiCalls: 1000, storageUsed: 1024, activeUsers: 10 },
        usagePercentage: { apiCalls: 10, storageUsed: 50, activeUsers: 50 },
        isOverLimit: {
          apiCalls: false,
          storageUsed: false,
          activeUsers: false,
        },
      };

      mockTenantService.getTenantUsageSummary.mockResolvedValue(
        mockUsageSummary
      );

      const result = await controller.getTenantUsage(tenantId);

      expect(mockTenantService.getTenantUsageSummary).toHaveBeenCalledWith(
        tenantId
      );
      expect(result).toEqual(mockUsageSummary);
    });
  });

  describe('updateTenantUsage', () => {
    it('should update tenant usage successfully', async () => {
      const tenantId = '1';
      const metric = TenantUsageMetric.API_CALLS;
      const body = { value: 150, limit: 1000 };

      const mockUsage = {
        id: '1',
        tenantId,
        metric,
        value: 150,
        limit: 1000,
        date: new Date(),
      };

      mockTenantService.updateTenantUsage.mockResolvedValue(mockUsage);

      const result = await controller.updateTenantUsage(tenantId, metric, body);

      expect(mockTenantService.updateTenantUsage).toHaveBeenCalledWith(
        tenantId,
        metric,
        body.value,
        body.limit
      );
      expect(result).toEqual(mockUsage);
    });
  });

  describe('getTenantFeatures', () => {
    it('should return empty array for now', async () => {
      const tenantId = '1';

      mockTenantService.getTenantFeatures.mockResolvedValue([]);

      const result = await controller.getTenantFeatures(tenantId);

      expect(mockTenantService.getTenantFeatures).toHaveBeenCalledWith(
        tenantId
      );
      expect(result).toEqual([]);
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true if feature is enabled', async () => {
      const tenantId = '1';
      const feature = TenantFeature.ADVANCED_ANALYTICS;

      mockTenantService.isFeatureEnabled.mockResolvedValue(true);

      const result = await controller.isFeatureEnabled(tenantId, feature);

      expect(mockTenantService.isFeatureEnabled).toHaveBeenCalledWith(
        tenantId,
        feature
      );
      expect(result).toEqual({ enabled: true });
    });

    it('should return false if feature is disabled', async () => {
      const tenantId = '1';
      const feature = TenantFeature.ADVANCED_ANALYTICS;

      mockTenantService.isFeatureEnabled.mockResolvedValue(false);

      const result = await controller.isFeatureEnabled(tenantId, feature);

      expect(result).toEqual({ enabled: false });
    });
  });

  describe('updateFeatureFlag', () => {
    it('should update a feature flag successfully', async () => {
      const tenantId = '1';
      const feature = TenantFeature.ADVANCED_ANALYTICS;
      const body = { enabled: true, config: { retentionDays: 30 } };

      const mockFeatureFlag = {
        id: '1',
        tenantId,
        feature,
        isEnabled: true,
        config: { retentionDays: 30 },
      };

      mockTenantService.updateFeatureFlag.mockResolvedValue(mockFeatureFlag);

      const result = await controller.updateFeatureFlag(
        tenantId,
        feature,
        body
      );

      expect(mockTenantService.updateFeatureFlag).toHaveBeenCalledWith(
        tenantId,
        feature,
        body.enabled,
        body.config
      );
      expect(result).toEqual(mockFeatureFlag);
    });

    it('should update a feature flag without config', async () => {
      const tenantId = '1';
      const feature = TenantFeature.ADVANCED_ANALYTICS;
      const body = { enabled: false };

      const mockFeatureFlag = {
        id: '1',
        tenantId,
        feature,
        isEnabled: false,
        config: null,
      };

      mockTenantService.updateFeatureFlag.mockResolvedValue(mockFeatureFlag);

      const result = await controller.updateFeatureFlag(
        tenantId,
        feature,
        body
      );

      expect(mockTenantService.updateFeatureFlag).toHaveBeenCalledWith(
        tenantId,
        feature,
        body.enabled,
        undefined
      );
      expect(result).toEqual(mockFeatureFlag);
    });
  });
});
