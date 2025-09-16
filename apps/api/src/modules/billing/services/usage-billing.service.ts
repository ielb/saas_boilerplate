import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UsageBilling, UsageBillingRecord } from '../entities';
import { BillingStatus } from '@app/shared';
import { SubscriptionUsage } from '../../subscriptions/entities/subscription-usage.entity';

@Injectable()
export class UsageBillingService {
  private readonly logger = new Logger(UsageBillingService.name);

  constructor(
    @InjectRepository(UsageBilling)
    private readonly usageBillingRepository: Repository<UsageBilling>,
    @InjectRepository(UsageBillingRecord)
    private readonly usageBillingRecordRepository: Repository<UsageBillingRecord>,
    @InjectRepository(SubscriptionUsage)
    private readonly subscriptionUsageRepository: Repository<SubscriptionUsage>
  ) {}

  async createUsageBilling(
    tenantId: string,
    subscriptionId: string,
    billingPeriod: {
      startDate: Date;
      endDate: Date;
    }
  ): Promise<UsageBilling> {
    // Get usage records for the billing period
    const usageRecords = await this.subscriptionUsageRepository.find({
      where: {
        subscriptionId,
        recordedAt: Between(billingPeriod.startDate, billingPeriod.endDate),
      },
    });

    if (usageRecords.length === 0) {
      throw new Error('No usage records found for the specified period');
    }

    // Group usage by metric type and calculate totals
    const usageByMetric = this.groupUsageByMetric(usageRecords);

    // Create usage billing record
    const usageBilling = this.usageBillingRepository.create({
      tenantId,
      subscriptionId,
      billingPeriod,
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      currency: 'USD',
      status: BillingStatus.PENDING,
    });

    const savedUsageBilling =
      await this.usageBillingRepository.save(usageBilling);

    // Create individual usage billing records
    const usageBillingRecords = Object.entries(usageByMetric).map(
      ([metricType, records]) => {
        const totalQuantity = records.reduce(
          (sum, record) => sum + record.quantity,
          0
        );
        const averageUnitPrice =
          records.reduce((sum, record) => sum + (record.unitPrice || 0), 0) /
          records.length;
        const totalAmount = totalQuantity * averageUnitPrice;

        return this.usageBillingRecordRepository.create({
          usageBillingId: savedUsageBilling.id,
          metricType,
          metricName: records[0]?.metricName || 'Unknown',
          quantity: totalQuantity,
          unitPrice: averageUnitPrice,
          amount: totalAmount,
          currency: 'USD',
          metadata: {
            recordCount: records.length,
            periodStart: billingPeriod.startDate,
            periodEnd: billingPeriod.endDate,
          },
        });
      }
    );

    await this.usageBillingRecordRepository.save(usageBillingRecords);

    // Calculate totals
    const subtotal = usageBillingRecords.reduce(
      (sum, record) => sum + record.amount,
      0
    );
    const taxAmount = subtotal * 0.1; // 10% tax rate - this should be configurable
    const totalAmount = subtotal + taxAmount;

    // Update usage billing with totals
    savedUsageBilling.subtotal = subtotal;
    savedUsageBilling.taxAmount = taxAmount;
    savedUsageBilling.totalAmount = totalAmount;

    const updatedUsageBilling =
      await this.usageBillingRepository.save(savedUsageBilling);

    this.logger.log(
      `Created usage billing for subscription ${subscriptionId}: $${totalAmount}`
    );
    return updatedUsageBilling;
  }

  async getUsageBillingById(id: string): Promise<UsageBilling> {
    const usageBilling = await this.usageBillingRepository.findOne({
      where: { id },
      relations: ['usageRecords', 'subscription', 'tenant', 'invoice'],
    });

    if (!usageBilling) {
      throw new Error(`Usage billing with ID ${id} not found`);
    }

    return usageBilling;
  }

