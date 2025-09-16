import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { StripeService } from '../../payments/services/stripe.service';
import { SubscriptionService } from '../services/subscription.service';
import { SubscriptionWebhookService } from '../services/subscription-webhook.service';
import { WebhookSignatureGuard } from '../guards/webhook-signature.guard';
import { WebhookRateLimitGuard } from '../guards/webhook-rate-limit.guard';
import { stripeConfig } from '../../../config/stripe.config';

@Controller('webhooks/subscriptions')
export class SubscriptionWebhooksController {
  private readonly logger = new Logger(SubscriptionWebhooksController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionService: SubscriptionService,
    private readonly webhookService: SubscriptionWebhookService
  ) {}

  /**
   * Handle Stripe subscription webhook events
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @UseGuards(WebhookRateLimitGuard, WebhookSignatureGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute
  async handleStripeWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature: string,
    @Req() request: any
  ): Promise<{ received: boolean; eventId: string }> {
    try {
      this.logger.log('Received Stripe webhook event');

      // Get the verified event from the guard
      const event = request.verifiedEvent;

      this.logger.log(`Processing webhook event: ${event.type} (${event.id})`);

      // Process the webhook event
      await this.webhookService.processWebhookEvent(event);

      this.logger.log(
        `Successfully processed webhook event: ${event.type} (${event.id})`
      );

      return {
        received: true,
        eventId: event.id,
      };
    } catch (error: any) {
      this.logger.error(`Failed to process webhook: ${error.message}`);

      if (error.message.includes('signature')) {
        throw new UnauthorizedException('Invalid webhook signature');
      }

      throw new BadRequestException(
        `Webhook processing failed: ${error.message}`
      );
    }
  }

  /**
   * Health check endpoint for webhook monitoring
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
