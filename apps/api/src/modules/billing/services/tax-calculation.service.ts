import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxRate } from '../entities/tax-rate.entity';
import { TaxExemption, TaxExemptionStatus } from '../entities/tax-exemption.entity';
import { StripeService } from '../../payments/services/stripe.service';
import { taxConfig, getTaxJurisdictionByLocation } from '../../../config/tax.config';
import { TaxType, TaxInfo } from '@app/shared';

export interface TaxCalculationRequest {
  amount: number;
  currency: string;
  tenantId: string;
  customerId?: string;
  billingAddress: {
    country: string;
    state?: string;
    city?: string;
    postalCode?: string;
  };
  lineItems?: Array<{
    amount: number;
    description: string;
    taxable?: boolean;
    taxCode?: string;
  }>;
  exemptionId?: string;
}

export interface TaxCalculationResult {
  subtotal: number;
  totalTaxAmount: number;
  totalAmount: number;
  taxBreakdown: TaxInfo[];
  exemptionApplied?: {
    exemptionId: string;
    exemptionType: string;
    reason: string;
  };
  jurisdiction?: {
    code: string;
    name: string;
    country: string;
    state?: string;
  };
  calculationMethod: 'stripe' | 'manual' | 'external';
  metadata?: Record<string, any>;
}

@Injectable()
export class TaxCalculationService {
  private readonly logger = new Logger(TaxCalculationService.name);

  constructor(
    @InjectRepository(TaxRate)
    private readonly taxRateRepository: Repository<TaxRate>,
    @InjectRepository(TaxExemption)
    private readonly taxExemptionRepository: Repository<TaxExemption>,
    private readonly stripeService: StripeService
  ) {}

  async calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    this.logger.log(`Calculating tax for amount: ${request.amount} ${request.currency}`);

    try {
      // Check for tax exemption first
      const exemption = await this.checkTaxExemption(
        request.tenantId,
        request.customerId,
        request.exemptionId
      );

      if (exemption) {
        return this.createExemptResult(request, exemption);
      }

      // Calculate tax based on configured provider
      switch (taxConfig.provider) {
        case 'stripe':
          return await this.calculateWithStripe(request);
        case 'external':
          return await this.calculateWithExternalProvider(request);
        case 'manual':
        default:
          return await this.calculateManually(request);
      }
    } catch (error) {
      this.logger.error(`Tax calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
      // Fallback to manual calculation
      return await this.calculateManually(request);
    }
  }

  private async calculateWithStripe(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    if (!taxConfig.stripeConfig?.enabled) {
      throw new Error('Stripe Tax is not enabled');
    }

    this.logger.log('Calculating tax using Stripe Tax');

    try {
      // Use Stripe Tax API for calculation
      const taxCalculation = await this.stripeService.calculateTax({
        currency: request.currency.toLowerCase(),
        line_items: request.lineItems?.map(item => ({
          amount: Math.round(item.amount * 100), // Convert to cents
          reference: item.description,
          tax_code: item.taxCode || 'txcd_99999999', // Default tax code
        })) || [{
          amount: Math.round(request.amount * 100),
          reference: 'Service',
          tax_code: 'txcd_99999999',
        }],
        customer_details: {
          address: {
            country: request.billingAddress.country,
            ...(request.billingAddress.state && { state: request.billingAddress.state }),
            ...(request.billingAddress.city && { city: request.billingAddress.city }),
            ...(request.billingAddress.postalCode && { postal_code: request.billingAddress.postalCode }),
          },
          address_source: 'billing',
        },
        expand: ['line_items.data.tax_breakdown'],
      });

      return this.convertStripeResult(request, taxCalculation);
    } catch (error) {
      this.logger.error(`Stripe Tax calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Fallback to manual calculation
      return await this.calculateManually(request);
    }
  }

