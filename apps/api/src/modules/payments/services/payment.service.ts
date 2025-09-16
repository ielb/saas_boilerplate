import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import {
  Payment,
  PaymentStatus,
  PaymentType,
} from '../entities/payment.entity';
import {
  PaymentIntent,
  PaymentIntentStatus,
} from '../entities/payment-intent.entity';
import {
  PaymentRefund,
  RefundStatus,
  RefundReason,
} from '../entities/payment-refund.entity';
import { StripeService } from './stripe.service';
import { User } from '../../users/entities/user.entity';

export interface CreatePaymentDto {
  tenantId: string;
  userId: string;
  amount: number;
  currency: string;
  description?: string;
  paymentMethodId?: string;
  metadata?: Record<string, any>;
  captureMethod?: 'automatic' | 'manual';
  confirmationMethod?: 'automatic' | 'manual';
  receiptEmail?: string;
  statementDescriptor?: string;
  statementDescriptorSuffix?: string;
}

export interface ConfirmPaymentDto {
  paymentIntentId: string;
  paymentMethodId?: string;
  returnUrl?: string;
  receiptEmail?: string;
}

export interface CapturePaymentDto {
  paymentIntentId: string;
  amount?: number;
  receiptEmail?: string;
  statementDescriptor?: string;
  statementDescriptorSuffix?: string;
}

