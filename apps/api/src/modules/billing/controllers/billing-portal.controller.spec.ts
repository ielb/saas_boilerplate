import { BillingPortalController } from './billing-portal.controller';
import { BillingPortalService } from '../services/billing-portal.service';
import { InvoiceStatus, SubscriptionStatus } from '@app/shared';

describe('BillingPortalController', () => {
  let controller: BillingPortalController;
  let service: jest.Mocked<BillingPortalService>;

  const mockRequest = {
    user: { tenantId: 'tenant-123', userId: 'user-123' },
  };

  const mockBillingSummary = {
    activeSubscriptions: 2,
    totalAmountDue: 150.0,
    unpaidInvoiceCount: 1,
    nextInvoiceDate: new Date('2024-02-01'),
    paymentMethodsCount: 2,
    recentPayments: [
      {
        id: 'payment-1',
        amount: 99.99,
        currency: 'USD',
        status: 'succeeded',
        createdAt: new Date('2024-01-15'),
        invoiceNumber: 'INV-001',
      },
    ],
  };

  const mockInvoices = {
    invoices: [
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
        lineItems: [],
        downloadUrl: '/billing/portal/invoices/invoice-1/download',
      },
    ],
    total: 1,
  };

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
      planName: 'Premium Plan',
      features: {},
      limits: {},
      canCancel: true,
      canUpgrade: true,
      canDowngrade: true,
    },
  ];

  const mockPaymentMethods = [
    {
      id: 'pm-1',
      type: 'card',
      last4: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      canDelete: false,
    },
  ];

  beforeEach(async () => {
    service = {
      getBillingSummary: jest.fn(),
      getCustomerInvoices: jest.fn(),
      getCustomerSubscriptions: jest.fn(),
      getCustomerPaymentMethods: jest.fn(),
      setDefaultPaymentMethod: jest.fn(),
      deletePaymentMethod: jest.fn(),
      requestSubscriptionCancellation: jest.fn(),
      reactivateSubscription: jest.fn(),
      getInvoiceDownloadUrl: jest.fn(),
    } as any;

    controller = new BillingPortalController(service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBillingSummary', () => {
    it('should return billing summary', async () => {
      service.getBillingSummary.mockResolvedValue(mockBillingSummary as any);

      const result = await controller.getBillingSummary(mockRequest);

      expect(service.getBillingSummary).toHaveBeenCalledWith(
        'tenant-123',
        'user-123'
      );
      expect(result).toEqual({
        success: true,
        data: mockBillingSummary,
      });
    });
  });

  describe('getCustomerInvoices', () => {
    it('should return paginated invoices', async () => {
      const query = { page: 1, limit: 10 };
      service.getCustomerInvoices.mockResolvedValue(mockInvoices as any);

      const result = await controller.getCustomerInvoices(mockRequest, query);

      expect(service.getCustomerInvoices).toHaveBeenCalledWith(
        'tenant-123',
        'user-123',
        query
      );
      expect(result).toEqual({
        success: true,
        data: {
          ...mockInvoices,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      });
    });

    it('should handle pagination correctly', async () => {
      const query = { page: 2, limit: 5 };
      const mockInvoicesPage2 = { ...mockInvoices, total: 12 };
      service.getCustomerInvoices.mockResolvedValue(mockInvoicesPage2 as any);

      const result = await controller.getCustomerInvoices(mockRequest, query);

      expect(result.data).toMatchObject({
        page: 2,
        limit: 5,
        totalPages: 3,
        hasNext: true,
        hasPrevious: true,
      });
    });
  });

  describe('getInvoiceDownloadUrl', () => {
    it('should return download URL', async () => {
      const invoiceId = 'invoice-123';
      const downloadUrl = '/billing/portal/invoices/invoice-123/download';
      service.getInvoiceDownloadUrl.mockResolvedValue(downloadUrl);

      const result = await controller.getInvoiceDownloadUrl(
        mockRequest,
        invoiceId
      );

      expect(service.getInvoiceDownloadUrl).toHaveBeenCalledWith(
        'tenant-123',
        'user-123',
        invoiceId
      );
      expect(result).toEqual({
        success: true,
        data: {
          downloadUrl,
          expiresAt: expect.any(Date),
        },
      });
    });
  });

  describe('getCustomerSubscriptions', () => {
    it('should return customer subscriptions', async () => {
      service.getCustomerSubscriptions.mockResolvedValue(
        mockSubscriptions as any
      );

      const result = await controller.getCustomerSubscriptions(mockRequest);

      expect(service.getCustomerSubscriptions).toHaveBeenCalledWith(
        'tenant-123',
        'user-123'
      );
      expect(result).toEqual({
        success: true,
        data: mockSubscriptions,
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription with reason', async () => {
      const subscriptionId = 'sub-123';
      const body = { reason: 'Too expensive' };

      service.requestSubscriptionCancellation.mockResolvedValue();

      const result = await controller.cancelSubscription(
        mockRequest,
        subscriptionId,
        body
      );

      expect(service.requestSubscriptionCancellation).toHaveBeenCalledWith(
        'tenant-123',
        'user-123',
        subscriptionId,
        'Too expensive'
      );
      expect(result).toEqual({
        success: true,
        message:
          'Subscription scheduled for cancellation at the end of current billing period',
      });
    });

    it('should cancel subscription without reason', async () => {
      const subscriptionId = 'sub-123';
      const body = {};

      service.requestSubscriptionCancellation.mockResolvedValue();

      const result = await controller.cancelSubscription(
        mockRequest,
        subscriptionId,
        body
      );

      expect(service.requestSubscriptionCancellation).toHaveBeenCalledWith(
        'tenant-123',
        'user-123',
        subscriptionId,
        undefined
      );
      expect(result).toEqual({
        success: true,
        message:
          'Subscription scheduled for cancellation at the end of current billing period',
      });
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate subscription', async () => {
      const subscriptionId = 'sub-123';

      service.reactivateSubscription.mockResolvedValue();

      const result = await controller.reactivateSubscription(
        mockRequest,
        subscriptionId
      );

      expect(service.reactivateSubscription).toHaveBeenCalledWith(
        'tenant-123',
        'user-123',
        subscriptionId
      );
      expect(result).toEqual({
        success: true,
        message: 'Subscription cancellation has been revoked',
      });
    });
  });

  describe('getCustomerPaymentMethods', () => {
    it('should return payment methods', async () => {
      service.getCustomerPaymentMethods.mockResolvedValue(
        mockPaymentMethods as any
      );

      const result = await controller.getCustomerPaymentMethods(mockRequest);

      expect(service.getCustomerPaymentMethods).toHaveBeenCalledWith(
        'tenant-123',
        'user-123'
      );
      expect(result).toEqual({
        success: true,
        data: mockPaymentMethods,
      });
    });
  });

  describe('setDefaultPaymentMethod', () => {
    it('should set default payment method', async () => {
      const paymentMethodId = 'pm-123';

      service.setDefaultPaymentMethod.mockResolvedValue();

      const result = await controller.setDefaultPaymentMethod(
        mockRequest,
        paymentMethodId
      );

      expect(service.setDefaultPaymentMethod).toHaveBeenCalledWith(
        'tenant-123',
        'user-123',
        paymentMethodId
      );
      expect(result).toEqual({
        success: true,
        message: 'Default payment method updated successfully',
      });
    });
  });

  describe('deletePaymentMethod', () => {
    it('should delete payment method', async () => {
      const paymentMethodId = 'pm-123';

      service.deletePaymentMethod.mockResolvedValue();

      const result = await controller.deletePaymentMethod(
        mockRequest,
        paymentMethodId
      );

      expect(service.deletePaymentMethod).toHaveBeenCalledWith(
        'tenant-123',
        'user-123',
        paymentMethodId
      );
      expect(result).toEqual({
        success: true,
        message: 'Payment method deleted successfully',
      });
    });
  });

  describe('Error handling', () => {
    it('should propagate service errors', async () => {
      const error = new Error('Database connection failed');
      service.getBillingSummary.mockRejectedValue(error);

      await expect(controller.getBillingSummary(mockRequest)).rejects.toThrow(
        error
      );
      expect(service.getBillingSummary).toHaveBeenCalledWith(
        'tenant-123',
        'user-123'
      );
    });
  });
});
