export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRIAL = 'trial',
  EXPIRED = 'expired',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export enum SubscriptionBillingCycle {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUALLY = 'semi_annually',
  ANNUALLY = 'annually',
  CUSTOM = 'custom',
}

export enum SubscriptionPlanType {
  FREE = 'free',
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom',
}

export enum UsageMetricType {
  USERS = 'users',
  PROJECTS = 'projects',
  STORAGE = 'storage',
  API_CALLS = 'api_calls',
  FEATURES = 'features',
  CUSTOM = 'custom',
}

export enum SubscriptionEventType {
  CREATED = 'subscription.created',
  UPDATED = 'subscription.updated',
  CANCELED = 'subscription.canceled',
  RENEWED = 'subscription.renewed',
  EXPIRED = 'subscription.expired',
  TRIAL_ENDED = 'subscription.trial_ended',
  PAST_DUE = 'subscription.past_due',
  REACTIVATED = 'subscription.reactivated',
  SUSPENDED = 'subscription.suspended',
  UPGRADED = 'subscription.upgraded',
  DOWNGRADED = 'subscription.downgraded',
}

export interface SubscriptionFeatures {
  maxUsers: number;
  maxProjects: number;
  maxStorageGB: number;
  maxApiCalls: number;
  features: string[];
  customFeatures?: Record<string, any>;
}

export interface SubscriptionLimits {
  maxUsers: number;
  maxProjects: number;
  maxStorageGB: number;
  maxApiCalls: number;
  maxTeamMembers: number;
  maxIntegrations: number;
  customLimits?: Record<string, number>;
}

export interface SubscriptionMetadata {
  source?: string;
  campaign?: string;
  referrer?: string;
  notes?: string;
  customFields?: Record<string, any>;
}

export interface UsageRecord {
  metricType: UsageMetricType;
  metricName: string;
  quantity: number;
  unitPrice?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface BillingPeriod {
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isUpcoming: boolean;
}

export interface SubscriptionSummary {
  id: string;
  name: string;
  status: SubscriptionStatus;
  billingCycle: SubscriptionBillingCycle;
  amount: number;
  currency: string;
  startDate: Date;
  endDate?: Date;
  trialEndDate?: Date;
  isActive: boolean;
  isTrial: boolean;
  autoRenew: boolean;
  planType: SubscriptionPlanType;
  features: SubscriptionFeatures;
  limits: SubscriptionLimits;
  usage: {
    currentUsers: number;
    currentProjects: number;
    currentStorageGB: number;
    currentApiCalls: number;
    usagePercentage: Record<string, number>;
  };
}
