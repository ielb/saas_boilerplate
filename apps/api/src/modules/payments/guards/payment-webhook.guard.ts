import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from '../services/stripe.service';
import { stripeConfig } from '../../../config/stripe.config';

@Injectable()
export class PaymentWebhookGuard implements CanActivate {
  constructor(private readonly stripeService: StripeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const signature = request.headers['stripe-signature'] as string;

    if (!signature || !signature.trim()) {
      throw new UnauthorizedException('Missing Stripe signature header');
    }

    if (!request.body) {
      throw new BadRequestException('Missing request body');
    }

    try {
      // Verify the webhook signature
      const event = this.stripeService.verifyWebhookSignature(
        request.body,
        signature,
        stripeConfig.webhookSecret
      );

      // Store the verified event in the request for later use
      (request as any).stripeEvent = event;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid Stripe webhook signature');
    }
  }
}
