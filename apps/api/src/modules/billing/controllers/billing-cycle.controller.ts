import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BillingCycleService } from '../services/billing-cycle.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { BillingCycle } from '@app/shared';

@Controller('billing/cycles')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BillingCycleController {
  constructor(private readonly billingCycleService: BillingCycleService) {}

  @Post()
  async createBillingCycle(
    @Request() req: any,
    @Body()
    body: {
      subscriptionId?: string;
      cycleType: BillingCycle;
      startDate: string;
      endDate: string;
      billingDate: string;
      metadata?: Record<string, any>;
    }
  ) {
    const tenantId = req.user.tenantId;
    const billingCycle = await this.billingCycleService.createBillingCycle(
      tenantId,
      {
        ...body,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        billingDate: new Date(body.billingDate),
      }
    );

    return {
      success: true,
      data: billingCycle,
      message: 'Billing cycle created successfully',
    };
  }

  @Get()
  async getBillingCycles(@Request() req: any, @Query('limit') limit?: number) {
    const tenantId = req.user.tenantId;
    const billingCycles =
      await this.billingCycleService.getBillingCyclesByTenant(tenantId, limit);

    return {
      success: true,
      data: billingCycles,
    };
  }

  @Get('upcoming')
  async getUpcomingBillingCycles(
    @Request() req: any,
    @Query('days') days?: number
  ) {
    const tenantId = req.user.tenantId;
    const billingCycles =
      await this.billingCycleService.getUpcomingBillingCycles(tenantId, days);

    return {
      success: true,
      data: billingCycles,
    };
  }

  @Get('subscription/:subscriptionId')
  async getBillingCyclesBySubscription(
    @Param('subscriptionId') subscriptionId: string
  ) {
    const billingCycles =
      await this.billingCycleService.getBillingCyclesBySubscription(
        subscriptionId
      );

    return {
      success: true,
      data: billingCycles,
    };
  }

  @Post(':id/process')
  async processBillingCycle(@Param('id') id: string) {
    const billingCycle = await this.billingCycleService.processBillingCycle(id);

    return {
      success: true,
      data: billingCycle,
      message: 'Billing cycle processed successfully',
    };
  }

  @Put(':id/status')
  async updateBillingCycleStatus(
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    const billingCycle =
      await this.billingCycleService.updateBillingCycleStatus(
        id,
        body.status as any
      );

    return {
      success: true,
      data: billingCycle,
      message: 'Billing cycle status updated successfully',
    };
  }

  @Post(':id/cancel')
  async cancelBillingCycle(@Param('id') id: string) {
    const billingCycle = await this.billingCycleService.cancelBillingCycle(id);

    return {
      success: true,
      data: billingCycle,
      message: 'Billing cycle cancelled successfully',
    };
  }

  @Post('schedule-recurring')
  async scheduleRecurringBilling(
    @Request() req: any,
    @Body()
    body: {
      subscriptionId: string;
      cycleType: BillingCycle;
    }
  ) {
    const tenantId = req.user.tenantId;
    await this.billingCycleService.scheduleRecurringBilling(
      tenantId,
      body.subscriptionId,
      body.cycleType
    );

    return {
      success: true,
      message: 'Recurring billing scheduled successfully',
    };
  }
}

