import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { SubscriptionUsage } from '../entities/subscription-usage.entity';
import {
  SubscriptionStatus,
  SubscriptionBillingCycle,
  SubscriptionEventType,
} from '@app/shared';

export interface BusinessRuleResult {
  canProceed: boolean;
  message: string;
  requiresApproval: boolean;
  suggestedActions: string[];
}

export interface PricingRule {
  basePrice: number;
  discountPercent: number;
  minimumCommitment: number;
  maximumDiscount: number;
}

export interface UsageRule {
  metric: string;
  limit: number;
  overageRate: number;
  gracePeriod: number;
}

@Injectable()
export class SubscriptionBusinessRulesService {
  private readonly logger = new Logger(SubscriptionBusinessRulesService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlan>,
    @InjectRepository(SubscriptionUsage)
    private readonly subscriptionUsageRepository: Repository<SubscriptionUsage>
  ) {}

  /**
   * Apply pricing rules and calculate final price
   */
  async applyPricingRules(
    baseAmount: number,
    billingCycle: SubscriptionBillingCycle,
    quantity: number = 1,
    customRules?: Partial<PricingRule>
  ): Promise<{
    finalAmount: number;
    discountApplied: number;
    rulesApplied: string[];
  }> {
    const rulesApplied: string[] = [];
    let finalAmount = baseAmount * quantity;
    let discountApplied = 0;

    try {
      // Annual billing discount
      if (billingCycle === SubscriptionBillingCycle.ANNUALLY) {
        const annualDiscount = customRules?.discountPercent || 20; // 20% default
        const discount = (finalAmount * annualDiscount) / 100;
        finalAmount -= discount;
        discountApplied += discount;
        rulesApplied.push(`Annual billing discount: ${annualDiscount}%`);
      }

      // Volume discount for high quantities
      if (quantity >= 10) {
        const volumeDiscount = Math.min(quantity * 2, 30); // 2% per unit, max 30%
        const discount = (finalAmount * volumeDiscount) / 100;
        finalAmount -= discount;
        discountApplied += discount;
        rulesApplied.push(
          `Volume discount: ${volumeDiscount}% for ${quantity} units`
        );
      }

      // Enterprise discount for high-value subscriptions
      if (finalAmount >= 1000) {
        const enterpriseDiscount = 15; // 15% for enterprise
        const discount = (finalAmount * enterpriseDiscount) / 100;
        finalAmount -= discount;
        discountApplied += discount;
        rulesApplied.push(`Enterprise discount: ${enterpriseDiscount}%`);
      }

      // Minimum price enforcement
      const minimumPrice = customRules?.minimumCommitment || 5.0;
      if (finalAmount < minimumPrice) {
        finalAmount = minimumPrice;
        rulesApplied.push(`Minimum price enforcement: $${minimumPrice}`);
      }

      // Maximum discount cap
      const maxDiscount = customRules?.maximumDiscount || 50;
      const totalDiscountPercent =
        (discountApplied / (baseAmount * quantity)) * 100;
      if (totalDiscountPercent > maxDiscount) {
        const excessDiscount =
          ((totalDiscountPercent - maxDiscount) / 100) *
          (baseAmount * quantity);
        finalAmount += excessDiscount;
        discountApplied -= excessDiscount;
        rulesApplied.push(`Maximum discount cap: ${maxDiscount}%`);
      }

      this.logger.log(
        `Pricing rules applied: $${baseAmount * quantity} -> $${finalAmount} (${discountApplied.toFixed(2)} discount)`
      );

      return {
        finalAmount: Math.round(finalAmount * 100) / 100, // Round to 2 decimal places
        discountApplied: Math.round(discountApplied * 100) / 100,
        rulesApplied,
      };
    } catch (error: any) {
      this.logger.error(`Error applying pricing rules: ${error.message}`);
      return {
        finalAmount: baseAmount * quantity,
        discountApplied: 0,
        rulesApplied: ['Error applying pricing rules - using base amount'],
      };
    }
  }

