import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice, BillingHistory } from '../entities';
import { BillingAnalyticsQueryDto } from '../dto';
import { InvoiceStatus } from '@app/shared';

@Injectable()
export class BillingAnalyticsService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(BillingHistory)
    private readonly billingHistoryRepository: Repository<BillingHistory>
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
    ] = await Promise.all([
      this.getAverageInvoiceAmount(tenantId, dateFilter, currency),
      this.getAveragePaymentTime(tenantId, dateFilter),
      this.getRevenueByPeriod(tenantId, dateFilter, groupBy, currency),
      this.getTopCustomers(tenantId, dateFilter, currency),
      this.getPaymentMethods(tenantId, dateFilter),
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
    // This would typically join with payment data
    // For now, return a placeholder structure
    return [
      { method: 'Credit Card', count: 0, percentage: 0 },
      { method: 'Bank Transfer', count: 0, percentage: 0 },
      { method: 'PayPal', count: 0, percentage: 0 },
    ];
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
