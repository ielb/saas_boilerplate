import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  HttpStatus,
  HttpCode,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentWebhookService } from '../services/payment-webhook.service';
import { PaymentWebhookGuard } from '../guards/payment-webhook.guard';
import { Request as ExpressRequest } from 'express';

@ApiTags('Payment Webhooks')
@Controller('webhooks/payments')
export class PaymentWebhooksController {
  constructor(private readonly paymentWebhookService: PaymentWebhookService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PaymentWebhookGuard)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid webhook signature',
  })
  async handleStripeWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature: string,
    @Request() req: ExpressRequest
  ): Promise<{ received: boolean }> {
    // The webhook guard has already verified the signature and stored the event
    const event = (req as any).stripeEvent;

    // Process the webhook event
    await this.paymentWebhookService.handleWebhookEvent(event);

    return { received: true };
  }

  @Post('stripe/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test Stripe webhook endpoint (development only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test webhook processed successfully',
  })
  async testStripeWebhook(
    @Body() payload: any
  ): Promise<{ received: boolean; event: any }> {
    // This endpoint is for testing webhook handling without signature verification
    // Should only be available in development mode
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test webhook endpoint not available in production');
    }

    // Process the test webhook event
    await this.paymentWebhookService.handleWebhookEvent(payload);

    return { received: true, event: payload };
  }
}
