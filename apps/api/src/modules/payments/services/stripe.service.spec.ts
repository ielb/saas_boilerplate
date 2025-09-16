import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';

// Mock Stripe
const mockStripe = {
  customers: {
    create: jest.fn(),
    update: jest.fn(),
    retrieve: jest.fn(),
    del: jest.fn(),
  },
  paymentMethods: {
    create: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn(),
    retrieve: jest.fn(),
    list: jest.fn(),
  },
  paymentIntents: {
    create: jest.fn(),
    confirm: jest.fn(),
    capture: jest.fn(),
    cancel: jest.fn(),
    retrieve: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
    retrieve: jest.fn(),
    cancel: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

// Mock stripe config
jest.mock('../../../config/stripe.config', () => ({
  stripeConfig: {
    secretKey: 'sk_test_mock',
    publishableKey: 'pk_test_mock',
    apiVersion: '2023-10-16',
    maxNetworkRetries: 3,
    timeout: 30000,
    testMode: true,
  },
  validateStripeConfig: jest.fn(),
}));

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset all mock functions
    Object.values(mockStripe.customers).forEach(mock => mock.mockReset());
    Object.values(mockStripe.paymentMethods).forEach(mock => mock.mockReset());
    Object.values(mockStripe.paymentIntents).forEach(mock => mock.mockReset());
    Object.values(mockStripe.refunds).forEach(mock => mock.mockReset());
    Object.values(mockStripe.webhooks).forEach(mock => mock.mockReset());
  });

  describe('constructor', () => {
    it('should create Stripe instance with correct config', () => {
      expect(service).toBeDefined();
      expect(service['stripe']).toBeDefined();
    });

    it('should validate Stripe config on initialization', () => {
      const validateSpy = jest.spyOn(
        require('../../../config/stripe.config'),
        'validateStripeConfig'
      );
      expect(validateSpy).toHaveBeenCalled();
    });
  });

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const createParams = {
        email: 'test@example.com',
        name: 'Test Customer',
      };

      const mockCustomer = { id: 'cus_test123', email: 'test@example.com' };
      mockStripe.customers.create.mockResolvedValue(mockCustomer as any);

      const result = await service.createCustomer(createParams);

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: createParams.email,
        name: createParams.name,
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should handle customer creation error', async () => {
      const createParams = {
        email: 'test@example.com',
      };

      const error = new Error('Stripe API error');
      mockStripe.customers.create.mockRejectedValue(error);

      await expect(service.createCustomer(createParams)).rejects.toThrow(
        'Stripe API error'
      );
    });
  });

  describe('updateCustomer', () => {
    it('should update a customer successfully', async () => {
      const customerId = 'cus_test123';
      const updateParams = {
        name: 'Updated Customer',
      };

      const updatedCustomer = { id: customerId, name: 'Updated Customer' };
      mockStripe.customers.update.mockResolvedValue(updatedCustomer as any);

      const result = await service.updateCustomer(customerId, updateParams);

      expect(mockStripe.customers.update).toHaveBeenCalledWith(
        customerId,
        updateParams
      );
      expect(result).toEqual(updatedCustomer);
    });
  });

  describe('getCustomer', () => {
    it('should retrieve a customer successfully', async () => {
      const customerId = 'cus_test123';
      const mockCustomer = { id: customerId, email: 'test@example.com' };

      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer as any);

      const result = await service.getCustomer(customerId);

      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith(customerId);
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('deleteCustomer', () => {
    it('should delete a customer successfully', async () => {
      const customerId = 'cus_test123';
      const deletedCustomer = { id: customerId, deleted: true };

      mockStripe.customers.del.mockResolvedValue(deletedCustomer as any);

      const result = await service.deleteCustomer(customerId);

      expect(mockStripe.customers.del).toHaveBeenCalledWith(customerId);
      expect(result).toEqual(deletedCustomer);
    });
  });

  describe('createPaymentMethod', () => {
    it('should create a payment method successfully', async () => {
      const createParams = {
        type: 'card' as const,
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      };

      const mockPaymentMethod = { id: 'pm_test123', type: 'card' };
      mockStripe.paymentMethods.create.mockResolvedValue(
        mockPaymentMethod as any
      );

      const result = await service.createPaymentMethod(createParams);

      expect(mockStripe.paymentMethods.create).toHaveBeenCalledWith({
        type: createParams.type,
        card: createParams.card,
      });
      expect(result).toEqual(mockPaymentMethod);
    });
  });

  describe('attachPaymentMethod', () => {
    it('should attach a payment method successfully', async () => {
      const paymentMethodId = 'pm_test123';
      const customerId = 'cus_test123';

      const attachedPaymentMethod = {
        id: paymentMethodId,
        customer: customerId,
      };
      mockStripe.paymentMethods.attach.mockResolvedValue(
        attachedPaymentMethod as any
      );

      const result = await service.attachPaymentMethod(
        paymentMethodId,
        customerId
      );

      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith(
        paymentMethodId,
        {
          customer: customerId,
        }
      );
      expect(result).toEqual(attachedPaymentMethod);
    });
  });

  describe('detachPaymentMethod', () => {
    it('should detach a payment method successfully', async () => {
      const paymentMethodId = 'pm_test123';

      const detachedPaymentMethod = { id: paymentMethodId, customer: null };
      mockStripe.paymentMethods.detach.mockResolvedValue(
        detachedPaymentMethod as any
      );

      const result = await service.detachPaymentMethod(paymentMethodId);

      expect(mockStripe.paymentMethods.detach).toHaveBeenCalledWith(
        paymentMethodId
      );
      expect(result).toEqual(detachedPaymentMethod);
    });
  });

  describe('getPaymentMethod', () => {
    it('should retrieve a payment method successfully', async () => {
      const paymentMethodId = 'pm_test123';
      const mockPaymentMethod = { id: paymentMethodId, type: 'card' };

      mockStripe.paymentMethods.retrieve.mockResolvedValue(
        mockPaymentMethod as any
      );

      const result = await service.getPaymentMethod(paymentMethodId);

      expect(mockStripe.paymentMethods.retrieve).toHaveBeenCalledWith(
        paymentMethodId
      );
      expect(result).toEqual(mockPaymentMethod);
    });
  });

  describe('listPaymentMethods', () => {
    it('should list payment methods successfully', async () => {
      const customerId = 'cus_test123';
      const params = { type: 'card', limit: 10 };

      const mockList = {
        object: 'list',
        data: [{ id: 'pm_test123', type: 'card' }],
        has_more: false,
        url: '/v1/payment_methods',
      };

      mockStripe.paymentMethods.list.mockResolvedValue(mockList as any);

      const result = await service.listPaymentMethods(customerId, params);

      expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
        customer: customerId,
        type: 'card',
        limit: 10,
      });
      expect(result).toEqual(mockList);
    });
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const createParams = {
        amount: 1000,
        currency: 'usd',
        customer: 'cus_test123',
      };

      const mockPaymentIntent = {
        id: 'pi_test123',
        amount: 1000,
        currency: 'usd',
      };
      mockStripe.paymentIntents.create.mockResolvedValue(
        mockPaymentIntent as any
      );

      const result = await service.createPaymentIntent(createParams);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: createParams.amount,
        currency: createParams.currency,
        customer: createParams.customer,
      });
      expect(result).toEqual(mockPaymentIntent);
    });
  });

  describe('confirmPaymentIntent', () => {
    it('should confirm a payment intent successfully', async () => {
      const paymentIntentId = 'pi_test123';
      const confirmParams = {
        paymentMethod: 'pm_test123',
        returnUrl: 'https://example.com/return',
        receiptEmail: 'test@example.com',
      };

      const confirmedPaymentIntent = {
        id: paymentIntentId,
        status: 'succeeded',
      };
      mockStripe.paymentIntents.confirm.mockResolvedValue(
        confirmedPaymentIntent as any
      );

      const result = await service.confirmPaymentIntent(
        paymentIntentId,
        confirmParams
      );

      expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith(
        paymentIntentId,
        {
          payment_method: 'pm_test123',
          return_url: 'https://example.com/return',
          receipt_email: 'test@example.com',
        }
      );
      expect(result).toEqual(confirmedPaymentIntent);
    });
  });

  describe('capturePaymentIntent', () => {
    it('should capture a payment intent successfully', async () => {
      const paymentIntentId = 'pi_test123';
      const captureParams = {
        amount: 1000,
        receiptEmail: 'test@example.com',
        statementDescriptor: 'Test Payment',
      };

      const capturedPaymentIntent = {
        id: paymentIntentId,
        status: 'succeeded',
      };
      mockStripe.paymentIntents.capture.mockResolvedValue(
        capturedPaymentIntent as any
      );

      const result = await service.capturePaymentIntent(
        paymentIntentId,
        captureParams
      );

      expect(mockStripe.paymentIntents.capture).toHaveBeenCalledWith(
        paymentIntentId,
        {
          amount_to_capture: 1000,
        }
      );
      expect(result).toEqual(capturedPaymentIntent);
    });
  });

  describe('cancelPaymentIntent', () => {
    it('should cancel a payment intent successfully', async () => {
      const paymentIntentId = 'pi_test123';
      const cancelParams = {
        cancellationReason: 'requested_by_customer' as const,
      };

      const canceledPaymentIntent = { id: paymentIntentId, status: 'canceled' };
      mockStripe.paymentIntents.cancel.mockResolvedValue(
        canceledPaymentIntent as any
      );

      const result = await service.cancelPaymentIntent(
        paymentIntentId,
        cancelParams
      );

      expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith(
        paymentIntentId,
        {
          cancellation_reason: 'requested_by_customer',
        }
      );
      expect(result).toEqual(canceledPaymentIntent);
    });
  });

  describe('getPaymentIntent', () => {
    it('should retrieve a payment intent successfully', async () => {
      const paymentIntentId = 'pi_test123';
      const mockPaymentIntent = {
        id: paymentIntentId,
        amount: 1000,
        currency: 'usd',
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(
        mockPaymentIntent as any
      );

      const result = await service.getPaymentIntent(paymentIntentId);

      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith(
        paymentIntentId
      );
      expect(result).toEqual(mockPaymentIntent);
    });
  });

  describe('createRefund', () => {
    it('should create a refund successfully', async () => {
      const createParams = {
        charge: 'ch_test123',
        amount: 1000,
      };

      const mockRefund = {
        id: 're_test123',
        amount: 1000,
        status: 'succeeded',
      };
      mockStripe.refunds.create.mockResolvedValue(mockRefund as any);

      const result = await service.createRefund(createParams);

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        charge: createParams.charge,
        amount: createParams.amount,
      });
      expect(result).toEqual(mockRefund);
    });
  });

  describe('getRefund', () => {
    it('should retrieve a refund successfully', async () => {
      const refundId = 're_test123';
      const mockRefund = { id: refundId, amount: 1000, status: 'succeeded' };

      mockStripe.refunds.retrieve.mockResolvedValue(mockRefund as any);

      const result = await service.getRefund(refundId);

      expect(mockStripe.refunds.retrieve).toHaveBeenCalledWith(refundId);
      expect(result).toEqual(mockRefund);
    });
  });

  describe('cancelRefund', () => {
    it('should cancel a refund successfully', async () => {
      const refundId = 're_test123';
      const canceledRefund = { id: refundId, status: 'canceled' };

      mockStripe.refunds.cancel.mockResolvedValue(canceledRefund as any);

      const result = await service.cancelRefund(refundId);

      expect(mockStripe.refunds.cancel).toHaveBeenCalledWith(refundId);
      expect(result).toEqual(canceledRefund);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify webhook signature successfully', () => {
      const payload = 'test_payload';
      const signature = 'test_signature';
      const secret = 'test_secret';

      const mockEvent = { id: 'evt_test123', type: 'payment_intent.succeeded' };
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent as any);

      const result = service.verifyWebhookSignature(payload, signature, secret);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        secret
      );
      expect(result).toEqual(mockEvent);
    });

    it('should handle webhook signature verification error', () => {
      const payload = 'test_payload';
      const signature = 'test_signature';
      const secret = 'test_secret';

      const error = new Error('Invalid signature');
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw error;
      });

      expect(() =>
        service.verifyWebhookSignature(payload, signature, secret)
      ).toThrow('Invalid signature');
    });
  });
});
