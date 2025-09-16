import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { StripeService } from '../../payments/services/stripe.service';
import { stripeConfig } from '../../../config/stripe.config';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(private readonly stripeService: StripeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['stripe-signature'];

    if (!signature) {
      this.logger.error('Missing Stripe signature header');
      throw new UnauthorizedException('Missing Stripe signature');
    }

    try {
      // Verify the webhook signature
      const event = this.stripeService.verifyWebhookSignature(
        JSON.stringify(request.body),
        signature,
        stripeConfig.webhookSecret
      );

      // Attach the verified event to the request for use in the controller
      request.verifiedEvent = event;

      this.logger.log(`Webhook signature verified for event: ${event.type}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Webhook signature verification failed: ${error.message}`
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}

