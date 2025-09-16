import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { BillingAnalyticsService } from '../services/billing-analytics.service';
import { BillingAnalyticsQueryDto, BillingReportDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';

@Controller('billing/analytics')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BillingAnalyticsController {
  constructor(
    private readonly billingAnalyticsService: BillingAnalyticsService
  ) {}

  @Get()
  async getBillingAnalytics(
    @Request() req: any,
    @Query() query: BillingAnalyticsQueryDto
  ) {
    const tenantId = req.user.tenantId;
    const analytics = await this.billingAnalyticsService.getBillingAnalytics(
      tenantId,
      query
    );

    return {
      success: true,
      data: analytics,
    };
  }

  @Get('revenue')
  async getRevenueAnalytics(
    @Request() req: any,
    @Query() query: BillingAnalyticsQueryDto
  ) {
    const tenantId = req.user.tenantId;
    const analytics = await this.billingAnalyticsService.getBillingAnalytics(
      tenantId,
      query
    );

    return {
      success: true,
      data: {
        totalRevenue: analytics.totalRevenue,
        revenueByPeriod: analytics.revenueByPeriod,
        averageInvoiceAmount: analytics.averageInvoiceAmount,
      },
    };
  }

  @Get('invoices')
  async getInvoiceAnalytics(
    @Request() req: any,
    @Query() query: BillingAnalyticsQueryDto
  ) {
    const tenantId = req.user.tenantId;
    const analytics = await this.billingAnalyticsService.getBillingAnalytics(
      tenantId,
      query
    );

    return {
      success: true,
      data: {
        totalInvoices: analytics.totalInvoices,
        paidInvoices: analytics.paidInvoices,
        overdueInvoices: analytics.overdueInvoices,
        averagePaymentTime: analytics.averagePaymentTime,
      },
    };
  }

  @Get('customers')
  async getCustomerAnalytics(
    @Request() req: any,
    @Query() query: BillingAnalyticsQueryDto
  ) {
    const tenantId = req.user.tenantId;
    const analytics = await this.billingAnalyticsService.getBillingAnalytics(
      tenantId,
      query
    );

    return {
      success: true,
      data: {
        topCustomers: analytics.topCustomers,
      },
    };
  }

  @Get('payment-methods')
  async getPaymentMethodAnalytics(
    @Request() req: any,
    @Query() query: BillingAnalyticsQueryDto
  ) {
    const tenantId = req.user.tenantId;
    const analytics = await this.billingAnalyticsService.getBillingAnalytics(
      tenantId,
      query
    );

    return {
      success: true,
      data: {
        paymentMethods: analytics.paymentMethods,
      },
    };
  }
}

