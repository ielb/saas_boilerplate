import { SubscriptionStatus, SubscriptionBillingCycle } from '@app/shared';

export class SubscriptionResponseDto {
  id!: string;
  tenantId!: string;
  userId!: string;
  name!: string;
  description?: string;
  status!: SubscriptionStatus;
  billingCycle!: SubscriptionBillingCycle;
  amount!: number;
  currency!: string;
  quantity!: number;
  unitPrice?: number;
  startDate!: Date;
  endDate?: Date;
  trialEndDate?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: Date;
  canceledAt?: Date;
  endedAt?: Date;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeProductId?: string;
  stripeCustomerId?: string;
  planId?: string;
  metadata?: Record<string, any>;
  features?: Record<string, any>;
  limits?: Record<string, any>;
  isActive!: boolean;
  isTrial!: boolean;
  autoRenew!: boolean;
  trialDays!: number;
  gracePeriodDays!: number;
  cancelReason?: string;
  notes?: string;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;
}

