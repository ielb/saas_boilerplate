import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
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
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
} from '../dto';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SubscriptionLimits {
  maxUsers?: number;
  maxStorage?: number;
  maxApiCalls?: number;
  maxProjects?: number;
  maxTeams?: number;
  customLimits?: Record<string, number>;
}

export interface SubscriptionFeatures {
  analytics?: boolean;
  apiAccess?: boolean;
  customBranding?: boolean;
  prioritySupport?: boolean;
  sso?: boolean;
  customFeatures?: Record<string, boolean>;
}

@Injectable()
export class SubscriptionValidationService {
  private readonly logger = new Logger(SubscriptionValidationService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlan>,
    @InjectRepository(SubscriptionUsage)
    private readonly subscriptionUsageRepository: Repository<SubscriptionUsage>
  ) {}

  /**
   * Validate subscription creation
   */
  async validateSubscriptionCreation(
    createDto: CreateSubscriptionDto
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate basic required fields
      this.validateRequiredFields(createDto, errors);

      // Validate plan compatibility
      if (createDto.planId) {
        await this.validatePlanCompatibility(
          createDto.planId,
          createDto,
          errors,
          warnings
        );
      }

      // Validate tenant and user constraints
      await this.validateTenantUserConstraints(createDto, errors);

      // Validate pricing and billing
      this.validatePricingAndBilling(createDto, errors, warnings);

      // Validate trial period
      this.validateTrialPeriod(createDto, errors, warnings);

      // Validate Stripe integration
      if (createDto.stripeCustomerId || createDto.stripePriceId) {
        await this.validateStripeIntegration(createDto, errors, warnings);
      }

      // Validate business rules
      await this.validateBusinessRules(createDto, errors, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: any) {
      this.logger.error(`Validation error: ${error.message}`);
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Validate subscription update
   */
  async validateSubscriptionUpdate(
    subscriptionId: string,
    updateDto: UpdateSubscriptionDto
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ['plan'],
      });

      if (!subscription) {
        errors.push('Subscription not found');
        return { isValid: false, errors, warnings };
      }

      // Validate state transition
      this.validateStateTransition(subscription, updateDto, errors);

      // Validate plan changes
      if (updateDto.planId && updateDto.planId !== subscription.planId) {
        await this.validatePlanChange(
          subscription,
          updateDto.planId,
          errors,
          warnings
        );
      }

      // Validate pricing changes
      if (updateDto.amount !== undefined) {
        this.validatePricingChange(
          subscription,
          updateDto.amount,
          errors,
          warnings
        );
      }

      // Validate billing cycle changes
      if (updateDto.billingCycle) {
        this.validateBillingCycleChange(
          subscription,
          updateDto.billingCycle,
          errors,
          warnings
        );
      }

      // Validate trial modifications
      if (
        updateDto.trialDays !== undefined ||
        updateDto.isTrial !== undefined
      ) {
        this.validateTrialModification(
          subscription,
          updateDto,
          errors,
          warnings
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: any) {
      this.logger.error(`Update validation error: ${error.message}`);
      return {
        isValid: false,
        errors: [`Update validation failed: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Validate subscription cancellation
   */
  async validateSubscriptionCancellation(
    subscriptionId: string,
    cancelDto: CancelSubscriptionDto
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ['plan'],
      });

      if (!subscription) {
        errors.push('Subscription not found');
        return { isValid: false, errors, warnings };
      }

      // Validate cancellation eligibility
      this.validateCancellationEligibility(subscription, errors);

      // Validate cancellation timing
      this.validateCancellationTiming(
        subscription,
        cancelDto,
        errors,
        warnings
      );

      // Validate proration rules
      if (cancelDto.prorate !== undefined) {
        this.validateProrationRules(
          subscription,
          cancelDto.prorate,
          errors,
          warnings
        );
      }

      // Validate business impact
      await this.validateCancellationBusinessImpact(
        subscription,
        errors,
        warnings
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: any) {
      this.logger.error(`Cancellation validation error: ${error.message}`);
      return {
        isValid: false,
        errors: [`Cancellation validation failed: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Validate subscription limits and usage
   */
  async validateSubscriptionLimits(
    subscriptionId: string,
    usageData: Record<string, number>
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ['plan'],
      });

      if (!subscription) {
        errors.push('Subscription not found');
        return { isValid: false, errors, warnings };
      }

      // Get current usage
      const currentUsage = await this.getCurrentUsage(subscriptionId);

      // Validate against limits
      await this.validateAgainstLimits(
        subscription,
        currentUsage,
        usageData,
        errors,
        warnings
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: any) {
      this.logger.error(`Limits validation error: ${error.message}`);
      return {
        isValid: false,
        errors: [`Limits validation failed: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(
    createDto: CreateSubscriptionDto,
    errors: string[]
  ): void {
    if (!createDto.tenantId) {
      errors.push('Tenant ID is required');
    }

    if (!createDto.userId) {
      errors.push('User ID is required');
    }

    if (!createDto.name) {
      errors.push('Subscription name is required');
    }

    if (!createDto.amount || createDto.amount <= 0) {
      errors.push('Valid amount is required');
    }

    if (!createDto.startDate) {
      errors.push('Start date is required');
    }

    if (createDto.startDate && new Date(createDto.startDate) < new Date()) {
      errors.push('Start date cannot be in the past');
    }
  }

  /**
   * Validate plan compatibility
   */
  private async validatePlanCompatibility(
    planId: string,
    createDto: CreateSubscriptionDto,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    const plan = await this.subscriptionPlanRepository.findOne({
      where: { id: planId },
    });

    if (!plan) {
      errors.push('Subscription plan not found');
      return;
    }

    if (!plan.isActive) {
      errors.push('Subscription plan is not active');
    }

    // Validate plan features against requested features
    if (createDto.features) {
      this.validateFeatureCompatibility(
        plan,
        createDto.features,
        errors,
        warnings
      );
    }

    // Validate plan limits against requested limits
    if (createDto.limits) {
      this.validateLimitCompatibility(plan, createDto.limits, errors, warnings);
    }

    // Validate billing cycle compatibility
    if (
      createDto.billingCycle &&
      plan.billingCycle !== createDto.billingCycle
    ) {
      warnings.push(
        `Plan billing cycle (${plan.billingCycle}) differs from requested (${createDto.billingCycle})`
      );
    }
  }

  /**
   * Validate tenant and user constraints
   */
  private async validateTenantUserConstraints(
    createDto: CreateSubscriptionDto,
    errors: string[]
  ): Promise<void> {
    // Check for existing active subscription
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: {
        tenantId: createDto.tenantId,
        userId: createDto.userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSubscription) {
      errors.push(
        'An active subscription already exists for this tenant and user'
      );
    }

    // Check for existing trial subscription
    const existingTrial = await this.subscriptionRepository.findOne({
      where: {
        tenantId: createDto.tenantId,
        userId: createDto.userId,
        status: SubscriptionStatus.TRIAL,
      },
    });

    if (existingTrial && createDto.isTrial) {
      errors.push(
        'A trial subscription already exists for this tenant and user'
      );
    }
  }

  /**
   * Validate pricing and billing
   */
  private validatePricingAndBilling(
    createDto: CreateSubscriptionDto,
    errors: string[],
    warnings: string[]
  ): void {
    if (createDto.amount < 0) {
      errors.push('Amount cannot be negative');
    }

    if (createDto.quantity && createDto.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (createDto.unitPrice && createDto.unitPrice < 0) {
      errors.push('Unit price cannot be negative');
    }

    // Validate currency
    if (
      createDto.currency &&
      !['USD', 'EUR', 'GBP', 'CAD', 'AUD'].includes(createDto.currency)
    ) {
      warnings.push(`Currency ${createDto.currency} may not be supported`);
    }

    // Validate billing cycle
    if (
      createDto.billingCycle &&
      !Object.values(SubscriptionBillingCycle).includes(createDto.billingCycle)
    ) {
      errors.push('Invalid billing cycle');
    }
  }

  /**
   * Validate trial period
   */
  private validateTrialPeriod(
    createDto: CreateSubscriptionDto,
    errors: string[],
    warnings: string[]
  ): void {
    if (createDto.isTrial) {
      if (!createDto.trialDays || createDto.trialDays <= 0) {
        errors.push(
          'Trial days must be specified and greater than 0 for trial subscriptions'
        );
      }

      if (createDto.trialDays && createDto.trialDays > 90) {
        warnings.push(
          'Trial period longer than 90 days may require special approval'
        );
      }

      if (createDto.trialEndDate) {
        const trialEnd = new Date(createDto.trialEndDate);
        const startDate = new Date(createDto.startDate);
        const expectedEnd = new Date(
          startDate.getTime() + (createDto.trialDays || 0) * 24 * 60 * 60 * 1000
        );

        if (
          Math.abs(trialEnd.getTime() - expectedEnd.getTime()) >
          24 * 60 * 60 * 1000
        ) {
          warnings.push(
            'Trial end date does not match calculated trial period'
          );
        }
      }
    }
  }

  /**
   * Validate Stripe integration
   */
  private async validateStripeIntegration(
    createDto: CreateSubscriptionDto,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    if (createDto.stripeCustomerId && !createDto.stripePriceId) {
      errors.push('Stripe price ID is required when customer ID is provided');
    }

    if (createDto.stripePriceId && !createDto.stripeCustomerId) {
      errors.push('Stripe customer ID is required when price ID is provided');
    }

    // Additional Stripe validation could be added here
    // For example, verifying that the customer and price exist in Stripe
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    createDto: CreateSubscriptionDto,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Business rule: Minimum subscription amount
    if (createDto.amount < 5.0) {
      warnings.push('Subscription amount is below recommended minimum');
    }

    // Business rule: Maximum trial period
    if (createDto.isTrial && createDto.trialDays && createDto.trialDays > 30) {
      warnings.push('Trial period exceeds standard 30-day limit');
    }

    // Business rule: Annual billing discount
    if (
      createDto.billingCycle === SubscriptionBillingCycle.ANNUALLY &&
      createDto.amount > 0
    ) {
      const monthlyEquivalent = createDto.amount / 12;
      if (monthlyEquivalent < createDto.amount * 0.8) {
        warnings.push('Annual billing should provide at least 20% discount');
      }
    }
  }

  /**
   * Validate state transition
   */
  private validateStateTransition(
    subscription: Subscription,
    updateDto: UpdateSubscriptionDto,
    errors: string[]
  ): void {
    const allowedTransitions: Record<SubscriptionStatus, SubscriptionStatus[]> =
      {
        [SubscriptionStatus.ACTIVE]: [
          SubscriptionStatus.SUSPENDED,
          SubscriptionStatus.CANCELED,
        ],
        [SubscriptionStatus.TRIAL]: [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.CANCELED,
        ],
        [SubscriptionStatus.SUSPENDED]: [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.CANCELED,
        ],
        [SubscriptionStatus.CANCELED]: [SubscriptionStatus.ACTIVE], // Reactivation
        [SubscriptionStatus.PAST_DUE]: [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.CANCELED,
        ],
        [SubscriptionStatus.UNPAID]: [SubscriptionStatus.CANCELED],
        [SubscriptionStatus.PENDING]: [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.CANCELED,
        ],
        [SubscriptionStatus.INACTIVE]: [SubscriptionStatus.ACTIVE],
        [SubscriptionStatus.EXPIRED]: [SubscriptionStatus.ACTIVE], // Reactivation
        [SubscriptionStatus.COMPLETED]: [], // No transitions from completed
      };

    if (
      updateDto.status &&
      !allowedTransitions[subscription.status]?.includes(updateDto.status)
    ) {
      errors.push(
        `Cannot transition from ${subscription.status} to ${updateDto.status}`
      );
    }
  }

  /**
   * Validate plan change
   */
  private async validatePlanChange(
    subscription: Subscription,
    newPlanId: string,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    const newPlan = await this.subscriptionPlanRepository.findOne({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      errors.push('New subscription plan not found');
      return;
    }

    if (!newPlan.isActive) {
      errors.push('New subscription plan is not active');
    }

    // Validate feature compatibility
    if (subscription.features && newPlan.features) {
      this.validateFeatureDowngrade(
        subscription.features,
        newPlan.features,
        errors,
        warnings
      );
    }

    // Validate limit compatibility
    if (subscription.limits && newPlan.limits) {
      this.validateLimitDowngrade(
        subscription.limits,
        newPlan.limits,
        errors,
        warnings
      );
    }
  }

  /**
   * Validate pricing change
   */
  private validatePricingChange(
    subscription: Subscription,
    newAmount: number,
    errors: string[],
    warnings: string[]
  ): void {
    if (newAmount < 0) {
      errors.push('New amount cannot be negative');
    }

    const priceChangePercent =
      Math.abs(newAmount - subscription.amount) / subscription.amount;
    if (priceChangePercent > 0.5) {
      warnings.push('Price change exceeds 50% - may require customer approval');
    }
  }

  /**
   * Validate billing cycle change
   */
  private validateBillingCycleChange(
    subscription: Subscription,
    newBillingCycle: SubscriptionBillingCycle,
    errors: string[],
    warnings: string[]
  ): void {
    if (subscription.billingCycle === newBillingCycle) {
      warnings.push('Billing cycle is unchanged');
      return;
    }

    // Validate cycle change timing
    const now = new Date();
    if (!subscription.currentPeriodEnd) {
      warnings.push('No current period end date set - cannot validate timing');
      return;
    }
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const daysUntilRenewal = Math.ceil(
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilRenewal < 7) {
      warnings.push('Billing cycle change requested close to renewal date');
    }
  }

  /**
   * Validate trial modification
   */
  private validateTrialModification(
    subscription: Subscription,
    updateDto: UpdateSubscriptionDto,
    errors: string[],
    warnings: string[]
  ): void {
    if (subscription.status !== SubscriptionStatus.TRIAL && updateDto.isTrial) {
      errors.push('Cannot convert non-trial subscription to trial');
    }

    if (
      subscription.isTrial &&
      updateDto.trialDays &&
      updateDto.trialDays < subscription.trialDays
    ) {
      errors.push('Cannot reduce trial period for existing trial subscription');
    }
  }

  /**
   * Validate cancellation eligibility
   */
  private validateCancellationEligibility(
    subscription: Subscription,
    errors: string[]
  ): void {
    if (subscription.status === SubscriptionStatus.CANCELED) {
      errors.push('Subscription is already canceled');
    }

    if (subscription.status === SubscriptionStatus.UNPAID) {
      errors.push('Cannot cancel unpaid subscription - use different process');
    }
  }

  /**
   * Validate cancellation timing
   */
  private validateCancellationTiming(
    subscription: Subscription,
    cancelDto: CancelSubscriptionDto,
    errors: string[],
    warnings: string[]
  ): void {
    const now = new Date();
    if (!subscription.currentPeriodEnd) {
      warnings.push('No current period end date set - cannot validate timing');
      return;
    }
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const daysUntilRenewal = Math.ceil(
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (cancelDto.cancelAtPeriodEnd && daysUntilRenewal < 1) {
      warnings.push(
        'Cancellation at period end requested on last day of billing period'
      );
    }

    if (!cancelDto.cancelAtPeriodEnd && daysUntilRenewal > 30) {
      warnings.push(
        'Immediate cancellation requested more than 30 days before renewal'
      );
    }
  }

  /**
   * Validate proration rules
   */
  private validateProrationRules(
    subscription: Subscription,
    prorate: boolean,
    errors: string[],
    warnings: string[]
  ): void {
    const now = new Date();
    if (!subscription.currentPeriodEnd) {
      warnings.push(
        'No current period end date set - cannot validate proration'
      );
      return;
    }
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const daysUntilRenewal = Math.ceil(
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (prorate && daysUntilRenewal < 7) {
      warnings.push(
        'Proration requested close to renewal date - may result in minimal refund'
      );
    }
  }

  /**
   * Validate cancellation business impact
   */
  private async validateCancellationBusinessImpact(
    subscription: Subscription,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Check if this is a high-value subscription
    if (subscription.amount > 1000) {
      warnings.push(
        'High-value subscription cancellation - consider retention offer'
      );
    }

    // Check subscription age
    const subscriptionAge = Math.ceil(
      (Date.now() - subscription.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (subscriptionAge < 30) {
      warnings.push('Early cancellation - subscription less than 30 days old');
    }
  }

  /**
   * Validate feature compatibility
   */
  private validateFeatureCompatibility(
    plan: SubscriptionPlan,
    requestedFeatures: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (!plan.features) return;

    for (const [feature, enabled] of Object.entries(requestedFeatures)) {
      if (enabled && !plan.features[feature]) {
        errors.push(
          `Feature '${feature}' is not available in the selected plan`
        );
      }
    }
  }

  /**
   * Validate limit compatibility
   */
  private validateLimitCompatibility(
    plan: SubscriptionPlan,
    requestedLimits: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (!plan.limits) return;

    for (const [limit, value] of Object.entries(requestedLimits)) {
      if (
        typeof value === 'number' &&
        plan.limits[limit] &&
        value > plan.limits[limit]
      ) {
        errors.push(
          `Limit '${limit}' exceeds plan maximum of ${plan.limits[limit]}`
        );
      }
    }
  }

  /**
   * Validate feature downgrade
   */
  private validateFeatureDowngrade(
    currentFeatures: any,
    newFeatures: any,
    errors: string[],
    warnings: string[]
  ): void {
    for (const [feature, enabled] of Object.entries(currentFeatures)) {
      if (enabled && !newFeatures[feature]) {
        warnings.push(`Feature '${feature}' will be disabled with plan change`);
      }
    }
  }

  /**
   * Validate limit downgrade
   */
  private validateLimitDowngrade(
    currentLimits: any,
    newLimits: any,
    errors: string[],
    warnings: string[]
  ): void {
    for (const [limit, value] of Object.entries(currentLimits)) {
      if (
        typeof value === 'number' &&
        newLimits[limit] &&
        value > newLimits[limit]
      ) {
        warnings.push(
          `Limit '${limit}' will be reduced from ${value} to ${newLimits[limit]}`
        );
      }
    }
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
   * Validate against limits
   */
  private async validateAgainstLimits(
    subscription: Subscription,
    currentUsage: Record<string, number>,
    requestedUsage: Record<string, number>,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    if (!subscription.limits) return;

    for (const [metric, requestedValue] of Object.entries(requestedUsage)) {
      const currentValue = currentUsage[metric] || 0;
      const totalValue = currentValue + requestedValue;
      const limit = subscription.limits[metric];

      if (limit && totalValue > limit) {
        errors.push(
          `Usage limit exceeded for '${metric}': ${totalValue}/${limit}`
        );
      } else if (limit && totalValue > limit * 0.8) {
        warnings.push(
          `Approaching usage limit for '${metric}': ${totalValue}/${limit}`
        );
      }
    }
  }
}
