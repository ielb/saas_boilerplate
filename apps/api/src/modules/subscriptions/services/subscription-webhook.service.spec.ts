import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionWebhookService } from './subscription-webhook.service';
import { SubscriptionService } from './subscription.service';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { SubscriptionUsage } from '../entities/subscription-usage.entity';
import { SubscriptionInvoice } from '../entities/subscription-invoice.entity';
import { StripeService } from '../../payments/services/stripe.service';
import { SubscriptionStatus } from '@app/shared';

describe('SubscriptionWebhookService', () => {
  let service: SubscriptionWebhookService;
  let subscriptionService: SubscriptionService;
  let stripeService: StripeService;

  const mockSubscription: Subscription = {
    id: 'test-subscription-id',
    tenantId: 'test-tenant-id',
    userId: 'test-user-id',
    name: 'Test Subscription',
    description: 'Test Description',
    status: SubscriptionStatus.ACTIVE,
    billingCycle: 'monthly' as any,
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
    status: 'active',
    created: 1704067200, // 2024-01-01
    current_period_start: 1704067200,
    current_period_end: 1706745600,
    trial_end: null,
    cancel_at_period_end: false,
    customer: 'cus_test123',
    items: {
      data: [
        {
          id: 'si_test123',
          quantity: 1,
          amount_total: 2999,
          price: {
            id: 'price_test123',
            product: 'prod_test123',
          },
        },
      ],
    },
    metadata: {},
  };

  const mockStripeInvoice = {
    id: 'in_test123',
    subscription: 'sub_test123',
    customer: 'cus_test123',
    amount_paid: 2999,
    amount_due: 0,
    status: 'paid',
    created: 1704067200,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionWebhookService,
        {
          provide: SubscriptionService,
          useValue: {
            findByStripeSubscriptionId: jest.fn(),
            updateSubscription: jest.fn(),
            updateFromWebhook: jest.fn(),
            cancelSubscription: jest.fn(),
          },
        },
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
            verifyWebhookSignature: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionWebhookService>(
      SubscriptionWebhookService
    );
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
    stripeService = module.get<StripeService>(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processWebhookEvent', () => {
    it('should process customer.subscription.created event', async () => {
      // Arrange
      const event = {
        type: 'customer.subscription.created',
        id: 'evt_test123',
        data: { object: mockStripeSubscription },
      } as any;

      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(null);

      // Act
      await service.processWebhookEvent(event);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
    });

    it('should process customer.subscription.updated event', async () => {
      // Arrange
      const event = {
        type: 'customer.subscription.updated',
        id: 'evt_test123',
        data: { object: mockStripeSubscription },
      } as any;

      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(subscriptionService, 'updateFromWebhook')
        .mockResolvedValue({} as any);

      // Act
      await service.processWebhookEvent(event);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
      expect(subscriptionService.updateFromWebhook).toHaveBeenCalled();
    });

    it('should process customer.subscription.deleted event', async () => {
      // Arrange
      const event = {
        type: 'customer.subscription.deleted',
        id: 'evt_test123',
        data: { object: mockStripeSubscription },
      } as any;

      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(subscriptionService, 'cancelSubscription')
        .mockResolvedValue({} as any);

      // Act
      await service.processWebhookEvent(event);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
      expect(subscriptionService.cancelSubscription).toHaveBeenCalled();
    });

    it('should process customer.subscription.trial_will_end event', async () => {
      // Arrange
      const event = {
        type: 'customer.subscription.trial_will_end',
        id: 'evt_test123',
        data: { object: mockStripeSubscription },
      } as any;

      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(subscriptionService, 'updateFromWebhook')
        .mockResolvedValue({} as any);

      // Act
      await service.processWebhookEvent(event);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
      expect(subscriptionService.updateFromWebhook).toHaveBeenCalled();
    });

    it('should process invoice.payment_succeeded event', async () => {
      // Arrange
      const event = {
        type: 'invoice.payment_succeeded',
        id: 'evt_test123',
        data: { object: mockStripeInvoice },
      } as any;

      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(subscriptionService, 'updateFromWebhook')
        .mockResolvedValue({} as any);

      // Act
      await service.processWebhookEvent(event);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
    });

    it('should process invoice.payment_failed event', async () => {
      // Arrange
      const event = {
        type: 'invoice.payment_failed',
        id: 'evt_test123',
        data: { object: mockStripeInvoice },
      } as any;

      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(subscriptionService, 'updateFromWebhook')
        .mockResolvedValue({} as any);

      // Act
      await service.processWebhookEvent(event);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
      expect(subscriptionService.updateFromWebhook).toHaveBeenCalledWith(
        'sub_test123',
        { status: SubscriptionStatus.PAST_DUE }
      );
    });

    it('should process invoice.upcoming event', async () => {
      // Arrange
      const event = {
        type: 'invoice.upcoming',
        id: 'evt_test123',
        data: { object: mockStripeInvoice },
      } as any;

      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(mockSubscription);

      // Act
      await service.processWebhookEvent(event);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
    });

    it('should handle unhandled event types gracefully', async () => {
      // Arrange
      const event = {
        type: 'customer.created',
        id: 'evt_test123',
        data: { object: {} },
      } as any;

      // Act & Assert
      await expect(service.processWebhookEvent(event)).resolves.not.toThrow();
    });

    it('should throw error when processing fails', async () => {
      // Arrange
      const event = {
        type: 'customer.subscription.updated',
        id: 'evt_test123',
        data: { object: mockStripeSubscription },
      } as any;

      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.processWebhookEvent(event)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('handleSubscriptionCreated', () => {
    it('should handle subscription creation when subscription does not exist', async () => {
      // Arrange
      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(null);

      // Act
      await service['handleSubscriptionCreated'](mockStripeSubscription as any);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
    });

    it('should skip creation when subscription already exists', async () => {
      // Arrange
      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(mockSubscription);

      // Act
      await service['handleSubscriptionCreated'](mockStripeSubscription as any);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
    });

    it('should handle missing subscription items', async () => {
      // Arrange
      const subscriptionWithoutItems = {
        ...mockStripeSubscription,
        items: { data: [] },
      };

      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(null);

      // Act
      await service['handleSubscriptionCreated'](
        subscriptionWithoutItems as any
      );

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
    });
  });

  describe('handleSubscriptionUpdated', () => {
    it('should update existing subscription', async () => {
      // Arrange
      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(subscriptionService, 'updateFromWebhook')
        .mockResolvedValue({} as any);

      // Act
      await service['handleSubscriptionUpdated'](mockStripeSubscription as any);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
      expect(subscriptionService.updateFromWebhook).toHaveBeenCalled();
    });

    it('should skip update when subscription does not exist', async () => {
      // Arrange
      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(null);

      // Act
      await service['handleSubscriptionUpdated'](mockStripeSubscription as any);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
      expect(subscriptionService.updateSubscription).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionDeleted', () => {
    it('should cancel existing subscription', async () => {
      // Arrange
      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(subscriptionService, 'cancelSubscription')
        .mockResolvedValue({} as any);

      // Act
      await service['handleSubscriptionDeleted'](mockStripeSubscription as any);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
      expect(subscriptionService.cancelSubscription).toHaveBeenCalledWith(
        'test-subscription-id',
        {
          reason: 'stripe_deleted',
          cancelAtPeriodEnd: false,
        }
      );
    });

    it('should skip cancellation when subscription does not exist', async () => {
      // Arrange
      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(null);

      // Act
      await service['handleSubscriptionDeleted'](mockStripeSubscription as any);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
      expect(subscriptionService.cancelSubscription).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentSucceeded', () => {
    it('should update subscription status from past due to active', async () => {
      // Arrange
      const pastDueSubscription = {
        ...mockSubscription,
        status: SubscriptionStatus.PAST_DUE,
      };
      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(pastDueSubscription);
      jest
        .spyOn(subscriptionService, 'updateFromWebhook')
        .mockResolvedValue({} as any);

      // Act
      await service['handlePaymentSucceeded'](mockStripeInvoice as any);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
      expect(subscriptionService.updateFromWebhook).toHaveBeenCalledWith(
        'sub_test123',
        { status: SubscriptionStatus.ACTIVE }
      );
    });

    it('should skip update when subscription is not past due', async () => {
      // Arrange
      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(subscriptionService, 'updateFromWebhook')
        .mockResolvedValue({} as any);

      // Act
      await service['handlePaymentSucceeded'](mockStripeInvoice as any);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
      expect(subscriptionService.updateSubscription).not.toHaveBeenCalled();
    });

    it('should handle invoice without subscription', async () => {
      // Arrange
      const invoiceWithoutSubscription = {
        ...mockStripeInvoice,
        subscription: null,
      };

      // Act
      await service['handlePaymentSucceeded'](
        invoiceWithoutSubscription as any
      );

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentFailed', () => {
    it('should update subscription status to past due', async () => {
      // Arrange
      jest
        .spyOn(subscriptionService, 'findByStripeSubscriptionId')
        .mockResolvedValue(mockSubscription);
      jest
        .spyOn(subscriptionService, 'updateFromWebhook')
        .mockResolvedValue({} as any);

      // Act
      await service['handlePaymentFailed'](mockStripeInvoice as any);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).toHaveBeenCalledWith('sub_test123');
      expect(subscriptionService.updateFromWebhook).toHaveBeenCalledWith(
        'sub_test123',
        { status: SubscriptionStatus.PAST_DUE }
      );
    });

    it('should handle invoice without subscription', async () => {
      // Arrange
      const invoiceWithoutSubscription = {
        ...mockStripeInvoice,
        subscription: null,
      };

      // Act
      await service['handlePaymentFailed'](invoiceWithoutSubscription as any);

      // Assert
      expect(
        subscriptionService.findByStripeSubscriptionId
      ).not.toHaveBeenCalled();
    });
  });

  describe('mapStripeStatusToLocal', () => {
    it('should map Stripe statuses to local statuses correctly', () => {
      expect(service['mapStripeStatusToLocal']('active')).toBe(
        SubscriptionStatus.ACTIVE
      );
      expect(service['mapStripeStatusToLocal']('trialing')).toBe(
        SubscriptionStatus.TRIAL
      );
      expect(service['mapStripeStatusToLocal']('past_due')).toBe(
        SubscriptionStatus.PAST_DUE
      );
      expect(service['mapStripeStatusToLocal']('canceled')).toBe(
        SubscriptionStatus.CANCELED
      );
      expect(service['mapStripeStatusToLocal']('unpaid')).toBe(
        SubscriptionStatus.UNPAID
      );
      expect(service['mapStripeStatusToLocal']('incomplete')).toBe(
        SubscriptionStatus.PENDING
      );
      expect(service['mapStripeStatusToLocal']('incomplete_expired')).toBe(
        SubscriptionStatus.PENDING
      );
      expect(service['mapStripeStatusToLocal']('unknown')).toBe(
        SubscriptionStatus.INACTIVE
      );
    });
  });
});
