import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentWebhookService } from './payment-webhook.service';
import { PaymentService } from './payment.service';
import { PaymentMethodService } from './payment-method.service';
import { StripeService } from './stripe.service';

describe('PaymentWebhookService', () => {
  let service: PaymentWebhookService;
  let mockPaymentService: jest.Mocked<PaymentService>;
  let mockPaymentMethodService: jest.Mocked<PaymentMethodService>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  const mockPaymentIntent: Stripe.PaymentIntent = {
    id: 'pi_test123',
    object: 'payment_intent',
    amount: 1000,
    status: 'succeeded',
    currency: 'usd',
    customer: 'cus_test123',
    payment_method: 'pm_test123',
    client_secret: 'pi_test123_secret',
    created: 1234567890,
    livemode: false,
    metadata: {},
  } as Stripe.PaymentIntent;

  const mockStripeEvent: Stripe.PaymentIntentSucceededEvent = {
    id: 'evt_test123',
    object: 'event',
    api_version: '2023-10-16',
    created: 1234567890,
    data: {
      object: mockPaymentIntent,
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type: 'payment_intent.succeeded',
  } as Stripe.PaymentIntentSucceededEvent;

  const mockCustomer: Stripe.Customer = {
    id: 'cus_test123',
    object: 'customer',
    created: 1234567890,
    email: 'test@example.com',
    livemode: false,
    metadata: {},
    name: 'Test Customer',
    phone: null,
    preferred_locales: [],
    shipping: null,
    tax_exempt: 'none',
    test_clock: null,
    balance: 0,
    default_source: null,
    description: null,
    invoice_settings: {
      custom_fields: null,
      default_payment_method: null,
      footer: null,
      rendering_options: null,
    },
    next_invoice_sequence: 1,
    address: null,
    currency: null,
    deleted: undefined,
    discount: null,
    invoice_prefix: null,
    payment_method: null,
    sources: {
      object: 'list',
      data: [],
      has_more: false,
      total_count: 0,
      url: '/v1/customers/cus_test123/sources',
    },
    subscriptions: {
      object: 'list',
      data: [],
      has_more: false,
      total_count: 0,
      url: '/v1/customers/cus_test123/subscriptions',
    },
    tax_ids: {
      object: 'list',
      data: [],
      has_more: false,
      total_count: 0,
      url: '/v1/customers/cus_test123/tax_ids',
    },
  } as Stripe.Customer;

  const mockPaymentMethod: Stripe.PaymentMethod = {
    id: 'pm_test123',
    object: 'payment_method',
    type: 'card',
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2025,
    },
    billing_details: {
      name: 'Test User',
      email: 'test@example.com',
    },
    customer: 'cus_test123',
    created: 1234567890,
    livemode: false,
    metadata: {},
  } as Stripe.PaymentMethod;

  const mockCharge: Stripe.Charge = {
    id: 'ch_test123',
    object: 'charge',
    amount: 1000,
    currency: 'usd',
    customer: 'cus_test123',
    payment_intent: 'pi_test123',
    status: 'succeeded',
    created: 1234567890,
    livemode: false,
    metadata: {},
  } as Stripe.Charge;

  const mockApplication: Stripe.Application = {
    id: 'ca_test123',
    object: 'application',
    name: 'Test App',
    created: 1234567890,
    livemode: false,
    metadata: {},
  } as Stripe.Application;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentWebhookService,
        {
          provide: StripeService,
          useValue: {
            verifyWebhookSignature: jest.fn(),
          },
        },
        {
          provide: PaymentService,
          useValue: {
            updatePaymentFromStripe: jest.fn(),
          },
        },
        {
          provide: PaymentMethodService,
          useValue: {
            updatePaymentMethodFromStripe: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
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

    service = module.get<PaymentWebhookService>(PaymentWebhookService);
    mockPaymentService = module.get(PaymentService);
    mockPaymentMethodService = module.get(PaymentMethodService);
    mockEventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleWebhookEvent', () => {
    it('should handle payment_intent.succeeded event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'payment_intent.succeeded',
        data: { object: mockPaymentIntent },
      } as Stripe.PaymentIntentSucceededEvent;

      await service.handleWebhookEvent(event);

      expect(mockPaymentService.updatePaymentFromStripe).toHaveBeenCalledWith(
        mockPaymentIntent
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('payment.succeeded', {
        paymentIntent: mockPaymentIntent,
      });
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'payment_intent.payment_failed',
        data: { object: mockPaymentIntent },
      } as Stripe.PaymentIntentPaymentFailedEvent;

      await service.handleWebhookEvent(event);

      expect(mockPaymentService.updatePaymentFromStripe).toHaveBeenCalledWith(
        mockPaymentIntent
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('payment.failed', {
        paymentIntent: mockPaymentIntent,
      });
    });

    it('should handle payment_intent.canceled event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'payment_intent.canceled',
        data: { object: mockPaymentIntent },
      } as Stripe.PaymentIntentCanceledEvent;

      await service.handleWebhookEvent(event);

      expect(mockPaymentService.updatePaymentFromStripe).toHaveBeenCalledWith(
        mockPaymentIntent
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('payment.canceled', {
        paymentIntent: mockPaymentIntent,
      });
    });

    it('should handle customer.created event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'customer.created',
        data: { object: mockCustomer },
      } as Stripe.CustomerCreatedEvent;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('customer.created', {
        customer: mockCustomer,
      });
    });

    it('should handle customer.updated event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'customer.updated',
        data: { object: mockCustomer },
      } as Stripe.CustomerUpdatedEvent;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('customer.updated', {
        customer: mockCustomer,
      });
    });

    it('should handle customer.deleted event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'customer.deleted',
        data: { object: mockCustomer },
      } as Stripe.CustomerDeletedEvent;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('customer.deleted', {
        customer: mockCustomer,
      });
    });

    it('should handle payment_method.attached event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'payment_method.attached',
        data: { object: mockPaymentMethod },
      } as Stripe.PaymentMethodAttachedEvent;

      await service.handleWebhookEvent(event);

      expect(
        mockPaymentMethodService.updatePaymentMethodFromStripe
      ).toHaveBeenCalledWith(mockPaymentMethod);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment_method.attached',
        { paymentMethod: mockPaymentMethod }
      );
    });

    it('should handle payment_method.detached event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'payment_method.detached',
        data: { object: mockPaymentMethod },
      } as Stripe.PaymentMethodDetachedEvent;

      await service.handleWebhookEvent(event);

      expect(
        mockPaymentMethodService.updatePaymentMethodFromStripe
      ).toHaveBeenCalledWith(mockPaymentMethod);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment_method.detached',
        { paymentMethod: mockPaymentMethod }
      );
    });

    it('should handle payment_method.updated event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'payment_method.updated',
        data: { object: mockPaymentMethod },
      } as Stripe.PaymentMethodUpdatedEvent;

      await service.handleWebhookEvent(event);

      expect(
        mockPaymentMethodService.updatePaymentMethodFromStripe
      ).toHaveBeenCalledWith(mockPaymentMethod);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment_method.updated',
        { paymentMethod: mockPaymentMethod }
      );
    });

    it('should handle invoice.payment_succeeded event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'invoice.payment_succeeded',
        data: { object: { id: 'in_test123' } },
      } as Stripe.InvoicePaymentSucceededEvent;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'stripe.invoice.payment_succeeded',
        event
      );
    });

    it('should handle invoice.payment_failed event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'invoice.payment_failed',
        data: { object: { id: 'in_test123' } },
      } as Stripe.InvoicePaymentFailedEvent;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'stripe.invoice.payment_failed',
        event
      );
    });

    it('should handle charge.succeeded event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'charge.succeeded',
        data: { object: mockCharge },
      } as Stripe.ChargeSucceededEvent;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('charge.succeeded', {
        charge: mockCharge,
      });
    });

    it('should handle charge.failed event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'charge.failed',
        data: { object: mockCharge },
      } as Stripe.ChargeFailedEvent;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('charge.failed', {
        charge: mockCharge,
      });
    });

    it('should handle charge.refunded event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'charge.refunded',
        data: { object: mockCharge },
      } as Stripe.ChargeRefundedEvent;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('charge.refunded', {
        charge: mockCharge,
      });
    });

    it('should handle charge.dispute.created event', async () => {
      const mockDispute = {
        id: 'dp_test123',
        object: 'dispute',
        amount: 1000,
        charge: 'ch_test123',
        currency: 'usd',
        reason: 'fraudulent',
        status: 'warning_needs_response',
        created: 1234567890,
        livemode: false,
        metadata: {},
      } as Stripe.Dispute;

      const event = {
        ...mockStripeEvent,
        type: 'charge.dispute.created',
        data: { object: mockDispute },
      } as Stripe.ChargeDisputeCreatedEvent;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'charge.dispute.created',
        { dispute: mockDispute }
      );
    });

    it('should handle charge.dispute.closed event', async () => {
      const mockDispute = {
        id: 'dp_test123',
        object: 'dispute',
        amount: 1000,
        charge: 'ch_test123',
        currency: 'usd',
        reason: 'fraudulent',
        status: 'lost',
        created: 1234567890,
        livemode: false,
        metadata: {},
      } as Stripe.Dispute;

      const event = {
        ...mockStripeEvent,
        type: 'charge.dispute.closed',
        data: { object: mockDispute },
      } as Stripe.ChargeDisputeClosedEvent;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'charge.dispute.closed',
        { dispute: mockDispute }
      );
    });

    it('should handle account.updated event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'account.updated',
        data: { object: { id: 'acct_test123' } },
      } as Stripe.AccountUpdatedEvent;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('account.updated', {
        account: { id: 'acct_test123' },
      });
    });

    it('should handle account.application.authorized event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'account.application.authorized',
        data: { object: mockApplication },
      } as Stripe.AccountApplicationAuthorizedEvent;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'account.application.authorized',
        { application: mockApplication }
      );
    });

    it('should handle account.application.deauthorized event', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'account.application.deauthorized',
        data: { object: mockApplication },
      } as Stripe.AccountApplicationDeauthorizedEvent;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'account.application.deauthorized',
        { application: mockApplication }
      );
    });

    it('should handle unknown event types', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'unknown.event.type',
        data: { object: {} },
      } as unknown as Stripe.Event;

      await service.handleWebhookEvent(event);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'stripe.unknown.event.type',
        event
      );
    });

    it('should handle errors during event processing', async () => {
      const event = {
        ...mockStripeEvent,
        type: 'payment_intent.succeeded',
        data: { object: mockPaymentIntent },
      } as Stripe.PaymentIntentSucceededEvent;

      const error = new Error('Processing error');
      mockPaymentService.updatePaymentFromStripe.mockRejectedValue(error);

      await expect(service.handleWebhookEvent(event)).rejects.toThrow(
        'Processing error'
      );
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should delegate to StripeService for signature verification', async () => {
      const payload = 'test_payload';
      const signature = 'test_signature';
      const secret = 'test_secret';

      // Mock the StripeService method
      const mockStripeService = {
        verifyWebhookSignature: jest.fn().mockResolvedValue(mockStripeEvent),
      };

      // Replace the service's stripeService with our mock
      (service as any).stripeService = mockStripeService;

      const result = await service.verifyWebhookSignature(
        payload,
        signature,
        secret
      );

      expect(mockStripeService.verifyWebhookSignature).toHaveBeenCalledWith(
        payload,
        signature,
        secret
      );
      expect(result).toEqual(mockStripeEvent);
    });
  });
});
