import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  SubscriptionResponseDto,
} from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { CurrentUser } from '../../../common/decorators/auth.decorator';
import { User } from '../../users/entities/user.entity';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Create a new subscription
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @Body() createDto: CreateSubscriptionDto,
    @CurrentUser() user: User
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.createSubscription(createDto);
  }

  /**
   * Get all subscriptions for the current tenant
   */
  @Get()
  async getSubscriptions(
    @Query('tenantId') tenantId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string
  ): Promise<SubscriptionResponseDto[]> {
    let subscriptions;

    if (tenantId) {
      subscriptions = await this.subscriptionService.findByTenantId(tenantId);
    } else if (userId) {
      subscriptions = await this.subscriptionService.findByUserId(userId);
    } else {
      subscriptions = await this.subscriptionService.findAll();
    }

    // Filter by status if provided
    if (status) {
      subscriptions = subscriptions.filter(sub => sub.status === status);
    }

    return subscriptions.map(sub =>
      this.subscriptionService['mapToResponseDto'](sub)
    );
  }

  /**
   * Get a specific subscription by ID
   */
  @Get(':id')
  async getSubscription(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionService.findById(id);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    return this.subscriptionService['mapToResponseDto'](subscription);
  }

  /**
   * Update a subscription
   */
  @Put(':id')
  async updateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.updateSubscription(id, updateDto);
  }

  /**
   * Cancel a subscription
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: CancelSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.cancelSubscription(id, cancelDto);
  }

  /**
   * Reactivate a canceled subscription
   */
  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateSubscription(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.reactivateSubscription(id);
  }

  /**
   * Suspend a subscription
   */
  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionService.suspendSubscription(id, reason);
  }

  /**
   * Delete a subscription (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubscription(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<void> {
    await this.subscriptionService.deleteSubscription(id);
  }

  /**
   * Get subscription by Stripe subscription ID
   */
  @Get('stripe/:stripeSubscriptionId')
  async getSubscriptionByStripeId(
    @Param('stripeSubscriptionId') stripeSubscriptionId: string
  ): Promise<SubscriptionResponseDto> {
    const subscription =
      await this.subscriptionService.findByStripeSubscriptionId(
        stripeSubscriptionId
      );
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    return this.subscriptionService['mapToResponseDto'](subscription);
  }

  /**
   * Check if subscription can be upgraded
   */
  @Get(':id/can-upgrade/:targetPlanId')
  @ApiOperation({
    summary: 'Check if subscription can be upgraded to target plan',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiParam({ name: 'targetPlanId', description: 'Target plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upgrade eligibility checked',
  })
  async canUpgrade(
    @Param('id') id: string,
    @Param('targetPlanId') targetPlanId: string
  ): Promise<{
    canUpgrade: boolean;
    message: string;
    requiresApproval: boolean;
    suggestedActions: string[];
  }> {
    return await this.subscriptionService.canUpgradeSubscription(
      id,
      targetPlanId
    );
  }

  /**
   * Check if subscription can be downgraded
   */
  @Get(':id/can-downgrade/:targetPlanId')
  @ApiOperation({
    summary: 'Check if subscription can be downgraded to target plan',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiParam({ name: 'targetPlanId', description: 'Target plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Downgrade eligibility checked',
  })
  async canDowngrade(
    @Param('id') id: string,
    @Param('targetPlanId') targetPlanId: string
  ): Promise<{
    canDowngrade: boolean;
    message: string;
    requiresApproval: boolean;
    suggestedActions: string[];
  }> {
    return await this.subscriptionService.canDowngradeSubscription(
      id,
      targetPlanId
    );
  }

  /**
   * Calculate proration for subscription changes
   */
  @Post(':id/calculate-proration')
  @ApiOperation({ summary: 'Calculate proration for subscription changes' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newAmount: { type: 'number', description: 'New subscription amount' },
        effectiveDate: {
          type: 'string',
          format: 'date-time',
          description: 'Effective date for changes',
        },
      },
      required: ['newAmount'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Proration calculated',
  })
  async calculateProration(
    @Param('id') id: string,
    @Body() body: { newAmount: number; effectiveDate?: string }
  ): Promise<{
    prorationAmount: number;
    creditAmount: number;
    chargeAmount: number;
  }> {
    const effectiveDate = body.effectiveDate
      ? new Date(body.effectiveDate)
      : undefined;
    return await this.subscriptionService.calculateProration(
      id,
      body.newAmount,
      effectiveDate
    );
  }

  /**
   * Validate subscription limits and usage
   */
  @Post(':id/validate-limits')
  @ApiOperation({ summary: 'Validate subscription limits and usage' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        usageData: {
          type: 'object',
          description: 'Usage data to validate against limits',
          additionalProperties: { type: 'number' },
        },
      },
      required: ['usageData'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Limits validation completed',
  })
  async validateLimits(
    @Param('id') id: string,
    @Body() body: { usageData: Record<string, number> }
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    return await this.subscriptionService.validateSubscriptionLimits(
      id,
      body.usageData
    );
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
