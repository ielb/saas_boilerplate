import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BillingPortalService } from '../services/billing-portal.service';
import {
  BillingPortalQueryDto,
  UpdatePaymentMethodDto,
  CancelSubscriptionDto,
  BillingPortalSummaryDto,
  PaginatedInvoicesDto,
  BillingPortalSubscriptionDto,
  BillingPortalPaymentMethodDto,
  BillingPortalSuccessDto,
  DownloadUrlDto,
} from '../dto/billing-portal.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';

@Controller('billing/portal')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BillingPortalController {
  constructor(private readonly billingPortalService: BillingPortalService) {}

  /**
   * Get billing portal dashboard summary
   */
  @Get('summary')
  async getBillingSummary(
    @Request() req: any
  ): Promise<{ success: boolean; data: BillingPortalSummaryDto }> {
    const { tenantId, userId } = req.user;

    const summary = await this.billingPortalService.getBillingSummary(
      tenantId,
      userId
    );

    return {
      success: true,
      data: summary,
    };
  }

  /**
   * Get customer's invoices with pagination
   */
  @Get('invoices')
  async getCustomerInvoices(
    @Request() req: any,
    @Query() query: BillingPortalQueryDto
  ): Promise<{ success: boolean; data: PaginatedInvoicesDto }> {
    const { tenantId, userId } = req.user;

    const result = await this.billingPortalService.getCustomerInvoices(
      tenantId,
      userId,
      query
    );

    const { page = 1, limit = 10 } = query;
    const totalPages = Math.ceil(result.total / limit);

    return {
      success: true,
      data: {
        ...result,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Get invoice download URL
   */
  @Get('invoices/:invoiceId/download')
  async getInvoiceDownloadUrl(
    @Request() req: any,
    @Param('invoiceId') invoiceId: string
  ): Promise<{ success: boolean; data: DownloadUrlDto }> {
    const { tenantId, userId } = req.user;

    const downloadUrl = await this.billingPortalService.getInvoiceDownloadUrl(
      tenantId,
      userId,
      invoiceId
    );

    return {
      success: true,
      data: {
        downloadUrl,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
      },
    };
  }

  /**
   * Get customer's subscriptions
   */
  @Get('subscriptions')
  async getCustomerSubscriptions(
    @Request() req: any
  ): Promise<{ success: boolean; data: BillingPortalSubscriptionDto[] }> {
    const { tenantId, userId } = req.user;

    const subscriptions =
      await this.billingPortalService.getCustomerSubscriptions(
        tenantId,
        userId
      );

    return {
      success: true,
      data: subscriptions,
    };
  }

  /**
   * Request subscription cancellation
   */
  @Post('subscriptions/:subscriptionId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @Request() req: any,
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: CancelSubscriptionDto
  ): Promise<{ success: boolean; message: string }> {
    const { tenantId, userId } = req.user;

    await this.billingPortalService.requestSubscriptionCancellation(
      tenantId,
      userId,
      subscriptionId,
      body.reason
    );

    return {
      success: true,
      message:
        'Subscription scheduled for cancellation at the end of current billing period',
    };
  }

  /**
   * Reactivate cancelled subscription
   */
  @Post('subscriptions/:subscriptionId/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateSubscription(
    @Request() req: any,
    @Param('subscriptionId') subscriptionId: string
  ): Promise<{ success: boolean; message: string }> {
    const { tenantId, userId } = req.user;

    await this.billingPortalService.reactivateSubscription(
      tenantId,
      userId,
      subscriptionId
    );

    return {
      success: true,
      message: 'Subscription cancellation has been revoked',
    };
  }

  /**
   * Get customer's payment methods
   */
  @Get('payment-methods')
  async getCustomerPaymentMethods(
    @Request() req: any
  ): Promise<{ success: boolean; data: BillingPortalPaymentMethodDto[] }> {
    const { tenantId, userId } = req.user;

    const paymentMethods =
      await this.billingPortalService.getCustomerPaymentMethods(
        tenantId,
        userId
      );

    return {
      success: true,
      data: paymentMethods,
    };
  }

  /**
   * Set default payment method
   */
  @Put('payment-methods/:paymentMethodId/default')
  @HttpCode(HttpStatus.OK)
  async setDefaultPaymentMethod(
    @Request() req: any,
    @Param('paymentMethodId') paymentMethodId: string
  ): Promise<{ success: boolean; message: string }> {
    const { tenantId, userId } = req.user;

    await this.billingPortalService.setDefaultPaymentMethod(
      tenantId,
      userId,
      paymentMethodId
    );

    return {
      success: true,
      message: 'Default payment method updated successfully',
    };
  }

  /**
   * Delete payment method
   */
  @Delete('payment-methods/:paymentMethodId')
  @HttpCode(HttpStatus.OK)
  async deletePaymentMethod(
    @Request() req: any,
    @Param('paymentMethodId') paymentMethodId: string
  ): Promise<{ success: boolean; message: string }> {
    const { tenantId, userId } = req.user;

    await this.billingPortalService.deletePaymentMethod(
      tenantId,
      userId,
      paymentMethodId
    );

    return {
      success: true,
      message: 'Payment method deleted successfully',
    };
  }
}