  private async calculateManually(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    this.logger.log('Calculating tax manually using local tax rates');

    // Find applicable tax rate
    const taxRate = await this.findApplicableTaxRate(
      request.billingAddress.country,
      request.billingAddress.state
    );

    if (!taxRate) {
      // No tax rate found, return zero tax
      return {
        subtotal: request.amount,
        totalTaxAmount: 0,
        totalAmount: request.amount,
        taxBreakdown: [],
        calculationMethod: 'manual',
        jurisdiction: {
          code: request.billingAddress.country,
          name: request.billingAddress.country,
          country: request.billingAddress.country,
          ...(request.billingAddress.state && { state: request.billingAddress.state }),
        },
      };
    }

    const taxAmount = taxRate.calculateTax(request.amount);

    return {
      subtotal: request.amount,
      totalTaxAmount: taxAmount,
      totalAmount: request.amount + taxAmount,
      taxBreakdown: [{
        type: taxRate.taxType,
        rate: taxRate.rate,
        amount: taxAmount,
        jurisdiction: taxRate.name,
        taxId: taxRate.jurisdictionCode,
      }],
      calculationMethod: 'manual',
      jurisdiction: {
        code: taxRate.jurisdictionCode,
        name: taxRate.name,
        country: taxRate.country,
        ...(taxRate.state && { state: taxRate.state }),
      },
    };
  }

  private async calculateWithExternalProvider(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    if (!taxConfig.externalConfig?.apiUrl) {
      throw new Error('External tax provider is not configured');
    }

    this.logger.log(`Calculating tax using external provider: ${taxConfig.externalConfig.provider}`);

    // Implement external provider integration here
    // This is a placeholder for third-party tax calculation services
    throw new Error('External tax provider integration not implemented');
  }

  private async findApplicableTaxRate(country: string, state?: string): Promise<TaxRate | null> {
    // First try to find state-specific rate
    if (state) {
      const stateRate = await this.taxRateRepository.findOne({
        where: {
          country: country.toUpperCase(),
          state: state.toUpperCase(),
          enabled: true,
        },
      });

      if (stateRate && stateRate.isValidForDate()) {
        return stateRate;
      }
    }

    // Fallback to country-level rate
    const countryRate = await this.taxRateRepository.findOne({
      where: {
        country: country.toUpperCase(),
        state: null as any,
        enabled: true,
      },
    });

    return countryRate && countryRate.isValidForDate() ? countryRate : null;
  }

  private async checkTaxExemption(
    tenantId: string,
    customerId?: string,
    exemptionId?: string
  ): Promise<TaxExemption | null> {
    if (exemptionId) {
      const exemption = await this.taxExemptionRepository.findOne({
        where: { id: exemptionId, status: TaxExemptionStatus.APPROVED },
      });

      if (exemption && exemption.isValid()) {
        return exemption;
      }
    }

    // Check for tenant-level exemption
    const tenantExemption = await this.taxExemptionRepository.findOne({
      where: {
        tenantId,
        customerId: null as any,
        status: TaxExemptionStatus.APPROVED,
      },
    });

    if (tenantExemption && tenantExemption.isValid()) {
      return tenantExemption;
    }

    // Check for customer-specific exemption
    if (customerId) {
      const customerExemption = await this.taxExemptionRepository.findOne({
        where: {
          tenantId,
          customerId,
          status: TaxExemptionStatus.APPROVED,
        },
      });

      if (customerExemption && customerExemption.isValid()) {
        return customerExemption;
      }
    }

    return null;
  }

  private createExemptResult(
    request: TaxCalculationRequest,
    exemption: TaxExemption
  ): TaxCalculationResult {
    return {
      subtotal: request.amount,
      totalTaxAmount: 0,
      totalAmount: request.amount,
      taxBreakdown: [],
      exemptionApplied: {
        exemptionId: exemption.id,
        exemptionType: exemption.exemptionType,
        reason: `Tax exempt: ${exemption.organizationName} (${exemption.exemptionNumber})`,
      },
      calculationMethod: 'manual',
      jurisdiction: {
        code: exemption.state ? `${exemption.country}_${exemption.state}` : exemption.country,
        name: exemption.state || exemption.country,
        country: exemption.country,
        ...(exemption.state && { state: exemption.state }),
      },
    };
  }

