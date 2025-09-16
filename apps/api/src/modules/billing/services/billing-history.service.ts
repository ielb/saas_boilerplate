import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BillingHistory } from '../entities';
import { BillingStatus, BillingType } from '@app/shared';

@Injectable()
export class BillingHistoryService {
  private readonly logger = new Logger(BillingHistoryService.name);

  constructor(
    @InjectRepository(BillingHistory)
    private readonly billingHistoryRepository: Repository<BillingHistory>
  ) {}

  async createBillingHistory(
    tenantId: string,
    data: {
      type: BillingType;
      description: string;
      amount: number;
      currency: string;
      status?: BillingStatus;
      referenceId?: string;
      referenceType?: string;
      invoiceId?: string;
      paymentId?: string;
      subscriptionId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<BillingHistory> {
    const billingHistory = this.billingHistoryRepository.create({
      ...data,
      tenantId,
      status: data.status || BillingStatus.PENDING,
    });

    const savedHistory =
      await this.billingHistoryRepository.save(billingHistory);

    this.logger.log(`Created billing history record: ${savedHistory.id}`);
    return savedHistory;
  }

  async getBillingHistoryByTenant(
    tenantId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      type?: BillingType;
      status?: BillingStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ history: BillingHistory[]; total: number }> {
    const {
      startDate,
      endDate,
      type,
      status,
      limit = 50,
      offset = 0,
    } = options;

    const queryBuilder = this.billingHistoryRepository
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.invoice', 'invoice')
      .leftJoinAndSelect('history.payment', 'payment')
      .leftJoinAndSelect('history.subscription', 'subscription')
      .where('history.tenantId = :tenantId', { tenantId });

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'history.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        }
      );
    }

    if (type) {
      queryBuilder.andWhere('history.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('history.status = :status', { status });
    }

    const [history, total] = await queryBuilder
      .orderBy('history.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { history, total };
  }

  async getBillingHistoryBySubscription(
    subscriptionId: string
  ): Promise<BillingHistory[]> {
    return this.billingHistoryRepository.find({
      where: { subscriptionId },
      relations: ['invoice', 'payment', 'subscription'],
      order: { createdAt: 'DESC' },
    });
  }

  async getBillingHistoryByInvoice(
    invoiceId: string
  ): Promise<BillingHistory[]> {
    return this.billingHistoryRepository.find({
      where: { invoiceId },
      relations: ['invoice', 'payment', 'subscription'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateBillingHistoryStatus(
    id: string,
    status: BillingStatus,
    processedAt?: Date
  ): Promise<BillingHistory> {
    const history = await this.billingHistoryRepository.findOne({
      where: { id },
    });

    if (!history) {
      throw new Error(`Billing history with ID ${id} not found`);
    }

    history.status = status;
    if (processedAt) {
      history.processedAt = processedAt;
    }

    const updatedHistory = await this.billingHistoryRepository.save(history);

    this.logger.log(`Updated billing history status: ${id} -> ${status}`);
    return updatedHistory;
  }

  async getBillingSummary(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netRevenue: number;
    transactionCount: number;
    averageTransactionAmount: number;
  }> {
    const dateFilter = startDate && endDate ? Between(startDate, endDate) : {};

    const [revenueResult, expenseResult, countResult] = await Promise.all([
      this.billingHistoryRepository
        .createQueryBuilder('history')
        .select('SUM(history.amount)', 'total')
        .where('history.tenantId = :tenantId', { tenantId })
        .andWhere('history.type IN (:...revenueTypes)', {
          revenueTypes: [
            BillingType.SUBSCRIPTION,
            BillingType.USAGE,
            BillingType.ONE_TIME,
          ],
        })
        .andWhere('history.status = :status', { status: BillingStatus.PENDING })
        .andWhere(dateFilter)
        .getRawOne(),

      this.billingHistoryRepository
        .createQueryBuilder('history')
        .select('SUM(history.amount)', 'total')
        .where('history.tenantId = :tenantId', { tenantId })
        .andWhere('history.type IN (:...expenseTypes)', {
          expenseTypes: [BillingType.REFUND, BillingType.ADJUSTMENT],
        })
        .andWhere('history.status = :status', { status: BillingStatus.PENDING })
        .andWhere(dateFilter)
        .getRawOne(),

      this.billingHistoryRepository.count({
        where: {
          tenantId,
          ...dateFilter,
        },
      }),
    ]);

    const totalRevenue = parseFloat(revenueResult?.total || '0');
    const totalExpenses = parseFloat(expenseResult?.total || '0');
    const netRevenue = totalRevenue - totalExpenses;
    const transactionCount = countResult;
    const averageTransactionAmount =
      transactionCount > 0
        ? (totalRevenue + totalExpenses) / transactionCount
        : 0;

    return {
      totalRevenue,
      totalExpenses,
      netRevenue,
      transactionCount,
      averageTransactionAmount,
    };
  }

  async recordInvoicePayment(
    invoiceId: string,
    paymentId: string,
    amount: number,
    currency: string
  ): Promise<BillingHistory> {
    return this.createBillingHistory('', {
      // tenantId would be resolved from invoice
      type: BillingType.SUBSCRIPTION,
      description: 'Invoice payment received',
      amount,
      currency,
      status: BillingStatus.PENDING,
      referenceId: paymentId,
      referenceType: 'payment',
      invoiceId,
      paymentId,
      metadata: {
        paymentAmount: amount,
        paymentCurrency: currency,
      },
    });
  }

  async recordRefund(
    invoiceId: string,
    amount: number,
    currency: string,
    reason?: string
  ): Promise<BillingHistory> {
    return this.createBillingHistory('', {
      // tenantId would be resolved from invoice
      type: BillingType.REFUND,
      description: `Refund processed${reason ? `: ${reason}` : ''}`,
      amount: -amount, // Negative amount for refunds
      currency,
      status: BillingStatus.PENDING,
      referenceId: invoiceId,
      referenceType: 'invoice',
      invoiceId,
      metadata: {
        refundAmount: amount,
        refundCurrency: currency,
        refundReason: reason,
      },
    });
  }

  async recordAdjustment(
    tenantId: string,
    amount: number,
    currency: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<BillingHistory> {
    return this.createBillingHistory(tenantId, {
      type: BillingType.ADJUSTMENT,
      description,
      amount,
      currency,
      status: BillingStatus.PENDING,
      ...(metadata && { metadata }),
    });
  }

  async deleteBillingHistory(id: string): Promise<void> {
    const history = await this.billingHistoryRepository.findOne({
      where: { id },
    });

    if (!history) {
      throw new Error(`Billing history with ID ${id} not found`);
    }

    await this.billingHistoryRepository.remove(history);

    this.logger.log(`Deleted billing history record: ${id}`);
  }
}
