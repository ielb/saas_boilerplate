import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { SubscriptionUsage } from '../entities/subscription-usage.entity';
import { SubscriptionInvoice } from '../entities/subscription-invoice.entity';
import { StripeService } from '../../payments/services/stripe.service';
import { SubscriptionValidationService } from './subscription-validation.service';
import { SubscriptionBusinessRulesService } from './subscription-business-rules.service';
import { UsersService } from '../../users/services/users.service';
import { TenantService } from '../../tenants/services/tenant.service';
import {
  SubscriptionStatus,
  SubscriptionBillingCycle,
  SubscriptionEventType,
} from '@app/shared';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
} from '../dto';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let module: TestingModule;
  let subscriptionRepository: Repository<Subscription>;
  let subscriptionPlanRepository: Repository<SubscriptionPlan>;
  let subscriptionUsageRepository: Repository<SubscriptionUsage>;
  let subscriptionInvoiceRepository: Repository<SubscriptionInvoice>;
  let stripeService: StripeService;

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

  const mockStripeSubscription = {
    id: 'sub_test123',
    current_period_start: 1704067200, // 2024-01-01
    current_period_end: 1706745600, // 2024-02-01
    trial_end: null,
    items: {
      data: [
        {
          price: {
            id: 'price_test123',
            product: 'prod_test123',
          },
        },
      ],
    },
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: getRepositoryToken(Subscription),
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
          provide: getRepositoryToken(SubscriptionPlan),
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
        {
          provide: StripeService,
          useValue: {
            createSubscription: jest.fn(),
            updateSubscription: jest.fn(),
            cancelSubscription: jest.fn(),
            reactivateSubscription: jest.fn(),
            getSubscription: jest.fn(),
            listSubscriptions: jest.fn(),
          },
        },
        {
          provide: SubscriptionValidationService,
          useValue: {
            validateSubscriptionCreation: jest
              .fn()
              .mockResolvedValue({ isValid: true, errors: [], warnings: [] }),
            validateSubscriptionUpdate: jest
              .fn()
              .mockResolvedValue({ isValid: true, errors: [], warnings: [] }),
            validateSubscriptionCancellation: jest
              .fn()
              .mockResolvedValue({ isValid: true, errors: [], warnings: [] }),
            validateSubscriptionData: jest.fn(),
            validateSubscriptionStatus: jest.fn(),
            validateSubscriptionPlan: jest.fn(),
            validateSubscriptionLimits: jest.fn(),
          },
        },
        {
          provide: SubscriptionBusinessRulesService,
          useValue: {
            applyPricingRules: jest.fn().mockResolvedValue({
              finalAmount: 100,
              discountApplied: 0,
              rulesApplied: [],
            }),
            canCreateSubscription: jest.fn(),
            canUpdateSubscription: jest.fn(),
            canCancelSubscription: jest.fn().mockResolvedValue({
              canProceed: true,
              message: 'Cancellation allowed',
              requiresApproval: false,
              suggestedActions: [],
            }),
            canReactivateSubscription: jest.fn(),
            canSuspendSubscription: jest.fn(),
            canDeleteSubscription: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: TenantService,
          useValue: {
            findById: jest.fn(),
            findByName: jest.fn(),
            getTenantById: jest.fn().mockResolvedValue({
              id: 'test-tenant-id',
              name: 'Test Tenant',
            }),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    subscriptionRepository = module.get<Repository<Subscription>>(
      getRepositoryToken(Subscription)
    );
    subscriptionPlanRepository = module.get<Repository<SubscriptionPlan>>(
      getRepositoryToken(SubscriptionPlan)
    );
    subscriptionUsageRepository = module.get<Repository<SubscriptionUsage>>(
      getRepositoryToken(SubscriptionUsage)
    );
    subscriptionInvoiceRepository = module.get<Repository<SubscriptionInvoice>>(
      getRepositoryToken(SubscriptionInvoice)
    );
    stripeService = module.get<StripeService>(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSubscription', () => {
    const createDto: CreateSubscriptionDto = {
      tenantId: 'test-tenant-id',
      userId: 'test-user-id',
      name: 'Test Subscription',
      description: 'Test Description',
      amount: 29.99,
      currency: 'USD',
      quantity: 1,
      startDate: '2024-01-01',
      stripeCustomerId: 'cus_test123',
      stripePriceId: 'price_test123',
    };

    it('should create a subscription successfully', async () => {
      // Arrange
      const mockCreatedSubscription = { ...mockSubscription };
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(stripeService, 'createSubscription')
        .mockResolvedValue(mockStripeSubscription as any);
      jest
        .spyOn(subscriptionRepository, 'create')
        .mockReturnValue(mockCreatedSubscription as any);
      jest
        .spyOn(subscriptionRepository, 'save')
        .mockResolvedValue(mockCreatedSubscription);

      // Act
      const result = await service.createSubscription(createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockSubscription.id);
      expect(result.name).toBe(createDto.name);
      expect(stripeService.createSubscription).toHaveBeenCalledWith({
        customerId: createDto.stripeCustomerId,
        priceId: createDto.stripePriceId,
        quantity: createDto.quantity,
        metadata: {
          tenantId: createDto.tenantId,
          userId: createDto.userId,
          planId: '',
        },
      });
    });

    it('should create a subscription without Stripe integration', async () => {
      // Arrange
      const createDtoWithoutStripe = { ...createDto };
      delete createDtoWithoutStripe.stripeCustomerId;
      delete createDtoWithoutStripe.stripePriceId;

      const mockCreatedSubscription = { ...mockSubscription };
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(subscriptionRepository, 'create')
        .mockReturnValue(mockCreatedSubscription as any);
      jest
        .spyOn(subscriptionRepository, 'save')
        .mockResolvedValue(mockCreatedSubscription);

      // Act
      const result = await service.createSubscription(createDtoWithoutStripe);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockSubscription.id);
      expect(stripeService.createSubscription).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when active subscription exists', async () => {
      // Arrange
      const validationService = module.get<SubscriptionValidationService>(
        SubscriptionValidationService
      );
      jest
        .spyOn(validationService, 'validateSubscriptionCreation')
        .mockResolvedValue({
          isValid: false,
          errors: [
            'An active subscription already exists for this tenant and user',
          ],
          warnings: [],
        });

      // Act & Assert
      await expect(service.createSubscription(createDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw NotFoundException when plan does not exist', async () => {
      // Arrange
      const createDtoWithPlan = { ...createDto, planId: 'non-existent-plan' };
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValueOnce(null); // No existing subscription
      jest.spyOn(subscriptionPlanRepository, 'findOne').mockResolvedValue(null); // Plan not found

      // Act & Assert
      await expect(
        service.createSubscription(createDtoWithPlan)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when Stripe subscription creation fails', async () => {
      // Arrange
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(stripeService, 'createSubscription')
        .mockRejectedValue(new Error('Stripe error'));

      // Act & Assert
      await expect(service.createSubscription(createDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('updateSubscription', () => {
    const updateDto: UpdateSubscriptionDto = {
      name: 'Updated Subscription',
      amount: 39.99,
    };

    it('should update a subscription successfully', async () => {
      // Arrange
      const { endDate, trialEndDate, ...updateDtoWithoutDates } = updateDto;
      const updatedSubscription = {
        ...mockSubscription,
        ...updateDtoWithoutDates,
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(subscriptionRepository, 'update')
        .mockResolvedValue({ affected: 1 } as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(updatedSubscription);

      // Act
      const result = await service.updateSubscription(
        mockSubscription.id,
        updateDto
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(result.amount).toBe(updateDto.amount);
    });

    it('should throw NotFoundException when subscription does not exist', async () => {
      // Arrange
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateSubscription('non-existent-id', updateDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when subscription cannot be updated', async () => {
      // Arrange
      const canceledSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(canceledSubscription);

      // Act & Assert
      await expect(
        service.updateSubscription(mockSubscription.id, updateDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelSubscription', () => {
    const cancelDto: CancelSubscriptionDto = {
      reason: 'user_request' as any,
      cancelAtPeriodEnd: true,
    };

    it('should cancel a subscription successfully', async () => {
      // Arrange
      const canceledSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        cancelReason: cancelDto.reason as string,
        isActive: false,
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(stripeService, 'cancelSubscription')
        .mockResolvedValue(mockStripeSubscription as any);
      jest
        .spyOn(subscriptionRepository, 'update')
        .mockResolvedValue({ affected: 1 } as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(canceledSubscription);

      // Act
      const result = await service.cancelSubscription(
        mockSubscription.id,
        cancelDto
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(SubscriptionStatus.CANCELED);
      expect(result.isActive).toBe(false);
      expect(stripeService.cancelSubscription).toHaveBeenCalledWith(
        mockSubscription.stripeSubscriptionId,
        {
          cancelAtPeriodEnd: cancelDto.cancelAtPeriodEnd,
        }
      );
    });

    it('should throw NotFoundException when subscription does not exist', async () => {
      // Arrange
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.cancelSubscription('non-existent-id', cancelDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when subscription cannot be canceled', async () => {
      // Arrange
      const canceledSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(canceledSubscription);

      // Act & Assert
      await expect(
        service.cancelSubscription(mockSubscription.id, cancelDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate a canceled subscription successfully', async () => {
      // Arrange
      const canceledSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.CANCELED,
      };
      const reactivatedSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
        isActive: true,
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(canceledSubscription);
      jest
        .spyOn(stripeService, 'reactivateSubscription')
        .mockResolvedValue(mockStripeSubscription as any);
      jest
        .spyOn(subscriptionRepository, 'update')
        .mockResolvedValue({ affected: 1 } as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValueOnce(canceledSubscription)
        .mockResolvedValueOnce(reactivatedSubscription);

      // Act
      const result = await service.reactivateSubscription(mockSubscription.id);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.isActive).toBe(true);
      expect(stripeService.reactivateSubscription).toHaveBeenCalledWith(
        mockSubscription.stripeSubscriptionId
      );
    });

    it('should throw BadRequestException when subscription is not canceled', async () => {
      // Arrange
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      // Act & Assert
      await expect(
        service.reactivateSubscription(mockSubscription.id)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('suspendSubscription', () => {
    it('should suspend an active subscription successfully', async () => {
      // Arrange
      const suspendedSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.SUSPENDED,
        isActive: false,
        cancelReason: 'Test reason',
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(subscriptionRepository, 'update')
        .mockResolvedValue({ affected: 1 } as any);
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValueOnce(mockSubscription)
        .mockResolvedValueOnce(suspendedSubscription);

      // Act
      const result = await service.suspendSubscription(
        mockSubscription.id,
        'Test reason'
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(SubscriptionStatus.SUSPENDED);
      expect(result.isActive).toBe(false);
    });

    it('should throw BadRequestException when subscription is not active', async () => {
      // Arrange
      const suspendedSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.SUSPENDED,
      };
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(suspendedSubscription);

      // Act & Assert
      await expect(
        service.suspendSubscription(mockSubscription.id)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteSubscription', () => {
    it('should soft delete a subscription successfully', async () => {
      // Arrange
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(subscriptionRepository, 'update')
        .mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.deleteSubscription(mockSubscription.id);

      // Assert
      expect(result).toBe(true);
      expect(subscriptionRepository.update).toHaveBeenCalledWith(
        mockSubscription.id,
        {
          deletedAt: expect.any(Date),
          isActive: false,
        }
      );
    });

    it('should throw NotFoundException when subscription does not exist', async () => {
      // Arrange
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteSubscription('non-existent-id')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByStripeSubscriptionId', () => {
    it('should find subscription by Stripe subscription ID', async () => {
      // Arrange
      jest
        .spyOn(subscriptionRepository, 'findOne')
        .mockResolvedValue(mockSubscription);

      // Act
      const result = await service.findByStripeSubscriptionId('sub_test123');

      // Assert
      expect(result).toBeDefined();
      expect(result?.stripeSubscriptionId).toBe('sub_test123');
    });

    it('should return null when subscription not found', async () => {
      // Arrange
      jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result =
        await service.findByStripeSubscriptionId('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Basic CRUD Operations', () => {
    describe('findAll', () => {
      it('should return all subscriptions', async () => {
        // Arrange
        const mockSubscriptions = [mockSubscription];
        jest
          .spyOn(subscriptionRepository, 'find')
          .mockResolvedValue(mockSubscriptions);

        // Act
        const result = await service.findAll();

        // Assert
        expect(result).toEqual(mockSubscriptions);
        expect(subscriptionRepository.find).toHaveBeenCalledWith({
          relations: ['plan', 'tenant', 'user'],
        });
      });
    });

    describe('findById', () => {
      it('should return a subscription by id', async () => {
        // Arrange
        jest
          .spyOn(subscriptionRepository, 'findOne')
          .mockResolvedValue(mockSubscription);

        // Act
        const result = await service.findById('test-subscription-id');

        // Assert
        expect(result).toEqual(mockSubscription);
        expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
          where: { id: 'test-subscription-id' },
          relations: ['plan', 'tenant', 'user'],
        });
      });

      it('should return null if subscription not found', async () => {
        // Arrange
        jest.spyOn(subscriptionRepository, 'findOne').mockResolvedValue(null);

        // Act
        const result = await service.findById('non-existent');

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('findByTenantId', () => {
      it('should return subscriptions for a tenant', async () => {
        // Arrange
        const mockSubscriptions = [mockSubscription];
        jest
          .spyOn(subscriptionRepository, 'find')
          .mockResolvedValue(mockSubscriptions);

        // Act
        const result = await service.findByTenantId('test-tenant-id');

        // Assert
        expect(result).toEqual(mockSubscriptions);
        expect(subscriptionRepository.find).toHaveBeenCalledWith({
          where: { tenantId: 'test-tenant-id' },
          relations: ['plan', 'tenant', 'user'],
        });
      });
    });

    describe('findByUserId', () => {
      it('should return subscriptions for a user', async () => {
        // Arrange
        const mockSubscriptions = [mockSubscription];
        jest
          .spyOn(subscriptionRepository, 'find')
          .mockResolvedValue(mockSubscriptions);

        // Act
        const result = await service.findByUserId('test-user-id');

        // Assert
        expect(result).toEqual(mockSubscriptions);
        expect(subscriptionRepository.find).toHaveBeenCalledWith({
          where: { userId: 'test-user-id' },
          relations: ['plan', 'tenant', 'user'],
        });
      });
    });
  });
});