  private convertStripeResult(
    request: TaxCalculationRequest,
    stripeResult: any
  ): TaxCalculationResult {
    const taxBreakdown: TaxInfo[] = [];

    // Process Stripe tax breakdown
    if (stripeResult.line_items?.data) {
      for (const lineItem of stripeResult.line_items.data) {
        if (lineItem.tax_breakdown) {
          for (const tax of lineItem.tax_breakdown) {
            taxBreakdown.push({
              type: this.mapStripeTaxType(tax.jurisdiction?.type),
              rate: tax.tax_rate_details?.percentage_decimal / 100,
              amount: tax.tax_amount / 100, // Convert from cents
              jurisdiction: tax.jurisdiction?.display_name,
              taxId: tax.tax_rate_details?.tax_type,
            });
          }
        }
      }
    }

    const totalTaxAmount = stripeResult.tax_amount_exclusive / 100; // Convert from cents

    return {
      subtotal: request.amount,
      totalTaxAmount,
      totalAmount: request.amount + totalTaxAmount,
      taxBreakdown,
      calculationMethod: 'stripe',
      metadata: {
        stripeCalculationId: stripeResult.id,
        stripeLivemode: stripeResult.livemode,
      },
    };
  }

  private mapStripeTaxType(stripeType: string): TaxType {
    switch (stripeType?.toLowerCase()) {
      case 'vat':
        return TaxType.VAT;
      case 'gst':
        return TaxType.GST;
      case 'hst':
        return TaxType.HST;
      case 'pst':
        return TaxType.PST;
      case 'qst':
        return TaxType.QST;
      case 'sales_tax':
      default:
        return TaxType.SALES_TAX;
    }
  }

  // Public methods for managing tax rates and exemptions
  async createTaxRate(taxRateData: Partial<TaxRate>): Promise<TaxRate> {
    const taxRate = this.taxRateRepository.create(taxRateData);
    return await this.taxRateRepository.save(taxRate);
  }

  async updateTaxRate(id: string, updates: Partial<TaxRate>): Promise<TaxRate> {
    await this.taxRateRepository.update(id, updates);
    const updated = await this.taxRateRepository.findOne({ where: { id } });
    if (!updated) {
      throw new Error(`Tax rate with ID ${id} not found`);
    }
    return updated;
  }

  async getTaxRates(filters?: {
    country?: string;
    state?: string;
    enabled?: boolean;
  }): Promise<TaxRate[]> {
    const where: any = {};
    if (filters?.country) where.country = filters.country;
    if (filters?.state) where.state = filters.state;
    if (filters?.enabled !== undefined) where.enabled = filters.enabled;

    return await this.taxRateRepository.find({
      where: Object.keys(where).length > 0 ? where : undefined,
      order: { country: 'ASC', state: 'ASC' },
    });
  }

  async createTaxExemption(exemptionData: Partial<TaxExemption>): Promise<TaxExemption> {
    const exemption = this.taxExemptionRepository.create(exemptionData);
    return await this.taxExemptionRepository.save(exemption);
  }

  async getTaxExemptions(tenantId: string, customerId?: string): Promise<TaxExemption[]> {
    const where: any = { tenantId };
    if (customerId !== undefined) {
      where.customerId = customerId;
    }

    return await this.taxExemptionRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async validateTaxExemption(exemptionId: string): Promise<boolean> {
    const exemption = await this.taxExemptionRepository.findOne({
      where: { id: exemptionId },
    });

    if (!exemption) {
      return false;
    }

    // Update validation data
    exemption.validationData = {
      ...exemption.validationData,
      validatedAt: new Date(),
      validationMethod: 'manual',
      validationResult: exemption.isValid() ? 'valid' : 'invalid',
    };

    await this.taxExemptionRepository.save(exemption);
    return exemption.isValid();
  }
}
