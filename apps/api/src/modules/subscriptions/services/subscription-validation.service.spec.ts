import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionValidationService } from './subscription-validation.service';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { SubscriptionUsage } from '../entities/subscription-usage.entity';
import { SubscriptionInvoice } from '../entities/subscription-invoice.entity';
import { SubscriptionStatus, SubscriptionBillingCycle } from '@app/shared';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
} from '../dto';

describe('SubscriptionValidationService', () => {
  let service: SubscriptionValidationService;
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
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    currentPeriodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    currentPeriodEnd: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000), // 32 days from now
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

  const mockCreateDto: CreateSubscriptionDto = {
    tenantId: 'test-tenant-id',
    userId: 'test-user-id',
    name: 'Test Subscription',
    amount: 29.99,
    currency: 'USD',
    billingCycle: SubscriptionBillingCycle.MONTHLY,
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    planId: 'plan_test123',
  };

  const mockUpdateDto: UpdateSubscriptionDto = {
    name: 'Updated Subscription',
    amount: 39.99,
  };

  const mockCancelDto: CancelSubscriptionDto = {
    reason: 'user_request' as any,
    cancelAtPeriodEnd: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionValidationService,
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

    service = module.get<SubscriptionValidationService>(
      SubscriptionValidationService
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

  describe('validateSubscriptionCreation', () => {
    it('should validate successful subscription creation', async () => {
      // Arrange
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockPlan);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null); // No existing subscription

      // Act
      const result = await service.validateSubscriptionCreation(mockCreateDto);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(subscriptionPlanRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCreateDto.planId },
      });
    });

    it('should fail validation when required fields are missing', async () => {
      // Arrange
      const invalidDto = { ...mockCreateDto, tenantId: '', userId: '' };

      // Act
      const result = await service.validateSubscriptionCreation(invalidDto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tenant ID is required');
      expect(result.errors).toContain('User ID is required');
    });

    it('should fail validation when plan is not found', async () => {
      // Arrange
      jest.spyOn(subscriptionPlanRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.validateSubscriptionCreation(mockCreateDto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Subscription plan not found');
    });

    it('should fail validation when plan is inactive', async () => {
      // Arrange
      const inactivePlan = { ...mockPlan, isActive: false };
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(inactivePlan);

      // Act
      const result = await service.validateSubscriptionCreation(mockCreateDto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Subscription plan is not active');
    });

    it('should fail validation when active subscription already exists', async () => {
      // Arrange
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockPlan);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      // Act
      const result = await service.validateSubscriptionCreation(mockCreateDto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'An active subscription already exists for this tenant and user'
      );
    });

    it('should fail validation when amount is negative', async () => {
      // Arrange
      const invalidDto = { ...mockCreateDto, amount: -10 };
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockPlan);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.validateSubscriptionCreation(invalidDto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Amount cannot be negative');
    });

    it('should warn when trial period exceeds 90 days', async () => {
      // Arrange
      const trialDto = { ...mockCreateDto, isTrial: true, trialDays: 120 };
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockPlan);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.validateSubscriptionCreation(trialDto);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Trial period longer than 90 days may require special approval'
      );
    });

    it('should warn when subscription amount is below minimum', async () => {
      // Arrange
      const lowAmountDto = { ...mockCreateDto, amount: 2.0 };
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockPlan);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.validateSubscriptionCreation(lowAmountDto);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Subscription amount is below recommended minimum'
      );
    });
  });

  describe('validateSubscriptionUpdate', () => {
    it('should validate successful subscription update', async () => {
      // Arrange
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      // Act
      const result = await service.validateSubscriptionUpdate(
        'test-id',
        mockUpdateDto
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when subscription is not found', async () => {
      // Arrange
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.validateSubscriptionUpdate(
        'non-existent-id',
        mockUpdateDto
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Subscription not found');
    });

    it('should fail validation for invalid state transition', async () => {
      // Arrange
      const completedSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.COMPLETED,
      };
      const updateWithStatus = {
        ...mockUpdateDto,
        status: SubscriptionStatus.ACTIVE,
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(completedSubscription);

      // Act
      const result = await service.validateSubscriptionUpdate(
        'test-id',
        updateWithStatus
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Cannot transition from completed to active'
      );
    });

    it('should warn when price change exceeds 50%', async () => {
      // Arrange
      const highPriceUpdate = { ...mockUpdateDto, amount: 100.0 }; // More than 50% increase
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      // Act
      const result = await service.validateSubscriptionUpdate(
        'test-id',
        highPriceUpdate
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Price change exceeds 50% - may require customer approval'
      );
    });
  });

  describe('validateSubscriptionCancellation', () => {
    it('should validate successful subscription cancellation', async () => {
      // Arrange
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      // Act
      const result = await service.validateSubscriptionCancellation(
        'test-id',
        mockCancelDto
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when subscription is already canceled', async () => {
      // Arrange
      const canceledSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(canceledSubscription);

      // Act
      const result = await service.validateSubscriptionCancellation(
        'test-id',
        mockCancelDto
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Subscription is already canceled');
    });

    it('should warn for high-value subscription cancellation', async () => {
      // Arrange
      const highValueSubscription = { ...mockSubscription, amount: 1001 };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(highValueSubscription);

      // Act
      const result = await service.validateSubscriptionCancellation(
        'test-id',
        mockCancelDto
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'High-value subscription cancellation - consider retention offer'
      );
    });

    it('should warn for early cancellation', async () => {
      // Arrange
      const recentSubscription = {
        ...mockSubscription,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(recentSubscription);

      // Act
      const result = await service.validateSubscriptionCancellation(
        'test-id',
        mockCancelDto
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Early cancellation - subscription less than 30 days old'
      );
    });
  });

  describe('validateSubscriptionLimits', () => {
    it('should validate usage within limits', async () => {
      // Arrange
      const subscriptionWithLimits = {
        ...mockSubscription,
        limits: { maxUsers: 10, maxStorage: 1000 },
      };
      const usageData = { maxUsers: 5, maxStorage: 500 };
      const mockUsage = [
        { metric: 'maxUsers', usage: 3 },
        { metric: 'maxStorage', usage: 200 },
      ];

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(subscriptionWithLimits);
      jest
        .spyOn(subscriptionUsageRepository, 'find')
        .mockResolvedValue(mockUsage as any);

      // Act
      const result = await service.validateSubscriptionLimits(
        'test-id',
        usageData
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when usage exceeds limits', async () => {
      // Arrange
      const subscriptionWithLimits = {
        ...mockSubscription,
        limits: { maxUsers: 10, maxStorage: 1000 },
      };
      const usageData = { maxUsers: 5, maxStorage: 500 };
      const mockUsage = [
        { metricName: 'maxUsers', quantity: 8 },
        { metricName: 'maxStorage', quantity: 600 },
      ];

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(subscriptionWithLimits);
      jest
        .spyOn(subscriptionUsageRepository, 'find')
        .mockResolvedValue(mockUsage as any);

      // Act
      const result = await service.validateSubscriptionLimits(
        'test-id',
        usageData
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Usage limit exceeded for 'maxUsers': 13/10"
      );
    });

    it('should warn when approaching usage limits', async () => {
      // Arrange
      const subscriptionWithLimits = {
        ...mockSubscription,
        limits: { maxUsers: 10, maxStorage: 1000 },
      };
      const usageData = { maxUsers: 2, maxStorage: 100 };
      const mockUsage = [
        { metricName: 'maxUsers', quantity: 7 },
        { metricName: 'maxStorage', quantity: 700 },
      ];

      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(subscriptionWithLimits);
      jest
        .spyOn(subscriptionUsageRepository, 'find')
        .mockResolvedValue(mockUsage as any);

      // Act
      const result = await service.validateSubscriptionLimits(
        'test-id',
        usageData
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Approaching usage limit for 'maxUsers': 9/10"
      );
    });
  });

  describe('validateFeatureCompatibility', () => {
    it('should validate feature compatibility with plan', async () => {
      // Arrange
      const dtoWithFeatures = {
        ...mockCreateDto,
        features: { analytics: true, apiAccess: true, customBranding: true },
      };
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockPlan);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result =
        await service.validateSubscriptionCreation(dtoWithFeatures);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Feature 'customBranding' is not available in the selected plan"
      );
    });
  });

  describe('validateLimitCompatibility', () => {
    it('should validate limit compatibility with plan', async () => {
      // Arrange
      const dtoWithLimits = {
        ...mockCreateDto,
        limits: { maxUsers: 20, maxStorage: 2000 },
      };
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockPlan);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.validateSubscriptionCreation(dtoWithLimits);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Limit 'maxUsers' exceeds plan maximum of 10"
      );
    });
  });

  describe('validateTrialPeriod', () => {
    it('should fail validation when trial subscription has no trial days', async () => {
      // Arrange
      const trialDto = { ...mockCreateDto, isTrial: true, trialDays: 0 };
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockPlan);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.validateSubscriptionCreation(trialDto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Trial days must be specified and greater than 0 for trial subscriptions'
      );
    });

    it('should warn when trial period exceeds standard limit', async () => {
      // Arrange
      const trialDto = { ...mockCreateDto, isTrial: true, trialDays: 45 };
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockPlan);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.validateSubscriptionCreation(trialDto);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Trial period exceeds standard 30-day limit'
      );
    });
  });

  describe('validateStripeIntegration', () => {
    it('should fail validation when customer ID is provided without price ID', async () => {
      // Arrange
      const stripeDto = { ...mockCreateDto, stripeCustomerId: 'cus_123' };
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockPlan);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.validateSubscriptionCreation(stripeDto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Stripe price ID is required when customer ID is provided'
      );
    });

    it('should fail validation when price ID is provided without customer ID', async () => {
      // Arrange
      const stripeDto = { ...mockCreateDto, stripePriceId: 'price_123' };
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockPlan);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.validateSubscriptionCreation(stripeDto);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Stripe customer ID is required when price ID is provided'
      );
    });
  });

  describe('validateBusinessRules', () => {
    it('should warn when annual billing discount is insufficient', async () => {
      // Arrange
      const annualDto = {
        ...mockCreateDto,
        billingCycle: SubscriptionBillingCycle.ANNUALLY,
        amount: 100, // Should be at least 20% discount from monthly equivalent
      };
      jest
        .spyOn(subscriptionPlanRepository, 'findOne')
        .mockResolvedValue(mockPlan);
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.validateSubscriptionCreation(annualDto);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Annual billing should provide at least 20% discount'
      );
    });
  });
});
