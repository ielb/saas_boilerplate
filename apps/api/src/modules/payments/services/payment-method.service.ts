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
  PaymentMethod,
  PaymentMethodType,
  PaymentMethodStatus,
} from '../entities/payment-method.entity';
import { StripeService } from './stripe.service';

export interface CreatePaymentMethodDto {
  tenantId: string;
  userId: string;
  type: PaymentMethodType;
  stripePaymentMethodId: string;
  stripeCustomerId: string;
  isDefault?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdatePaymentMethodDto {
  isDefault?: boolean;
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  metadata?: Record<string, any>;
}

@Injectable()
export class PaymentMethodService {
  private readonly logger = new Logger(PaymentMethodService.name);

  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    private readonly stripeService: StripeService
  ) {}

  // Create Payment Method
  async createPaymentMethod(
    createPaymentMethodDto: CreatePaymentMethodDto
  ): Promise<PaymentMethod> {
    this.logger.log(
      `Creating payment method for user ${createPaymentMethodDto.userId}`
    );

    try {
      // Get payment method details from Stripe
      const stripePaymentMethod = await this.stripeService.getPaymentMethod(
        createPaymentMethodDto.stripePaymentMethodId
      );

      // Create payment method record
      const paymentMethodData = {
        tenantId: createPaymentMethodDto.tenantId,
        userId: createPaymentMethodDto.userId,
        type: createPaymentMethodDto.type,
        status: PaymentMethodStatus.ACTIVE,
        stripePaymentMethodId: createPaymentMethodDto.stripePaymentMethodId,
        stripeCustomerId: createPaymentMethodDto.stripeCustomerId,
        isDefault: createPaymentMethodDto.isDefault || false,
        metadata: createPaymentMethodDto.metadata || {},
        ...this.extractPaymentMethodDetails(stripePaymentMethod),
      };

      const paymentMethod =
        this.paymentMethodRepository.create(paymentMethodData);

      // If this is the default payment method, unset other defaults
      if (paymentMethod.isDefault) {
        await this.unsetOtherDefaults(
          createPaymentMethodDto.tenantId,
          createPaymentMethodDto.userId
        );
      }

      const savedPaymentMethod =
        await this.paymentMethodRepository.save(paymentMethod);

      this.logger.log(
        `Payment method created successfully: ${savedPaymentMethod.id}`
      );
      return savedPaymentMethod;
    } catch (error) {
      this.logger.error(
        `Failed to create payment method: ${(error as Error).message}`
      );
      throw error;
    }
  }

  // Update Payment Method
  async updatePaymentMethod(
    paymentMethodId: string,
    updatePaymentMethodDto: UpdatePaymentMethodDto
  ): Promise<PaymentMethod> {
    this.logger.log(`Updating payment method: ${paymentMethodId}`);

    try {
      const paymentMethod = await this.paymentMethodRepository.findOne({
        where: { id: paymentMethodId },
      });

      if (!paymentMethod) {
        throw new NotFoundException('Payment method not found');
      }

      // Update fields
      if (updatePaymentMethodDto.isDefault !== undefined) {
        paymentMethod.isDefault = updatePaymentMethodDto.isDefault;

        // If setting as default, unset other defaults
        if (paymentMethod.isDefault) {
          await this.unsetOtherDefaults(
            paymentMethod.tenantId,
            paymentMethod.userId
          );
        }
      }

      if (updatePaymentMethodDto.billingDetails) {
        paymentMethod.billingDetails = {
          ...paymentMethod.billingDetails,
          ...updatePaymentMethodDto.billingDetails,
        };
      }

      if (updatePaymentMethodDto.metadata) {
        paymentMethod.metadata = {
          ...paymentMethod.metadata,
          ...updatePaymentMethodDto.metadata,
        };
      }

      const updatedPaymentMethod =
        await this.paymentMethodRepository.save(paymentMethod);

      this.logger.log(
        `Payment method updated successfully: ${updatedPaymentMethod.id}`
      );
      return updatedPaymentMethod;
    } catch (error) {
      this.logger.error(
        `Failed to update payment method: ${(error as Error).message}`
      );
      throw error;
    }
  }

  // Delete Payment Method
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    this.logger.log(`Deleting payment method: ${paymentMethodId}`);

