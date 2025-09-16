import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { SubscriptionService } from './subscription.service';
import { SubscriptionStatus, SubscriptionEventType } from '@app/shared';

@Injectable()
export class SubscriptionWebhookService {
  private readonly logger = new Logger(SubscriptionWebhookService.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Process incoming webhook events from Stripe
   */
  async processWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      this.logger.log(`Processing webhook event: ${event.type}`);

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(
            event.data.object as Stripe.Subscription
          );
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription
          );
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription
          );
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(
            event.data.object as Stripe.Subscription
          );
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(
            event.data.object as Stripe.Invoice
          );
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.upcoming':
          await this.handleUpcomingInvoice(event.data.object as Stripe.Invoice);
          break;

        default:
          this.logger.warn(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to process webhook event ${event.type}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Handle subscription created event
   */
  private async handleSubscriptionCreated(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    try {
      this.logger.log(
        `Handling subscription created: ${stripeSubscription.id}`
      );

      // Check if subscription already exists in our database
      const existingSubscription =
        await this.subscriptionService.findByStripeSubscriptionId(
          stripeSubscription.id
        );

      if (existingSubscription) {
        this.logger.warn(
          `Subscription ${stripeSubscription.id} already exists in database`
        );
        return;
      }

      // Extract customer and subscription data
      const customerId =
        typeof stripeSubscription.customer === 'string'
          ? stripeSubscription.customer
          : stripeSubscription.customer.id;

      const subscriptionItem = stripeSubscription.items.data[0];
      if (!subscriptionItem) {
        this.logger.error(
          `No subscription items found for subscription ${stripeSubscription.id}`
        );
        return;
      }

      const price = subscriptionItem.price;
      const product =
        typeof price.product === 'string' ? price.product : price.product.id;

      // Create subscription in our database
      // Note: This is a simplified version - in a real implementation, you'd need to
      // map the Stripe customer to your user/tenant system
      const subscriptionData = {
        tenantId: 'unknown', // This should be mapped from your customer data
        userId: 'unknown', // This should be mapped from your customer data
        name: `Subscription ${stripeSubscription.id}`,
        description: `Stripe subscription ${stripeSubscription.id}`,
        status: this.mapStripeStatusToLocal(stripeSubscription.status),
        amount: subscriptionItem.price?.unit_amount || 0,
        currency: stripeSubscription.currency,
        quantity: subscriptionItem.quantity || 1,
        startDate: new Date(stripeSubscription.created * 1000),
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000
        ),
        trialEndDate: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : undefined,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: price.id,
        stripeProductId: product,
        stripeCustomerId: customerId,
        isActive: stripeSubscription.status === 'active',
        isTrial: stripeSubscription.status === 'trialing',
        autoRenew: !stripeSubscription.cancel_at_period_end,
        metadata: stripeSubscription.metadata,
      };

      // For now, we'll just log this - in a real implementation, you'd create the subscription
      this.logger.log(`Would create subscription with data:`, subscriptionData);

      this.logger.log(
        `Successfully handled subscription created: ${stripeSubscription.id}`
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to handle subscription created: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Handle subscription updated event
   */
  private async handleSubscriptionUpdated(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    try {
      this.logger.log(
        `Handling subscription updated: ${stripeSubscription.id}`
      );

      const existingSubscription =
        await this.subscriptionService.findByStripeSubscriptionId(
          stripeSubscription.id
        );

      if (!existingSubscription) {
        this.logger.warn(
          `Subscription ${stripeSubscription.id} not found in database`
        );
        return;
      }

      // Update subscription data
      const updateData = {
        status: this.mapStripeStatusToLocal(stripeSubscription.status),
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000
        ),
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000
        ),
        ...(stripeSubscription.trial_end && {
          trialEndDate: new Date(stripeSubscription.trial_end * 1000),
        }),
        isActive: stripeSubscription.status === 'active',
        isTrial: stripeSubscription.status === 'trialing',
        autoRenew: !stripeSubscription.cancel_at_period_end,
        metadata: stripeSubscription.metadata,
      };

      // Update the subscription using webhook-specific method
      await this.subscriptionService.updateFromWebhook(
        stripeSubscription.id,
        updateData
      );

      this.logger.log(
        `Successfully handled subscription updated: ${stripeSubscription.id}`
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to handle subscription updated: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Handle subscription deleted event
   */
  private async handleSubscriptionDeleted(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    try {
      this.logger.log(
        `Handling subscription deleted: ${stripeSubscription.id}`
      );

      const existingSubscription =
        await this.subscriptionService.findByStripeSubscriptionId(
          stripeSubscription.id
        );

      if (!existingSubscription) {
        this.logger.warn(
          `Subscription ${stripeSubscription.id} not found in database`
        );
        return;
      }

      // Cancel the subscription
      await this.subscriptionService.cancelSubscription(
        existingSubscription.id,
        {
          reason: 'stripe_deleted' as any,
          cancelAtPeriodEnd: false,
        }
      );

      this.logger.log(
        `Successfully handled subscription deleted: ${stripeSubscription.id}`
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to handle subscription deleted: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Handle trial will end event
   */
  private async handleTrialWillEnd(
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    try {
      this.logger.log(`Handling trial will end: ${stripeSubscription.id}`);

      const existingSubscription =
        await this.subscriptionService.findByStripeSubscriptionId(
          stripeSubscription.id
        );

      if (!existingSubscription) {
        this.logger.warn(
          `Subscription ${stripeSubscription.id} not found in database`
        );
        return;
      }

      // Update trial end date
      const updateData = {
        ...(stripeSubscription.trial_end && {
          trialEndDate: new Date(stripeSubscription.trial_end * 1000),
        }),
      };

      await this.subscriptionService.updateFromWebhook(
        stripeSubscription.id,
        updateData
      );

      // TODO: Send notification to user about trial ending
      this.logger.log(
        `Trial ending notification should be sent for subscription: ${stripeSubscription.id}`
      );

      this.logger.log(
        `Successfully handled trial will end: ${stripeSubscription.id}`
      );
    } catch (error: any) {
      this.logger.error(`Failed to handle trial will end: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle payment succeeded event
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      this.logger.log(`Handling payment succeeded: ${invoice.id}`);

      if (!invoice.subscription) {
        this.logger.log(
          `Invoice ${invoice.id} is not associated with a subscription`
        );
        return;
      }

      const subscriptionId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription.id;

      const existingSubscription =
        await this.subscriptionService.findByStripeSubscriptionId(
          subscriptionId
        );

      if (!existingSubscription) {
        this.logger.warn(
          `Subscription ${subscriptionId} not found in database`
        );
        return;
      }

      // Update subscription status to active if it was past due
      if (existingSubscription.status === SubscriptionStatus.PAST_DUE) {
        await this.subscriptionService.updateFromWebhook(subscriptionId, {
          status: SubscriptionStatus.ACTIVE,
        });
      }

      // TODO: Create invoice record in database
      // TODO: Send payment confirmation email

      this.logger.log(`Successfully handled payment succeeded: ${invoice.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to handle payment succeeded: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle payment failed event
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      this.logger.log(`Handling payment failed: ${invoice.id}`);

      if (!invoice.subscription) {
        this.logger.log(
          `Invoice ${invoice.id} is not associated with a subscription`
        );
        return;
      }

      const subscriptionId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription.id;

      const existingSubscription =
        await this.subscriptionService.findByStripeSubscriptionId(
          subscriptionId
        );

      if (!existingSubscription) {
        this.logger.warn(
          `Subscription ${subscriptionId} not found in database`
        );
        return;
      }

      // Update subscription status to past due
      await this.subscriptionService.updateFromWebhook(subscriptionId, {
        status: SubscriptionStatus.PAST_DUE,
      });

      // TODO: Send payment failed notification
      // TODO: Implement retry logic or grace period

      this.logger.log(`Successfully handled payment failed: ${invoice.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to handle payment failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle upcoming invoice event
   */
  private async handleUpcomingInvoice(invoice: Stripe.Invoice): Promise<void> {
    try {
      this.logger.log(`Handling upcoming invoice: ${invoice.id}`);

      if (!invoice.subscription) {
        this.logger.log(
          `Invoice ${invoice.id} is not associated with a subscription`
        );
        return;
      }

      const subscriptionId =
        typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription.id;

      const existingSubscription =
        await this.subscriptionService.findByStripeSubscriptionId(
          subscriptionId
        );

      if (!existingSubscription) {
        this.logger.warn(
          `Subscription ${subscriptionId} not found in database`
        );
        return;
      }

      // TODO: Send upcoming invoice notification
      // TODO: Update subscription with next billing date

      this.logger.log(`Successfully handled upcoming invoice: ${invoice.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to handle upcoming invoice: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map Stripe subscription status to local subscription status
   */
  private mapStripeStatusToLocal(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'trialing':
        return SubscriptionStatus.TRIAL;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'unpaid':
        return SubscriptionStatus.UNPAID;
      case 'incomplete':
      case 'incomplete_expired':
        return SubscriptionStatus.PENDING;
      default:
        this.logger.warn(`Unknown Stripe status: ${stripeStatus}`);
        return SubscriptionStatus.INACTIVE;
    }
  }
}
