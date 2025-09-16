import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { StripeService } from './stripe.service';
import { PaymentService } from './payment.service';
import { PaymentMethodService } from './payment-method.service';

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly paymentService: PaymentService,
    private readonly paymentMethodService: PaymentMethodService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}`);

    try {
      switch (event.type) {
        // Payment Intent Events
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent
          );
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentPaymentFailed(
            event.data.object as Stripe.PaymentIntent
          );
          break;
        case 'payment_intent.canceled':
          await this.handlePaymentIntentCanceled(
            event.data.object as Stripe.PaymentIntent
          );
          break;

        // Customer Events
        case 'customer.created':
          await this.handleCustomerCreated(
            event.data.object as Stripe.Customer
          );
          break;
        case 'customer.updated':
          await this.handleCustomerUpdated(
            event.data.object as Stripe.Customer
          );
          break;
        case 'customer.deleted':
          await this.handleCustomerDeleted(
            event.data.object as Stripe.Customer
          );
          break;

        // Payment Method Events
        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(
            event.data.object as Stripe.PaymentMethod
          );
          break;
        case 'payment_method.detached':
          await this.handlePaymentMethodDetached(
            event.data.object as Stripe.PaymentMethod
          );
          break;
        case 'payment_method.updated':
          await this.handlePaymentMethodUpdated(
            event.data.object as Stripe.PaymentMethod
          );
          break;

        // Charge Events
        case 'charge.succeeded':
          await this.handleChargeSucceeded(event.data.object as Stripe.Charge);
          break;
        case 'charge.failed':
          await this.handleChargeFailed(event.data.object as Stripe.Charge);
          break;
        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;
        case 'charge.dispute.created':
          await this.handleChargeDisputeCreated(
            event.data.object as Stripe.Dispute
          );
          break;
        case 'charge.dispute.closed':
          await this.handleChargeDisputeClosed(
            event.data.object as Stripe.Dispute
          );
          break;

        // Refund Events
        case 'charge.refund.updated':
          await this.handleRefundUpdated(event.data.object as Stripe.Refund);
          break;

        // Account Events
        case 'account.updated':
          await this.handleAccountUpdated(event.data.object as Stripe.Account);
          break;
        case 'account.application.authorized':
          await this.handleAccountApplicationAuthorized(
            event.data.object as Stripe.Application
          );
          break;
        case 'account.application.deauthorized':
          await this.handleAccountApplicationDeauthorized(
            event.data.object as Stripe.Application
          );
          break;

        default:
          this.logger.warn(`Unhandled webhook event type: ${event.type}`);
      }

      // Emit event for external listeners
      this.eventEmitter.emit(`stripe.${event.type}`, event);
    } catch (error) {
      this.logger.error(
        `Error processing webhook event ${event.type}: ${(error as Error).message}`
      );
      throw error;
    }
  }

  // Payment Intent Handlers
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    this.logger.log(`Payment intent succeeded: ${paymentIntent.id}`);

    try {
      await this.paymentService.updatePaymentFromStripe(paymentIntent);
      this.eventEmitter.emit('payment.succeeded', { paymentIntent });
    } catch (error) {
      this.logger.error(
        `Error handling payment intent succeeded: ${(error as Error).message}`
      );
      throw error;
    }
  }

  private async handlePaymentIntentPaymentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    this.logger.log(`Payment intent failed: ${paymentIntent.id}`);

    try {
      await this.paymentService.updatePaymentFromStripe(paymentIntent);
      this.eventEmitter.emit('payment.failed', { paymentIntent });
    } catch (error) {
      this.logger.error(
        `Error handling payment intent failed: ${(error as Error).message}`
      );
      throw error;
    }
  }

  private async handlePaymentIntentCanceled(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    this.logger.log(`Payment intent canceled: ${paymentIntent.id}`);

    try {
      await this.paymentService.updatePaymentFromStripe(paymentIntent);
      this.eventEmitter.emit('payment.canceled', { paymentIntent });
    } catch (error) {
      this.logger.error(
        `Error handling payment intent canceled: ${(error as Error).message}`
      );
      throw error;
    }
  }

  // Customer Handlers
  private async handleCustomerCreated(
    customer: Stripe.Customer
  ): Promise<void> {
    this.logger.log(`Customer created: ${customer.id}`);
    this.eventEmitter.emit('customer.created', { customer });
  }

  private async handleCustomerUpdated(
    customer: Stripe.Customer
  ): Promise<void> {
    this.logger.log(`Customer updated: ${customer.id}`);
    this.eventEmitter.emit('customer.updated', { customer });
  }

  private async handleCustomerDeleted(
    customer: Stripe.Customer
  ): Promise<void> {
    this.logger.log(`Customer deleted: ${customer.id}`);
    this.eventEmitter.emit('customer.deleted', { customer });
  }

  // Payment Method Handlers
  private async handlePaymentMethodAttached(
    paymentMethod: Stripe.PaymentMethod
  ): Promise<void> {
    this.logger.log(`Payment method attached: ${paymentMethod.id}`);

    try {
      await this.paymentMethodService.updatePaymentMethodFromStripe(
        paymentMethod
      );
      this.eventEmitter.emit('payment_method.attached', { paymentMethod });
    } catch (error) {
      this.logger.error(
        `Error handling payment method attached: ${(error as Error).message}`
      );
      throw error;
    }
  }

  private async handlePaymentMethodDetached(
    paymentMethod: Stripe.PaymentMethod
  ): Promise<void> {
    this.logger.log(`Payment method detached: ${paymentMethod.id}`);

    try {
      await this.paymentMethodService.updatePaymentMethodFromStripe(
        paymentMethod
      );
      this.eventEmitter.emit('payment_method.detached', { paymentMethod });
    } catch (error) {
      this.logger.error(
        `Error handling payment method detached: ${(error as Error).message}`
      );
      throw error;
    }
  }

  private async handlePaymentMethodUpdated(
    paymentMethod: Stripe.PaymentMethod
  ): Promise<void> {
    this.logger.log(`Payment method updated: ${paymentMethod.id}`);

    try {
      await this.paymentMethodService.updatePaymentMethodFromStripe(
        paymentMethod
      );
      this.eventEmitter.emit('payment_method.updated', { paymentMethod });
    } catch (error) {
      this.logger.error(
        `Error handling payment method updated: ${(error as Error).message}`
      );
      throw error;
    }
  }

  // Charge Handlers
  private async handleChargeSucceeded(charge: Stripe.Charge): Promise<void> {
    this.logger.log(`Charge succeeded: ${charge.id}`);
    this.eventEmitter.emit('charge.succeeded', { charge });
  }

  private async handleChargeFailed(charge: Stripe.Charge): Promise<void> {
    this.logger.log(`Charge failed: ${charge.id}`);
    this.eventEmitter.emit('charge.failed', { charge });
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    this.logger.log(`Charge refunded: ${charge.id}`);
    this.eventEmitter.emit('charge.refunded', { charge });
  }

  private async handleChargeDisputeCreated(
    dispute: Stripe.Dispute
  ): Promise<void> {
    this.logger.log(`Charge dispute created: ${dispute.id}`);
    this.eventEmitter.emit('charge.dispute.created', { dispute });
  }

  private async handleChargeDisputeClosed(
    dispute: Stripe.Dispute
  ): Promise<void> {
    this.logger.log(`Charge dispute closed: ${dispute.id}`);
    this.eventEmitter.emit('charge.dispute.closed', { dispute });
  }

  // Refund Handlers
  private async handleRefundUpdated(refund: Stripe.Refund): Promise<void> {
    this.logger.log(`Refund updated: ${refund.id}`);
    this.eventEmitter.emit('refund.updated', { refund });
  }

  // Account Handlers
  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    this.logger.log(`Account updated: ${account.id}`);
    this.eventEmitter.emit('account.updated', { account });
  }

  private async handleAccountApplicationAuthorized(
    application: Stripe.Application
  ): Promise<void> {
    this.logger.log(`Account application authorized: ${application.id}`);
    this.eventEmitter.emit('account.application.authorized', { application });
  }

  private async handleAccountApplicationDeauthorized(
    application: Stripe.Application
  ): Promise<void> {
    this.logger.log(`Account application deauthorized: ${application.id}`);
    this.eventEmitter.emit('account.application.deauthorized', { application });
  }

  // Utility Methods
  async verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Promise<Stripe.Event> {
    return this.stripeService.verifyWebhookSignature(
      payload,
      signature,
      secret
    );
  }

  getSupportedEvents(): string[] {
    return [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'payment_intent.canceled',
      'customer.created',
      'customer.updated',
      'customer.deleted',
      'payment_method.attached',
      'payment_method.detached',
      'payment_method.updated',
      'charge.succeeded',
      'charge.failed',
      'charge.refunded',
      'charge.dispute.created',
      'charge.dispute.closed',
      'charge.refund.updated',
      'account.updated',
      'account.application.authorized',
      'account.application.deauthorized',
    ];
  }
}