export interface RefundPaymentDto {
  paymentId: string;
  amount?: number;
  reason?: RefundReason;
  notes?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentIntent)
    private readonly paymentIntentRepository: Repository<PaymentIntent>,
    @InjectRepository(PaymentRefund)
    private readonly paymentRefundRepository: Repository<PaymentRefund>,
    private readonly stripeService: StripeService
  ) {}

  // Create Payment
  async createPayment(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    this.logger.log(`Creating payment for user ${createPaymentDto.userId}`);

    try {
      // Create payment intent in Stripe
      const paymentIntentParams: any = {
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        capture_method: 'automatic',
        confirmation_method: 'automatic',
        customer: undefined,
        metadata: {
          tenantId: createPaymentDto.tenantId,
          userId: createPaymentDto.userId,
        },
      };

      if (createPaymentDto.description)
        paymentIntentParams.description = createPaymentDto.description;
      if (createPaymentDto.paymentMethodId)
        paymentIntentParams.payment_method = createPaymentDto.paymentMethodId;
      if (createPaymentDto.metadata)
        paymentIntentParams.metadata = createPaymentDto.metadata;
      if (createPaymentDto.captureMethod)
        paymentIntentParams.captureMethod = createPaymentDto.captureMethod;
      if (createPaymentDto.confirmationMethod)
        paymentIntentParams.confirmationMethod =
          createPaymentDto.confirmationMethod;
      if (createPaymentDto.receiptEmail)
        paymentIntentParams.receiptEmail = createPaymentDto.receiptEmail;
      if (createPaymentDto.statementDescriptor)
        paymentIntentParams.statementDescriptor =
          createPaymentDto.statementDescriptor;
      if (createPaymentDto.statementDescriptorSuffix)
        paymentIntentParams.statementDescriptorSuffix =
          createPaymentDto.statementDescriptorSuffix;

      const stripePaymentIntent =
        await this.stripeService.createPaymentIntent(paymentIntentParams);

      // Create payment record in database
      const paymentData: any = {
        tenantId: createPaymentDto.tenantId,
        userId: createPaymentDto.userId,
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        stripePaymentIntentId: stripePaymentIntent.id,
        stripePaymentIntent: stripePaymentIntent,
        status: this.mapStripeStatusToPaymentStatus(stripePaymentIntent.status),
        type: PaymentType.ONE_TIME,
      };

      if (createPaymentDto.paymentMethodId)
        paymentData.paymentMethodId = createPaymentDto.paymentMethodId;
      if (createPaymentDto.description)
        paymentData.description = createPaymentDto.description;
      if (createPaymentDto.metadata)
        paymentData.metadata = createPaymentDto.metadata;
      if (typeof stripePaymentIntent.customer === 'string')
        paymentData.stripeCustomerId = stripePaymentIntent.customer;

      const payment = this.paymentRepository.create(paymentData);

      const savedPayment = (await this.paymentRepository.save(payment))[0]!;

      // Create payment intent record
      const paymentIntentData: any = {
        tenantId: createPaymentDto.tenantId,
        userId: createPaymentDto.userId,
        paymentId: savedPayment.id,
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        stripePaymentIntentId: stripePaymentIntent.id,
        stripePaymentIntent: stripePaymentIntent,
        status: this.mapStripeStatusToPaymentIntentStatus(
          stripePaymentIntent.status
        ),
        captureMethod: stripePaymentIntent.capture_method,
        confirmationMethod: stripePaymentIntent.confirmation_method,
      };

      if (createPaymentDto.description)
        paymentIntentData.description = createPaymentDto.description;
      if (createPaymentDto.receiptEmail)
        paymentIntentData.receiptEmail = createPaymentDto.receiptEmail;
      if (createPaymentDto.statementDescriptor)
        paymentIntentData.statementDescriptor =
          createPaymentDto.statementDescriptor;
      if (createPaymentDto.statementDescriptorSuffix)
        paymentIntentData.statementDescriptorSuffix =
          createPaymentDto.statementDescriptorSuffix;
      if (createPaymentDto.metadata)
        paymentIntentData.metadata = createPaymentDto.metadata;
      if (typeof stripePaymentIntent.customer === 'string')
        paymentIntentData.stripeCustomerId = stripePaymentIntent.customer;
      if (typeof stripePaymentIntent.payment_method === 'string')
        paymentIntentData.stripePaymentMethodId =
          stripePaymentIntent.payment_method;
      if (stripePaymentIntent.client_secret)
        paymentIntentData.clientSecret = stripePaymentIntent.client_secret;

      const paymentIntent =
        this.paymentIntentRepository.create(paymentIntentData);

      await this.paymentIntentRepository.save(paymentIntent);

      this.logger.log(`Payment created successfully: ${savedPayment.id}`);
      return savedPayment;
    } catch (error: any) {
      this.logger.error(`Failed to create payment: ${error.message}`);
      throw error;
    }
  }

  // Confirm Payment
  async confirmPayment(confirmPaymentDto: ConfirmPaymentDto): Promise<Payment> {
    this.logger.log(
      `Confirming payment intent: ${confirmPaymentDto.paymentIntentId}`
    );

    try {
      // Confirm payment intent in Stripe
      const confirmParams: any = {};
      if (confirmPaymentDto.paymentMethodId)
        confirmParams.paymentMethod = confirmPaymentDto.paymentMethodId;
      if (confirmPaymentDto.returnUrl)
        confirmParams.returnUrl = confirmPaymentDto.returnUrl;
      if (confirmPaymentDto.receiptEmail)
        confirmParams.receiptEmail = confirmPaymentDto.receiptEmail;

      const stripePaymentIntent = await this.stripeService.confirmPaymentIntent(
        confirmPaymentDto.paymentIntentId,
        confirmParams
      );

      // Update payment record
      const payment = await this.paymentRepository.findOne({
        where: { stripePaymentIntentId: confirmPaymentDto.paymentIntentId },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      payment.status = this.mapStripeStatusToPaymentStatus(
        stripePaymentIntent.status
      );
      payment.stripePaymentIntent = stripePaymentIntent;
      if (stripePaymentIntent.status === 'succeeded') {
        payment.processedAt = new Date();
      }
      if (stripePaymentIntent.status === 'canceled') {
        payment.failedAt = new Date();
      }

      const updatedPayment = await this.paymentRepository.save(payment);

      // Update payment intent record
      const paymentIntent = await this.paymentIntentRepository.findOne({
        where: { stripePaymentIntentId: confirmPaymentDto.paymentIntentId },
      });

      if (paymentIntent) {
        paymentIntent.status = this.mapStripeStatusToPaymentIntentStatus(
          stripePaymentIntent.status
        );
        paymentIntent.stripePaymentIntent = stripePaymentIntent;
        if (stripePaymentIntent.status === 'succeeded') {
          paymentIntent.confirmedAt = new Date();
        }
        await this.paymentIntentRepository.save(paymentIntent);
      }

      this.logger.log(`Payment confirmed successfully: ${updatedPayment.id}`);
      return updatedPayment;
    } catch (error: any) {
      this.logger.error(`Failed to confirm payment: ${error.message}`);
      throw error;
    }
  }

  // Capture Payment
  async capturePayment(capturePaymentDto: CapturePaymentDto): Promise<Payment> {
    this.logger.log(
      `Capturing payment intent: ${capturePaymentDto.paymentIntentId}`
    );

    try {
      // Capture payment intent in Stripe
      const captureParams: any = {};
      if (capturePaymentDto.amount)
        captureParams.amount = capturePaymentDto.amount;
      if (capturePaymentDto.receiptEmail)
        captureParams.receiptEmail = capturePaymentDto.receiptEmail;
      if (capturePaymentDto.statementDescriptor)
        captureParams.statementDescriptor =
          capturePaymentDto.statementDescriptor;
      if (capturePaymentDto.statementDescriptorSuffix)
        captureParams.statementDescriptorSuffix =
          capturePaymentDto.statementDescriptorSuffix;

      const stripePaymentIntent = await this.stripeService.capturePaymentIntent(
        capturePaymentDto.paymentIntentId,
        captureParams
      );

      // Update payment record
      const payment = await this.paymentRepository.findOne({
        where: { stripePaymentIntentId: capturePaymentDto.paymentIntentId },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      payment.status = this.mapStripeStatusToPaymentStatus(
        stripePaymentIntent.status
      );
      payment.amountCaptured = stripePaymentIntent.amount_received;
      payment.stripePaymentIntent = stripePaymentIntent;
      payment.processedAt = new Date();

      const updatedPayment = await this.paymentRepository.save(payment);

      // Update payment intent record
      const paymentIntent = await this.paymentIntentRepository.findOne({
        where: { stripePaymentIntentId: capturePaymentDto.paymentIntentId },
      });

      if (paymentIntent) {
        paymentIntent.status = this.mapStripeStatusToPaymentIntentStatus(
          stripePaymentIntent.status
        );
        paymentIntent.amountReceived = stripePaymentIntent.amount_received;
        paymentIntent.stripePaymentIntent = stripePaymentIntent;
        paymentIntent.capturedAt = new Date();
        await this.paymentIntentRepository.save(paymentIntent);
      }

      this.logger.log(`Payment captured successfully: ${updatedPayment.id}`);
      return updatedPayment;
    } catch (error: any) {
      this.logger.error(`Failed to capture payment: ${error.message}`);
      throw error;
    }
  }

  // Cancel Payment
  async cancelPayment(
    paymentIntentId: string,
    reason?: string
  ): Promise<Payment> {
    this.logger.log(`Canceling payment intent: ${paymentIntentId}`);

    try {
      // Cancel payment intent in Stripe
      const stripePaymentIntent = await this.stripeService.cancelPaymentIntent(
        paymentIntentId,
        {
          cancellationReason: 'requested_by_customer',
        }
      );

      // Update payment record
      const payment = await this.paymentRepository.findOne({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      payment.status = this.mapStripeStatusToPaymentStatus(
        stripePaymentIntent.status
      );
      payment.stripePaymentIntent = stripePaymentIntent;
      payment.canceledAt = new Date();

      const updatedPayment = await this.paymentRepository.save(payment);

      // Update payment intent record
      const paymentIntent = await this.paymentIntentRepository.findOne({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (paymentIntent) {
        paymentIntent.status = this.mapStripeStatusToPaymentIntentStatus(
          stripePaymentIntent.status
        );
        paymentIntent.stripePaymentIntent = stripePaymentIntent;
        paymentIntent.canceledAt = new Date();
        if (reason) {
          paymentIntent.cancellationReason = reason;
        }
        await this.paymentIntentRepository.save(paymentIntent);
      }

      this.logger.log(`Payment canceled successfully: ${updatedPayment.id}`);
      return updatedPayment;
    } catch (error: any) {
      this.logger.error(`Failed to cancel payment: ${error.message}`);
      throw error;
    }
  }

  // Refund Payment
  async refundPayment(
    refundPaymentDto: RefundPaymentDto
  ): Promise<PaymentRefund> {
    this.logger.log(
      `Creating refund for payment: ${refundPaymentDto.paymentId}`
    );

    try {
      // Get payment record
      const payment = await this.paymentRepository.findOne({
        where: { id: refundPaymentDto.paymentId },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (!payment.stripeChargeId) {
        throw new BadRequestException('Payment has no charge to refund');
      }

      if (payment.amountRefunded >= payment.amountCaptured) {
        throw new BadRequestException(
          'Payment has already been fully refunded'
        );
      }

      const refundAmount = refundPaymentDto.amount || payment.refundableAmount;

      if (refundAmount > payment.refundableAmount) {
        throw new BadRequestException(
          'Refund amount exceeds refundable amount'
        );
      }

      // Create refund in Stripe
      const refundParams: any = {
        payment_intent: payment.stripePaymentIntentId,
        amount: refundAmount,
        metadata: {
          notes: refundPaymentDto.notes,
          tenantId: payment.tenantId,
          userId: payment.userId,
          ...refundPaymentDto.metadata,
        },
      };
      if (refundPaymentDto.reason) {
        refundParams.reason =
          refundPaymentDto.reason === RefundReason.REQUESTED_BY_CUSTOMER
            ? 'requested_by_customer'
            : refundPaymentDto.reason === RefundReason.DUPLICATE
              ? 'duplicate'
              : 'fraudulent';
      }

      const stripeRefund = await this.stripeService.createRefund(refundParams);

      // Create refund record
      const refundData: any = {
        tenantId: payment.tenantId,
        userId: payment.userId,
        paymentId: payment.id,
        amount: refundAmount,
        currency: payment.currency,
        stripeRefundId: stripeRefund.id,
        stripeChargeId: payment.stripeChargeId,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        stripeRefund: stripeRefund,
        status: this.mapStripeRefundStatusToRefundStatus(
          stripeRefund.status || 'pending'
        ),
      };

      if (refundPaymentDto.notes)
        refundData.description = refundPaymentDto.notes;
      if (refundPaymentDto.reason) refundData.reason = refundPaymentDto.reason;
      if (refundPaymentDto.metadata)
        refundData.metadata = refundPaymentDto.metadata;
      if (stripeRefund.status === 'succeeded')
        refundData.processedAt = new Date();

      const refund = this.paymentRefundRepository.create(refundData);
      const savedRefund = (await this.paymentRefundRepository.save(refund))[0]!;

      // Update payment record
      payment.amountRefunded += refundAmount;
      await this.paymentRepository.save(payment);

      this.logger.log(`Refund created successfully: ${savedRefund.id}`);
      return savedRefund;
    } catch (error: any) {
      this.logger.error(`Failed to create refund: ${error.message}`);
      throw error;
    }
  }

  // Get Payment
  async getPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['paymentMethod', 'refunds'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  // Get Payment Intent
  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    const paymentIntent = await this.paymentIntentRepository.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
      relations: ['payment'],
    });

    if (!paymentIntent) {
      throw new NotFoundException('Payment intent not found');
    }

    return paymentIntent;
  }

  // List Payments
  async listPayments(params: {
    tenantId: string;
    userId?: string;
    status?: PaymentStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ payments: Payment[]; total: number }> {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.tenantId = :tenantId', { tenantId: params.tenantId })
      .leftJoinAndSelect('payment.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('payment.refunds', 'refunds')
      .orderBy('payment.createdAt', 'DESC');

    if (params.userId) {
      query.andWhere('payment.userId = :userId', { userId: params.userId });
    }

    if (params.status) {
      query.andWhere('payment.status = :status', { status: params.status });
    }

    if (params.limit) {
      query.limit(params.limit);
    }

    if (params.offset) {
      query.offset(params.offset);
    }

    const [payments, total] = await query.getManyAndCount();

    return { payments, total };
  }

  // Update Payment from Stripe
  async updatePaymentFromStripe(
    stripePaymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentIntentId: stripePaymentIntent.id },
    });

    if (payment) {
      payment.status = this.mapStripeStatusToPaymentStatus(
        stripePaymentIntent.status
      );
      payment.stripePaymentIntent = stripePaymentIntent;
      if (stripePaymentIntent.status === 'succeeded') {
        payment.processedAt = new Date();
      }
      if (stripePaymentIntent.status === 'canceled') {
        payment.failedAt = new Date();
      }

      if (stripePaymentIntent.last_payment_error) {
        if (stripePaymentIntent.last_payment_error.code) {
          payment.failureCode = stripePaymentIntent.last_payment_error.code;
        }
        if (stripePaymentIntent.last_payment_error.message) {
          payment.failureMessage =
            stripePaymentIntent.last_payment_error.message;
        }
      }

      await this.paymentRepository.save(payment);
    }
  }

  // Utility Methods
  private mapStripeStatusToPaymentStatus(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'requires_payment_method':
      case 'requires_action':
        return PaymentStatus.REQUIRES_ACTION;
      case 'requires_confirmation':
        return PaymentStatus.REQUIRES_CONFIRMATION;
      case 'processing':
        return PaymentStatus.PROCESSING;
      case 'requires_capture':
        return PaymentStatus.REQUIRES_ACTION;
      case 'succeeded':
        return PaymentStatus.SUCCEEDED;
      case 'canceled':
        return PaymentStatus.CANCELED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private mapStripeStatusToPaymentIntentStatus(
    stripeStatus: string
  ): PaymentIntentStatus {
    switch (stripeStatus) {
      case 'requires_payment_method':
        return PaymentIntentStatus.REQUIRES_PAYMENT_METHOD;
      case 'requires_confirmation':
        return PaymentIntentStatus.REQUIRES_CONFIRMATION;
      case 'requires_action':
        return PaymentIntentStatus.REQUIRES_ACTION;
      case 'processing':
        return PaymentIntentStatus.PROCESSING;
      case 'requires_capture':
        return PaymentIntentStatus.REQUIRES_CAPTURE;
      case 'succeeded':
        return PaymentIntentStatus.SUCCEEDED;
      case 'canceled':
        return PaymentIntentStatus.CANCELED;
      default:
        return PaymentIntentStatus.REQUIRES_PAYMENT_METHOD;
    }
  }

  private mapStripeRefundStatusToRefundStatus(
    stripeStatus: string
  ): RefundStatus {
    switch (stripeStatus) {
      case 'pending':
        return RefundStatus.PENDING;
      case 'succeeded':
        return RefundStatus.SUCCEEDED;
      case 'failed':
        return RefundStatus.FAILED;
      case 'canceled':
        return RefundStatus.CANCELED;
      default:
        return RefundStatus.PENDING;
    }
  }
}
