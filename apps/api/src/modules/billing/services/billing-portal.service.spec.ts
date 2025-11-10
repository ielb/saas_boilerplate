import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingPortalService } from './billing-portal.service';
import { Invoice } from '../entities/invoice.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { PaymentMethod } from '../../payments/entities/payment-method.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { InvoiceStatus, SubscriptionStatus, PaymentStatus } from '@app/shared';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('BillingPortalService', () => {
  let service: BillingPortalService;
  let invoiceRepository: jest.Mocked<Repository<Invoice>>;
  let subscriptionRepository: jest.Mocked<Repository<Subscription>>;
  let paymentMethodRepository: jest.Mocked<Repository<PaymentMethod>>;
  let paymentRepository: jest.Mocked<Repository<Payment>>;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingPortalService,
        {
          provide: getRepositoryToken(Invoice),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PaymentMethod),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            count: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BillingPortalService>(BillingPortalService);
    invoiceRepository = module.get(getRepositoryToken(Invoice));
    subscriptionRepository = module.get(getRepositoryToken(Subscription));
    paymentMethodRepository = module.get(getRepositoryToken(PaymentMethod));
    paymentRepository = module.get(getRepositoryToken(Payment));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBillingSummary', () => {
    it('should return billing summary for customer', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      subscriptionRepository.count.mockResolvedValue(2);
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ totalDue: '150.00', invoiceCount: '2' }) // unpaid invoices
        .mockResolvedValueOnce({ nextInvoiceDate: '2024-02-01' }); // next invoice date

      paymentMethodRepository.count.mockResolvedValue(3);
      mockQueryBuilder.getMany.mockResolvedValue([
        {
          id: 'payment-1',
          amount: 99.99,
          currency: 'USD',
          status: PaymentStatus.SUCCEEDED,
          createdAt: new Date('2024-01-15'),
          invoice: { invoiceNumber: 'INV-001' },
        },
      ]);

      const result = await service.getBillingSummary(tenantId, userId);

      expect(result).toEqual({
        activeSubscriptions: 2,
        totalAmountDue: 150,
        unpaidInvoiceCount: 2,
        nextInvoiceDate: '2024-02-01',
        paymentMethodsCount: 3,
        recentPayments: [
          {
            id: 'payment-1',
            amount: 99.99,
            currency: 'USD',
            status: PaymentStatus.SUCCEEDED,
            createdAt: new Date('2024-01-15'),
            invoiceNumber: 'INV-001',
          },
        ],
      });

      expect(subscriptionRepository.count).toHaveBeenCalledWith({
        where: {
          tenantId,
          userId,
          status: SubscriptionStatus.ACTIVE,
        },
      });
    });
  });

  describe('getCustomerInvoices', () => {
    it('should return paginated invoices for customer', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const query = { page: 1, limit: 10 };

      const mockInvoices = [
        {
          id: 'invoice-1',
          invoiceNumber: 'INV-001',
          status: InvoiceStatus.PAID,
          totalAmount: 99.99,
          currency: 'USD',
          issuedDate: new Date('2024-01-01'),
          dueDate: new Date('2024-01-15'),
          paidDate: new Date('2024-01-10'),
          description: 'Monthly subscription',
          lineItems: [
            {
              id: 'line-1',
              description: 'Premium Plan',
              quantity: 1,
              unitPrice: 99.99,
              totalAmount: 99.99,
            },
          ],
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockInvoices, 1]);

      const result = await service.getCustomerInvoices(tenantId, userId, query);

      expect(result.invoices).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.invoices[0]).toMatchObject({
        id: 'invoice-1',
        invoiceNumber: 'INV-001',
        status: InvoiceStatus.PAID,
        totalAmount: 99.99,
        downloadUrl: '/billing/portal/invoices/invoice-1/download',
      });
    });

    it('should filter invoices by status', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const query = { page: 1, limit: 10, status: InvoiceStatus.PENDING };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getCustomerInvoices(tenantId, userId, query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'invoice.status = :status',
        { status: InvoiceStatus.PENDING }
      );
    });
  });

  describe('getCustomerSubscriptions', () => {
    it('should return customer subscriptions with plan details', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      const mockSubscriptions = [
        {
          id: 'sub-1',
          name: 'Premium Subscription',
          description: 'Premium plan features',
          status: SubscriptionStatus.ACTIVE,
          billingCycle: 'monthly',
          amount: 99.99,
          currency: 'USD',
          currentPeriodStart: new Date('2024-01-01'),
          currentPeriodEnd: new Date('2024-02-01'),
          cancelAtPeriodEnd: null,
          trialEndDate: null,
          isTrial: false,
          plan: { name: 'Premium Plan' },
          features: { api_calls: 10000 },
          limits: { users: 50 },
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockSubscriptions);

      const result = await service.getCustomerSubscriptions(tenantId, userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'sub-1',
        name: 'Premium Subscription',
        status: SubscriptionStatus.ACTIVE,
        canCancel: true,
        canUpgrade: true,
        canDowngrade: true,
        planName: 'Premium Plan',
      });
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set payment method as default', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const paymentMethodId = 'pm-123';

      const mockPaymentMethod = {
        id: paymentMethodId,
        tenantId,
        userId,
        isActive: true,
      };

      paymentMethodRepository.findOne.mockResolvedValue(
        mockPaymentMethod as any
      );
      paymentMethodRepository.update.mockResolvedValue({} as any);

      await service.setDefaultPaymentMethod(tenantId, userId, paymentMethodId);

      expect(paymentMethodRepository.update).toHaveBeenCalledTimes(2);
      expect(paymentMethodRepository.update).toHaveBeenCalledWith(
        { tenantId, userId, status: 'active' },
        { isDefault: false }
      );
      expect(paymentMethodRepository.update).toHaveBeenCalledWith(
        { id: paymentMethodId },
        { isDefault: true }
      );
    });

    it('should throw NotFoundException if payment method not found', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const paymentMethodId = 'pm-123';

      paymentMethodRepository.findOne.mockResolvedValue(null);

      await expect(
        service.setDefaultPaymentMethod(tenantId, userId, paymentMethodId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePaymentMethod', () => {
    it('should delete non-default payment method', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const paymentMethodId = 'pm-123';

      const mockPaymentMethod = {
        id: paymentMethodId,
        tenantId,
        userId,
        isActive: true,
        isDefault: false,
      };

      paymentMethodRepository.findOne.mockResolvedValue(
        mockPaymentMethod as any
      );
      paymentMethodRepository.update.mockResolvedValue({} as any);

      await service.deletePaymentMethod(tenantId, userId, paymentMethodId);

      expect(paymentMethodRepository.update).toHaveBeenCalledWith(
        { id: paymentMethodId },
        { status: 'inactive' }
      );
    });

    it('should throw BadRequestException when trying to delete default payment method', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const paymentMethodId = 'pm-123';

      const mockPaymentMethod = {
        id: paymentMethodId,
        tenantId,
        userId,
        isActive: true,
        isDefault: true,
      };

      paymentMethodRepository.findOne.mockResolvedValue(
        mockPaymentMethod as any
      );

      await expect(
        service.deletePaymentMethod(tenantId, userId, paymentMethodId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestSubscriptionCancellation', () => {
    it('should schedule subscription for cancellation', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const subscriptionId = 'sub-123';
      const reason = 'Too expensive';

      const mockSubscription = {
        id: subscriptionId,
        tenantId,
        userId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date('2024-02-01'),
        notes: 'Existing notes',
      };

      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as any);
      subscriptionRepository.update.mockResolvedValue({} as any);

      await service.requestSubscriptionCancellation(
        tenantId,
        userId,
        subscriptionId,
        reason
      );

      expect(subscriptionRepository.update).toHaveBeenCalledWith(
        { id: subscriptionId },
        expect.objectContaining({
          cancelAtPeriodEnd: new Date('2024-02-01'),
          cancelReason: reason,
          notes: expect.stringContaining(
            'Cancellation requested via billing portal'
          ),
        })
      );
    });

    it('should throw NotFoundException if subscription not found', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const subscriptionId = 'sub-123';

      subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.requestSubscriptionCancellation(
          tenantId,
          userId,
          subscriptionId
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate cancelled subscription', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const subscriptionId = 'sub-123';

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days in the future

      const mockSubscription = {
        id: subscriptionId,
        tenantId,
        userId,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: futureDate,
        notes: 'Existing notes',
      };

      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as any);
      subscriptionRepository.query.mockResolvedValue({} as any);

      await service.reactivateSubscription(tenantId, userId, subscriptionId);

      expect(subscriptionRepository.query).toHaveBeenCalledWith(
        'UPDATE subscriptions SET "cancelAtPeriodEnd" = NULL, "cancelReason" = NULL, notes = $1 WHERE id = $2',
        [
          expect.stringContaining('Cancellation revoked via billing portal'),
          subscriptionId,
        ]
      );
    });

    it('should throw BadRequestException if subscription not scheduled for cancellation', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const subscriptionId = 'sub-123';

      const mockSubscription = {
        id: subscriptionId,
        tenantId,
        userId,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: null,
      };

      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as any);

      await expect(
        service.reactivateSubscription(tenantId, userId, subscriptionId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if cancellation period has ended', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const subscriptionId = 'sub-123';

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockSubscription = {
        id: subscriptionId,
        tenantId,
        userId,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: pastDate,
      };

      subscriptionRepository.findOne.mockResolvedValue(mockSubscription as any);

      await expect(
        service.reactivateSubscription(tenantId, userId, subscriptionId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInvoiceDownloadUrl', () => {
    it('should return download URL for valid invoice', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const invoiceId = 'invoice-123';

      const mockInvoice = {
        id: invoiceId,
        tenantId,
        customerId: userId,
      };

      invoiceRepository.findOne.mockResolvedValue(mockInvoice as any);

      const result = await service.getInvoiceDownloadUrl(
        tenantId,
        userId,
        invoiceId
      );

      expect(result).toBe(`/billing/portal/invoices/${invoiceId}/download`);
    });

    it('should throw NotFoundException if invoice not found', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const invoiceId = 'invoice-123';

      invoiceRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getInvoiceDownloadUrl(tenantId, userId, invoiceId)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
