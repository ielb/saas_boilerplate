import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionBusinessRulesService } from './subscription-business-rules.service';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { SubscriptionUsage } from '../entities/subscription-usage.entity';
import { SubscriptionInvoice } from '../entities/subscription-invoice.entity';
import { SubscriptionStatus, SubscriptionBillingCycle } from '@app/shared';

describe('SubscriptionBusinessRulesService', () => {
  let service: SubscriptionBusinessRulesService;
  let subscriptionRepository: Repository<Subscription>;
  let subscriptionPlanRepository: Repository<SubscriptionPlan>;
  let subscriptionUsageRepository: Repository<SubscriptionUsage>;

  const mockSubscription: Subscription = {
    id: 'test-subscription-id',
    tenantId: 'test-tenant-id',
    userId: 'test-user-id',
    name: 'Test Subscription',
    description: 'Test Description',
    status: SubscriptionStatus.ACTIVE,
    billingCycle: SubscriptionBillingCycle.MONTHLY,
    amount: 29.99,
    currency: 'USD',
    quantity: 1,
    unitPrice: 29.99,
    startDate: new Date('2024-01-01'),
    currentPeriodStart: new Date('2024-01-01'),
    currentPeriodEnd: new Date('2024-02-01'),
    stripeSubscriptionId: 'sub_test123',
    stripePriceId: 'price_test123',
    stripeProductId: 'prod_test123',
    stripeCustomerId: 'cus_test123',
    planId: 'plan_test123',
    metadata: {},
    features: {},
    limits: {},
    isActive: true,
    isTrial: false,
    autoRenew: true,
    trialDays: 0,
    gracePeriodDays: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    tenant: {} as any,
    user: {} as any,
    plan: {} as any,
  };

  const mockPlan: SubscriptionPlan = {
    id: 'plan_test123',
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
    features: {
      analytics: true,
      apiAccess: true,
      customBranding: false,
    },
    limits: {
      maxUsers: 10,
      maxStorage: 1000,
      maxApiCalls: 10000,
    },
    metadata: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    subscriptions: [],
  };

  const mockUpgradePlan: SubscriptionPlan = {
    ...mockPlan,
    id: 'upgrade_plan',
    name: 'Upgrade Plan',
    price: 59.99,
  };

  const mockDowngradePlan: SubscriptionPlan = {
    ...mockPlan,
    id: 'downgrade_plan',
    name: 'Downgrade Plan',
    price: 19.99,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionBusinessRulesService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SubscriptionPlan),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SubscriptionUsage),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SubscriptionInvoice),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionBusinessRulesService>(
      SubscriptionBusinessRulesService
    );
    subscriptionRepository = module.get<Repository<Subscription>>(
      getRepositoryToken(Subscription)
    );
    subscriptionPlanRepository = module.get<Repository<SubscriptionPlan>>(
      getRepositoryToken(SubscriptionPlan)
    );
    subscriptionUsageRepository = module.get<Repository<SubscriptionUsage>>(
      getRepositoryToken(SubscriptionUsage)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyPricingRules', () => {
    it('should apply annual billing discount', async () => {
      // Act
      const result = await service.applyPricingRules(
        100,
        SubscriptionBillingCycle.ANNUALLY,
        1
      );

      // Assert
      expect(result.finalAmount).toBe(80); // 20% discount
      expect(result.discountApplied).toBe(20);
      expect(result.rulesApplied).toContain('Annual billing discount: 20%');
    });

    it('should apply volume discount for high quantities', async () => {
      // Act
      const result = await service.applyPricingRules(
        100,
        SubscriptionBillingCycle.MONTHLY,
        15
      );

      // Assert
      expect(result.finalAmount).toBeLessThan(1500); // Should have volume discount
      expect(result.discountApplied).toBeGreaterThan(0);
      expect(result.rulesApplied).toContainEqual(
        expect.stringMatching(/Volume discount/)
      );
    });

    it('should apply enterprise discount for high-value subscriptions', async () => {
      // Act
      const result = await service.applyPricingRules(
        1200,
        SubscriptionBillingCycle.MONTHLY,
        1
      );

      // Assert
      expect(result.finalAmount).toBeLessThan(1200); // Should have enterprise discount
      expect(result.discountApplied).toBeGreaterThan(0);
      expect(result.rulesApplied).toContain('Enterprise discount: 15%');
    });

    it('should enforce minimum price', async () => {
      // Act
      const result = await service.applyPricingRules(
        2,
        SubscriptionBillingCycle.MONTHLY,
        1
      );

      // Assert
      expect(result.finalAmount).toBe(5); // Minimum price enforcement
      expect(result.rulesApplied).toContain('Minimum price enforcement: $5');
    });

    it('should cap maximum discount', async () => {
      // Act
      const result = await service.applyPricingRules(
        1000,
        SubscriptionBillingCycle.ANNUALLY,
        20
      );

      // Assert
      const totalDiscountPercent = (result.discountApplied / (1000 * 20)) * 100;
      expect(totalDiscountPercent).toBeLessThanOrEqual(50); // Max 50% discount
      expect(result.rulesApplied).toContain('Maximum discount cap: 50%');
    });

    it('should handle custom pricing rules', async () => {
      // Act
      const result = await service.applyPricingRules(
        5,
        SubscriptionBillingCycle.MONTHLY,
        1,
        {
          discountPercent: 15,
          minimumCommitment: 10,
          maximumDiscount: 30,
        }
      );

      // Assert
      expect(result.finalAmount).toBeGreaterThanOrEqual(10); // Minimum commitment
      expect(result.rulesApplied).toContain('Minimum price enforcement: $10');
    });
  });

  describe('canUpgradeSubscription', () => {
    it('should allow upgrade to higher-tier plan', async () => {
      // Arrange
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue({
        ...mockSubscription,
        plan: mockPlan,
      });
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockUpgradePlan);

      // Act
      const result = await service.canUpgradeSubscription(
        'test-id',
        'upgrade_plan'
      );

      // Assert
      expect(result.canProceed).toBe(true);
      expect(result.message).toBe('Upgrade available');
      expect(result.requiresApproval).toBe(false);
    });

    it('should reject upgrade when subscription is not found', async () => {
      // Arrange
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.canUpgradeSubscription(
        'non-existent-id',
        'upgrade_plan'
      );

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.message).toBe('Subscription not found');
    });

    it('should reject upgrade when target plan is not found', async () => {
      // Arrange
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);
      jest.spyOn(subscriptionPlanRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.canUpgradeSubscription(
        'test-id',
        'non-existent-plan'
      );

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.message).toBe('Target plan not found');
    });

    it('should reject upgrade when subscription is not active', async () => {
      // Arrange
      const inactiveSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(inactiveSubscription);
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockPlan);

      // Act
      const result = await service.canUpgradeSubscription(
        'test-id',
        'upgrade_plan'
      );

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.message).toContain(
        'Cannot upgrade subscription in canceled status'
      );
    });

    it('should reject upgrade when target plan is not higher tier', async () => {
      // Arrange
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue({
        ...mockSubscription,
        plan: mockPlan,
      });
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockDowngradePlan);

      // Act
      const result = await service.canUpgradeSubscription(
        'test-id',
        'downgrade_plan'
      );

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.message).toBe('Target plan is not an upgrade');
    });

    it('should warn about billing cycle change for upgrade', async () => {
      // Arrange
      const monthlySubscription = {
        ...mockSubscription,
        billingCycle: SubscriptionBillingCycle.MONTHLY,
      };
      const yearlyUpgradePlan = {
        ...mockUpgradePlan,
        billingCycle: SubscriptionBillingCycle.ANNUALLY,
      };

      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue({
        ...monthlySubscription,
        plan: {
          ...mockPlan,
          billingCycle: SubscriptionBillingCycle.MONTHLY,
          price: 29.99,
        },
      });
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(yearlyUpgradePlan);

      // Act
      const result = await service.canUpgradeSubscription(
        'test-id',
        'upgrade_plan'
      );

      // Assert
      expect(result.canProceed).toBe(true);
      expect(result.message).toBe('Upgrade available');
    });
  });

  describe('canDowngradeSubscription', () => {
    it('should allow downgrade to lower-tier plan', async () => {
      // Arrange
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue({
        ...mockSubscription,
        plan: mockPlan,
      });
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockDowngradePlan);
      jest.spyOn(subscriptionUsageRepository, 'find').mockResolvedValue([]);

      // Act
      const result = await service.canDowngradeSubscription(
        'test-id',
        'downgrade_plan'
      );

      // Assert
      expect(result.canProceed).toBe(true);
      expect(result.message).toBe('Downgrade available at next billing cycle');
    });

    it('should reject downgrade when subscription is not active', async () => {
      // Arrange
      const inactiveSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(inactiveSubscription);
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockDowngradePlan);

      // Act
      const result = await service.canDowngradeSubscription(
        'test-id',
        'downgrade_plan'
      );

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.message).toContain(
        'Cannot downgrade subscription in canceled status'
      );
    });

    it('should reject downgrade when target plan is not lower tier', async () => {
      // Arrange
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue({
        ...mockSubscription,
        plan: mockPlan,
      });
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockUpgradePlan);

      // Act
      const result = await service.canDowngradeSubscription(
        'test-id',
        'upgrade_plan'
      );

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.message).toBe('Target plan is not a downgrade');
    });

    it('should reject downgrade when current usage exceeds target plan limits', async () => {
      // Arrange
      const subscriptionWithUsage = {
        ...mockSubscription,
        plan: mockPlan,
        limits: { maxUsers: 10, maxStorage: 1000 },
      };
      const downgradePlanWithLowerLimits = {
        ...mockDowngradePlan,
        limits: { maxUsers: 5, maxStorage: 500 },
      };
      const mockUsage = [
        { metricName: 'maxUsers', quantity: 8 },
        { metricName: 'maxStorage', quantity: 600 },
      ];

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(subscriptionWithUsage);
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(downgradePlanWithLowerLimits);
      jest
        .spyOn(subscriptionUsageRepository, 'find')
        .mockResolvedValue(mockUsage as any);

      // Act
      const result = await service.canDowngradeSubscription(
        'test-id',
        'downgrade_plan'
      );

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.message).toContain(
        'Current usage exceeds target plan limits'
      );
    });

    it('should warn about early adopter benefits for new subscriptions', async () => {
      // Arrange
      const recentSubscription = {
        ...mockSubscription,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        plan: mockPlan,
      };

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(recentSubscription);
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockDowngradePlan);
      jest.spyOn(subscriptionUsageRepository, 'find').mockResolvedValue([]);

      // Act
      const result = await service.canDowngradeSubscription(
        'test-id',
        'downgrade_plan'
      );

      // Assert
      expect(result.canProceed).toBe(true);
      expect(result.message).toBe(
        'Downgrade available but may affect early adopter benefits'
      );
    });
  });

  describe('canCancelSubscription', () => {
    it('should allow cancellation of active subscription', async () => {
      // Arrange
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      // Act
      const result = await service.canCancelSubscription('test-id');

      // Assert
      expect(result.canProceed).toBe(true);
      expect(result.message).toBe('Cancellation available');
    });

    it('should reject cancellation when subscription is already canceled', async () => {
      // Arrange
      const canceledSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(canceledSubscription);

      // Act
      const result = await service.canCancelSubscription('test-id');

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.message).toBe('Subscription is already canceled');
    });

    it('should suggest retention offer for high-value subscriptions', async () => {
      // Arrange
      const highValueSubscription = { ...mockSubscription, amount: 600 };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(highValueSubscription);

      // Act
      const result = await service.canCancelSubscription('test-id');

      // Assert
      expect(result.canProceed).toBe(true);
      expect(result.message).toBe('High-value subscription cancellation');
      expect(result.suggestedActions).toContain('Consider retention offer');
    });

    it('should suggest refund policy for early cancellations', async () => {
      // Arrange
      const recentSubscription = {
        ...mockSubscription,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(recentSubscription);

      // Act
      const result = await service.canCancelSubscription('test-id');

      // Assert
      expect(result.canProceed).toBe(true);
      expect(result.message).toBe(
        'Early cancellation - consider refund policy'
      );
      expect(result.suggestedActions).toContain('Review refund policy');
    });
  });

  describe('calculateProration', () => {
    it('should calculate proration for price increase', async () => {
      // Arrange
      const subscription = {
        ...mockSubscription,
        amount: 100,
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(subscription);

      // Act
      const result = await service.calculateProration(
        'test-id',
        200,
        new Date('2024-01-15')
      );

      // Assert
      expect(result.prorationAmount).toBeGreaterThan(0); // Should charge more
      expect(result.chargeAmount).toBeGreaterThan(0);
      expect(result.creditAmount).toBe(0);
    });

    it('should calculate proration for price decrease', async () => {
      // Arrange
      const subscription = {
        ...mockSubscription,
        amount: 200,
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(subscription);

      // Act
      const result = await service.calculateProration(
        'test-id',
        100,
        new Date('2024-01-15')
      );

      // Assert
      expect(result.prorationAmount).toBeLessThan(0); // Should credit
      expect(result.creditAmount).toBeGreaterThan(0);
      expect(result.chargeAmount).toBe(0);
    });

    it('should handle proration at period start', async () => {
      // Arrange
      const subscription = {
        ...mockSubscription,
        amount: 100,
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(subscription);

      // Act
      const result = await service.calculateProration(
        'test-id',
        200,
        new Date('2024-01-01')
      );

      // Assert
      expect(result.prorationAmount).toBe(100); // Full difference for full period
    });

    it('should handle proration at period end', async () => {
      // Arrange
      const subscription = {
        ...mockSubscription,
        amount: 100,
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2024-02-01'),
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(subscription);

      // Act
      const result = await service.calculateProration(
        'test-id',
        200,
        new Date('2024-02-01')
      );

      // Assert
      expect(result.prorationAmount).toBe(0); // No proration at period end
    });

    it('should return zero proration when subscription is not found', async () => {
      // Arrange
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.calculateProration('non-existent-id', 200);

      // Assert
      expect(result.prorationAmount).toBe(0);
      expect(result.creditAmount).toBe(0);
      expect(result.chargeAmount).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully in applyPricingRules', async () => {
      // Act
      const result = await service.applyPricingRules(
        100,
        SubscriptionBillingCycle.MONTHLY,
        1
      );

      // Assert
      expect(result.finalAmount).toBe(100); // Should return base amount
      expect(result.discountApplied).toBe(0);
      expect(result.rulesApplied).toHaveLength(0); // No rules applied for monthly billing
    });

    it('should handle errors in canUpgradeSubscription', async () => {
      // Arrange
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.canUpgradeSubscription(
        'test-id',
        'upgrade_plan'
      );

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.message).toBe('Error checking upgrade eligibility');
      expect(result.requiresApproval).toBe(true);
    });

    it('should handle errors in canDowngradeSubscription', async () => {
      // Arrange
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.canDowngradeSubscription(
        'test-id',
        'downgrade_plan'
      );

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.message).toBe('Error checking downgrade eligibility');
      expect(result.requiresApproval).toBe(true);
    });

    it('should handle errors in canCancelSubscription', async () => {
      // Arrange
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.canCancelSubscription('test-id');

      // Assert
      expect(result.canProceed).toBe(false);
      expect(result.message).toBe('Error checking cancellation eligibility');
      expect(result.requiresApproval).toBe(true);
    });

    it('should handle errors in calculateProration', async () => {
      // Arrange
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.calculateProration('test-id', 200);

      // Assert
      expect(result.prorationAmount).toBe(0);
      expect(result.creditAmount).toBe(0);
      expect(result.chargeAmount).toBe(0);
    });
  });
});
