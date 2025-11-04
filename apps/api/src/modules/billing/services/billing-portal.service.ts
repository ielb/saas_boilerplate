import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { PaymentMethod } from '../../payments/entities/payment-method.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { InvoiceStatus, SubscriptionStatus } from '@app/shared';
import { PaymentMethodStatus } from '../../../modules/payments/entities/payment-method.entity';
import {
  BillingPortalSummaryDto,
  BillingPortalInvoiceDto,
  BillingPortalSubscriptionDto,
  BillingPortalPaymentMethodDto,
  UpdatePaymentMethodDto,
  BillingPortalQueryDto,
} from '../dto/billing-portal.dto';

@Injectable()
export class BillingPortalService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>
  ) {}

  /**
   * Get billing portal summary for a customer
   */
  async getBillingSummary(
    tenantId: string,
    userId: string
  ): Promise<BillingPortalSummaryDto> {
    // Get active subscriptions
    const activeSubscriptions = await this.subscriptionRepository.count({
      where: {
        tenantId,
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // Get total amount due (unpaid invoices)
    const unpaidInvoicesResult = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.totalAmount)', 'totalDue')
      .addSelect('COUNT(invoice.id)', 'invoiceCount')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.customerId = :userId', { userId })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE],
      })
      .getRawOne();

    const totalAmountDue = parseFloat(unpaidInvoicesResult?.totalDue || '0');
    const unpaidInvoiceCount = parseInt(
      unpaidInvoicesResult?.invoiceCount || '0'
    );

    // Get next invoice date from active subscriptions
    const nextInvoice = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('MIN(subscription.currentPeriodEnd)', 'nextInvoiceDate')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.userId = :userId', { userId })
      .andWhere('subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .getRawOne();

    // Get payment methods count
    const paymentMethodsCount = await this.paymentMethodRepository.count({
      where: {
        tenantId,
        userId,
        status: PaymentMethodStatus.ACTIVE,
      },
    });

    // Get recent payment history (last 5 payments)
    const recentPayments = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.invoice', 'invoice')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.userId = :userId', { userId })
      .orderBy('payment.createdAt', 'DESC')
      .limit(5)
      .getMany();

    return {
      activeSubscriptions,
      totalAmountDue,
      unpaidInvoiceCount,
      nextInvoiceDate: nextInvoice?.nextInvoiceDate || null,
      paymentMethodsCount,
      recentPayments: recentPayments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
        invoiceNumber: payment.invoice?.invoiceNumber || null,
      })),
    };
  }

  /**
   * Get customer's invoices with pagination
   */
  async getCustomerInvoices(
    tenantId: string,
    userId: string,
    query: BillingPortalQueryDto
  ): Promise<{ invoices: BillingPortalInvoiceDto[]; total: number }> {
    const { page = 1, limit = 10, status, startDate, endDate } = query;
    const offset = (page - 1) * limit;

    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.lineItems', 'lineItems')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.customerId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('invoice.status = :status', { status });
    }

    if (startDate) {
      queryBuilder.andWhere('invoice.issuedDate >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('invoice.issuedDate <= :endDate', { endDate });
    }

    const [invoices, total] = await queryBuilder
      .orderBy('invoice.issuedDate', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      invoices: invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        issuedDate: invoice.issuedDate,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate || null,
        description: invoice.notes,
        lineItems:
          invoice.lineItems?.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalAmount: item.amount,
          })) || [],
        downloadUrl: `/billing/portal/invoices/${invoice.id}/download`,
      })),
      total,
    };
  }

  /**
   * Get customer's subscriptions
   */
  async getCustomerSubscriptions(
    tenantId: string,
    userId: string
  ): Promise<BillingPortalSubscriptionDto[]> {
    const subscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .where('subscription.tenantId = :tenantId', { tenantId })
      .andWhere('subscription.userId = :userId', { userId })
      .orderBy('subscription.createdAt', 'DESC')
      .getMany();

    return subscriptions.map(subscription => ({
      id: subscription.id,
      name: subscription.name,
      description: subscription.description || null,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      amount: subscription.amount,
      currency: subscription.currency,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      trialEndDate: subscription.trialEndDate,
      isTrial: subscription.isTrial,
      planName: subscription.plan?.name || null,
      features: subscription.features || {},
      limits: subscription.limits || {},
      canCancel: subscription.status === SubscriptionStatus.ACTIVE,
      canUpgrade: subscription.status === SubscriptionStatus.ACTIVE,
      canDowngrade: subscription.status === SubscriptionStatus.ACTIVE,
    }));
  }

  /**
   * Get customer's payment methods
   */
  async getCustomerPaymentMethods(
    tenantId: string,
    userId: string
  ): Promise<BillingPortalPaymentMethodDto[]> {
    const paymentMethods = await this.paymentMethodRepository
      .createQueryBuilder('paymentMethod')
      .where('paymentMethod.tenantId = :tenantId', { tenantId })
      .andWhere('paymentMethod.userId = :userId', { userId })
      .andWhere('paymentMethod.status = :status', { status: 'active' })
      .orderBy('paymentMethod.isDefault', 'DESC')
      .addOrderBy('paymentMethod.createdAt', 'DESC')
      .getMany();

    return paymentMethods.map(method => ({
      id: method.id,
      type: method.type,
      last4: method.cardLast4 || method.bankLast4 || '',
      brand: method.cardBrand || null,
      expiryMonth: method.cardExpMonth
        ? parseInt(method.cardExpMonth)
        : undefined,
      expiryYear: method.cardExpYear ? parseInt(method.cardExpYear) : undefined,
      isDefault: method.isDefault,
      isActive: method.status === PaymentMethodStatus.ACTIVE,
      createdAt: method.createdAt,
      canDelete: !method.isDefault, // Don't allow deleting default payment method
    }));
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(
    tenantId: string,
    userId: string,
    paymentMethodId: string
  ): Promise<void> {
    // Verify payment method belongs to user
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: {
        id: paymentMethodId,
        tenantId,
        userId,
        status: PaymentMethodStatus.ACTIVE,
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Remove default flag from all user's payment methods
    await this.paymentMethodRepository.update(
      { tenantId, userId, status: PaymentMethodStatus.ACTIVE },
      { isDefault: false }
    );

    // Set new default
    await this.paymentMethodRepository.update(
      { id: paymentMethodId },
      { isDefault: true }
    );
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(
    tenantId: string,
    userId: string,
    paymentMethodId: string
  ): Promise<void> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: {
        id: paymentMethodId,
        tenantId,
        userId,
        status: PaymentMethodStatus.ACTIVE,
      },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    if (paymentMethod.isDefault) {
      throw new BadRequestException(
        'Cannot delete default payment method. Set another payment method as default first.'
      );
    }

    // Soft delete by marking as inactive
    await this.paymentMethodRepository.update(
      { id: paymentMethodId },
      { status: PaymentMethodStatus.INACTIVE }
    );
  }

  /**
   * Get invoice PDF download URL
   */
  async getInvoiceDownloadUrl(
    tenantId: string,
    userId: string,
    invoiceId: string
  ): Promise<string> {
    const invoice = await this.invoiceRepository.findOne({
      where: {
        id: invoiceId,
        tenantId,
        customerId: userId,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Return download URL (this would typically be a signed URL for S3 or similar)
    return `/billing/portal/invoices/${invoiceId}/download`;
  }

  /**
   * Request subscription cancellation
   */
  async requestSubscriptionCancellation(
    tenantId: string,
    userId: string,
    subscriptionId: string,
    reason?: string
  ): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        id: subscriptionId,
        tenantId,
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Active subscription not found');
    }

    // Mark for cancellation at period end
    const updateData: any = {
      cancelReason: reason || 'Customer requested cancellation',
      notes:
        `${subscription.notes || ''}\nCancellation requested via billing portal on ${new Date().toISOString()}`.trim(),
    };

    if (subscription.currentPeriodEnd) {
      updateData.cancelAtPeriodEnd = subscription.currentPeriodEnd;
    }

    await this.subscriptionRepository.update(
      { id: subscriptionId },
      updateData
    );
  }

  /**
   * Reactivate cancelled subscription (if still within period)
   */
  async reactivateSubscription(
    tenantId: string,
    userId: string,
    subscriptionId: string
  ): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        id: subscriptionId,
        tenantId,
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new BadRequestException(
        'Subscription is not scheduled for cancellation'
      );
    }

    if (subscription.cancelAtPeriodEnd < new Date()) {
      throw new BadRequestException(
        'Subscription cancellation period has already ended'
      );
    }

    // Remove cancellation - use raw SQL for null values
    const newNotes =
      `${subscription.notes || ''}\nCancellation revoked via billing portal on ${new Date().toISOString()}`.trim();
    await this.subscriptionRepository.query(
      'UPDATE subscriptions SET "cancelAtPeriodEnd" = NULL, "cancelReason" = NULL, notes = $1 WHERE id = $2',
      [newNotes, subscriptionId]
    );
  }
}