    try {
      const paymentMethod = await this.paymentMethodRepository.findOne({
        where: { id: paymentMethodId },
      });

      if (!paymentMethod) {
        throw new NotFoundException('Payment method not found');
      }

      // Detach from Stripe
      await this.stripeService.detachPaymentMethod(
        paymentMethod.stripePaymentMethodId
      );

      // Delete from database
      await this.paymentMethodRepository.remove(paymentMethod);

      this.logger.log(
        `Payment method deleted successfully: ${paymentMethodId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete payment method: ${(error as Error).message}`
      );
      throw error;
    }
  }

  // Get Payment Method
  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    return paymentMethod;
  }

  // List Payment Methods
  async listPaymentMethods(params: {
    tenantId: string;
    userId: string;
    type?: PaymentMethodType;
    status?: PaymentMethodStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ paymentMethods: PaymentMethod[]; total: number }> {
    const query = this.paymentMethodRepository
      .createQueryBuilder('paymentMethod')
      .where('paymentMethod.tenantId = :tenantId', {
        tenantId: params.tenantId,
      })
      .andWhere('paymentMethod.userId = :userId', { userId: params.userId })
      .orderBy('paymentMethod.isDefault', 'DESC')
      .addOrderBy('paymentMethod.createdAt', 'DESC');

    if (params.type) {
      query.andWhere('paymentMethod.type = :type', { type: params.type });
    }

    if (params.status) {
      query.andWhere('paymentMethod.status = :status', {
        status: params.status,
      });
    }

    const total = await query.getCount();

    if (params.limit) {
      query.limit(params.limit);
    }

    if (params.offset) {
      query.offset(params.offset);
    }

    const paymentMethods = await query.getMany();

    return { paymentMethods, total };
  }

  // Set Default Payment Method
  async setDefaultPaymentMethod(
    paymentMethodId: string
  ): Promise<PaymentMethod> {
    this.logger.log(`Setting default payment method: ${paymentMethodId}`);

    try {
      const paymentMethod = await this.paymentMethodRepository.findOne({
        where: { id: paymentMethodId },
      });

      if (!paymentMethod) {
        throw new NotFoundException('Payment method not found');
      }

      // Unset other defaults
      await this.unsetOtherDefaults(
        paymentMethod.tenantId,
        paymentMethod.userId
      );

      // Set this as default
      paymentMethod.isDefault = true;
      const updatedPaymentMethod =
        await this.paymentMethodRepository.save(paymentMethod);

      this.logger.log(
        `Default payment method set successfully: ${updatedPaymentMethod.id}`
      );
      return updatedPaymentMethod;
    } catch (error) {
      this.logger.error(
        `Failed to set default payment method: ${(error as Error).message}`
      );
      throw error;
    }
  }

  // Get Default Payment Method
  async getDefaultPaymentMethod(
    tenantId: string,
    userId: string
  ): Promise<PaymentMethod | null> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: {
        tenantId,
        userId,
        isDefault: true,
        status: PaymentMethodStatus.ACTIVE,
      },
    });

    return paymentMethod;
  }

  // Update Payment Method from Stripe
  async updatePaymentMethodFromStripe(
    stripePaymentMethod: Stripe.PaymentMethod
  ): Promise<void> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { stripePaymentMethodId: stripePaymentMethod.id },
    });

    if (paymentMethod) {
      // Update payment method details
      const updatedDetails =
        this.extractPaymentMethodDetails(stripePaymentMethod);

      Object.assign(paymentMethod, updatedDetails);

      // Update status based on Stripe status
      if (stripePaymentMethod.customer === null) {
        paymentMethod.status = PaymentMethodStatus.INACTIVE;
      }

      await this.paymentMethodRepository.save(paymentMethod);
    }
  }

  // Utility Methods
  private async unsetOtherDefaults(
    tenantId: string,
    userId: string
  ): Promise<void> {
    await this.paymentMethodRepository
      .createQueryBuilder()
      .update(PaymentMethod)
      .set({ isDefault: false })
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('userId = :userId', { userId })
      .andWhere('isDefault = :isDefault', { isDefault: true })
      .execute();
  }

  private extractPaymentMethodDetails(
    stripePaymentMethod: Stripe.PaymentMethod
  ): Partial<PaymentMethod> {
    const details: Partial<PaymentMethod> = {};

    // Extract card details
    if (stripePaymentMethod.card) {
      details.cardBrand = stripePaymentMethod.card.brand;
      details.cardLast4 = stripePaymentMethod.card.last4;
      details.cardExpMonth = stripePaymentMethod.card.exp_month?.toString();
      details.cardExpYear = stripePaymentMethod.card.exp_year?.toString();
    }

    // Extract bank account details
    if (stripePaymentMethod.sepa_debit) {
      details.bankCurrency = 'eur'; // SEPA is always EUR
      if (stripePaymentMethod.sepa_debit.bank_code) {
        details.bankName = stripePaymentMethod.sepa_debit.bank_code;
      }
      if (stripePaymentMethod.sepa_debit.last4) {
        details.bankLast4 = stripePaymentMethod.sepa_debit.last4;
      }
      if (stripePaymentMethod.sepa_debit.country) {
        details.bankCountry = stripePaymentMethod.sepa_debit.country;
      }
    }

    // Extract billing details
    if (stripePaymentMethod.billing_details) {
      details.billingDetails = {
        ...(stripePaymentMethod.billing_details.name && {
          name: stripePaymentMethod.billing_details.name,
        }),
        ...(stripePaymentMethod.billing_details.email && {
          email: stripePaymentMethod.billing_details.email,
        }),
        ...(stripePaymentMethod.billing_details.phone && {
          phone: stripePaymentMethod.billing_details.phone,
        }),
        ...(stripePaymentMethod.billing_details.address && {
          address: {
            ...(stripePaymentMethod.billing_details.address.line1 && {
              line1: stripePaymentMethod.billing_details.address.line1,
            }),
            ...(stripePaymentMethod.billing_details.address.line2 && {
              line2: stripePaymentMethod.billing_details.address.line2,
            }),
            ...(stripePaymentMethod.billing_details.address.city && {
              city: stripePaymentMethod.billing_details.address.city,
            }),
            ...(stripePaymentMethod.billing_details.address.state && {
              state: stripePaymentMethod.billing_details.address.state,
            }),
            ...(stripePaymentMethod.billing_details.address.postal_code && {
              postalCode:
                stripePaymentMethod.billing_details.address.postal_code,
            }),
            ...(stripePaymentMethod.billing_details.address.country && {
              country: stripePaymentMethod.billing_details.address.country,
            }),
          },
        }),
      };
    }

    return details;
  }

  // Validate Payment Method
  async validatePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      const paymentMethod = await this.getPaymentMethod(paymentMethodId);

      if (!paymentMethod.isActive) {
        return false;
      }

      // Check if payment method is expired
      if (paymentMethod.isExpired) {
        return false;
      }

      // Verify with Stripe
      const stripePaymentMethod = await this.stripeService.getPaymentMethod(
        paymentMethod.stripePaymentMethodId
      );

      return stripePaymentMethod.customer !== null;
    } catch (error) {
      this.logger.error(
        `Failed to validate payment method: ${(error as Error).message}`
      );
      return false;
    }
  }
}