  /**
   * Check if subscription can be upgraded
   */
  async canUpgradeSubscription(
    subscriptionId: string,
    targetPlanId: string
  ): Promise<BusinessRuleResult> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ['plan'],
      });

      if (!subscription) {
        return {
          canProceed: false,
          message: 'Subscription not found',
          requiresApproval: false,
          suggestedActions: [],
        };
      }

      const targetPlan = await this.subscriptionPlanRepository.findOne({
        where: { id: targetPlanId },
      });

      if (!targetPlan) {
        return {
          canProceed: false,
          message: 'Target plan not found',
          requiresApproval: false,
          suggestedActions: [],
        };
      }

      // Check subscription status
      if (
        subscription.status !== SubscriptionStatus.ACTIVE &&
        subscription.status !== SubscriptionStatus.TRIAL
      ) {
        return {
          canProceed: false,
          message: `Cannot upgrade subscription in ${subscription.status} status`,
          requiresApproval: false,
          suggestedActions: ['Activate subscription first'],
        };
      }

      // Check if target plan is higher tier
      const isUpgrade = this.isPlanUpgrade(subscription.plan, targetPlan);
      if (!isUpgrade) {
        return {
          canProceed: false,
          message: 'Target plan is not an upgrade',
          requiresApproval: false,
          suggestedActions: ['Select a higher-tier plan'],
        };
      }

      // Check billing cycle compatibility
      const billingCompatible = this.isBillingCycleCompatible(
        subscription.billingCycle,
        targetPlan.billingCycle
      );
      if (!billingCompatible) {
        return {
          canProceed: true,
          message: 'Billing cycle change required for upgrade',
          requiresApproval: false,
          suggestedActions: ['Confirm billing cycle change'],
        };
      }

      // Check for immediate upgrade eligibility
      const daysUntilRenewal = this.getDaysUntilRenewal(subscription);
      if (daysUntilRenewal > 7) {
        return {
          canProceed: true,
          message: 'Upgrade available with proration',
          requiresApproval: false,
          suggestedActions: ['Apply proration for immediate upgrade'],
        };
      }

      return {
        canProceed: true,
        message: 'Upgrade available',
        requiresApproval: false,
        suggestedActions: [],
      };
    } catch (error: any) {
      this.logger.error(`Error checking upgrade eligibility: ${error.message}`);
      return {
        canProceed: false,
        message: 'Error checking upgrade eligibility',
        requiresApproval: true,
        suggestedActions: ['Contact support'],
      };
    }
  }

  /**
   * Check if subscription can be downgraded
   */
  async canDowngradeSubscription(
    subscriptionId: string,
    targetPlanId: string
  ): Promise<BusinessRuleResult> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ['plan'],
      });

      if (!subscription) {
        return {
          canProceed: false,
          message: 'Subscription not found',
          requiresApproval: false,
          suggestedActions: [],
        };
      }

      const targetPlan = await this.subscriptionPlanRepository.findOne({
        where: { id: targetPlanId },
      });

      if (!targetPlan) {
        return {
          canProceed: false,
          message: 'Target plan not found',
          requiresApproval: false,
          suggestedActions: [],
        };
      }

      // Check subscription status
      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        return {
          canProceed: false,
          message: `Cannot downgrade subscription in ${subscription.status} status`,
          requiresApproval: false,
          suggestedActions: ['Activate subscription first'],
        };
      }

      // Check if target plan is lower tier
      const isDowngrade = this.isPlanDowngrade(subscription.plan, targetPlan);
      if (!isDowngrade) {
        return {
          canProceed: false,
          message: 'Target plan is not a downgrade',
          requiresApproval: false,
          suggestedActions: ['Select a lower-tier plan'],
        };
      }

      // Check current usage against target plan limits
      const usageConflict = await this.checkUsageAgainstTargetPlan(
        subscription,
        targetPlan
      );
      if (usageConflict.hasConflict) {
        return {
          canProceed: false,
          message: `Current usage exceeds target plan limits: ${usageConflict.conflicts.join(', ')}`,
          requiresApproval: false,
          suggestedActions: ['Reduce usage or select different plan'],
        };
      }

      // Check subscription age for downgrade restrictions
      const subscriptionAge = this.getSubscriptionAge(subscription);
      if (subscriptionAge < 30) {
        return {
          canProceed: true,
          message: 'Downgrade available but may affect early adopter benefits',
          requiresApproval: false,
          suggestedActions: ['Review early adopter benefits'],
        };
      }

      return {
        canProceed: true,
        message: 'Downgrade available at next billing cycle',
        requiresApproval: false,
        suggestedActions: ['Schedule downgrade for next billing cycle'],
      };
    } catch (error: any) {
      this.logger.error(
        `Error checking downgrade eligibility: ${error.message}`
      );
      return {
        canProceed: false,
        message: 'Error checking downgrade eligibility',
        requiresApproval: true,
        suggestedActions: ['Contact support'],
      };
    }
  }

  /**
   * Check if subscription can be canceled
   */
  async canCancelSubscription(
    subscriptionId: string
  ): Promise<BusinessRuleResult> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ['plan'],
      });

      if (!subscription) {
        return {
          canProceed: false,
          message: 'Subscription not found',
          requiresApproval: false,
          suggestedActions: [],
        };
      }

      // Check subscription status
      if (subscription.status === SubscriptionStatus.CANCELED) {
        return {
          canProceed: false,
          message: 'Subscription is already canceled',
          requiresApproval: false,
          suggestedActions: [],
        };
      }

      // Check for active usage that might be affected
      const activeUsage = await this.getActiveUsage(subscriptionId);
      if (activeUsage.length > 0) {
        return {
          canProceed: true,
          message: 'Cancellation will affect active usage',
          requiresApproval: false,
          suggestedActions: [
            'Review active usage before canceling',
            'Consider pausing instead',
          ],
        };
      }

      // Check subscription value for retention
      if (subscription.amount > 500) {
        return {
          canProceed: true,
          message: 'High-value subscription cancellation',
          requiresApproval: false,
          suggestedActions: [
            'Consider retention offer',
            'Schedule call with account manager',
          ],
        };
      }

      // Check subscription age
      const subscriptionAge = this.getSubscriptionAge(subscription);
      if (subscriptionAge < 7) {
        return {
          canProceed: true,
          message: 'Early cancellation - consider refund policy',
          requiresApproval: false,
          suggestedActions: [
            'Review refund policy',
            'Consider trial extension',
          ],
        };
      }

      return {
        canProceed: true,
        message: 'Cancellation available',
        requiresApproval: false,
        suggestedActions: [],
      };
    } catch (error: any) {
      this.logger.error(
        `Error checking cancellation eligibility: ${error.message}`
      );
      return {
        canProceed: false,
        message: 'Error checking cancellation eligibility',
        requiresApproval: true,
        suggestedActions: ['Contact support'],
      };
    }
  }

  /**
   * Calculate proration amount
   */
  async calculateProration(
    subscriptionId: string,
    newAmount: number,
    effectiveDate?: Date
  ): Promise<{
    prorationAmount: number;
    creditAmount: number;
    chargeAmount: number;
  }> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const now = new Date();
      const effective = effectiveDate || now;
      const periodStart = subscription.currentPeriodStart;
      const periodEnd = subscription.currentPeriodEnd;

      if (!periodStart || !periodEnd) {
        throw new Error('Subscription period dates are not set');
      }

      // Calculate days used and remaining
      const totalDays = Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysUsed = Math.ceil(
        (effective.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysRemaining = totalDays - daysUsed;

      // Calculate proration
      const currentDailyRate = subscription.amount / totalDays;
      const newDailyRate = newAmount / totalDays;
      const dailyDifference = newDailyRate - currentDailyRate;

      const prorationAmount = dailyDifference * daysRemaining;
      const creditAmount = Math.max(0, -prorationAmount);
      const chargeAmount = Math.max(0, prorationAmount);

      this.logger.log(
        `Proration calculated: $${prorationAmount.toFixed(2)} (credit: $${creditAmount.toFixed(2)}, charge: $${chargeAmount.toFixed(2)})`
      );

      return {
        prorationAmount: Math.round(prorationAmount * 100) / 100,
        creditAmount: Math.round(creditAmount * 100) / 100,
        chargeAmount: Math.round(chargeAmount * 100) / 100,
      };
    } catch (error: any) {
      this.logger.error(`Error calculating proration: ${error.message}`);
      return {
        prorationAmount: 0,
        creditAmount: 0,
        chargeAmount: 0,
      };
    }
  }

  /**
   * Check usage against target plan limits
   */
  private async checkUsageAgainstTargetPlan(
    subscription: Subscription,
    targetPlan: SubscriptionPlan
  ): Promise<{ hasConflict: boolean; conflicts: string[] }> {
    const conflicts: string[] = [];

    if (!targetPlan.limits) {
      return { hasConflict: false, conflicts: [] };
    }

    const currentUsage = await this.getCurrentUsage(subscription.id);

    for (const [metric, limit] of Object.entries(targetPlan.limits)) {
      const usage = currentUsage[metric] || 0;
      if (usage > limit) {
        conflicts.push(`${metric}: ${usage}/${limit}`);
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Get current usage for subscription
   */
  private async getCurrentUsage(
    subscriptionId: string
  ): Promise<Record<string, number>> {
    const usage = await this.subscriptionUsageRepository.find({
      where: { subscriptionId },
    });

    const usageMap: Record<string, number> = {};
    usage.forEach(u => {
      usageMap[u.metricName] = u.quantity;
    });

    return usageMap;
  }

  /**
   * Get active usage that might be affected by cancellation
   */
  private async getActiveUsage(subscriptionId: string): Promise<string[]> {
    // This would typically check for active sessions, ongoing processes, etc.
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Check if plan is an upgrade
   */
  private isPlanUpgrade(
    currentPlan: SubscriptionPlan,
    targetPlan: SubscriptionPlan
  ): boolean {
    // Simple price-based comparison - in reality, this would be more complex
    return targetPlan.price > currentPlan.price;
  }

  /**
   * Check if plan is a downgrade
   */
  private isPlanDowngrade(
    currentPlan: SubscriptionPlan,
    targetPlan: SubscriptionPlan
  ): boolean {
    return targetPlan.price < currentPlan.price;
  }

  /**
   * Check billing cycle compatibility
   */
  private isBillingCycleCompatible(
    current: SubscriptionBillingCycle,
    target: SubscriptionBillingCycle
  ): boolean {
    // Allow same cycle or upgrade to longer cycle
    const cycleOrder: Record<SubscriptionBillingCycle, number> = {
      [SubscriptionBillingCycle.DAILY]: 1,
      [SubscriptionBillingCycle.WEEKLY]: 2,
      [SubscriptionBillingCycle.MONTHLY]: 3,
      [SubscriptionBillingCycle.QUARTERLY]: 4,
      [SubscriptionBillingCycle.SEMI_ANNUALLY]: 5,
      [SubscriptionBillingCycle.ANNUALLY]: 6,
      [SubscriptionBillingCycle.CUSTOM]: 7,
    };

    return cycleOrder[target] >= cycleOrder[current];
  }

  /**
   * Get days until renewal
   */
  private getDaysUntilRenewal(subscription: Subscription): number {
    const now = new Date();
    if (!subscription.currentPeriodEnd) {
      return 0;
    }
    const periodEnd = new Date(subscription.currentPeriodEnd);
    return Math.ceil(
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  /**
   * Get subscription age in days
   */
  private getSubscriptionAge(subscription: Subscription): number {
    const now = new Date();
    return Math.ceil(
      (now.getTime() - subscription.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
  }
}
