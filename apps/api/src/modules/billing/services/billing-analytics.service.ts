import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice, BillingHistory } from '../entities';
import { SubscriptionHistory, SubscriptionChangeType } from '../entities/subscription-history.entity';
import { BillingAnalyticsQueryDto } from '../dto';
import { InvoiceStatus, SubscriptionStatus } from '@app/shared';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

@Injectable()
export class BillingAnalyticsService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(BillingHistory)
    private readonly billingHistoryRepository: Repository<BillingHistory>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionHistory)
    private readonly subscriptionHistoryRepository: Repository<SubscriptionHistory>
  ) {}

  async getBillingAnalytics(tenantId: string, query: BillingAnalyticsQueryDto) {
    const { startDate, endDate, groupBy = 'month', currency = 'USD' } = query;

    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get basic metrics
    const [totalRevenue, totalInvoices, paidInvoices, overdueInvoices] =
      await Promise.all([
        this.getTotalRevenue(tenantId, dateFilter, currency),
        this.getTotalInvoices(tenantId, dateFilter),
        this.getPaidInvoices(tenantId, dateFilter),
        this.getOverdueInvoices(tenantId, dateFilter),
      ]);

    // Get detailed analytics
    const [
      averageInvoiceAmount,
      averagePaymentTime,
      revenueByPeriod,
      topCustomers,
      paymentMethods,
      mrrAnalytics,
      churnAnalytics,
      growthAnalytics,
    ] = await Promise.all([
      this.getAverageInvoiceAmount(tenantId, dateFilter, currency),
      this.getAveragePaymentTime(tenantId, dateFilter),
      this.getRevenueByPeriod(tenantId, dateFilter, groupBy, currency),
      this.getTopCustomers(tenantId, dateFilter, currency),
      this.getPaymentMethods(tenantId, dateFilter),
      this.getMRRAnalytics(tenantId, dateFilter, currency),
      this.getChurnAnalytics(tenantId, dateFilter),
      this.getGrowthAnalytics(tenantId, dateFilter, currency),
    ]);

    return {
      totalRevenue,
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      averageInvoiceAmount,
      averagePaymentTime,
      revenueByPeriod,
      topCustomers,
      paymentMethods,
      mrr: mrrAnalytics,
      churn: churnAnalytics,
      growth: growthAnalytics,
    };
  }

  private async getTotalRevenue(
    tenantId: string,
    dateFilter: any,
    currency: string
  ): Promise<number> {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'total')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.currency = :currency', { currency })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.PAID })
      .andWhere(dateFilter)
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  private async getTotalInvoices(
    tenantId: string,
    dateFilter: any
  ): Promise<number> {
    return this.invoiceRepository.count({
      where: {
        tenantId,
        ...dateFilter,
      },
    });
  }

  private async getPaidInvoices(
    tenantId: string,
    dateFilter: any
  ): Promise<number> {
    return this.invoiceRepository.count({
      where: {
        tenantId,
        status: InvoiceStatus.PAID,
        ...dateFilter,
      },
    });
  }

  private async getOverdueInvoices(
    tenantId: string,
    dateFilter: any
  ): Promise<number> {
    const now = new Date();
    return this.invoiceRepository.count({
      where: {
        tenantId,
        status: InvoiceStatus.OVERDUE,
        dueDate: Between(dateFilter.createdAt?.[0] || new Date(0), now),
      },
    });
  }

  private async getAverageInvoiceAmount(
    tenantId: string,
    dateFilter: any,
    currency: string
  ): Promise<number> {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('AVG(invoice.totalAmount)', 'average')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.currency = :currency', { currency })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.PAID })
      .andWhere(dateFilter)
      .getRawOne();

    return parseFloat(result?.average || '0');
  }

  private async getAveragePaymentTime(
    tenantId: string,
    dateFilter: any
  ): Promise<number> {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select(
        'AVG(EXTRACT(EPOCH FROM (invoice.paidDate - invoice.issuedDate))/86400)',
        'averageDays'
      )
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.PAID })
      .andWhere('invoice.paidDate IS NOT NULL')
      .andWhere(dateFilter)
      .getRawOne();

    return parseFloat(result?.averageDays || '0');
  }

  private async getRevenueByPeriod(
    tenantId: string,
    dateFilter: any,
    groupBy: string,
    currency: string
  ) {
    const dateFormat = this.getDateFormat(groupBy);

    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select(`DATE_TRUNC('${groupBy}', invoice.paidDate)`, 'period')
      .addSelect('SUM(invoice.totalAmount)', 'revenue')
      .addSelect('COUNT(invoice.id)', 'invoices')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.currency = :currency', { currency })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.PAID })
      .andWhere('invoice.paidDate IS NOT NULL')
      .andWhere(dateFilter)
      .groupBy(`DATE_TRUNC('${groupBy}', invoice.paidDate)`)
      .orderBy('period', 'ASC')
      .getRawMany();

    return result.map(row => ({
      period: row.period,
      revenue: parseFloat(row.revenue || '0'),
      invoices: parseInt(row.invoices || '0'),
    }));
  }

  private async getTopCustomers(
    tenantId: string,
    dateFilter: any,
    currency: string
  ) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.customer', 'customer')
      .select('invoice.customerId', 'customerId')
      .addSelect('customer.email', 'email')
      .addSelect('customer.firstName', 'firstName')
      .addSelect('customer.lastName', 'lastName')
      .addSelect('SUM(invoice.totalAmount)', 'totalRevenue')
      .addSelect('COUNT(invoice.id)', 'invoiceCount')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.currency = :currency', { currency })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.PAID })
      .andWhere(dateFilter)
      .groupBy(
        'invoice.customerId, customer.email, customer.firstName, customer.lastName'
      )
      .orderBy('SUM(invoice.totalAmount)', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map(row => ({
      customerId: row.customerId,
      email: row.email,
      name: `${row.firstName || ''} ${row.lastName || ''}`.trim(),
      totalRevenue: parseFloat(row.totalRevenue || '0'),
      invoiceCount: parseInt(row.invoiceCount || '0'),
    }));
  }

  private async getPaymentMethods(tenantId: string, dateFilter: any) {
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoin('invoice.payments', 'payment')
      .leftJoin('payment.paymentMethod', 'paymentMethod')
      .select('paymentMethod.type', 'method')
      .addSelect('COUNT(DISTINCT invoice.id)', 'count')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.PAID })
      .andWhere('payment.id IS NOT NULL')
      .andWhere(dateFilter)
      .groupBy('paymentMethod.type')
      .getRawMany();

    const totalPayments = result.reduce(
      (sum, row) => sum + parseInt(row.count || '0'),
      0
    );

    return result.map(row => {
      const count = parseInt(row.count || '0');
      return {
        method: row.method || 'Unknown',
        count,
        percentage: totalPayments > 0 ? (count / totalPayments) * 100 : 0,
      };
    });
  }

  /**
   * Calculate Monthly Recurring Revenue (MRR) analytics
   */
  private async getMRRAnalytics(
    tenantId: string,
    dateFilter: any,
    currency: string
  ) {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Current MRR from active subscriptions
    const currentMRR = await this.calculateMRRForPeriod(
      tenantId,
      currentMonth,
      currency
    );

    // Previous month MRR for comparison
    const previousMRR = await this.calculateMRRForPeriod(
      tenantId,
      previousMonth,
      currency
    );

    // MRR growth rate
    const mrrGrowthRate =
      previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR) * 100 : 0;

    // New MRR from new subscriptions this month
    const newMRR = await this.calculateNewMRRForPeriod(
      tenantId,
      currentMonth,
      currency
    );

    // Churned MRR from canceled subscriptions this month
    const churnedMRR = await this.calculateChurnedMRRForPeriod(
      tenantId,
      currentMonth,
      currency
    );

    // Expansion MRR from upgrades
    const expansionMRR = await this.calculateExpansionMRRForPeriod(
      tenantId,
      currentMonth,
      currency
    );

    // Contraction MRR from downgrades
    const contractionMRR = await this.calculateContractionMRRForPeriod(
      tenantId,
      currentMonth,
      currency
    );

    // Net MRR movement
    const netMRRMovement = newMRR + expansionMRR - churnedMRR - contractionMRR;

    // MRR by period for trending
    const mrrByPeriod = await this.getMRRByPeriod(
      tenantId,
      dateFilter,
      currency
    );

    return {
      currentMRR,
      previousMRR,
      mrrGrowthRate,
      newMRR,
      churnedMRR,
      expansionMRR,
      contractionMRR,
      netMRRMovement,
      mrrByPeriod,
    };
  }

  /**
   * Calculate customer churn analytics
   */
  private async getChurnAnalytics(tenantId: string, dateFilter: any) {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Customer churn rate for current month
    const currentChurnRate = await this.calculateChurnRateForPeriod(
      tenantId,
      currentMonth
    );

    // Previous month for comparison
    const previousChurnRate = await this.calculateChurnRateForPeriod(
      tenantId,
      previousMonth
    );

    // Revenue churn rate
    const revenueChurnRate = await this.calculateRevenueChurnRateForPeriod(
      tenantId,
      currentMonth
    );

    // Churn reasons breakdown
    const churnReasons = await this.getChurnReasons(tenantId, currentMonth);

    // Churn by period for trending
    const churnByPeriod = await this.getChurnByPeriod(tenantId, dateFilter);

    // Customer lifetime value
    const averageCustomerLifetimeValue =
      await this.calculateAverageCustomerLifetimeValue(tenantId, dateFilter);

    return {
      currentChurnRate,
      previousChurnRate,
      revenueChurnRate,
      churnReasons,
      churnByPeriod,
      averageCustomerLifetimeValue,
    };
  }

  /**
   * Calculate growth analytics
   */
  private async getGrowthAnalytics(
    tenantId: string,
    dateFilter: any,
    currency: string
  ) {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Customer growth metrics
    const newCustomers = await this.getNewCustomersForPeriod(
      tenantId,
      currentMonth
    );
    const totalActiveCustomers = await this.getTotalActiveCustomers(
      tenantId,
      currentMonth
    );
    const previousActiveCustomers = await this.getTotalActiveCustomers(
      tenantId,
      previousMonth
    );

    const customerGrowthRate =
      previousActiveCustomers > 0
        ? ((totalActiveCustomers - previousActiveCustomers) /
            previousActiveCustomers) *
          100
        : 0;

    // Revenue growth metrics
    const currentRevenue = await this.getTotalRevenueForPeriod(
      tenantId,
      currentMonth,
      currency
    );
    const previousRevenue = await this.getTotalRevenueForPeriod(
      tenantId,
      previousMonth,
      currency
    );

    const revenueGrowthRate =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    // Average Revenue Per User (ARPU)
    const arpu =
      totalActiveCustomers > 0 ? currentRevenue / totalActiveCustomers : 0;

    // Growth metrics by period
    const growthByPeriod = await this.getGrowthByPeriod(
      tenantId,
      dateFilter,
      currency
    );

    return {
      newCustomers,
      totalActiveCustomers,
      customerGrowthRate,
      currentRevenue,
      revenueGrowthRate,
      arpu,
      growthByPeriod,
    };
  }

  // MRR Calculation Helper Methods

  private async calculateMRRForPeriod(
    tenantId: string,
    period: Date,
    currency: string
  ): Promise<number> {
    const result = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select(
        'SUM(CASE ' +
          "WHEN subscription.billingCycle = 'monthly' THEN subscription.amount " +
          "WHEN subscription.billingCycle = 'yearly' THEN subscription.amount / 12 " +
          "WHEN subscription.billingCycle = 'quarterly' THEN subscription.amount / 3 " +
          'ELSE subscription.amount END)',
        'mrr'
      )
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.currency = :currency', { currency })
      .andWhere('subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .andWhere('subscription.currentPeriodStart <= :period', { period })
      .andWhere(
        '(subscription.currentPeriodEnd IS NULL OR subscription.currentPeriodEnd >= :period)',
        { period }
      )
      .getRawOne();

    return parseFloat(result?.mrr || '0');
  }

  private async calculateNewMRRForPeriod(
    tenantId: string,
    period: Date,
    currency: string
  ): Promise<number> {
    const nextMonth = new Date(period.getFullYear(), period.getMonth() + 1, 1);

    const result = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select(
        'SUM(CASE ' +
          "WHEN subscription.billingCycle = 'monthly' THEN subscription.amount " +
          "WHEN subscription.billingCycle = 'yearly' THEN subscription.amount / 12 " +
          "WHEN subscription.billingCycle = 'quarterly' THEN subscription.amount / 3 " +
          'ELSE subscription.amount END)',
        'newMrr'
      )
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.currency = :currency', { currency })
      .andWhere('subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .andWhere('subscription.startDate >= :period', { period })
      .andWhere('subscription.startDate < :nextMonth', { nextMonth })
      .getRawOne();

    return parseFloat(result?.newMrr || '0');
  }

  private async calculateChurnedMRRForPeriod(
    tenantId: string,
    period: Date,
    currency: string
  ): Promise<number> {
    const nextMonth = new Date(period.getFullYear(), period.getMonth() + 1, 1);

    const result = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select(
        'SUM(CASE ' +
          "WHEN subscription.billingCycle = 'monthly' THEN subscription.amount " +
          "WHEN subscription.billingCycle = 'yearly' THEN subscription.amount / 12 " +
          "WHEN subscription.billingCycle = 'quarterly' THEN subscription.amount / 3 " +
          'ELSE subscription.amount END)',
        'churnedMrr'
      )
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.currency = :currency', { currency })
      .andWhere('subscription.status = :status', {
        status: SubscriptionStatus.CANCELED,
      })
      .andWhere('subscription.canceledAt >= :period', { period })
      .andWhere('subscription.canceledAt < :nextMonth', { nextMonth })
      .getRawOne();

    return parseFloat(result?.churnedMrr || '0');
  }

  private async calculateExpansionMRRForPeriod(
    tenantId: string,
    period: Date,
    currency: string
  ): Promise<number> {
    const nextMonth = new Date(period.getFullYear(), period.getMonth() + 1, 1);

    const result = await this.subscriptionHistoryRepository
      .createQueryBuilder('history')
      .select('SUM(history.monthlyAmountDifference)', 'expansionMrr')
      .where('history.tenantId = :tenantId', { tenantId })
      .andWhere('history.currency = :currency', { currency })
      .andWhere('history.changeType IN (:...changeTypes)', {
        changeTypes: [
          SubscriptionChangeType.UPGRADED,
          SubscriptionChangeType.PLAN_CHANGED,
        ],
      })
      .andWhere('history.changeDate >= :period', { period })
      .andWhere('history.changeDate < :nextMonth', { nextMonth })
      .andWhere('(history.newAmount - history.previousAmount) > 0')
      .getRawOne();

    return parseFloat(result?.expansionMrr || '0');
  }

  private async calculateContractionMRRForPeriod(
    tenantId: string,
    period: Date,
    currency: string
  ): Promise<number> {
    const nextMonth = new Date(period.getFullYear(), period.getMonth() + 1, 1);

    const result = await this.subscriptionHistoryRepository
      .createQueryBuilder('history')
      .select('SUM(ABS(history.monthlyAmountDifference))', 'contractionMrr')
      .where('history.tenantId = :tenantId', { tenantId })
      .andWhere('history.currency = :currency', { currency })
      .andWhere('history.changeType IN (:...changeTypes)', {
        changeTypes: [
          SubscriptionChangeType.DOWNGRADED,
          SubscriptionChangeType.PLAN_CHANGED,
        ],
      })
      .andWhere('history.changeDate >= :period', { period })
      .andWhere('history.changeDate < :nextMonth', { nextMonth })
      .andWhere('(history.newAmount - history.previousAmount) < 0')
      .getRawOne();

    return parseFloat(result?.contractionMrr || '0');
  }

  private async getMRRByPeriod(
    tenantId: string,
    dateFilter: any,
    currency: string
  ) {
    // Get MRR for the last 12 months
    const endDate = new Date();
    const startDate = new Date(
      endDate.getFullYear(),
      endDate.getMonth() - 11,
      1
    );

    const periods: { period: Date; mrr: number }[] = [];

    for (let i = 0; i < 12; i++) {
      const period = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i,
        1
      );
      const mrr = await this.calculateMRRForPeriod(tenantId, period, currency);
      periods.push({ period, mrr });
    }

    return periods;
  }

  // Churn Calculation Helper Methods

  private async calculateChurnRateForPeriod(
    tenantId: string,
    period: Date
  ): Promise<number> {
    const nextMonth = new Date(period.getFullYear(), period.getMonth() + 1, 1);

    // Get customers at start of period
    const customersAtStart = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('COUNT(DISTINCT subscription.userId)', 'count')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .andWhere('subscription.startDate < :period', { period })
      .getRawOne();

    // Get churned customers during period
    const churnedCustomers = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('COUNT(DISTINCT subscription.userId)', 'count')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.status = :status', {
        status: SubscriptionStatus.CANCELED,
      })
      .andWhere('subscription.canceledAt >= :period', { period })
      .andWhere('subscription.canceledAt < :nextMonth', { nextMonth })
      .getRawOne();

    const startCount = parseInt(customersAtStart?.count || '0');
    const churnedCount = parseInt(churnedCustomers?.count || '0');

    return startCount > 0 ? (churnedCount / startCount) * 100 : 0;
  }

  private async calculateRevenueChurnRateForPeriod(
    tenantId: string,
    period: Date
  ): Promise<number> {
    const nextMonth = new Date(period.getFullYear(), period.getMonth() + 1, 1);

    // Get MRR at start of period
    const mrrAtStart = await this.calculateMRRForPeriod(
      tenantId,
      period,
      'USD'
    );

    // Get churned MRR during period
    const churnedMRR = await this.calculateChurnedMRRForPeriod(
      tenantId,
      period,
      'USD'
    );

    return mrrAtStart > 0 ? (churnedMRR / mrrAtStart) * 100 : 0;
  }

  private async getChurnReasons(tenantId: string, period: Date) {
    const nextMonth = new Date(period.getFullYear(), period.getMonth() + 1, 1);

    const result = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('subscription.cancelReason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.status = :status', {
        status: SubscriptionStatus.CANCELED,
      })
      .andWhere('subscription.canceledAt >= :period', { period })
      .andWhere('subscription.canceledAt < :nextMonth', { nextMonth })
      .groupBy('subscription.cancelReason')
      .getRawMany();

    return result.map(row => ({
      reason: row.reason || 'Unknown',
      count: parseInt(row.count || '0'),
    }));
  }

  private async getChurnByPeriod(tenantId: string, dateFilter: any) {
    // Get churn rate for the last 12 months
    const endDate = new Date();
    const startDate = new Date(
      endDate.getFullYear(),
      endDate.getMonth() - 11,
      1
    );

    const periods: { period: Date; churnRate: number }[] = [];

    for (let i = 0; i < 12; i++) {
      const period = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i,
        1
      );
      const churnRate = await this.calculateChurnRateForPeriod(
        tenantId,
        period
      );
      periods.push({ period, churnRate });
    }

    return periods;
  }

  private async calculateAverageCustomerLifetimeValue(
    tenantId: string,
    dateFilter: any
  ): Promise<number> {
    // Simplified CLV calculation: Average revenue per customer / churn rate
    const totalRevenue = await this.getTotalRevenue(
      tenantId,
      dateFilter,
      'USD'
    );
    const totalCustomers = await this.getTotalActiveCustomers(
      tenantId,
      new Date()
    );
    const avgChurnRate =
      (await this.calculateChurnRateForPeriod(tenantId, new Date())) / 100;

    if (totalCustomers > 0 && avgChurnRate > 0) {
      const arpu = totalRevenue / totalCustomers;
      return arpu / avgChurnRate;
    }

    return 0;
  }

  // Growth Calculation Helper Methods

  private async getNewCustomersForPeriod(
    tenantId: string,
    period: Date
  ): Promise<number> {
    const nextMonth = new Date(period.getFullYear(), period.getMonth() + 1, 1);

    const result = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('COUNT(DISTINCT subscription.userId)', 'count')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.startDate >= :period', { period })
      .andWhere('subscription.startDate < :nextMonth', { nextMonth })
      .getRawOne();

    return parseInt(result?.count || '0');
  }

  private async getTotalActiveCustomers(
    tenantId: string,
    period: Date
  ): Promise<number> {
    const result = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('COUNT(DISTINCT subscription.userId)', 'count')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .andWhere('subscription.startDate <= :period', { period })
      .andWhere(
        '(subscription.endDate IS NULL OR subscription.endDate >= :period)',
        { period }
      )
      .getRawOne();

    return parseInt(result?.count || '0');
  }

  private async getTotalRevenueForPeriod(
    tenantId: string,
    period: Date,
    currency: string
  ): Promise<number> {
    const nextMonth = new Date(period.getFullYear(), period.getMonth() + 1, 1);

    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'total')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.currency = :currency', { currency })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.PAID })
      .andWhere('invoice.paidDate >= :period', { period })
      .andWhere('invoice.paidDate < :nextMonth', { nextMonth })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  private async getGrowthByPeriod(
    tenantId: string,
    dateFilter: any,
    currency: string
  ) {
    // Get growth metrics for the last 12 months
    const endDate = new Date();
    const startDate = new Date(
      endDate.getFullYear(),
      endDate.getMonth() - 11,
      1
    );

    const periods: {
      period: Date;
      customers: number;
      revenue: number;
      customerGrowthRate: number;
      revenueGrowthRate: number;
    }[] = [];

    let previousCustomers = 0;
    let previousRevenue = 0;

    for (let i = 0; i < 12; i++) {
      const period = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i,
        1
      );
      const customers = await this.getTotalActiveCustomers(tenantId, period);
      const revenue = await this.getTotalRevenueForPeriod(
        tenantId,
        period,
        currency
      );

      const customerGrowthRate =
        previousCustomers > 0
          ? ((customers - previousCustomers) / previousCustomers) * 100
          : 0;
      const revenueGrowthRate =
        previousRevenue > 0
          ? ((revenue - previousRevenue) / previousRevenue) * 100
          : 0;

      periods.push({
        period,
        customers,
        revenue,
        customerGrowthRate,
        revenueGrowthRate,
      });

      previousCustomers = customers;
      previousRevenue = revenue;
    }

    return periods;
  }

  private buildDateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) {
      return {};
    }

    const filter: any = {};

    if (startDate && endDate) {
      filter.createdAt = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      filter.createdAt = Between(new Date(startDate), new Date());
    } else if (endDate) {
      filter.createdAt = Between(new Date(0), new Date(endDate));
    }

    return filter;
  }

  private getDateFormat(groupBy: string): string {
    switch (groupBy) {
      case 'day':
        return 'YYYY-MM-DD';
      case 'week':
        return 'YYYY-"W"WW';
      case 'month':
        return 'YYYY-MM';
      case 'quarter':
        return 'YYYY-"Q"Q';
      case 'year':
        return 'YYYY';
      default:
        return 'YYYY-MM';
    }
  }
}
