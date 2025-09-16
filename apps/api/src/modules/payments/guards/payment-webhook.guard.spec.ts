import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentWebhookGuard } from './payment-webhook.guard';
import { StripeService } from '../services/stripe.service';
import { Stripe } from 'stripe';

describe('PaymentWebhookGuard', () => {
  let guard: PaymentWebhookGuard;
  let mockStripeService: jest.Mocked<StripeService>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockGetRequest: jest.Mock;

  const mockStripeEvent: Stripe.Event = {
    id: 'evt_test123',
    object: 'event',
    api_version: '2020-08-27',
    created: 1234567890,
    livemode: false,
    pending_webhooks: 1,
    request: { id: 'req_test123', idempotency_key: null },
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test123',
        object: 'payment_intent',
        amount: 2000,
        currency: 'usd',
        status: 'succeeded',
      } as Stripe.PaymentIntent,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentWebhookGuard,
        {
          provide: StripeService,
          useValue: {
            verifyWebhookSignature: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PaymentWebhookGuard>(PaymentWebhookGuard);
    mockStripeService = module.get(StripeService);
    mockGetRequest = jest.fn();
    const mockSwitchToHttp = jest.fn().mockReturnValue({
      getRequest: mockGetRequest,
    });

    mockExecutionContext = {
      switchToHttp: mockSwitchToHttp,
      getHandler: jest.fn(),
    } as any;
  });

  beforeEach(() => {
    // Set default mock return value for request
    mockGetRequest.mockReturnValue({
      headers: {
        'stripe-signature': 'test_signature',
      },
      body: { test: 'data' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when signature is valid', async () => {
      mockStripeService.verifyWebhookSignature.mockReturnValue(mockStripeEvent);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockStripeService.verifyWebhookSignature).toHaveBeenCalledWith(
        { test: 'data' },
        'test_signature',
        expect.any(String) // stripeConfig.webhookSecret
      );
    });

    it('should store verified event in request', async () => {
      mockStripeService.verifyWebhookSignature.mockReturnValue(mockStripeEvent);

      await guard.canActivate(mockExecutionContext);

      const request = mockExecutionContext.switchToHttp().getRequest();
      expect(request.stripeEvent).toEqual(mockStripeEvent);
    });

    it('should throw UnauthorizedException when stripe-signature header is missing', async () => {
      mockGetRequest.mockReturnValue({
        headers: {},
        body: { test: 'data' },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw BadRequestException when request body is missing', async () => {
      mockGetRequest.mockReturnValue({
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: null,
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw UnauthorizedException when signature verification fails', async () => {
      const error = new Error('Invalid signature');
      mockStripeService.verifyWebhookSignature.mockImplementation(() => {
        throw error;
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should provide clear error message for missing signature header', async () => {
      mockGetRequest.mockReturnValue({
        headers: {},
        body: { test: 'data' },
      });

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        expect((error as Error).message).toBe(
          'Missing Stripe signature header'
        );
      }
    });

    it('should provide clear error message for missing request body', async () => {
      mockGetRequest.mockReturnValue({
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: null,
      });

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        expect((error as Error).message).toBe('Missing request body');
      }
    });

    it('should provide clear error message for invalid signature', async () => {
      const error = new Error('Invalid signature');
      mockStripeService.verifyWebhookSignature.mockImplementation(() => {
        throw error;
      });

      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        expect((error as Error).message).toBe(
          'Invalid Stripe webhook signature'
        );
      }
    });

    it('should handle empty signature header', async () => {
      mockGetRequest.mockReturnValue({
        headers: {
          'stripe-signature': '',
        },
        body: { test: 'data' },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle whitespace-only signature header', async () => {
      mockGetRequest.mockReturnValue({
        headers: {
          'stripe-signature': '   ',
        },
        body: { test: 'data' },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle empty request body', async () => {
      mockGetRequest.mockReturnValue({
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: {},
      });

      mockStripeService.verifyWebhookSignature.mockReturnValue(mockStripeEvent);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should handle complex request body', async () => {
      const complexBody = {
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            amount: 1000,
            currency: 'usd',
          },
        },
        created: 1234567890,
      };

      mockGetRequest.mockReturnValue({
        headers: {
          'stripe-signature': 'test_signature',
        },
        body: complexBody,
      });

      mockStripeService.verifyWebhookSignature.mockReturnValue(mockStripeEvent);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockStripeService.verifyWebhookSignature).toHaveBeenCalledWith(
        complexBody,
        'test_signature',
        expect.any(String)
      );
    });
  });

  describe('integration with StripeService', () => {
    it('should call StripeService with correct parameters', async () => {
      mockStripeService.verifyWebhookSignature.mockReturnValue(mockStripeEvent);

      await guard.canActivate(mockExecutionContext);

      expect(mockStripeService.verifyWebhookSignature).toHaveBeenCalledWith(
        { test: 'data' },
        'test_signature',
        expect.any(String)
      );
    });

    it('should handle StripeService throwing different types of errors', async () => {
      const stripeErrors = [
        new Error('Invalid signature'),
        new Error('Webhook signature verification failed'),
        new Error('Invalid webhook secret'),
        new Error('Malformed signature'),
      ];

      for (const error of stripeErrors) {
        mockStripeService.verifyWebhookSignature.mockImplementation(() => {
          throw error;
        });

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
          UnauthorizedException
        );
      }
    });
  });
});
