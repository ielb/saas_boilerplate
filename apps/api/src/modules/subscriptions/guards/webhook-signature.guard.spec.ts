import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { WebhookSignatureGuard } from './webhook-signature.guard';
import { StripeService } from '../../payments/services/stripe.service';

describe('WebhookSignatureGuard', () => {
  let guard: WebhookSignatureGuard;
  let stripeService: StripeService;

  const mockEvent = {
    id: 'evt_test123',
    type: 'customer.subscription.created',
    data: { object: {} },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookSignatureGuard,
        {
          provide: StripeService,
          useValue: {
            verifyWebhookSignature: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<WebhookSignatureGuard>(WebhookSignatureGuard);
    stripeService = module.get<StripeService>(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const mockRequest = {
      headers: {
        'stripe-signature': 'test_signature',
      },
      body: { test: 'data' },
      verifiedEvent: null,
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;

    it('should allow access with valid signature', async () => {
      // Arrange
      jest
        .spyOn(stripeService, 'verifyWebhookSignature')
        .mockReturnValue(mockEvent as any);

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      expect(mockRequest.verifiedEvent).toBe(mockEvent);
      expect(stripeService.verifyWebhookSignature).toHaveBeenCalledWith(
        JSON.stringify(mockRequest.body),
        'test_signature',
        expect.any(String)
      );
    });

    it('should throw UnauthorizedException when signature is missing', async () => {
      // Arrange
      const requestWithoutSignature = {
        ...mockRequest,
        headers: {},
      };

      const contextWithoutSignature = {
        switchToHttp: () => ({
          getRequest: () => requestWithoutSignature,
        }),
      } as ExecutionContext;

      // Act & Assert
      await expect(guard.canActivate(contextWithoutSignature)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when signature verification fails', async () => {
      // Arrange
      jest
        .spyOn(stripeService, 'verifyWebhookSignature')
        .mockImplementation(() => {
          throw new Error('Invalid signature');
        });

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
