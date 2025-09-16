import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentService } from './payment.service';
import { StripeService } from './stripe.service';
import {
  Payment,
  PaymentStatus,
  PaymentType,
} from '../entities/payment.entity';
import {
  PaymentIntent,
  PaymentIntentStatus,
} from '../entities/payment-intent.entity';
import {
  PaymentRefund,
  RefundStatus,
  RefundReason,
} from '../entities/payment-refund.entity';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPaymentRepository: jest.Mocked<Repository<Payment>>;
  let mockPaymentIntentRepository: jest.Mocked<Repository<PaymentIntent>>;
  let mockPaymentRefundRepository: jest.Mocked<Repository<PaymentRefund>>;
  let mockStripeService: jest.Mocked<StripeService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    tenantId: 'tenant-123',
    isActive: true,
    emailVerified: true,
    requireEmailVerification: false,
    requireKyc: false,
    kycVerified: true,
    isSuspended: false,
    permissions: ['payment:create', 'payment:read'],
  } as unknown as User;

  const mockTenant: Tenant = {
    id: 'tenant-123',
    name: 'Test Tenant',
    slug: 'test-tenant',
  } as unknown as Tenant;

  const mockPayment: Payment = {
    id: 'payment-123',
    tenantId: 'tenant-123',
    userId: 'user-123',
    status: PaymentStatus.PENDING,
    type: PaymentType.ONE_TIME,
    amount: 1000,
    amountRefunded: 0,
    amountCaptured: 0,
    currency: 'usd',
    description: 'Test payment',
    stripePaymentIntentId: 'pi_test123',
    stripeCustomerId: 'cus_test123',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Payment;

  const mockPaymentIntent: PaymentIntent = {
    id: 'intent-123',
    tenantId: 'tenant-123',
    userId: 'user-123',
    paymentId: 'payment-123',
    status: PaymentIntentStatus.REQUIRES_PAYMENT_METHOD,
    captureMethod: 'automatic',
    confirmationMethod: 'automatic',
    amount: 1000,
    amountCapturable: 1000,
    amountReceived: 0,
    currency: 'usd',
    stripePaymentIntentId: 'pi_test123',
    stripeCustomerId: 'cus_test123',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as PaymentIntent;

  const mockStripePaymentIntent: Stripe.PaymentIntent = {
    id: 'pi_test123',
    object: 'payment_intent',
    amount: 1000,
    amount_capturable: 1000,
    amount_received: 0,
    status: 'requires_payment_method',
    currency: 'usd',
    customer: 'cus_test123',
    payment_method: 'pm_test123',
    client_secret: 'pi_test123_secret',
    capture_method: 'automatic',
    confirmation_method: 'automatic',
    created: 1234567890,
    livemode: false,
    metadata: {},
  } as Stripe.PaymentIntent;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PaymentIntent),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PaymentRefund),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: StripeService,
          useValue: {
            createPaymentIntent: jest.fn(),
            confirmPaymentIntent: jest.fn(),
            capturePaymentIntent: jest.fn(),
            cancelPaymentIntent: jest.fn(),
            createRefund: jest.fn(),
            getPaymentIntent: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    mockPaymentRepository = module.get(getRepositoryToken(Payment));
    mockPaymentIntentRepository = module.get(getRepositoryToken(PaymentIntent));
    mockPaymentRefundRepository = module.get(getRepositoryToken(PaymentRefund));
    mockStripeService = module.get(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const createPaymentDto = {
        tenantId: 'tenant-123',
        userId: 'user-123',
        amount: 1000,
        currency: 'usd',
        description: 'Test payment',
        paymentMethodId: 'pm_test123',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockPaymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any
      );
      mockStripeService.createPaymentIntent.mockResolvedValue(
        mockStripePaymentIntent
      );
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue([mockPayment] as any);
      mockPaymentIntentRepository.create.mockReturnValue(mockPaymentIntent);
      mockPaymentIntentRepository.save.mockResolvedValue(mockPaymentIntent);

      const result = await service.createPayment(createPaymentDto);

      expect(mockStripeService.createPaymentIntent).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'usd',
        customer: undefined,
        description: 'Test payment',
        payment_method: 'pm_test123',
        capture_method: 'automatic',
        confirmation_method: 'automatic',
        metadata: {
          tenantId: 'tenant-123',
          userId: 'user-123',
        },
      });
      expect(mockPaymentRepository.save).toHaveBeenCalled();
      expect(mockPaymentIntentRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockPayment);
    });

    it('should handle existing payment method', async () => {
      const createPaymentDto = {
        tenantId: 'tenant-123',
        userId: 'user-123',
        amount: 1000,
        currency: 'usd',
        paymentMethodId: 'pm_test123',
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'pm-123' }),
      };

      mockPaymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any
      );
      mockStripeService.createPaymentIntent.mockResolvedValue(
        mockStripePaymentIntent
      );
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue([mockPayment] as any);

      const result = await service.createPayment(createPaymentDto);

      expect(result).toEqual(mockPayment);
    });
  });

  describe('confirmPayment', () => {
    it('should confirm a payment successfully', async () => {
      const confirmPaymentDto = {
        paymentIntentId: 'pi_test123',
        paymentMethodId: 'pm_test123',
        returnUrl: 'https://example.com/return',
        receiptEmail: 'test@example.com',
      };

      const confirmedStripeIntent = {
        ...mockStripePaymentIntent,
        status: 'succeeded' as Stripe.PaymentIntent.Status,
      };
      mockStripeService.confirmPaymentIntent.mockResolvedValue(
        confirmedStripeIntent
      );
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);
      mockPaymentIntentRepository.findOne.mockResolvedValue(mockPaymentIntent);
      mockPaymentIntentRepository.save.mockResolvedValue(mockPaymentIntent);

      const result = await service.confirmPayment(confirmPaymentDto);

      expect(mockStripeService.confirmPaymentIntent).toHaveBeenCalledWith(
        'pi_test123',
        {
          paymentMethod: 'pm_test123',
          returnUrl: 'https://example.com/return',
          receiptEmail: 'test@example.com',
        }
      );
      expect(result).toEqual(mockPayment);
    });

    it('should handle payment not found', async () => {
      const confirmPaymentDto = {
        paymentIntentId: 'pi_test123',
      };

      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.confirmPayment(confirmPaymentDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('capturePayment', () => {
    it('should capture a payment successfully', async () => {
      const capturePaymentDto = {
        paymentIntentId: 'pi_test123',
        amount: 1000,
        receiptEmail: 'test@example.com',
        statementDescriptor: 'Test Payment',
      };

      const capturedStripeIntent = {
        ...mockStripePaymentIntent,
        status: 'succeeded' as Stripe.PaymentIntent.Status,
        amount_captured: 1000,
      };
      mockStripeService.capturePaymentIntent.mockResolvedValue(
        capturedStripeIntent
      );
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);
      mockPaymentIntentRepository.findOne.mockResolvedValue(mockPaymentIntent);
      mockPaymentIntentRepository.save.mockResolvedValue(mockPaymentIntent);

      const result = await service.capturePayment(capturePaymentDto);

      expect(mockStripeService.capturePaymentIntent).toHaveBeenCalledWith(
        'pi_test123',
        {
          amount: 1000,
          receiptEmail: 'test@example.com',
          statementDescriptor: 'Test Payment',
        }
      );
      expect(result).toEqual(mockPayment);
    });

    it('should handle payment not found', async () => {
      const capturePaymentDto = {
        paymentIntentId: 'pi_test123',
      };

      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.capturePayment(capturePaymentDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('cancelPayment', () => {
    it('should cancel a payment successfully', async () => {
      const canceledStripeIntent = {
        ...mockStripePaymentIntent,
        status: 'canceled' as Stripe.PaymentIntent.Status,
      };
      mockStripeService.cancelPaymentIntent.mockResolvedValue(
        canceledStripeIntent
      );
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);
      mockPaymentIntentRepository.findOne.mockResolvedValue(mockPaymentIntent);
      mockPaymentIntentRepository.save.mockResolvedValue(mockPaymentIntent);

      const result = await service.cancelPayment(
        'pi_test123',
        'Customer request'
      );

      expect(mockStripeService.cancelPaymentIntent).toHaveBeenCalledWith(
        'pi_test123',
        {
          cancellationReason: 'requested_by_customer',
        }
      );
      expect(result).toEqual(mockPayment);
    });

    it('should handle payment not found', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelPayment('pi_test123')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('refundPayment', () => {
    it('should create a refund successfully', async () => {
      const refundPaymentDto = {
        paymentId: 'payment-123',
        amount: 500,
        reason: RefundReason.REQUESTED_BY_CUSTOMER,
        notes: 'Partial refund',
      };

      const mockRefund: PaymentRefund = {
        id: 'refund-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
        paymentId: 'payment-123',
        status: RefundStatus.PENDING,
        reason: RefundReason.REQUESTED_BY_CUSTOMER,
        amount: 500,
        currency: 'usd',
        notes: 'Partial refund',
        stripeRefundId: 're_test123',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as PaymentRefund;

      const mockStripeRefund: Stripe.Refund = {
        id: 're_test123',
        object: 'refund',
        amount: 500,
        currency: 'usd',
        payment_intent: 'pi_test123',
        status: 'succeeded',
      } as Stripe.Refund;

      const paymentWithRefunds = {
        ...mockPayment,
        amountRefunded: 0,
        amountCaptured: 1000,
        stripeChargeId: 'ch_test123',
        isSuccessful: false,
        isFailed: false,
        isPending: false,
        isProcessing: false,
        isCanceled: false,
        isRefundable: true,
        refundableAmount: 1000,
        requiresAction: false,
        netAmount: 1000,
      } as Payment;
      mockPaymentRepository.findOne.mockResolvedValue(paymentWithRefunds);
      mockStripeService.createRefund.mockResolvedValue(mockStripeRefund);
      mockPaymentRefundRepository.create.mockReturnValue(mockRefund);
      mockPaymentRefundRepository.save.mockResolvedValue([mockRefund] as any);

      const result = await service.refundPayment(refundPaymentDto);

      expect(mockStripeService.createRefund).toHaveBeenCalledWith({
        amount: 500,
        payment_intent: 'pi_test123',
        reason: 'requested_by_customer',
        metadata: {
          notes: 'Partial refund',
          tenantId: 'tenant-123',
          userId: 'user-123',
        },
      });
      expect(result).toEqual(mockRefund);
    });

    it('should handle payment not found', async () => {
      const refundPaymentDto = {
        paymentId: 'payment-123',
        amount: 500,
      };

      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.refundPayment(refundPaymentDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should handle fully refunded payment', async () => {
      const refundPaymentDto = {
        paymentId: 'payment-123',
        amount: 500,
      };

      const paymentWithRefunds = {
        ...mockPayment,
        amountRefunded: 1000,
        amountCaptured: 1000,
        stripeChargeId: 'ch_test123',
        isSuccessful: false,
        isFailed: false,
        isPending: false,
        isProcessing: false,
        isCanceled: false,
        isRefundable: false,
        refundableAmount: 0,
        requiresAction: false,
        netAmount: 0,
      } as Payment;
      mockPaymentRepository.findOne.mockResolvedValue(paymentWithRefunds);

      await expect(service.refundPayment(refundPaymentDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle refund amount exceeding refundable amount', async () => {
      const refundPaymentDto = {
        paymentId: 'payment-123',
        amount: 1500,
      };

      const paymentWithRefunds = {
        ...mockPayment,
        amountRefunded: 0,
        amountCaptured: 1000,
        stripeChargeId: 'ch_test123',
        isSuccessful: false,
        isFailed: false,
        isPending: false,
        isProcessing: false,
        isCanceled: false,
        isRefundable: true,
        refundableAmount: 1000,
        requiresAction: false,
        netAmount: 1000,
      } as Payment;
      mockPaymentRepository.findOne.mockResolvedValue(paymentWithRefunds);

      await expect(service.refundPayment(refundPaymentDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getPayment', () => {
    it('should return payment by ID', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.getPayment('payment-123');

      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'payment-123' },
        relations: ['paymentMethod', 'refunds'],
      });
      expect(result).toEqual(mockPayment);
    });

    it('should throw NotFoundException for non-existent payment', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.getPayment('payment-123')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getPaymentIntent', () => {
    it('should return payment intent by Stripe ID', async () => {
      mockPaymentIntentRepository.findOne.mockResolvedValue(mockPaymentIntent);

      const result = await service.getPaymentIntent('pi_test123');

      expect(mockPaymentIntentRepository.findOne).toHaveBeenCalledWith({
        where: { stripePaymentIntentId: 'pi_test123' },
        relations: ['payment'],
      });
      expect(result).toEqual(mockPaymentIntent);
    });

    it('should throw NotFoundException for non-existent payment intent', async () => {
      mockPaymentIntentRepository.findOne.mockResolvedValue(null);

      await expect(service.getPaymentIntent('pi_test123')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('listPayments', () => {
    it('should return paginated payments', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPayment], 1]),
      };

      mockPaymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any
      );

      const result = await service.listPayments({
        tenantId: 'tenant-123',
        userId: 'user-123',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({
        payments: [mockPayment],
        total: 1,
      });
    });

    it('should apply status filter', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPayment], 1]),
      };

      mockPaymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any
      );

      await service.listPayments({
        tenantId: 'tenant-123',
        userId: 'user-123',
        status: PaymentStatus.SUCCEEDED,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'payment.status = :status',
        {
          status: PaymentStatus.SUCCEEDED,
        }
      );
    });
  });

  describe('updatePaymentFromStripe', () => {
    it('should update payment from Stripe webhook', async () => {
      const stripePaymentIntent = {
        ...mockStripePaymentIntent,
        status: 'succeeded' as Stripe.PaymentIntent.Status,
      };
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);

      await service.updatePaymentFromStripe(stripePaymentIntent);

      expect(mockPaymentRepository.save).toHaveBeenCalledWith({
        ...mockPayment,
        status: PaymentStatus.SUCCEEDED,
        processedAt: expect.any(Date),
      });
    });

    it('should handle payment not found', async () => {
      const stripePaymentIntent = {
        ...mockStripePaymentIntent,
        status: 'succeeded' as Stripe.PaymentIntent.Status,
      };
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await service.updatePaymentFromStripe(stripePaymentIntent);

      expect(mockPaymentRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('status mapping', () => {
    it('should map Stripe status to payment status correctly', () => {
      const testCases = [
        {
          stripeStatus: 'requires_payment_method',
          expected: PaymentStatus.REQUIRES_ACTION,
        },
        {
          stripeStatus: 'requires_confirmation',
          expected: PaymentStatus.REQUIRES_CONFIRMATION,
        },
        {
          stripeStatus: 'requires_action',
          expected: PaymentStatus.REQUIRES_ACTION,
        },
        { stripeStatus: 'processing', expected: PaymentStatus.PROCESSING },
        {
          stripeStatus: 'requires_capture',
          expected: PaymentStatus.REQUIRES_ACTION,
        },
        { stripeStatus: 'canceled', expected: PaymentStatus.CANCELED },
        { stripeStatus: 'succeeded', expected: PaymentStatus.SUCCEEDED },
        { stripeStatus: 'unknown', expected: PaymentStatus.PENDING },
      ];

      testCases.forEach(({ stripeStatus, expected }) => {
        const result = (service as any).mapStripeStatusToPaymentStatus(
          stripeStatus
        );
        expect(result).toBe(expected);
      });
    });

    it('should map Stripe status to payment intent status correctly', () => {
      const testCases = [
        {
          stripeStatus: 'requires_payment_method',
          expected: PaymentIntentStatus.REQUIRES_PAYMENT_METHOD,
        },
        {
          stripeStatus: 'requires_confirmation',
          expected: PaymentIntentStatus.REQUIRES_CONFIRMATION,
        },
        {
          stripeStatus: 'requires_action',
          expected: PaymentIntentStatus.REQUIRES_ACTION,
        },
        {
          stripeStatus: 'processing',
          expected: PaymentIntentStatus.PROCESSING,
        },
        {
          stripeStatus: 'requires_capture',
          expected: PaymentIntentStatus.REQUIRES_CAPTURE,
        },
        { stripeStatus: 'canceled', expected: PaymentIntentStatus.CANCELED },
        { stripeStatus: 'succeeded', expected: PaymentIntentStatus.SUCCEEDED },
        {
          stripeStatus: 'unknown',
          expected: PaymentIntentStatus.REQUIRES_PAYMENT_METHOD,
        },
      ];

      testCases.forEach(({ stripeStatus, expected }) => {
        const result = (service as any).mapStripeStatusToPaymentIntentStatus(
          stripeStatus
        );
        expect(result).toBe(expected);
      });
    });

    it('should map Stripe refund status to refund status correctly', () => {
      const testCases = [
        { stripeStatus: 'pending', expected: RefundStatus.PENDING },
        { stripeStatus: 'succeeded', expected: RefundStatus.SUCCEEDED },
        { stripeStatus: 'failed', expected: RefundStatus.FAILED },
        { stripeStatus: 'canceled', expected: RefundStatus.CANCELED },
        { stripeStatus: 'unknown', expected: RefundStatus.PENDING },
      ];

      testCases.forEach(({ stripeStatus, expected }) => {
        const result = (service as any).mapStripeRefundStatusToRefundStatus(
          stripeStatus
        );
        expect(result).toBe(expected);
      });
    });
  });
});
