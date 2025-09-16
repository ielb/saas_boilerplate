import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BillingCycleEntity, Invoice } from '../entities';
import { BillingStatus, BillingCycle } from '@app/shared';
import { InvoiceType, PaymentTerms, LineItemType } from '@app/shared';
import { InvoiceService } from './invoice.service';

@Injectable()
export class BillingCycleService {
  private readonly logger = new Logger(BillingCycleService.name);

  constructor(
    @InjectRepository(BillingCycleEntity)
    private readonly billingCycleRepository: Repository<BillingCycleEntity>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly invoiceService: InvoiceService
  ) {}

  async createBillingCycle(
    tenantId: string,
    data: {
      subscriptionId?: string;
      cycleType: BillingCycle;
      startDate: Date;
      endDate: Date;
      billingDate: Date;
      metadata?: Record<string, any>;
    }
  ): Promise<BillingCycleEntity> {
    const billingCycle = this.billingCycleRepository.create({
      ...data,
      tenantId,
      status: BillingStatus.PENDING,
      totalAmount: 0,
      currency: 'USD',
    });

    return this.billingCycleRepository.save(billingCycle);
  }

  async processBillingCycle(cycleId: string): Promise<BillingCycleEntity> {
    const cycle = await this.billingCycleRepository.findOne({
      where: { id: cycleId },
      relations: ['subscription', 'tenant'],
    });

    if (!cycle) {
      throw new Error(`Billing cycle with ID ${cycleId} not found`);
    }

    if (cycle.status !== BillingStatus.PENDING) {
      throw new Error(`Billing cycle ${cycleId} is not in pending status`);
    }

    try {
      // Calculate usage and generate invoice
      const invoice = await this.generateCycleInvoice(cycle);

      // Update cycle with invoice information
      cycle.invoiceId = invoice.id;
      cycle.totalAmount = invoice.totalAmount;
      cycle.currency = invoice.currency;
      cycle.status = BillingStatus.PAID; // This would be updated based on payment status

      const updatedCycle = await this.billingCycleRepository.save(cycle);

      this.logger.log(`Successfully processed billing cycle ${cycleId}`);
      return updatedCycle;
    } catch (error) {
      this.logger.error(`Failed to process billing cycle ${cycleId}`, error);
      cycle.status = BillingStatus.PENDING; // Reset status on failure
      await this.billingCycleRepository.save(cycle);
      throw error;
    }
  }

  async getUpcomingBillingCycles(
    tenantId: string,
    days: number = 7
  ): Promise<BillingCycleEntity[]> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.billingCycleRepository.find({
      where: {
        tenantId,
        billingDate: Between(startDate, endDate),
        status: BillingStatus.PENDING,
      },
      relations: ['subscription', 'tenant'],
      order: { billingDate: 'ASC' },
    });
  }

  async getBillingCyclesBySubscription(
    subscriptionId: string
  ): Promise<BillingCycleEntity[]> {
    return this.billingCycleRepository.find({
      where: { subscriptionId },
      relations: ['invoice', 'tenant'],
      order: { billingDate: 'DESC' },
    });
  }

  async getBillingCyclesByTenant(
    tenantId: string,
    limit: number = 50
  ): Promise<BillingCycleEntity[]> {
    return this.billingCycleRepository.find({
      where: { tenantId },
      relations: ['subscription', 'invoice', 'tenant'],
      order: { billingDate: 'DESC' },
      take: limit,
    });
  }

  async updateBillingCycleStatus(
    cycleId: string,
    status: BillingStatus
  ): Promise<BillingCycleEntity> {
    const cycle = await this.billingCycleRepository.findOne({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new Error(`Billing cycle with ID ${cycleId} not found`);
    }

    cycle.status = status;
    return this.billingCycleRepository.save(cycle);
  }

  async scheduleRecurringBilling(
    tenantId: string,
    subscriptionId: string,
    cycleType: BillingCycle
  ): Promise<void> {
    const now = new Date();
    const nextBillingDate = this.calculateNextBillingDate(now, cycleType);
    const period = this.calculateBillingPeriod(nextBillingDate, cycleType);

    await this.createBillingCycle(tenantId, {
      subscriptionId,
      cycleType,
      startDate: period.startDate,
      endDate: period.endDate,
      billingDate: nextBillingDate,
      metadata: {
        isRecurring: true,
        scheduledAt: now,
      },
    });

    this.logger.log(
      `Scheduled recurring billing for subscription ${subscriptionId}`
    );
  }

  async cancelBillingCycle(cycleId: string): Promise<BillingCycleEntity> {
    const cycle = await this.billingCycleRepository.findOne({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new Error(`Billing cycle with ID ${cycleId} not found`);
    }

    if (cycle.status === BillingStatus.PAID) {
      throw new Error('Cannot cancel a paid billing cycle');
    }

    cycle.status = BillingStatus.CANCELLED;
    return this.billingCycleRepository.save(cycle);
  }

  private async generateCycleInvoice(
    cycle: BillingCycleEntity
  ): Promise<Invoice> {
    // This would integrate with usage tracking to calculate actual usage
    // For now, we'll create a basic subscription invoice

    const lineItems = [
      {
        type: LineItemType.SUBSCRIPTION,
        description: `Subscription billing for ${cycle.cycleType} period`,
        quantity: 1,
        unitPrice: cycle.totalAmount || 0,
        taxRate: 0,
        discountAmount: 0,
        periodStart: cycle.startDate.toISOString(),
        periodEnd: cycle.endDate.toISOString(),
      },
    ];

    return this.invoiceService.createInvoice(cycle.tenantId, {
      type: InvoiceType.SUBSCRIPTION,
      customerId: cycle.subscription?.userId || '', // This would need to be properly resolved
      subscriptionId: cycle.subscriptionId || '',
      billingAddress: {
        // This would be populated from customer data
        name: 'Customer Name',
        email: 'customer@example.com',
      },
      lineItems,
      paymentTerms: PaymentTerms.NET_30,
      dueDate: new Date(
        cycle.billingDate.getTime() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      notes: `Billing cycle for ${cycle.startDate.toISOString().split('T')[0]} to ${cycle.endDate.toISOString().split('T')[0]}`,
    });
  }

  private calculateNextBillingDate(
    currentDate: Date,
    cycleType: BillingCycle
  ): Date {
    const nextDate = new Date(currentDate);

    switch (cycleType) {
      case BillingCycle.DAILY:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case BillingCycle.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case BillingCycle.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case BillingCycle.QUARTERLY:
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case BillingCycle.SEMI_ANNUALLY:
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case BillingCycle.ANNUALLY:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate;
  }

  private calculateBillingPeriod(
    billingDate: Date,
    cycleType: BillingCycle
  ): { startDate: Date; endDate: Date } {
    const startDate = new Date(billingDate);
    const endDate = new Date(billingDate);

    switch (cycleType) {
      case BillingCycle.DAILY:
        endDate.setDate(endDate.getDate() + 1);
        break;
      case BillingCycle.WEEKLY:
        endDate.setDate(endDate.getDate() + 7);
        break;
      case BillingCycle.MONTHLY:
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case BillingCycle.QUARTERLY:
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case BillingCycle.SEMI_ANNUALLY:
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case BillingCycle.ANNUALLY:
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    return { startDate, endDate };
  }
}
