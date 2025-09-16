import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { SubscriptionWebhooksController } from './subscription-webhooks.controller';
import { StripeService } from '../../payments/services/stripe.service';
import { SubscriptionService } from '../services/subscription.service';
import { SubscriptionWebhookService } from '../services/subscription-webhook.service';

describe('SubscriptionWebhooksController', () => {
  let controller: SubscriptionWebhooksController;
  let stripeService: StripeService;
  let subscriptionService: SubscriptionService;
  let webhookService: SubscriptionWebhookService;

  const mockEvent = {
    id: 'evt_test123',
    type: 'customer.subscription.created',
    data: {
      object: {
        id: 'sub_test123',
        status: 'active',
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'webhook',
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [SubscriptionWebhooksController],
      providers: [
        {
          provide: StripeService,
          useValue: {
            verifyWebhookSignature: jest.fn(),
          },
        },
        {
          provide: SubscriptionService,
          useValue: {
            findByStripeSubscriptionId: jest.fn(),
            updateSubscription: jest.fn(),
            cancelSubscription: jest.fn(),
          },
        },
        {
          provide: SubscriptionWebhookService,
          useValue: {
            processWebhookEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SubscriptionWebhooksController>(
      SubscriptionWebhooksController
    );
    stripeService = module.get<StripeService>(StripeService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
    webhookService = module.get<SubscriptionWebhookService>(
      SubscriptionWebhookService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleStripeWebhook', () => {
    const mockPayload = { test: 'data' };
    const mockSignature = 'test_signature';

    it('should process webhook successfully', async () => {
      // Arrange
      const mockRequest = { verifiedEvent: mockEvent };
      jest
        .spyOn(webhookService, 'processWebhookEvent')
        .mockResolvedValue(undefined);

      // Act
      const result = await controller.handleStripeWebhook(
        mockPayload,
        mockSignature,
        mockRequest
      );

      // Assert
      expect(result).toEqual({
        received: true,
        eventId: 'evt_test123',
      });
      expect(webhookService.processWebhookEvent).toHaveBeenCalledWith(
        mockEvent
      );
    });

    it('should throw UnauthorizedException for signature errors', async () => {
      // Arrange
      const mockRequest = { verifiedEvent: mockEvent };
      jest
        .spyOn(webhookService, 'processWebhookEvent')
        .mockRejectedValue(new Error('Invalid signature'));

      // Act & Assert
      await expect(
        controller.handleStripeWebhook(mockPayload, mockSignature, mockRequest)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for processing errors', async () => {
      // Arrange
      const mockRequest = { verifiedEvent: mockEvent };
      jest
        .spyOn(webhookService, 'processWebhookEvent')
        .mockRejectedValue(new Error('Processing failed'));

      // Act & Assert
      await expect(
        controller.handleStripeWebhook(mockPayload, mockSignature, mockRequest)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      // Act
      const result = await controller.healthCheck();

      // Assert
      expect(result).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
      });
    });
  });
});