  async getUsageBillingBySubscription(
    subscriptionId: string,
    limit: number = 50
  ): Promise<UsageBilling[]> {
    return this.usageBillingRepository.find({
      where: { subscriptionId },
      relations: ['usageRecords', 'invoice'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUsageBillingByTenant(
    tenantId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      status?: BillingStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ usageBilling: UsageBilling[]; total: number }> {
    const { startDate, endDate, status, limit = 50, offset = 0 } = options;

    const queryBuilder = this.usageBillingRepository
      .createQueryBuilder('usageBilling')
      .leftJoinAndSelect('usageBilling.usageRecords', 'usageRecords')
      .leftJoinAndSelect('usageBilling.subscription', 'subscription')
      .leftJoinAndSelect('usageBilling.invoice', 'invoice')
      .where('usageBilling.tenantId = :tenantId', { tenantId });

    if (startDate && endDate) {
      queryBuilder.andWhere(
        "usageBilling.billingPeriod->>'startDate' BETWEEN :startDate AND :endDate",
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }
      );
    }

    if (status) {
      queryBuilder.andWhere('usageBilling.status = :status', { status });
    }

    const [usageBilling, total] = await queryBuilder
      .orderBy('usageBilling.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { usageBilling, total };
  }

  async updateUsageBillingStatus(
    id: string,
    status: BillingStatus
  ): Promise<UsageBilling> {
    const usageBilling = await this.getUsageBillingById(id);

    usageBilling.status = status;
    const updatedUsageBilling =
      await this.usageBillingRepository.save(usageBilling);

    this.logger.log(`Updated usage billing status: ${id} -> ${status}`);
    return updatedUsageBilling;
  }

  async linkToInvoice(
    usageBillingId: string,
    invoiceId: string
  ): Promise<UsageBilling> {
    const usageBilling = await this.getUsageBillingById(usageBillingId);

    usageBilling.invoiceId = invoiceId;
    usageBilling.status = BillingStatus.PENDING; // Will be updated when invoice is paid

    const updatedUsageBilling =
      await this.usageBillingRepository.save(usageBilling);

    this.logger.log(
      `Linked usage billing ${usageBillingId} to invoice ${invoiceId}`
    );
    return updatedUsageBilling;
  }

  async getUsageBillingAnalytics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalUsageRevenue: number;
    totalUsageRecords: number;
    averageUsageAmount: number;
    topUsageMetrics: Array<{
      metricType: string;
      metricName: string;
      totalQuantity: number;
      totalRevenue: number;
    }>;
  }> {
    const dateFilter = startDate && endDate ? Between(startDate, endDate) : {};

    const [revenueResult, countResult, metricsResult] = await Promise.all([
      this.usageBillingRepository
        .createQueryBuilder('usageBilling')
        .select('SUM(usageBilling.totalAmount)', 'total')
        .where('usageBilling.tenantId = :tenantId', { tenantId })
        .andWhere('usageBilling.status = :status', {
          status: BillingStatus.PENDING,
        })
        .andWhere(dateFilter)
        .getRawOne(),

      this.usageBillingRepository.count({
        where: {
          tenantId,
          ...dateFilter,
        },
      }),

      this.usageBillingRecordRepository
        .createQueryBuilder('record')
        .leftJoin('record.usageBilling', 'usageBilling')
        .select('record.metricType', 'metricType')
        .addSelect('record.metricName', 'metricName')
        .addSelect('SUM(record.quantity)', 'totalQuantity')
        .addSelect('SUM(record.amount)', 'totalRevenue')
        .where('usageBilling.tenantId = :tenantId', { tenantId })
        .andWhere('usageBilling.status = :status', {
          status: BillingStatus.PENDING,
        })
        .andWhere(dateFilter)
        .groupBy('record.metricType, record.metricName')
        .orderBy('totalRevenue', 'DESC')
        .limit(10)
        .getRawMany(),
    ]);

    const totalUsageRevenue = parseFloat(revenueResult?.total || '0');
    const totalUsageRecords = countResult;
    const averageUsageAmount =
      totalUsageRecords > 0 ? totalUsageRevenue / totalUsageRecords : 0;

    const topUsageMetrics = metricsResult.map(row => ({
      metricType: row.metricType,
      metricName: row.metricName,
      totalQuantity: parseFloat(row.totalQuantity || '0'),
      totalRevenue: parseFloat(row.totalRevenue || '0'),
    }));

    return {
      totalUsageRevenue,
      totalUsageRecords,
      averageUsageAmount,
      topUsageMetrics,
    };
  }

  private groupUsageByMetric(
    usageRecords: SubscriptionUsage[]
  ): Record<string, SubscriptionUsage[]> {
    return usageRecords.reduce(
      (groups, record) => {
        const key = record.metricType;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(record);
        return groups;
      },
      {} as Record<string, SubscriptionUsage[]>
    );
  }

  async deleteUsageBilling(id: string): Promise<void> {
    const usageBilling = await this.getUsageBillingById(id);

    if (
      usageBilling.status === BillingStatus.PENDING &&
      usageBilling.invoiceId
    ) {
      throw new Error(
        'Cannot delete usage billing that is linked to an invoice'
      );
    }

    await this.usageBillingRepository.remove(usageBilling);

    this.logger.log(`Deleted usage billing record: ${id}`);
  }
}
