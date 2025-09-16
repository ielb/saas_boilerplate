import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionUsageTrackingService } from './subscription-usage-tracking.service';
import { SubscriptionUsage } from '../entities/subscription-usage.entity';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import {
  UsageMetricType,
  SubscriptionStatus,
  SubscriptionBillingCycle,
} from '@app/shared';

describe('SubscriptionUsageTrackingService', () => {
  let service: SubscriptionUsageTrackingService;
  let usageRepository: Repository<SubscriptionUsage>;
  let subscriptionRepository: Repository<Subscription>;
  let planRepository: Repository<SubscriptionPlan>;

  const mockUsageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockSubscriptionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockPlanRepository = {
    findOne: jest.fn(),
  };

  const mockSubscription: Subscription = {
    id: 'sub_123',
    tenantId: 'tenant_123',
    userId: 'user_123',
    planId: 'plan_123',
    status: SubscriptionStatus.ACTIVE,
    billingCycle: SubscriptionBillingCycle.MONTHLY,
    amount: 29.99,
    currency: 'USD',
    startDate: new Date('2024-01-01'),
    currentPeriodStart: new Date('2024-01-01'),
    currentPeriodEnd: new Date('2024-02-01'),
    autoRenew: true,
    isTrial: false,
    stripeSubscriptionId: 'sub_stripe_123',
    metadata: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    plan: {} as SubscriptionPlan,
  } as Subscription;

  const mockPlan: SubscriptionPlan = {
    id: 'plan_123',
    name: 'Test Plan',
    description: 'Test Plan Description',
    planType: 'standard' as any,
    price: 29.99,
    currency: 'USD',
    billingCycle: SubscriptionBillingCycle.MONTHLY,
    maxUsers: 10,
    maxProjects: 5,
    maxStorageGB: 1000,
    maxApiCalls: 10000,
    isActive: true,
    isPopular: false,
    isCustom: false,
    sortOrder: 1,
    features: {},
    limits: {
      maxUsers: 10,
      maxStorage: 1000,
      maxApiCalls: 10000,
    },
    metadata: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    subscriptions: [],
  } as SubscriptionPlan;

  const mockUsageRecord = {
    subscriptionId: 'sub_123',
    tenantId: 'tenant_123',
    metricType: UsageMetricType.API_CALLS,
    metricName: 'api_calls',
    quantity: 100,
    unitPrice: 0.01,
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-02-01'),
    metadata: { source: 'api' },
    tags: { environment: 'production' },
    notes: 'API usage tracking',
  };

  const createMockUsage = (
    overrides: Partial<SubscriptionUsage> = {}
  ): SubscriptionUsage => {
    const baseUsage = {
      id: 'usage_123',
      subscriptionId: 'sub_123',
      tenantId: 'tenant_123',
      metricType: UsageMetricType.API_CALLS,
      metricName: 'api_calls',
      metricDescription: 'API calls usage',
      quantity: 100,
      unitPrice: 0.01,
      totalAmount: 1.0,
      currency: 'USD',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-02-01'),
      recordedAt: new Date(),
      metadata: { source: 'api' },
      tags: { environment: 'production' },
      isBilled: false,
      notes: 'API usage tracking',
      createdAt: new Date(),
      updatedAt: new Date(),
      subscription: {} as Subscription,
      invoice: {} as any,
    };

    // Handle optional properties separately
    if (overrides.billedAt !== undefined) {
      (baseUsage as any).billedAt = overrides.billedAt;
    }
    if (overrides.invoiceId !== undefined) {
      (baseUsage as any).invoiceId = overrides.invoiceId;
    }

    return { ...baseUsage, ...overrides } as SubscriptionUsage;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionUsageTrackingService,
        {
          provide: getRepositoryToken(SubscriptionUsage),
          useValue: mockUsageRepository,
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(SubscriptionPlan),
          useValue: mockPlanRepository,
        },
      ],
    }).compile();

    service = module.get<SubscriptionUsageTrackingService>(
      SubscriptionUsageTrackingService
    );
    usageRepository = module.get<Repository<SubscriptionUsage>>(
      getRepositoryToken(SubscriptionUsage)
    );
    subscriptionRepository = module.get<Repository<Subscription>>(
      getRepositoryToken(Subscription)
    );
    planRepository = module.get<Repository<SubscriptionPlan>>(
      getRepositoryToken(SubscriptionPlan)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordUsage', () => {
    it('should record new usage successfully', async () => {
      // Arrange
      const mockUsage = createMockUsage();
      mockSubscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        plan: mockPlan,
      });
      mockUsageRepository.findOne.mockResolvedValue(null);
      mockUsageRepository.create.mockReturnValue(mockUsage);
      mockUsageRepository.save.mockResolvedValue(mockUsage);

      // Act
      const result = await service.recordUsage(mockUsageRecord);

      // Assert
      expect(result).toEqual(mockUsage);
      expect(mockUsageRepository.create).toHaveBeenCalledWith({
        ...mockUsageRecord,
        totalAmount: 1.0, // 100 * 0.01
        recordedAt: expect.any(Date),
      });
      expect(mockUsageRepository.save).toHaveBeenCalledWith(mockUsage);
    });

    it('should update existing usage record', async () => {
      // Arrange
      const existingUsage = createMockUsage({ quantity: 50 });
      const updatedUsage = createMockUsage({ quantity: 150 });
      mockSubscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        plan: mockPlan,
      });
      mockUsageRepository.findOne.mockResolvedValue(existingUsage);
      mockUsageRepository.save.mockResolvedValue(updatedUsage);

      // Act
      const result = await service.recordUsage({
        ...mockUsageRecord,
        quantity: 150,
      });

      // Assert
      expect(result).toEqual(updatedUsage);
      expect(existingUsage.quantity).toBe(150);
      expect(existingUsage.totalAmount).toBe(1.5); // 150 * 0.01
      expect(mockUsageRepository.save).toHaveBeenCalledWith(existingUsage);
    });

    it('should throw error when subscription not found', async () => {
      // Arrange
      mockSubscriptionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.recordUsage(mockUsageRecord)).rejects.toThrow(
        'Subscription sub_123 not found'
      );
    });

    it('should throw error when subscription is not active', async () => {
      // Arrange
      const inactiveSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
      };
      mockSubscriptionRepository.findOne.mockResolvedValue(
        inactiveSubscription
      );

      // Act & Assert
      await expect(service.recordUsage(mockUsageRecord)).rejects.toThrow(
        'Cannot record usage for subscription in canceled status'
      );
    });
  });

  describe('getCurrentUsage', () => {
    it('should return current usage for subscription', async () => {
      // Arrange
      const mockUsageRecords = [
        createMockUsage({ metricName: 'api_calls', quantity: 100 }),
        createMockUsage({ metricName: 'storage', quantity: 500 }),
      ];

      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockUsageRepository.find.mockResolvedValue(mockUsageRecords);

      // Act
      const result = await service.getCurrentUsage('sub_123');

      // Assert
      expect(result).toEqual({
        api_calls: 100,
        storage: 500,
      });
    });

    it('should throw error when subscription not found', async () => {
      // Arrange
      mockSubscriptionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getCurrentUsage('sub_123')).rejects.toThrow(
        'Subscription sub_123 not found'
      );
    });
  });

  describe('getUsageLimits', () => {
    it('should return usage limits with current usage', async () => {
      // Arrange
      const mockUsageRecords = [
        createMockUsage({ metricName: 'maxUsers', quantity: 8 }),
        createMockUsage({ metricName: 'maxStorage', quantity: 600 }),
      ];

      mockSubscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        plan: mockPlan,
      });
      mockUsageRepository.find.mockResolvedValue(mockUsageRecords);

      // Act
      const result = await service.getUsageLimits('sub_123');

      // Assert
      expect(result).toHaveLength(3); // maxUsers, maxStorage, maxApiCalls
      expect(result[0]).toMatchObject({
        metricName: 'maxUsers',
        limit: 10,
        currentUsage: 8,
        percentage: 80,
        isExceeded: false,
        isNearLimit: true,
      });
      expect(result[1]).toMatchObject({
        metricName: 'maxStorage',
        limit: 1000,
        currentUsage: 600,
        percentage: 60,
        isExceeded: false,
        isNearLimit: false,
      });
    });

    it('should detect exceeded limits', async () => {
      // Arrange
      const mockUsageRecords = [
        createMockUsage({ metricName: 'maxUsers', quantity: 15 }),
      ];

      mockSubscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        plan: mockPlan,
      });
      mockUsageRepository.find.mockResolvedValue(mockUsageRecords);

      // Act
      const result = await service.getUsageLimits('sub_123');

      // Assert
      const usersLimit = result.find(limit => limit.metricName === 'maxUsers');
      expect(usersLimit).toMatchObject({
        metricName: 'maxUsers',
        limit: 10,
        currentUsage: 15,
        percentage: 150,
        isExceeded: true,
        isNearLimit: false,
      });
    });
  });

  describe('checkUsageLimits', () => {
    it('should generate alerts for exceeded limits', async () => {
      // Arrange
      const mockUsageRecords = [
        createMockUsage({ metricName: 'maxUsers', quantity: 15 }),
      ];

      mockSubscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        plan: mockPlan,
      });
      mockUsageRepository.find.mockResolvedValue(mockUsageRecords);

      // Act
      const result = await service.checkUsageLimits('sub_123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'limit_exceeded',
        metricName: 'maxUsers',
        currentUsage: 15,
        limit: 10,
        percentage: 150,
        message: 'Usage limit exceeded for maxUsers: 15/10',
        severity: 'critical',
      });
    });

    it('should generate alerts for near limits', async () => {
      // Arrange
      const mockUsageRecords = [
        createMockUsage({ metricName: 'maxUsers', quantity: 8 }),
      ];

      mockSubscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        plan: mockPlan,
      });
      mockUsageRepository.find.mockResolvedValue(mockUsageRecords);

      // Act
      const result = await service.checkUsageLimits('sub_123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'near_limit',
        metricName: 'maxUsers',
        currentUsage: 8,
        limit: 10,
        percentage: 80,
        message: 'Approaching usage limit for maxUsers: 8/10 (80.0%)',
        severity: 'medium',
      });
    });

    it('should return empty array when no alerts needed', async () => {
      // Arrange
      const mockUsageRecords = [
        createMockUsage({ metricName: 'maxUsers', quantity: 5 }),
      ];

      mockSubscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        plan: mockPlan,
      });
      mockUsageRepository.find.mockResolvedValue(mockUsageRecords);

      // Act
      const result = await service.checkUsageLimits('sub_123');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('getUsageAnalytics', () => {
    it('should return usage analytics', async () => {
      // Arrange
      const mockUsageRecords = [
        createMockUsage({
          metricName: 'api_calls',
          quantity: 100,
          recordedAt: new Date('2024-01-01'),
        }),
        createMockUsage({
          metricName: 'api_calls',
          quantity: 150,
          recordedAt: new Date('2024-01-02'),
        }),
        createMockUsage({
          metricName: 'storage',
          quantity: 500,
          recordedAt: new Date('2024-01-01'),
        }),
      ];

      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockUsageRepository.find.mockResolvedValue(mockUsageRecords);

      // Act
      const result = await service.getUsageAnalytics('sub_123');

      // Assert
      expect(result.totalUsage).toBe(750);
      expect(result.usageByMetric).toEqual({
        api_calls: 250,
        storage: 500,
      });
      expect(result.usageTrends).toHaveLength(2);
      expect(result.topMetrics).toHaveLength(2);
      expect(result.topMetrics[0]).toMatchObject({
        metricName: 'storage',
        usage: 500,
        percentage: expect.closeTo(66.67, 2),
      });
    });
  });

  describe('getUsageHistory', () => {
    it('should return usage history', async () => {
      // Arrange
      const mockHistory = [
        createMockUsage({
          id: 'usage_1',
          metricName: 'api_calls',
          quantity: 100,
        }),
        createMockUsage({
          id: 'usage_2',
          metricName: 'api_calls',
          quantity: 150,
        }),
      ];

      mockUsageRepository.find.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getUsageHistory('sub_123');

      // Assert
      expect(result).toEqual(mockHistory);
      expect(mockUsageRepository.find).toHaveBeenCalledWith({
        where: { subscriptionId: 'sub_123' },
        order: { recordedAt: 'DESC' },
        take: 100,
        relations: ['invoice'],
      });
    });

    it('should filter by metric name', async () => {
      // Arrange
      const mockHistory = [
        createMockUsage({
          id: 'usage_1',
          metricName: 'api_calls',
          quantity: 100,
        }),
      ];

      mockUsageRepository.find.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getUsageHistory('sub_123', 'api_calls');

      // Assert
      expect(mockUsageRepository.find).toHaveBeenCalledWith({
        where: { subscriptionId: 'sub_123', metricName: 'api_calls' },
        order: { recordedAt: 'DESC' },
        take: 100,
        relations: ['invoice'],
      });
    });
  });

  describe('bulkRecordUsage', () => {
    it('should record multiple usage records', async () => {
      // Arrange
      const usageRecords = [
        { ...mockUsageRecord, metricName: 'api_calls' },
        { ...mockUsageRecord, metricName: 'storage' },
      ];

      const mockUsages = [
        createMockUsage({ id: 'usage_1', metricName: 'api_calls' }),
        createMockUsage({ id: 'usage_2', metricName: 'storage' }),
      ];

      mockSubscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        plan: mockPlan,
      });
      mockUsageRepository.findOne.mockResolvedValue(null);
      mockUsageRepository.create.mockReturnValue(mockUsages[0]);
      mockUsageRepository.save
        .mockResolvedValueOnce(mockUsages[0])
        .mockResolvedValueOnce(mockUsages[1]);

      // Act
      const result = await service.bulkRecordUsage(usageRecords);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockUsageRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTenantUsageSummary', () => {
    it('should return tenant usage summary', async () => {
      // Arrange
      const mockSubscriptions = [
        { id: 'sub_1', status: SubscriptionStatus.ACTIVE },
        { id: 'sub_2', status: SubscriptionStatus.TRIAL },
        { id: 'sub_3', status: SubscriptionStatus.CANCELED },
      ] as Subscription[];

      const mockUsageRecords = [
        createMockUsage({
          subscriptionId: 'sub_1',
          metricName: 'api_calls',
          quantity: 100,
        }),
        createMockUsage({
          subscriptionId: 'sub_1',
          metricName: 'storage',
          quantity: 200,
        }),
        createMockUsage({
          subscriptionId: 'sub_2',
          metricName: 'api_calls',
          quantity: 50,
        }),
      ];

      mockSubscriptionRepository.find.mockResolvedValue(mockSubscriptions);
      mockUsageRepository.find.mockResolvedValue(mockUsageRecords);

      // Act
      const result = await service.getTenantUsageSummary('tenant_123');

      // Assert
      expect(result.totalSubscriptions).toBe(3);
      expect(result.activeSubscriptions).toBe(2);
      expect(result.totalUsage).toBe(350);
      expect(result.usageByMetric).toEqual({
        api_calls: 150,
        storage: 200,
      });
      expect(result.topSubscriptions).toHaveLength(2);
    });
  });
});
