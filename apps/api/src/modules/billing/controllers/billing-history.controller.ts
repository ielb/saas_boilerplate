import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { BillingHistoryService } from '../services/billing-history.service';
import { BillingHistory } from '../entities';
import { BillingStatus, BillingType } from '@app/shared';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards';
import { User } from '../../users/entities/user.entity';

export class CreateBillingHistoryDto {
  type!: BillingType;
  description!: string;
  amount!: number;
  currency!: string;
  status?: BillingStatus;
  referenceId?: string;
  referenceType?: string;
  invoiceId?: string;
  paymentId?: string;
  subscriptionId?: string;
  metadata?: Record<string, any>;
}

export class UpdateBillingHistoryStatusDto {
  status!: BillingStatus;
  processedAt?: Date;
}

export class RecordRefundDto {
  invoiceId!: string;
  amount!: number;
  currency!: string;
  reason?: string;
}

export class RecordAdjustmentDto {
  amount!: number;
  currency!: string;
  description!: string;
  metadata?: Record<string, any>;
}

export class BillingHistoryQueryDto {
  startDate?: string;
  endDate?: string;
  type?: BillingType;
  status?: BillingStatus;
  limit?: number;
  offset?: number;
}

@Controller('billing-history')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BillingHistoryController {
  constructor(private readonly billingHistoryService: BillingHistoryService) {}

  @Post()
  async createBillingHistory(
    @Request() req: any,
    @Body() createBillingHistoryDto: CreateBillingHistoryDto
  ): Promise<BillingHistory> {
    const tenantId = req.user.tenantId;
    return this.billingHistoryService.createBillingHistory(
      tenantId,
      createBillingHistoryDto
    );
  }

  @Get()
  async getBillingHistoryByTenant(
    @Request() req: any,
    @Query() query: BillingHistoryQueryDto
  ): Promise<{ history: BillingHistory[]; total: number }> {
    const tenantId = req.user.tenantId;
    const options = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      type: query.type,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    };

    return this.billingHistoryService.getBillingHistoryByTenant(
      tenantId,
      options as {
        startDate?: Date;
        endDate?: Date;
        type?: BillingType;
        status?: BillingStatus;
        limit?: number;
        offset?: number;
      }
    );
  }

  @Get('subscription/:subscriptionId')
  async getBillingHistoryBySubscription(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string
  ): Promise<BillingHistory[]> {
    return this.billingHistoryService.getBillingHistoryBySubscription(
      subscriptionId
    );
  }

  @Get('invoice/:invoiceId')
  async getBillingHistoryByInvoice(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string
  ): Promise<BillingHistory[]> {
    return this.billingHistoryService.getBillingHistoryByInvoice(invoiceId);
  }

  @Get('summary')
  async getBillingSummary(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netRevenue: number;
    transactionCount: number;
    averageTransactionAmount: number;
  }> {
    const tenantId = req.user.tenantId;
    return this.billingHistoryService.getBillingSummary(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
  }

  @Put(':id/status')
  async updateBillingHistoryStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateBillingHistoryStatusDto
  ): Promise<BillingHistory> {
    return this.billingHistoryService.updateBillingHistoryStatus(
      id,
      updateStatusDto.status,
      updateStatusDto.processedAt
    );
  }

  @Post('payment')
  async recordInvoicePayment(
    @Body()
    paymentData: {
      invoiceId: string;
      paymentId: string;
      amount: number;
      currency: string;
    }
  ): Promise<BillingHistory> {
    return this.billingHistoryService.recordInvoicePayment(
      paymentData.invoiceId,
      paymentData.paymentId,
      paymentData.amount,
      paymentData.currency
    );
  }

  @Post('refund')
  async recordRefund(
    @Body() refundDto: RecordRefundDto
  ): Promise<BillingHistory> {
    return this.billingHistoryService.recordRefund(
      refundDto.invoiceId,
      refundDto.amount,
      refundDto.currency,
      refundDto.reason
    );
  }

  @Post('adjustment')
  async recordAdjustment(
    @Request() req: any,
    @Body() adjustmentDto: RecordAdjustmentDto
  ): Promise<BillingHistory> {
    const tenantId = req.user.tenantId;
    return this.billingHistoryService.recordAdjustment(
      tenantId,
      adjustmentDto.amount,
      adjustmentDto.currency,
      adjustmentDto.description,
      adjustmentDto.metadata
    );
  }

  @Delete(':id')
  async deleteBillingHistory(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{ message: string }> {
    await this.billingHistoryService.deleteBillingHistory(id);
    return { message: 'Billing history record deleted successfully' };
  }
}
