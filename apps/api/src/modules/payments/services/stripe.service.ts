import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import {
  stripeConfig,
  validateStripeConfig,
} from '../../../config/stripe.config';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor() {
    validateStripeConfig();
    this.stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: stripeConfig.apiVersion as Stripe.LatestApiVersion,
      maxNetworkRetries: stripeConfig.maxNetworkRetries,
      timeout: stripeConfig.timeout,
      typescript: true,
    });
  }

  // Customer Management
  async createCustomer(params: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    try {
      const customerData: Stripe.CustomerCreateParams = {
        email: params.email,
        ...(params.name && { name: params.name }),
        ...(params.phone && { phone: params.phone }),
        ...(params.metadata && { metadata: params.metadata }),
      };

      const customer = await this.stripe.customers.create(customerData);

      this.logger.log(`Created Stripe customer: ${customer.id}`);
      return customer;
    } catch (error: any) {
      this.logger.error(`Failed to create Stripe customer: ${error.message}`);
      throw error;
    }
  }

  async updateCustomer(
    customerId: string,
    params: Partial<Stripe.CustomerUpdateParams>
  ): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.update(customerId, params);
      this.logger.log(`Updated Stripe customer: ${customerId}`);
      return customer;
    } catch (error: any) {
      this.logger.error(
        `Failed to update Stripe customer ${customerId}: ${error.message}`
      );
      throw error;
    }
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer as Stripe.Customer;
    } catch (error: any) {
      this.logger.error(
        `Failed to retrieve Stripe customer ${customerId}: ${error.message}`
      );
      throw error;
    }
  }

  async deleteCustomer(customerId: string): Promise<Stripe.DeletedCustomer> {
    try {
      const customer = await this.stripe.customers.del(customerId);
      this.logger.log(`Deleted Stripe customer: ${customerId}`);
      return customer;
    } catch (error: any) {
      this.logger.error(
        `Failed to delete Stripe customer ${customerId}: ${error.message}`
      );
      throw error;
    }
  }

  // Payment Methods
  async createPaymentMethod(params: {
    type: Stripe.PaymentMethodCreateParams.Type;
    card?: Stripe.PaymentMethodCreateParams.Card1;
    billingDetails?: Stripe.PaymentMethodCreateParams.BillingDetails;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethodData: Stripe.PaymentMethodCreateParams = {
        type: params.type,
        ...(params.card && { card: params.card }),
        ...(params.billingDetails && {
          billing_details: params.billingDetails,
        }),
        ...(params.metadata && { metadata: params.metadata }),
      };

      const paymentMethod =
        await this.stripe.paymentMethods.create(paymentMethodData);

      this.logger.log(`Created payment method: ${paymentMethod.id}`);
      return paymentMethod;
    } catch (error: any) {
      this.logger.error(`Failed to create payment method: ${error.message}`);
      throw error;
    }
  }

  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(
        paymentMethodId,
        {
          customer: customerId,
        }
      );

      this.logger.log(
        `Attached payment method ${paymentMethodId} to customer ${customerId}`
      );
      return paymentMethod;
    } catch (error: any) {
      this.logger.error(
        `Failed to attach payment method ${paymentMethodId}: ${error.message}`
      );
      throw error;
    }
  }

  async detachPaymentMethod(
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod =
        await this.stripe.paymentMethods.detach(paymentMethodId);
      this.logger.log(`Detached payment method: ${paymentMethodId}`);
      return paymentMethod;
    } catch (error: any) {
      this.logger.error(
        `Failed to detach payment method ${paymentMethodId}: ${error.message}`
      );
      throw error;
    }
  }

  async getPaymentMethod(
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod =
        await this.stripe.paymentMethods.retrieve(paymentMethodId);
      return paymentMethod;
    } catch (error: any) {
      this.logger.error(
        `Failed to retrieve payment method ${paymentMethodId}: ${error.message}`
      );
      throw error;
    }
  }

  async listPaymentMethods(
    customerId: string,
    params?: {
      type?: string;
      limit?: number;
    }
  ): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
    try {
      const listParams: Stripe.PaymentMethodListParams = {
        customer: customerId,
        ...(params?.type && {
          type: params.type as Stripe.PaymentMethodListParams.Type,
        }),
        ...(params?.limit && { limit: params.limit }),
      };

      const paymentMethods = await this.stripe.paymentMethods.list(listParams);

      return paymentMethods;
    } catch (error: any) {
      this.logger.error(
        `Failed to list payment methods for customer ${customerId}: ${error.message}`
      );
      throw error;
    }
  }

  // Payment Intents
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customer?: string;
    paymentMethod?: string;
    description?: string;
    metadata?: Record<string, string>;
    captureMethod?: 'automatic' | 'manual';
    confirmationMethod?: 'automatic' | 'manual';
    receiptEmail?: string;
    statementDescriptor?: string;
    statementDescriptorSuffix?: string;
  }): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: params.amount,
        currency: params.currency,
        ...(params.customer && { customer: params.customer }),
        ...(params.paymentMethod && { payment_method: params.paymentMethod }),
        ...(params.description && { description: params.description }),
        ...(params.metadata && { metadata: params.metadata }),
        ...(params.captureMethod && { capture_method: params.captureMethod }),
        ...(params.confirmationMethod && {
          confirmation_method: params.confirmationMethod,
        }),
        ...(params.receiptEmail && { receipt_email: params.receiptEmail }),
        ...(params.statementDescriptor && {
          statement_descriptor: params.statementDescriptor,
        }),
        ...(params.statementDescriptorSuffix && {
          statement_descriptor_suffix: params.statementDescriptorSuffix,
        }),
      };

      const paymentIntent =
        await this.stripe.paymentIntents.create(paymentIntentData);

      this.logger.log(`Created payment intent: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error: any) {
      this.logger.error(`Failed to create payment intent: ${error.message}`);
      throw error;
    }
  }

  async confirmPaymentIntent(
    paymentIntentId: string,
    params?: {
      paymentMethod?: string;
      returnUrl?: string;
      receiptEmail?: string;
    }
  ): Promise<Stripe.PaymentIntent> {
    try {
      const confirmParams: Stripe.PaymentIntentConfirmParams = {
        ...(params?.paymentMethod && { payment_method: params.paymentMethod }),
        ...(params?.returnUrl && { return_url: params.returnUrl }),
        ...(params?.receiptEmail && { receipt_email: params.receiptEmail }),
      };

      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        confirmParams
      );

      this.logger.log(`Confirmed payment intent: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error: any) {
      this.logger.error(
        `Failed to confirm payment intent ${paymentIntentId}: ${error.message}`
      );
      throw error;
    }
  }

  async capturePaymentIntent(
    paymentIntentId: string,
    params?: {
      amount?: number;
      receiptEmail?: string;
      statementDescriptor?: string;
      statementDescriptorSuffix?: string;
    }
  ): Promise<Stripe.PaymentIntent> {
    try {
      const captureParams: Stripe.PaymentIntentCaptureParams = {
        ...(params?.amount && { amount_to_capture: params.amount }),
      };

      const paymentIntent = await this.stripe.paymentIntents.capture(
        paymentIntentId,
        captureParams
      );

      this.logger.log(`Captured payment intent: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error: any) {
      this.logger.error(
        `Failed to capture payment intent ${paymentIntentId}: ${error.message}`
      );
      throw error;
    }
  }

  async cancelPaymentIntent(
    paymentIntentId: string,
    params?: {
      cancellationReason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    }
  ): Promise<Stripe.PaymentIntent> {
    try {
      const cancelParams: Stripe.PaymentIntentCancelParams = {
        ...(params?.cancellationReason && {
          cancellation_reason: params.cancellationReason,
        }),
      };

      const paymentIntent = await this.stripe.paymentIntents.cancel(
        paymentIntentId,
        cancelParams
      );

      this.logger.log(`Canceled payment intent: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error: any) {
      this.logger.error(
        `Failed to cancel payment intent ${paymentIntentId}: ${error.message}`
      );
      throw error;
    }
  }

  async getPaymentIntent(
    paymentIntentId: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error: any) {
      this.logger.error(
        `Failed to retrieve payment intent ${paymentIntentId}: ${error.message}`
      );
      throw error;
    }
  }

  // Refunds
  async createRefund(params: {
    charge: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<Stripe.Refund> {
    try {
      const refundData: Stripe.RefundCreateParams = {
        charge: params.charge,
        ...(params.amount && { amount: params.amount }),
        ...(params.reason && { reason: params.reason }),
        ...(params.metadata && { metadata: params.metadata }),
      };

      const refund = await this.stripe.refunds.create(refundData);

      this.logger.log(`Created refund: ${refund.id}`);
      return refund;
    } catch (error: any) {
      this.logger.error(`Failed to create refund: ${error.message}`);
      throw error;
    }
  }

  async getRefund(refundId: string): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.retrieve(refundId);
      return refund;
    } catch (error: any) {
      this.logger.error(
        `Failed to retrieve refund ${refundId}: ${error.message}`
      );
      throw error;
    }
  }

  async cancelRefund(refundId: string): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.cancel(refundId);
      this.logger.log(`Canceled refund: ${refundId}`);
      return refund;
    } catch (error: any) {
      this.logger.error(
        `Failed to cancel refund ${refundId}: ${error.message}`
      );
      throw error;
    }
  }

  // Webhook Verification
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Stripe.Event {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        secret
      );
      this.logger.log(`Verified webhook signature for event: ${event.type}`);
      return event;
    } catch (error: any) {
      this.logger.error(
        `Webhook signature verification failed: ${error.message}`
      );
      throw error;
    }
  }

  // Subscription Management
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    quantity?: number;
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
    defaultPaymentMethod?: string;
    collectionMethod?: 'charge_automatically' | 'send_invoice';
    daysUntilDue?: number;
    prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
    billingCycleAnchor?: number;
    cancelAtPeriodEnd?: boolean;
  }): Promise<Stripe.Subscription> {
    try {
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: params.customerId,
        items: [
          {
            price: params.priceId,
            quantity: params.quantity || 1,
          },
        ],
        ...(params.trialPeriodDays && {
          trial_period_days: params.trialPeriodDays,
        }),
        ...(params.metadata && { metadata: params.metadata }),
        ...(params.defaultPaymentMethod && {
          default_payment_method: params.defaultPaymentMethod,
        }),
        ...(params.collectionMethod && {
          collection_method: params.collectionMethod,
        }),
        ...(params.daysUntilDue && { days_until_due: params.daysUntilDue }),
        ...(params.prorationBehavior && {
          proration_behavior: params.prorationBehavior,
        }),
        ...(params.billingCycleAnchor && {
          billing_cycle_anchor: params.billingCycleAnchor,
        }),
        ...(params.cancelAtPeriodEnd !== undefined && {
          cancel_at_period_end: params.cancelAtPeriodEnd,
        }),
        expand: ['latest_invoice.payment_intent'],
      };

      const subscription =
        await this.stripe.subscriptions.create(subscriptionData);

      this.logger.log(`Created Stripe subscription: ${subscription.id}`);
      return subscription;
    } catch (error: any) {
      this.logger.error(
        `Failed to create Stripe subscription: ${error.message}`
      );
      throw error;
    }
  }

  async updateSubscription(
    subscriptionId: string,
    params: {
      priceId?: string;
      quantity?: number;
      metadata?: Record<string, string>;
      defaultPaymentMethod?: string;
      collectionMethod?: 'charge_automatically' | 'send_invoice';
      daysUntilDue?: number;
      prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
      cancelAtPeriodEnd?: boolean;
      trialEnd?: number | 'now';
    }
  ): Promise<Stripe.Subscription> {
    try {
      const updateData: Stripe.SubscriptionUpdateParams = {
        ...(params.metadata && { metadata: params.metadata }),
        ...(params.defaultPaymentMethod && {
          default_payment_method: params.defaultPaymentMethod,
        }),
        ...(params.collectionMethod && {
          collection_method: params.collectionMethod,
        }),
        ...(params.daysUntilDue && { days_until_due: params.daysUntilDue }),
        ...(params.prorationBehavior && {
          proration_behavior: params.prorationBehavior,
        }),
        ...(params.cancelAtPeriodEnd !== undefined && {
          cancel_at_period_end: params.cancelAtPeriodEnd,
        }),
        ...(params.trialEnd && { trial_end: params.trialEnd }),
        expand: ['latest_invoice.payment_intent'],
      };

      // If priceId is provided, update the subscription item
      if (params.priceId) {
        const subscription =
          await this.stripe.subscriptions.retrieve(subscriptionId);
        const subscriptionItem = subscription.items.data[0];
        if (!subscriptionItem) {
          throw new Error('No subscription items found');
        }

        await this.stripe.subscriptionItems.update(subscriptionItem.id, {
          price: params.priceId,
          quantity: params.quantity || 1,
        });
      }

      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        updateData
      );

      this.logger.log(`Updated Stripe subscription: ${subscriptionId}`);
      return subscription;
    } catch (error: any) {
      this.logger.error(
        `Failed to update Stripe subscription ${subscriptionId}: ${error.message}`
      );
      throw error;
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    params?: {
      cancelAtPeriodEnd?: boolean;
      prorate?: boolean;
      invoiceNow?: boolean;
    }
  ): Promise<Stripe.Subscription> {
    try {
      const cancelParams: Stripe.SubscriptionCancelParams = {
        ...(params?.cancelAtPeriodEnd !== undefined && {
          cancel_at_period_end: params.cancelAtPeriodEnd,
        }),
        ...(params?.prorate !== undefined && { prorate: params.prorate }),
        ...(params?.invoiceNow !== undefined && {
          invoice_now: params.invoiceNow,
        }),
      };

      const subscription = await this.stripe.subscriptions.cancel(
        subscriptionId,
        cancelParams
      );

      this.logger.log(`Canceled Stripe subscription: ${subscriptionId}`);
      return subscription;
    } catch (error: any) {
      this.logger.error(
        `Failed to cancel Stripe subscription ${subscriptionId}: ${error.message}`
      );
      throw error;
    }
  }

  async reactivateSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: false,
        }
      );

      this.logger.log(`Reactivated Stripe subscription: ${subscriptionId}`);
      return subscription;
    } catch (error: any) {
      this.logger.error(
        `Failed to reactivate Stripe subscription ${subscriptionId}: ${error.message}`
      );
      throw error;
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionId,
        {
          expand: ['latest_invoice', 'default_payment_method'],
        }
      );
      return subscription;
    } catch (error: any) {
      this.logger.error(
        `Failed to retrieve Stripe subscription ${subscriptionId}: ${error.message}`
      );
      throw error;
    }
  }

  async listSubscriptions(params?: {
    customerId?: string;
    status?: Stripe.SubscriptionListParams.Status;
    limit?: number;
    startingAfter?: string;
    endingBefore?: string;
  }): Promise<Stripe.ApiList<Stripe.Subscription>> {
    try {
      const listParams: Stripe.SubscriptionListParams = {
        ...(params?.customerId && { customer: params.customerId }),
        ...(params?.status && { status: params.status }),
        ...(params?.limit && { limit: params.limit }),
        ...(params?.startingAfter && { starting_after: params.startingAfter }),
        ...(params?.endingBefore && { ending_before: params.endingBefore }),
        expand: ['data.latest_invoice', 'data.default_payment_method'],
      };

      const subscriptions = await this.stripe.subscriptions.list(listParams);
      return subscriptions;
    } catch (error: any) {
      this.logger.error(
        `Failed to list Stripe subscriptions: ${error.message}`
      );
      throw error;
    }
  }

  // Product and Price Management
  async createProduct(params: {
    name: string;
    description?: string;
    metadata?: Record<string, string>;
    images?: string[];
    url?: string;
  }): Promise<Stripe.Product> {
    try {
      const productData: Stripe.ProductCreateParams = {
        name: params.name,
        ...(params.description && { description: params.description }),
        ...(params.metadata && { metadata: params.metadata }),
        ...(params.images && { images: params.images }),
        ...(params.url && { url: params.url }),
      };

      const product = await this.stripe.products.create(productData);

      this.logger.log(`Created Stripe product: ${product.id}`);
      return product;
    } catch (error: any) {
      this.logger.error(`Failed to create Stripe product: ${error.message}`);
      throw error;
    }
  }

  async createPrice(params: {
    productId: string;
    unitAmount: number;
    currency: string;
    recurring?: {
      interval: 'day' | 'week' | 'month' | 'year';
      intervalCount?: number;
    };
    metadata?: Record<string, string>;
    nickname?: string;
  }): Promise<Stripe.Price> {
    try {
      const priceData: Stripe.PriceCreateParams = {
        product: params.productId,
        unit_amount: params.unitAmount,
        currency: params.currency,
        ...(params.recurring && {
          recurring: {
            interval: params.recurring.interval,
            ...(params.recurring.intervalCount && {
              interval_count: params.recurring.intervalCount,
            }),
          },
        }),
        ...(params.metadata && { metadata: params.metadata }),
        ...(params.nickname && { nickname: params.nickname }),
      };

      const price = await this.stripe.prices.create(priceData);

      this.logger.log(`Created Stripe price: ${price.id}`);
      return price;
    } catch (error: any) {
      this.logger.error(`Failed to create Stripe price: ${error.message}`);
      throw error;
    }
  }

  async getProduct(productId: string): Promise<Stripe.Product> {
    try {
      const product = await this.stripe.products.retrieve(productId);
      return product;
    } catch (error: any) {
      this.logger.error(
        `Failed to retrieve Stripe product ${productId}: ${error.message}`
      );
      throw error;
    }
  }

  async getPrice(priceId: string): Promise<Stripe.Price> {
    try {
      const price = await this.stripe.prices.retrieve(priceId);
      return price;
    } catch (error: any) {
      this.logger.error(
        `Failed to retrieve Stripe price ${priceId}: ${error.message}`
      );
      throw error;
    }
  }

  async listProducts(params?: {
    active?: boolean;
    limit?: number;
    startingAfter?: string;
    endingBefore?: string;
  }): Promise<Stripe.ApiList<Stripe.Product>> {
    try {
      const listParams: Stripe.ProductListParams = {
        ...(params?.active !== undefined && { active: params.active }),
        ...(params?.limit && { limit: params.limit }),
        ...(params?.startingAfter && { starting_after: params.startingAfter }),
        ...(params?.endingBefore && { ending_before: params.endingBefore }),
      };

      const products = await this.stripe.products.list(listParams);
      return products;
    } catch (error: any) {
      this.logger.error(`Failed to list Stripe products: ${error.message}`);
      throw error;
    }
  }

  async listPrices(params?: {
    productId?: string;
    active?: boolean;
    limit?: number;
    startingAfter?: string;
    endingBefore?: string;
  }): Promise<Stripe.ApiList<Stripe.Price>> {
    try {
      const listParams: Stripe.PriceListParams = {
        ...(params?.productId && { product: params.productId }),
        ...(params?.active !== undefined && { active: params.active }),
        ...(params?.limit && { limit: params.limit }),
        ...(params?.startingAfter && { starting_after: params.startingAfter }),
        ...(params?.endingBefore && { ending_before: params.endingBefore }),
      };

      const prices = await this.stripe.prices.list(listParams);
      return prices;
    } catch (error: any) {
      this.logger.error(`Failed to list Stripe prices: ${error.message}`);
      throw error;
    }
  }

  // Utility Methods
  getStripeInstance(): Stripe {
    return this.stripe;
  }

  async calculateTax(params: {
    currency: string;
    line_items: Array<{
      amount: number;
      reference?: string;
      tax_code?: string;
    }>;
    customer_details: {
      address: {
        country: string;
        state?: string;
        city?: string;
        postal_code?: string;
      };
      address_source?: 'billing' | 'shipping';
    };
    expand?: string[];
  }): Promise<Stripe.Tax.Calculation> {
    try {
      const taxCalculation = await this.stripe.tax.calculations.create({
        currency: params.currency,
        line_items: params.line_items,
        customer_details: params.customer_details,
        ...(params.expand && { expand: params.expand }),
      });

      this.logger.log(`Calculated tax using Stripe: ${taxCalculation.id}`);
      return taxCalculation;
    } catch (error: any) {
      this.logger.error(`Failed to calculate tax with Stripe: ${error.message}`);
      throw error;
    }
  }

  async createTaxTransaction(params: {
    calculation: string; // Tax calculation ID
    reference: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Tax.Transaction> {
    try {
      const transaction = await this.stripe.tax.transactions.createFromCalculation({
        calculation: params.calculation,
        reference: params.reference,
        ...(params.metadata && { metadata: params.metadata }),
      });

      this.logger.log(`Created tax transaction: ${transaction.id}`);
      return transaction;
    } catch (error: any) {
      this.logger.error(`Failed to create tax transaction: ${error.message}`);
      throw error;
    }
  }

  async getTaxRates(params?: {
    active?: boolean;
    created?: Stripe.RangeQueryParam | number;
    inclusive?: boolean;
    limit?: number;
    starting_after?: string;
    ending_before?: string;
  }): Promise<Stripe.ApiList<Stripe.TaxRate>> {
    try {
      const taxRates = await this.stripe.taxRates.list(params);
      this.logger.log(`Retrieved ${taxRates.data.length} tax rates from Stripe`);
      return taxRates;
    } catch (error: any) {
      this.logger.error(`Failed to retrieve tax rates: ${error.message}`);
      throw error;
    }
  }

  async createTaxRate(params: {
    display_name: string;
    percentage: number;
    inclusive: boolean;
    jurisdiction?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.TaxRate> {
    try {
      const taxRate = await this.stripe.taxRates.create({
        display_name: params.display_name,
        percentage: params.percentage,
        inclusive: params.inclusive,
        ...(params.jurisdiction && { jurisdiction: params.jurisdiction }),
        ...(params.description && { description: params.description }),
        ...(params.metadata && { metadata: params.metadata }),
      });

      this.logger.log(`Created tax rate in Stripe: ${taxRate.id}`);
      return taxRate;
    } catch (error: any) {
      this.logger.error(`Failed to create tax rate: ${error.message}`);
      throw error;
    }
  }

  getConfig() {
    return stripeConfig;
  }

  isTestMode(): boolean {
    return stripeConfig.testMode;
  }
}
