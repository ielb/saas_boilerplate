import {
  SubscriptionStatus,
  SubscriptionBillingCycle,
  SubscriptionPlanType,
  UsageMetricType,
  SubscriptionFeatures,
  SubscriptionLimits,
  UsageRecord,
  BillingPeriod,
} from '../types/subscription.types';
import { InvoiceStatus, InvoiceType } from '../types/billing.types';

/**
 * Calculate the next billing date based on billing cycle and current date
 */
export function calculateNextBillingDate(
  currentDate: Date,
  billingCycle: SubscriptionBillingCycle,
  startDate: Date
): Date {
  const nextDate = new Date(currentDate);

  switch (billingCycle) {
    case SubscriptionBillingCycle.DAILY:
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case SubscriptionBillingCycle.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case SubscriptionBillingCycle.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case SubscriptionBillingCycle.QUARTERLY:
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case SubscriptionBillingCycle.SEMI_ANNUALLY:
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case SubscriptionBillingCycle.ANNUALLY:
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      // For custom billing cycles, calculate based on start date
      const timeDiff = currentDate.getTime() - startDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      nextDate.setDate(startDate.getDate() + daysDiff);
  }

  return nextDate;
}

/**
 * Calculate the previous billing date based on billing cycle and current date
 */
export function calculatePreviousBillingDate(
  currentDate: Date,
  billingCycle: SubscriptionBillingCycle,
  startDate: Date
): Date {
  const previousDate = new Date(currentDate);

  switch (billingCycle) {
    case SubscriptionBillingCycle.DAILY:
      previousDate.setDate(previousDate.getDate() - 1);
      break;
    case SubscriptionBillingCycle.WEEKLY:
      previousDate.setDate(previousDate.getDate() - 7);
      break;
    case SubscriptionBillingCycle.MONTHLY:
      previousDate.setMonth(previousDate.getMonth() - 1);
      break;
    case SubscriptionBillingCycle.QUARTERLY:
      previousDate.setMonth(previousDate.getMonth() - 3);
      break;
    case SubscriptionBillingCycle.SEMI_ANNUALLY:
      previousDate.setMonth(previousDate.getMonth() - 6);
      break;
    case SubscriptionBillingCycle.ANNUALLY:
      previousDate.setFullYear(previousDate.getFullYear() - 1);
      break;
    default:
      // For custom billing cycles, calculate based on start date
      const timeDiff = currentDate.getTime() - startDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      previousDate.setDate(startDate.getDate() - daysDiff);
  }

  return previousDate;
}

/**
 * Calculate the current billing period
 */
export function calculateCurrentBillingPeriod(
  startDate: Date,
  billingCycle: SubscriptionBillingCycle,
  currentDate: Date = new Date()
): BillingPeriod {
  const periodStart = new Date(startDate);
  const periodEnd = calculateNextBillingDate(
    periodStart,
    billingCycle,
    startDate
  );
  const isCurrent = currentDate >= periodStart && currentDate < periodEnd;
  const isUpcoming = currentDate < periodStart;

  return {
    startDate: periodStart,
    endDate: periodEnd,
    isCurrent,
    isUpcoming,
  };
}

/**
 * Calculate the number of days remaining in trial
 */
export function calculateTrialDaysRemaining(trialEndDate: Date): number {
  const now = new Date();
  const trialEnd = new Date(trialEndDate);
  const timeDiff = trialEnd.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return Math.max(0, daysRemaining);
}

/**
 * Check if subscription is in trial period
 */
export function isSubscriptionInTrial(
  trialEndDate: Date,
  currentDate: Date = new Date()
): boolean {
  return currentDate < new Date(trialEndDate);
}

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIAL,
    SubscriptionStatus.PAST_DUE,
  ].includes(status);
}

/**
 * Check if subscription can be canceled
 */
export function canCancelSubscription(status: SubscriptionStatus): boolean {
  return [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIAL,
    SubscriptionStatus.PAST_DUE,
  ].includes(status);
}

/**
 * Check if subscription can be upgraded
 */
export function canUpgradeSubscription(status: SubscriptionStatus): boolean {
  return [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL].includes(status);
}

/**
 * Check if subscription can be downgraded
 */
export function canDowngradeSubscription(status: SubscriptionStatus): boolean {
  return [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL].includes(status);
}

/**
 * Calculate usage percentage for a metric
 */
export function calculateUsagePercentage(
  currentUsage: number,
  limit: number
): number {
  if (limit === 0) return 0;
  return Math.min(100, (currentUsage / limit) * 100);
}

/**
 * Check if usage exceeds limit
 */
export function isUsageExceeded(
  currentUsage: number,
  limit: number,
  threshold: number = 100
): boolean {
  return calculateUsagePercentage(currentUsage, limit) > threshold;
}

/**
 * Calculate prorated amount for subscription changes
 */
