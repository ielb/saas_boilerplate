import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { SubscriptionService } from '../services/subscription.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { Public } from '../../../common/decorators/auth.decorator';
import { ApiOperation, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SubscriptionPlanType, SubscriptionBillingCycle } from '@app/shared';

@Controller('subscription-plans')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SubscriptionPlansController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Health check endpoint
   */
  @Get('health')
  @Public() // No authentication required for health check
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get popular subscription plans
   */
  @Get('popular/plans')
  @ApiOperation({ summary: 'Get popular subscription plans' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Popular subscription plans retrieved successfully',
    type: [SubscriptionPlan],
  })
  async getPopularPlans(): Promise<SubscriptionPlan[]> {
    return this.subscriptionService.getPopularPlans();
  }

  /**
   * Get all available subscription plans
   */
  @Get()
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'planType',
    required: false,
    description: 'Filter by plan type',
  })
  @ApiQuery({
    name: 'billingCycle',
    required: false,
    description: 'Filter by billing cycle',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription plans retrieved successfully',
    type: [SubscriptionPlan],
  })
  async getSubscriptionPlans(
    @Query('isActive') isActive?: boolean,
    @Query('planType') planType?: SubscriptionPlanType,
    @Query('billingCycle') billingCycle?: SubscriptionBillingCycle
  ): Promise<SubscriptionPlan[]> {
    return this.subscriptionService.getSubscriptionPlans({
      ...(isActive !== undefined && { isActive }),
      ...(planType && { planType }),
      ...(billingCycle && { billingCycle }),
    });
  }

  /**
   * Get a specific subscription plan by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get subscription plan by ID' })
  @ApiParam({ name: 'id', description: 'Subscription plan ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription plan retrieved successfully',
    type: SubscriptionPlan,
  })
  async getSubscriptionPlan(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<SubscriptionPlan> {
    return this.subscriptionService.getSubscriptionPlan(id);
  }
}
