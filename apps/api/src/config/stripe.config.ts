import { env } from '@app/config';

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  priceId?: string;
  apiVersion: string;
  maxNetworkRetries: number;
  timeout: number;
  connectTimeout: number;
  readTimeout: number;
  currency: string;
  supportedCurrencies: string[];
  paymentMethods: {
    card: boolean;
    bankTransfer: boolean;
    sepaDebit: boolean;
    ideal: boolean;
    sofort: boolean;
    giropay: boolean;
    bancontact: boolean;
  };
  webhookEvents: string[];
  testMode: boolean;
}

export const stripeConfig: StripeConfig = {
  secretKey: env.STRIPE_SECRET_KEY || '',
  publishableKey: env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
  ...(env.STRIPE_PRICE_ID && { priceId: env.STRIPE_PRICE_ID }),
  apiVersion: '2023-10-16',
  maxNetworkRetries: 3,
  timeout: 80000,
  connectTimeout: 30000,
  readTimeout: 30000,
  currency: 'usd',
  supportedCurrencies: ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'],
  paymentMethods: {
    card: true,
    bankTransfer: true,
    sepaDebit: true,
    ideal: true,
    sofort: true,
    giropay: true,
    bancontact: true,
  },
  webhookEvents: [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.trial_will_end',
    'invoice.created',
    'invoice.finalized',
    'invoice.payment_action_required',
    'charge.succeeded',
    'charge.failed',
    'charge.refunded',
    'charge.dispute.created',
    'charge.dispute.closed',
    'account.updated',
    'account.application.authorized',
    'account.application.deauthorized',
  ],
  testMode: env.NODE_ENV !== 'production',
};

export const getStripeConfig = (): StripeConfig => stripeConfig;

export const validateStripeConfig = (): void => {
  if (!stripeConfig.secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }
  if (!stripeConfig.publishableKey) {
    throw new Error('STRIPE_PUBLISHABLE_KEY is required');
  }
  if (!stripeConfig.webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is required');
  }
};
