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
import { UsageBillingService } from '../services/usage-billing.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards';

@Controller('billing/usage')
@UseGuards(JwtAuthGuard, TenantGuard)
export class UsageBillingController {
  constructor(private readonly usageBillingService: UsageBillingService) {}

  @Post()
  async createUsageBilling(
    @Request() req: any,
    @Body()
    body: {
      subscriptionId: string;
      billingPeriod: {
        startDate: string;
        endDate: string;
      };
    }
  ) {
    const tenantId = req.user.tenantId;
    const usageBilling = await this.usageBillingService.createUsageBilling(
      tenantId,
      body.subscriptionId,
      {
        startDate: new Date(body.billingPeriod.startDate),
        endDate: new Date(body.billingPeriod.endDate),
      }
    );

    return {
      success: true,
      data: usageBilling,
      message: 'Usage billing created successfully',
    };
  }

  @Get()
  async getUsageBilling(
    @Request() req: any,
    @Query()
    query: {
      startDate?: string;
      endDate?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const tenantId = req.user.tenantId;
    const result = await this.usageBillingService.getUsageBillingByTenant(
      tenantId,
      {
        ...(query.startDate && { startDate: new Date(query.startDate) }),
        ...(query.endDate && { endDate: new Date(query.endDate) }),
        ...(query.status && { status: query.status as any }),
        ...(query.limit && { limit: query.limit }),
        ...(query.offset && { offset: query.offset }),
      }
    );

    return {
      success: true,
      data: result.usageBilling,
      pagination: {
        total: result.total,
        limit: query.limit || 50,
        offset: query.offset || 0,
      },
    };
  }

  @Get(':id')
  async getUsageBillingById(@Param('id') id: string) {
    const usageBilling = await this.usageBillingService.getUsageBillingById(id);

    return {
      success: true,
      data: usageBilling,
    };
  }

  @Get('subscription/:subscriptionId')
  async getUsageBillingBySubscription(
    @Param('subscriptionId') subscriptionId: string,
    @Query('limit') limit?: number
  ) {
    const usageBilling =
      await this.usageBillingService.getUsageBillingBySubscription(
        subscriptionId,
        limit
      );

    return {
      success: true,
      data: usageBilling,
    };
  }

  @Put(':id/status')
  async updateUsageBillingStatus(
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    const usageBilling =
      await this.usageBillingService.updateUsageBillingStatus(
        id,
        body.status as any
      );

    return {
      success: true,
      data: usageBilling,
      message: 'Usage billing status updated successfully',
    };
  }

  @Post(':id/link-invoice')
  async linkToInvoice(
    @Param('id') id: string,
    @Body() body: { invoiceId: string }
  ) {
    const usageBilling = await this.usageBillingService.linkToInvoice(
      id,
      body.invoiceId
    );

    return {
      success: true,
      data: usageBilling,
      message: 'Usage billing linked to invoice successfully',
    };
  }

  @Get('analytics/summary')
  async getUsageBillingAnalytics(
    @Request() req: any,
    @Query()
    query: {
      startDate?: string;
      endDate?: string;
    }
  ) {
    const tenantId = req.user.tenantId;
    const analytics = await this.usageBillingService.getUsageBillingAnalytics(
      tenantId,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined
    );

    return {
      success: true,
      data: analytics,
    };
  }
}
