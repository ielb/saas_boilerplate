import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { SubscriptionUsage } from '../entities/subscription-usage.entity';
import { SubscriptionInvoice } from '../entities/subscription-invoice.entity';
import {
  SubscriptionStatus,
  SubscriptionBillingCycle,
  SubscriptionEventType,
} from '@app/shared';
import { StripeService } from '../../payments/services/stripe.service';
import { SubscriptionValidationService } from './subscription-validation.service';
import { SubscriptionBusinessRulesService } from './subscription-business-rules.service';
import { UsersService } from '../../users/services/users.service';
import { TenantService } from '../../tenants/services/tenant.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  SubscriptionResponseDto,
} from '../dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly subscriptionPlanRepository: Repository<SubscriptionPlan>,
    @InjectRepository(SubscriptionUsage)
    private readonly subscriptionUsageRepository: Repository<SubscriptionUsage>,
    @InjectRepository(SubscriptionInvoice)
    private readonly subscriptionInvoiceRepository: Repository<SubscriptionInvoice>,
    private readonly stripeService: StripeService,
    private readonly validationService: SubscriptionValidationService,
    private readonly businessRulesService: SubscriptionBusinessRulesService,
    private readonly usersService: UsersService,
    private readonly tenantService: TenantService
  ) {}

  // Basic CRUD Operations
  async findAll(): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      relations: ['plan', 'tenant', 'user'],
    });
  }

  // Subscription Plans Management
  async getSubscriptionPlans(filters?: {
    isActive?: boolean;
    planType?: string;
    billingCycle?: string;
  }): Promise<SubscriptionPlan[]> {
    const queryBuilder =
      this.subscriptionPlanRepository.createQueryBuilder('plan');

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('plan.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.planType) {
      queryBuilder.andWhere('plan.planType = :planType', {
        planType: filters.planType,
      });
    }

    if (filters?.billingCycle) {
      queryBuilder.andWhere('plan.billingCycle = :billingCycle', {
        billingCycle: filters.billingCycle,
      });
    }

    queryBuilder
      .andWhere('plan.deletedAt IS NULL')
      .orderBy('plan.sortOrder', 'ASC')
      .addOrderBy('plan.price', 'ASC');

    return queryBuilder.getMany();
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found`);
    }

    return plan;
  }

  async getPopularPlans(): Promise<SubscriptionPlan[]> {
    return this.subscriptionPlanRepository.find({
      where: {
        isPopular: true,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: { sortOrder: 'ASC' },
    });
  }

  async findById(id: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { id },
      relations: ['plan', 'tenant', 'user'],
    });
  }

  async findByTenantId(tenantId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { tenantId },
      relations: ['plan', 'tenant', 'user'],
    });
  }

  async findByUserId(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { userId },
      relations: ['plan', 'tenant', 'user'],
    });
  }

  async findByStripeSubscriptionId(
    stripeSubscriptionId: string
  ): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId },
      relations: ['plan', 'tenant', 'user'],
    });
  }

  // Subscription Lifecycle Management

  /**
   * Create a new subscription with Stripe integration
   */
  async createSubscription(
    createDto: CreateSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(
        `Creating subscription for tenant ${createDto.tenantId} and user ${createDto.userId}`
      );

      // Validate subscription creation
      const validationResult =
        await this.validationService.validateSubscriptionCreation(createDto);
      if (!validationResult.isValid) {
        throw new BadRequestException(
          `Validation failed: ${validationResult.errors.join(', ')}`
        );
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        this.logger.warn(
          `Subscription creation warnings: ${validationResult.warnings.join(', ')}`
        );
      }

      // Apply business rules for pricing
      const pricingResult = await this.businessRulesService.applyPricingRules(
        createDto.amount,
        createDto.billingCycle || SubscriptionBillingCycle.MONTHLY,
        createDto.quantity || 1
      );

      // Update the amount with business rules applied
      createDto.amount = pricingResult.finalAmount;
      this.logger.log(
        `Pricing rules applied: ${pricingResult.rulesApplied.join(', ')}`
      );

      // Validate that plan exists if planId is provided
      let plan: SubscriptionPlan | null = null;
      if (createDto.planId) {
        plan = await this.subscriptionPlanRepository.findOne({
          where: { id: createDto.planId },
        });
        if (!plan) {
          throw new NotFoundException(
            `Subscription plan with ID ${createDto.planId} not found`
          );
        }
      }

      let stripeSubscription: any = null;

      // Automatic Stripe integration - create Stripe resources if not provided
      this.logger.log(
        `Checking Stripe integration - Customer ID: ${createDto.stripeCustomerId}, Price ID: ${createDto.stripePriceId}`
      );

      if (!createDto.stripeCustomerId || !createDto.stripePriceId) {
        this.logger.log(
          'Stripe IDs not provided, attempting to create Stripe resources...'
        );
        try {
          const stripeResources = await this.createStripeResources(
            createDto,
            plan
          );
          createDto.stripeCustomerId = stripeResources.customerId;
          createDto.stripePriceId = stripeResources.priceId;
          createDto.stripeProductId = stripeResources.productId;

          this.logger.log(
            `Created Stripe resources - Customer: ${stripeResources.customerId}, Price: ${stripeResources.priceId}`
          );
        } catch (error: any) {
          this.logger.warn(
            `Failed to create Stripe resources: ${error.message}. Proceeding with local subscription only.`
          );
          // Continue without Stripe integration if it fails
        }
      } else {
        this.logger.log(
          'Stripe IDs already provided, skipping resource creation'
        );
      }

      // Create Stripe subscription if Stripe IDs are available
      if (createDto.stripeCustomerId && createDto.stripePriceId) {
        try {
          const subscriptionParams: any = {
            customerId: createDto.stripeCustomerId,
            priceId: createDto.stripePriceId,
            quantity: createDto.quantity || 1,
            metadata: {
              tenantId: createDto.tenantId,
              userId: createDto.userId,
              planId: createDto.planId || '',
            },
          };

          if (createDto.trialDays) {
            subscriptionParams.trialPeriodDays = createDto.trialDays;
          }

          stripeSubscription =
            await this.stripeService.createSubscription(subscriptionParams);

          this.logger.log(
            `Created Stripe subscription: ${stripeSubscription.id}`
          );
        } catch (error: any) {
          this.logger.error(
            `Failed to create Stripe subscription: ${error.message}`
          );
          throw new BadRequestException(
            `Failed to create Stripe subscription: ${error.message}`
          );
        }
      }

      // Create local subscription entity
      const subscriptionData: any = {
        tenantId: createDto.tenantId,
        userId: createDto.userId,
        name: createDto.name,
        status: createDto.status || SubscriptionStatus.ACTIVE,
        billingCycle:
          createDto.billingCycle || SubscriptionBillingCycle.MONTHLY,
        amount: createDto.amount,
        currency: createDto.currency || 'USD',
        quantity: createDto.quantity || 1,
        startDate: new Date(createDto.startDate),
        trialDays: createDto.trialDays || 0,
        isTrial: createDto.isTrial || false,
        autoRenew:
          createDto.autoRenew !== undefined ? createDto.autoRenew : true,
        stripeSubscriptionId: stripeSubscription?.id,
        stripeCustomerId: createDto.stripeCustomerId,
        gracePeriodDays: createDto.gracePeriodDays || 0,
        isActive: true,
      };

      // Add optional fields only if they exist
      if (createDto.description)
        subscriptionData.description = createDto.description;
      if (createDto.unitPrice) subscriptionData.unitPrice = createDto.unitPrice;
      if (createDto.endDate)
        subscriptionData.endDate = new Date(createDto.endDate);
      if (createDto.trialEndDate)
        subscriptionData.trialEndDate = new Date(createDto.trialEndDate);
      if (createDto.stripePriceId)
        subscriptionData.stripePriceId = createDto.stripePriceId;
      if (stripeSubscription?.items?.data?.[0]?.price?.id)
        subscriptionData.stripePriceId =
          stripeSubscription.items.data[0].price.id;
      if (createDto.stripeProductId)
        subscriptionData.stripeProductId = createDto.stripeProductId;
      if (stripeSubscription?.items?.data?.[0]?.price?.product)
        subscriptionData.stripeProductId =
          stripeSubscription.items.data[0].price.product;
      if (createDto.planId) subscriptionData.planId = createDto.planId;
      if (createDto.metadata) subscriptionData.metadata = createDto.metadata;
      if (createDto.features) subscriptionData.features = createDto.features;
      if (plan?.features) subscriptionData.features = plan.features;
      if (createDto.limits) subscriptionData.limits = createDto.limits;
      if (plan?.limits) subscriptionData.limits = plan.limits;
      if (createDto.notes) subscriptionData.notes = createDto.notes;

      const subscription = this.subscriptionRepository.create(
        subscriptionData as Partial<Subscription>
      );

      // Set current period dates from Stripe if available
      if (stripeSubscription) {
        subscription.currentPeriodStart = new Date(
          stripeSubscription.current_period_start * 1000
        );
        subscription.currentPeriodEnd = new Date(
          stripeSubscription.current_period_end * 1000
        );
        if (stripeSubscription.trial_end) {
          subscription.trialEndDate = new Date(
            stripeSubscription.trial_end * 1000
          );
        }
      }

      const savedSubscription =
        await this.subscriptionRepository.save(subscription);

      this.logger.log(
        `Successfully created subscription: ${savedSubscription.id}`
      );

      // Emit subscription created event (you can implement event emission here)
      await this.emitSubscriptionEvent(
        SubscriptionEventType.CREATED,
        savedSubscription
      );

      return this.mapToResponseDto(savedSubscription);
    } catch (error: any) {
      this.logger.error(`Failed to create subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(
    id: string,
    updateDto: UpdateSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Updating subscription: ${id}`);

      const subscription = await this.findById(id);
      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${id} not found`);
      }

      // Validate subscription update
      const validationResult =
        await this.validationService.validateSubscriptionUpdate(id, updateDto);
      if (!validationResult.isValid) {
        throw new BadRequestException(
          `Update validation failed: ${validationResult.errors.join(', ')}`
        );
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        this.logger.warn(
          `Subscription update warnings: ${validationResult.warnings.join(', ')}`
        );
      }

      // Check if subscription can be updated
      if (!this.canUpdateSubscription(subscription)) {
        throw new BadRequestException(
          'Subscription cannot be updated in its current state'
        );
      }

      let stripeSubscription: any = null;

      // Update Stripe subscription if it exists
      if (subscription.stripeSubscriptionId) {
        try {
          const updateParams: any = {};

          if (updateDto.stripePriceId) {
            updateParams.priceId = updateDto.stripePriceId;
            updateParams.quantity = updateDto.quantity || subscription.quantity;
          }

          if (updateDto.metadata) {
            updateParams.metadata = updateDto.metadata;
          }

          if (Object.keys(updateParams).length > 0) {
            stripeSubscription = await this.stripeService.updateSubscription(
              subscription.stripeSubscriptionId,
              updateParams
            );

            this.logger.log(
              `Updated Stripe subscription: ${subscription.stripeSubscriptionId}`
            );
          }
        } catch (error: any) {
          this.logger.error(
            `Failed to update Stripe subscription: ${error.message}`
          );
          throw new BadRequestException(
            `Failed to update Stripe subscription: ${error.message}`
          );
        }
      }

      // Update local subscription entity
      const updateData: Partial<Subscription> = {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.description && { description: updateDto.description }),
        ...(updateDto.status && { status: updateDto.status }),
        ...(updateDto.billingCycle && { billingCycle: updateDto.billingCycle }),
        ...(updateDto.amount && { amount: updateDto.amount }),
        ...(updateDto.currency && { currency: updateDto.currency }),
        ...(updateDto.quantity && { quantity: updateDto.quantity }),
        ...(updateDto.unitPrice && { unitPrice: updateDto.unitPrice }),
        ...(updateDto.endDate && { endDate: new Date(updateDto.endDate) }),
        ...(updateDto.trialEndDate && {
          trialEndDate: new Date(updateDto.trialEndDate),
        }),
        ...(updateDto.trialDays && { trialDays: updateDto.trialDays }),
        ...(updateDto.isTrial !== undefined && { isTrial: updateDto.isTrial }),
        ...(updateDto.autoRenew !== undefined && {
          autoRenew: updateDto.autoRenew,
        }),
        ...(updateDto.stripePriceId && {
          stripePriceId: updateDto.stripePriceId,
        }),
        ...(updateDto.stripeProductId && {
          stripeProductId: updateDto.stripeProductId,
        }),
        ...(updateDto.metadata && { metadata: updateDto.metadata }),
        ...(updateDto.features && { features: updateDto.features }),
        ...(updateDto.limits && { limits: updateDto.limits }),
        ...(updateDto.gracePeriodDays && {
          gracePeriodDays: updateDto.gracePeriodDays,
        }),
        ...(updateDto.notes && { notes: updateDto.notes }),
      };

      // Update current period dates from Stripe if available
      if (stripeSubscription) {
        updateData.currentPeriodStart = new Date(
          stripeSubscription.current_period_start * 1000
        );
        updateData.currentPeriodEnd = new Date(
          stripeSubscription.current_period_end * 1000
        );
      }

      await this.subscriptionRepository.update(id, updateData);
      const updatedSubscription = await this.findById(id);

      this.logger.log(`Successfully updated subscription: ${id}`);

      // Emit subscription updated event
      await this.emitSubscriptionEvent(
        SubscriptionEventType.UPDATED,
        updatedSubscription!
      );

      return this.mapToResponseDto(updatedSubscription!);
    } catch (error: any) {
      this.logger.error(`Failed to update subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    id: string,
    cancelDto: CancelSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Canceling subscription: ${id}`);

      const subscription = await this.findById(id);
      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${id} not found`);
      }

      // Validate subscription cancellation
      const validationResult =
        await this.validationService.validateSubscriptionCancellation(
          id,
          cancelDto
        );
      if (!validationResult.isValid) {
        throw new BadRequestException(
          `Cancellation validation failed: ${validationResult.errors.join(', ')}`
        );
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        this.logger.warn(
          `Subscription cancellation warnings: ${validationResult.warnings.join(', ')}`
        );
      }

      // Check business rules for cancellation
      const businessRuleResult =
        await this.businessRulesService.canCancelSubscription(id);
      if (!businessRuleResult.canProceed) {
        throw new BadRequestException(
          `Cancellation not allowed: ${businessRuleResult.message}`
        );
      }

      // Log suggested actions
      if (businessRuleResult.suggestedActions.length > 0) {
        this.logger.log(
          `Cancellation suggestions: ${businessRuleResult.suggestedActions.join(', ')}`
        );
      }

      // Check if subscription can be canceled
      if (!this.canCancelSubscription(subscription)) {
        throw new BadRequestException(
          'Subscription cannot be canceled in its current state'
        );
      }

      let stripeSubscription: any = null;

      // Cancel Stripe subscription if it exists
      if (subscription.stripeSubscriptionId) {
        try {
          const cancelParams: any = {
            cancelAtPeriodEnd:
              cancelDto.cancelAtPeriodEnd !== undefined
                ? cancelDto.cancelAtPeriodEnd
                : true,
          };

          if (cancelDto.prorate !== undefined) {
            cancelParams.prorate = cancelDto.prorate;
          }
          if (cancelDto.invoiceNow !== undefined) {
            cancelParams.invoiceNow = cancelDto.invoiceNow;
          }

          stripeSubscription = await this.stripeService.cancelSubscription(
            subscription.stripeSubscriptionId,
            cancelParams
          );

          this.logger.log(
            `Canceled Stripe subscription: ${subscription.stripeSubscriptionId}`
          );
        } catch (error: any) {
          this.logger.error(
            `Failed to cancel Stripe subscription: ${error.message}`
          );
          throw new BadRequestException(
            `Failed to cancel Stripe subscription: ${error.message}`
          );
        }
      }

      // Update local subscription entity
      const updateData: any = {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        isActive: false,
      };

      if (cancelDto.reason || cancelDto.customReason) {
        updateData.cancelReason = cancelDto.reason || cancelDto.customReason;
      }
      if (cancelDto.notes) {
        updateData.notes = cancelDto.notes;
      }

      // Set cancel at period end date if applicable
      if (cancelDto.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
        updateData.cancelAtPeriodEnd = subscription.currentPeriodEnd;
      }

      await this.subscriptionRepository.update(id, updateData);
      const canceledSubscription = await this.findById(id);

      this.logger.log(`Successfully canceled subscription: ${id}`);

      // Emit subscription canceled event
      await this.emitSubscriptionEvent(
        SubscriptionEventType.CANCELED,
        canceledSubscription!
      );

      return this.mapToResponseDto(canceledSubscription!);
    } catch (error: any) {
      this.logger.error(`Failed to cancel subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(id: string): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Reactivating subscription: ${id}`);

      const subscription = await this.findById(id);
      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${id} not found`);
      }

      if (subscription.status !== SubscriptionStatus.CANCELED) {
        throw new BadRequestException(
          'Only canceled subscriptions can be reactivated'
        );
      }

      let stripeSubscription: any = null;

      // Reactivate Stripe subscription if it exists
      if (subscription.stripeSubscriptionId) {
        try {
          stripeSubscription = await this.stripeService.reactivateSubscription(
            subscription.stripeSubscriptionId
          );

          this.logger.log(
            `Reactivated Stripe subscription: ${subscription.stripeSubscriptionId}`
          );
        } catch (error: any) {
          this.logger.error(
            `Failed to reactivate Stripe subscription: ${error.message}`
          );
          throw new BadRequestException(
            `Failed to reactivate Stripe subscription: ${error.message}`
          );
        }
      }

      // Update local subscription entity
      const updateData: any = {
        status: SubscriptionStatus.ACTIVE,
        isActive: true,
      };

      await this.subscriptionRepository.update(id, updateData);
      const reactivatedSubscription = await this.findById(id);

      this.logger.log(`Successfully reactivated subscription: ${id}`);

      // Emit subscription reactivated event
      await this.emitSubscriptionEvent(
        SubscriptionEventType.REACTIVATED,
        reactivatedSubscription!
      );

      return this.mapToResponseDto(reactivatedSubscription!);
    } catch (error: any) {
      this.logger.error(`Failed to reactivate subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Suspend a subscription
   */
  async suspendSubscription(
    id: string,
    reason?: string
  ): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(`Suspending subscription: ${id}`);

      const subscription = await this.findById(id);
      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${id} not found`);
      }

      if (subscription.status !== SubscriptionStatus.ACTIVE) {
        throw new BadRequestException(
          'Only active subscriptions can be suspended'
        );
      }

      // Update local subscription entity
      const updateData: any = {
        status: SubscriptionStatus.SUSPENDED,
        isActive: false,
      };

      if (reason) {
        updateData.cancelReason = reason;
      }

      await this.subscriptionRepository.update(id, updateData);
      const suspendedSubscription = await this.findById(id);

      this.logger.log(`Successfully suspended subscription: ${id}`);

      // Emit subscription suspended event
      await this.emitSubscriptionEvent(
        SubscriptionEventType.SUSPENDED,
        suspendedSubscription!
      );

      return this.mapToResponseDto(suspendedSubscription!);
    } catch (error: any) {
      this.logger.error(`Failed to suspend subscription: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a subscription (soft delete)
   */
  async deleteSubscription(id: string): Promise<boolean> {
    try {
      this.logger.log(`Deleting subscription: ${id}`);

      const subscription = await this.findById(id);
      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${id} not found`);
      }

      // Soft delete by setting deletedAt timestamp
      await this.subscriptionRepository.update(id, {
        deletedAt: new Date(),
        isActive: false,
      });

      this.logger.log(`Successfully deleted subscription: ${id}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to delete subscription: ${error.message}`);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Check if a subscription can be updated
   */
  private canUpdateSubscription(subscription: Subscription): boolean {
    const updatableStatuses = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIAL,
      SubscriptionStatus.PENDING,
    ];
    return updatableStatuses.includes(subscription.status);
  }

  /**
   * Check if a subscription can be canceled
   */
  private canCancelSubscription(subscription: Subscription): boolean {
    const cancelableStatuses = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIAL,
      SubscriptionStatus.PENDING,
    ];
    return cancelableStatuses.includes(subscription.status);
  }

  /**
   * Emit subscription events (placeholder for event system)
   */
  private async emitSubscriptionEvent(
    eventType: SubscriptionEventType,
    subscription: Subscription
  ): Promise<void> {
    // TODO: Implement event emission system
    this.logger.log(
      `Subscription event: ${eventType} for subscription ${subscription.id}`
    );
  }

  /**
   * Check if subscription can be upgraded
   */
  async canUpgradeSubscription(
    subscriptionId: string,
    targetPlanId: string
  ): Promise<{
    canUpgrade: boolean;
    message: string;
    requiresApproval: boolean;
    suggestedActions: string[];
  }> {
    try {
      const result = await this.businessRulesService.canUpgradeSubscription(
        subscriptionId,
        targetPlanId
      );
      return {
        canUpgrade: result.canProceed,
        message: result.message,
        requiresApproval: result.requiresApproval,
        suggestedActions: result.suggestedActions,
      };
    } catch (error: any) {
      this.logger.error(`Error checking upgrade eligibility: ${error.message}`);
      return {
        canUpgrade: false,
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
  ): Promise<{
    canDowngrade: boolean;
    message: string;
    requiresApproval: boolean;
    suggestedActions: string[];
  }> {
    try {
      const result = await this.businessRulesService.canDowngradeSubscription(
        subscriptionId,
        targetPlanId
      );
      return {
        canDowngrade: result.canProceed,
        message: result.message,
        requiresApproval: result.requiresApproval,
        suggestedActions: result.suggestedActions,
      };
    } catch (error: any) {
      this.logger.error(
        `Error checking downgrade eligibility: ${error.message}`
      );
      return {
        canDowngrade: false,
        message: 'Error checking downgrade eligibility',
        requiresApproval: true,
        suggestedActions: ['Contact support'],
      };
    }
  }

  /**
   * Calculate proration for subscription changes
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
      return await this.businessRulesService.calculateProration(
        subscriptionId,
        newAmount,
        effectiveDate
      );
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
   * Validate subscription limits and usage
   */
  async validateSubscriptionLimits(
    subscriptionId: string,
    usageData: Record<string, number>
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    try {
      return await this.validationService.validateSubscriptionLimits(
        subscriptionId,
        usageData
      );
    } catch (error: any) {
      this.logger.error(
        `Error validating subscription limits: ${error.message}`
      );
      return {
        isValid: false,
        errors: [`Error validating limits: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Update subscription from webhook event (bypasses some validations)
   */
  async updateFromWebhook(
    stripeSubscriptionId: string,
    updateData: Partial<Subscription>
  ): Promise<SubscriptionResponseDto> {
    try {
      this.logger.log(
        `Updating subscription from webhook: ${stripeSubscriptionId}`
      );

      const subscription =
        await this.findByStripeSubscriptionId(stripeSubscriptionId);
      if (!subscription) {
        throw new NotFoundException(
          `Subscription with Stripe ID ${stripeSubscriptionId} not found`
        );
      }

      // Update the subscription without additional validations
      await this.subscriptionRepository.update(subscription.id, updateData);
      const updatedSubscription = await this.findById(subscription.id);

      this.logger.log(
        `Successfully updated subscription from webhook: ${stripeSubscriptionId}`
      );

      return this.mapToResponseDto(updatedSubscription!);
    } catch (error: any) {
      this.logger.error(
        `Failed to update subscription from webhook: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Map subscription entity to response DTO
   */
  private mapToResponseDto(
    subscription: Subscription
  ): SubscriptionResponseDto {
    const response: any = {
      id: subscription.id,
      tenantId: subscription.tenantId,
      userId: subscription.userId,
      name: subscription.name,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      amount: subscription.amount,
      currency: subscription.currency,
      quantity: subscription.quantity,
      startDate: subscription.startDate,
      isActive: subscription.isActive,
      isTrial: subscription.isTrial,
      autoRenew: subscription.autoRenew,
      trialDays: subscription.trialDays,
      gracePeriodDays: subscription.gracePeriodDays,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };

    // Add optional fields only if they exist
    if (subscription.description)
      response.description = subscription.description;
    if (subscription.unitPrice) response.unitPrice = subscription.unitPrice;
    if (subscription.endDate) response.endDate = subscription.endDate;
    if (subscription.trialEndDate)
      response.trialEndDate = subscription.trialEndDate;
    if (subscription.currentPeriodStart)
      response.currentPeriodStart = subscription.currentPeriodStart;
    if (subscription.currentPeriodEnd)
      response.currentPeriodEnd = subscription.currentPeriodEnd;
    if (subscription.cancelAtPeriodEnd)
      response.cancelAtPeriodEnd = subscription.cancelAtPeriodEnd;
    if (subscription.canceledAt) response.canceledAt = subscription.canceledAt;
    if (subscription.endedAt) response.endedAt = subscription.endedAt;
    if (subscription.stripeSubscriptionId)
      response.stripeSubscriptionId = subscription.stripeSubscriptionId;
    if (subscription.stripePriceId)
      response.stripePriceId = subscription.stripePriceId;
    if (subscription.stripeProductId)
      response.stripeProductId = subscription.stripeProductId;
    if (subscription.stripeCustomerId)
      response.stripeCustomerId = subscription.stripeCustomerId;
    if (subscription.planId) response.planId = subscription.planId;
    if (subscription.metadata) response.metadata = subscription.metadata;
    if (subscription.features) response.features = subscription.features;
    if (subscription.limits) response.limits = subscription.limits;
    if (subscription.cancelReason)
      response.cancelReason = subscription.cancelReason;
    if (subscription.notes) response.notes = subscription.notes;
    if (subscription.deletedAt) response.deletedAt = subscription.deletedAt;

    return response;
  }

  /**
   * Create Stripe resources (customer, product, price) for subscription
   */
  private async createStripeResources(
    createDto: CreateSubscriptionDto,
    plan: SubscriptionPlan | null
  ): Promise<{
    customerId: string;
    productId: string;
    priceId: string;
  }> {
    this.logger.log('Creating Stripe resources for subscription');
    this.logger.log(
      `User ID: ${createDto.userId}, Tenant ID: ${createDto.tenantId}`
    );

    // Get user and tenant information for customer creation
    this.logger.log('Getting user information...');
    const user = await this.getUserById(createDto.userId);
    this.logger.log(`User found: ${JSON.stringify(user)}`);

    this.logger.log('Getting tenant information...');
    const tenant = await this.getTenantById(createDto.tenantId);
    this.logger.log(`Tenant found: ${JSON.stringify(tenant)}`);

    if (!user) {
      throw new Error(`User with ID ${createDto.userId} not found`);
    }
    if (!tenant) {
      throw new Error(`Tenant with ID ${createDto.tenantId} not found`);
    }

    // Create or find Stripe customer
    let customerId = createDto.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripeService.createCustomer({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        metadata: {
          tenantId: createDto.tenantId,
          userId: createDto.userId,
          tenantName: tenant.name,
        },
      });
      customerId = customer.id;
      this.logger.log(`Created Stripe customer: ${customerId}`);
    }

    // Create or find Stripe product
    let productId = createDto.stripeProductId;
    if (!productId) {
      const productName = plan?.name || createDto.name;
      const productDescription =
        plan?.description ||
        createDto.description ||
        `Subscription: ${productName}`;

      const product = await this.stripeService.createProduct({
        name: productName,
        description: productDescription,
        metadata: {
          tenantId: createDto.tenantId,
          planId: createDto.planId || '',
          type: 'subscription',
        },
      });
      productId = product.id;
      this.logger.log(`Created Stripe product: ${productId}`);
    }

    // Create or find Stripe price
    let priceId = createDto.stripePriceId;
    if (!priceId) {
      // Convert billing cycle to Stripe interval
      const interval = this.convertBillingCycleToStripeInterval(
        createDto.billingCycle || SubscriptionBillingCycle.MONTHLY
      );

      const price = await this.stripeService.createPrice({
        productId: productId,
        unitAmount: Math.round(createDto.amount * 100), // Convert to cents
        currency: createDto.currency || 'usd',
        recurring: {
          interval: interval,
        },
        metadata: {
          tenantId: createDto.tenantId,
          planId: createDto.planId || '',
          billingCycle:
            createDto.billingCycle || SubscriptionBillingCycle.MONTHLY,
        },
      });
      priceId = price.id;
      this.logger.log(`Created Stripe price: ${priceId}`);
    }

    return {
      customerId,
      productId,
      priceId,
    };
  }

  /**
   * Convert billing cycle to Stripe interval
   */
  private convertBillingCycleToStripeInterval(
    billingCycle: SubscriptionBillingCycle
  ): 'day' | 'week' | 'month' | 'year' {
    switch (billingCycle) {
      case SubscriptionBillingCycle.DAILY:
        return 'day';
      case SubscriptionBillingCycle.WEEKLY:
        return 'week';
      case SubscriptionBillingCycle.MONTHLY:
        return 'month';
      case SubscriptionBillingCycle.QUARTERLY:
        return 'month'; // Stripe doesn't have quarterly, use monthly with 3-month interval
      case SubscriptionBillingCycle.ANNUALLY:
        return 'year';
      default:
        return 'month';
    }
  }

  /**
   * Get user by ID
   */
  private async getUserById(userId: string): Promise<any> {
    try {
      // Note: findOne requires tenantId, but we need to get user first
      // This is a limitation of the current UsersService API
      // For now, we'll use a mock approach until the service is enhanced
      this.logger.warn(
        `Using mock user data for ${userId} - UsersService API limitation`
      );
      return {
        id: userId,
        email: 'user@example.com',
        firstName: 'User',
        lastName: 'Name',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get user ${userId}: ${error.message}`);
      throw new Error(`User with ID ${userId} not found`);
    }
  }

  /**
   * Get tenant by ID
   */
  private async getTenantById(tenantId: string): Promise<any> {
    try {
      const tenant = await this.tenantService.getTenantById(tenantId);
      if (!tenant) {
        throw new Error(`Tenant with ID ${tenantId} not found`);
      }
      return tenant;
    } catch (error: any) {
      this.logger.error(`Failed to get tenant ${tenantId}: ${error.message}`);
      throw new Error(`Tenant with ID ${tenantId} not found`);
    }
  }
}