export function calculateProratedAmount(
  currentAmount: number,
  newAmount: number,
  daysInCurrentPeriod: number,
  daysRemaining: number
): number {
  const dailyRate = currentAmount / daysInCurrentPeriod;
  const newDailyRate = newAmount / daysInCurrentPeriod;
  const proratedAmount = (newDailyRate - dailyRate) * daysRemaining;
  return Math.round(proratedAmount * 100) / 100;
}

/**
 * Calculate the total cost for usage-based billing
 */
export function calculateUsageCost(
  usageRecords: UsageRecord[],
  basePrice: number = 0
): number {
  const usageCost = usageRecords.reduce((total, record) => {
    const cost = record.quantity * (record.unitPrice || 0);
    return total + cost;
  }, 0);

  return Math.round((basePrice + usageCost) * 100) / 100;
}

/**
 * Validate subscription plan features
 */
export function validateSubscriptionFeatures(
  features: SubscriptionFeatures,
  limits: SubscriptionLimits
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (features.maxUsers < 1) {
    errors.push('Maximum users must be at least 1');
  }

  if (features.maxProjects < 1) {
    errors.push('Maximum projects must be at least 1');
  }

  if (features.maxStorageGB < 0) {
    errors.push('Maximum storage cannot be negative');
  }

  if (features.maxApiCalls < 0) {
    errors.push('Maximum API calls cannot be negative');
  }

  if (limits.maxUsers > features.maxUsers) {
    errors.push('Limit users cannot exceed feature users');
  }

  if (limits.maxProjects > features.maxProjects) {
    errors.push('Limit projects cannot exceed feature projects');
  }

  if (limits.maxStorageGB > features.maxStorageGB) {
    errors.push('Limit storage cannot exceed feature storage');
  }

  if (limits.maxApiCalls > features.maxApiCalls) {
    errors.push('Limit API calls cannot exceed feature API calls');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate subscription reference number
 */
export function generateSubscriptionReference(
  tenantId: string,
  userId: string,
  timestamp: Date = new Date()
): string {
  const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = timestamp.getTime().toString().slice(-6);
  const tenantShort = tenantId.slice(0, 4);
  const userShort = userId.slice(0, 4);

  return `SUB-${tenantShort}-${userShort}-${dateStr}-${timeStr}`.toUpperCase();
}

/**
 * Calculate grace period days remaining
 */
export function calculateGracePeriodDaysRemaining(
  dueDate: Date,
  gracePeriodDays: number,
  currentDate: Date = new Date()
): number {
  const graceEndDate = new Date(dueDate);
  graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);

  const now = new Date();
  const timeDiff = graceEndDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

  return Math.max(0, daysRemaining);
}

/**
 * Check if subscription is in grace period
 */
export function isSubscriptionInGracePeriod(
  dueDate: Date,
  gracePeriodDays: number,
  currentDate: Date = new Date()
): boolean {
  const graceEndDate = new Date(dueDate);
  graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);

  return currentDate > new Date(dueDate) && currentDate <= graceEndDate;
}

/**
 * Get subscription status display name
 */
export function getSubscriptionStatusDisplayName(
  status: SubscriptionStatus
): string {
  const statusMap: Record<SubscriptionStatus, string> = {
    [SubscriptionStatus.ACTIVE]: 'Active',
    [SubscriptionStatus.INACTIVE]: 'Inactive',
    [SubscriptionStatus.TRIAL]: 'Trial',
    [SubscriptionStatus.EXPIRED]: 'Expired',
    [SubscriptionStatus.CANCELED]: 'Canceled',
    [SubscriptionStatus.PAST_DUE]: 'Past Due',
    [SubscriptionStatus.UNPAID]: 'Unpaid',
    [SubscriptionStatus.SUSPENDED]: 'Suspended',
    [SubscriptionStatus.PENDING]: 'Pending',
    [SubscriptionStatus.COMPLETED]: 'Completed',
  };

  return statusMap[status] || status;
}

/**
 * Get billing cycle display name
 */
export function getBillingCycleDisplayName(
  billingCycle: SubscriptionBillingCycle
): string {
  const cycleMap: Record<SubscriptionBillingCycle, string> = {
    [SubscriptionBillingCycle.DAILY]: 'Daily',
    [SubscriptionBillingCycle.WEEKLY]: 'Weekly',
    [SubscriptionBillingCycle.MONTHLY]: 'Monthly',
    [SubscriptionBillingCycle.QUARTERLY]: 'Quarterly',
    [SubscriptionBillingCycle.SEMI_ANNUALLY]: 'Semi-Annually',
    [SubscriptionBillingCycle.ANNUALLY]: 'Annually',
    [SubscriptionBillingCycle.CUSTOM]: 'Custom',
  };

  return cycleMap[billingCycle] || billingCycle;
}
