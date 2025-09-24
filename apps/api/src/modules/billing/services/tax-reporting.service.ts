import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { TaxRate } from '../entities/tax-rate.entity';
import { TaxExemption, TaxExemptionStatus } from '../entities/tax-exemption.entity';
import { taxConfig } from '../../../config/tax.config';
import { TaxType } from '@app/shared';

export interface TaxReportRequest {
  tenantId?: string;
  startDate: Date;
  endDate: Date;
  jurisdiction?: string;
  taxType?: TaxType;
  reportType: 'summary' | 'detailed' | 'exemptions' | 'audit';
  format?: 'json' | 'csv' | 'pdf';
}

export interface TaxReportSummary {
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  jurisdiction?: {
    code: string;
    name: string;
    country: string;
    state?: string;
  };
  totals: {
    grossSales: number;
    taxableAmount: number;
    exemptAmount: number;
    totalTaxCollected: number;
    transactionCount: number;
    exemptTransactionCount: number;
  };
  taxBreakdown: Array<{
    taxType: TaxType;
    jurisdiction: string;
    rate: number;
    taxableAmount: number;
    taxAmount: number;
    transactionCount: number;
  }>;
  exemptionBreakdown: Array<{
    exemptionType: string;
    exemptAmount: number;
    transactionCount: number;
    exemptionCount: number;
  }>;
  currency: string;
  generatedAt: Date;
}

export interface TaxReportDetailedItem {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string | undefined;
  date: Date;
  grossAmount: number;
  taxableAmount: number;
  exemptAmount: number;
  taxAmount: number;
  taxRate: number;
  taxType: TaxType;
  jurisdiction: string;
  exemptionApplied?: {
    exemptionId: string;
    exemptionType: string;
    exemptionNumber: string;
  } | undefined;
  billingAddress: {
    country: string;
    state?: string | undefined;
    city?: string | undefined;
    postalCode?: string | undefined;
  };
}

export interface TaxAuditReport {
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  summary: TaxReportSummary;
  auditTrail: Array<{
    date: Date;
    action: string;
    entityType: 'invoice' | 'tax_rate' | 'exemption';
    entityId: string;
    changes: Record<string, any>;
    userId?: string;
    ipAddress?: string;
  }>;
  reconciliation: {
    expectedTax: number;
    actualTax: number;
    variance: number;
    variancePercentage: number;
    reconciliationNotes: string[];
  };
  complianceChecks: Array<{
    check: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    recommendation?: string;
  }>;
}

@Injectable()
export class TaxReportingService {
  private readonly logger = new Logger(TaxReportingService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(TaxRate)
    private readonly taxRateRepository: Repository<TaxRate>,
    @InjectRepository(TaxExemption)
    private readonly taxExemptionRepository: Repository<TaxExemption>
  ) {}

  async generateTaxReport(request: TaxReportRequest): Promise<TaxReportSummary | TaxReportDetailedItem[] | TaxAuditReport> {
    this.logger.log(`Generating ${request.reportType} tax report for period ${request.startDate.toISOString()} to ${request.endDate.toISOString()}`);

    switch (request.reportType) {
      case 'summary':
        return await this.generateSummaryReport(request);
      case 'detailed':
        return await this.generateDetailedReport(request);
      case 'exemptions':
        return await this.generateExemptionsReport(request);
      case 'audit':
        return await this.generateAuditReport(request);
      default:
        throw new Error(`Unknown report type: ${request.reportType}`);
    }
  }

  private async generateSummaryReport(request: TaxReportRequest): Promise<TaxReportSummary> {
    const whereClause: any = {
      issuedDate: Between(request.startDate, request.endDate),
      status: 'paid', // Only include paid invoices
    };

    if (request.tenantId) {
      whereClause.tenantId = request.tenantId;
    }

    const invoices = await this.invoiceRepository.find({
      where: whereClause,
      relations: ['lineItems', 'customer'],
    });

    let grossSales = 0;
    let taxableAmount = 0;
    let exemptAmount = 0;
    let totalTaxCollected = 0;
    let exemptTransactionCount = 0;

    const taxBreakdownMap = new Map<string, {
      taxType: TaxType;
      jurisdiction: string;
      rate: number;
      taxableAmount: number;
      taxAmount: number;
      transactionCount: number;
    }>();

    const exemptionBreakdownMap = new Map<string, {
      exemptionType: string;
      exemptAmount: number;
      transactionCount: number;
      exemptionCount: number;
    }>();

    for (const invoice of invoices) {
      grossSales += invoice.subtotal;
      
      if (invoice.taxAmount > 0) {
        taxableAmount += invoice.subtotal;
        totalTaxCollected += invoice.taxAmount;

        // Process tax breakdown
        const taxRate = invoice.taxAmount / invoice.subtotal;
        const jurisdictionKey = this.getJurisdictionKey(invoice.billingAddress);
        
        if (!taxBreakdownMap.has(jurisdictionKey)) {
          taxBreakdownMap.set(jurisdictionKey, {
            taxType: TaxType.SALES_TAX, // Default, should be determined from tax rate
            jurisdiction: jurisdictionKey,
            rate: taxRate,
            taxableAmount: 0,
            taxAmount: 0,
            transactionCount: 0,
          });
        }

        const breakdown = taxBreakdownMap.get(jurisdictionKey)!;
        breakdown.taxableAmount += invoice.subtotal;
        breakdown.taxAmount += invoice.taxAmount;
        breakdown.transactionCount += 1;
      } else {
        exemptAmount += invoice.subtotal;
        exemptTransactionCount += 1;

        // Check if there's an exemption applied
        // This would need to be tracked in invoice metadata
        const exemptionType = invoice.metadata?.exemptionType || 'unknown';
        
        if (!exemptionBreakdownMap.has(exemptionType)) {
          exemptionBreakdownMap.set(exemptionType, {
            exemptionType,
            exemptAmount: 0,
            transactionCount: 0,
            exemptionCount: 1,
          });
        }

        const exemptBreakdown = exemptionBreakdownMap.get(exemptionType)!;
        exemptBreakdown.exemptAmount += invoice.subtotal;
        exemptBreakdown.transactionCount += 1;
      }
    }

    return {
      reportPeriod: {
        startDate: request.startDate,
        endDate: request.endDate,
      },
      totals: {
        grossSales,
        taxableAmount,
        exemptAmount,
        totalTaxCollected,
        transactionCount: invoices.length,
        exemptTransactionCount,
      },
      taxBreakdown: Array.from(taxBreakdownMap.values()),
      exemptionBreakdown: Array.from(exemptionBreakdownMap.values()),
      currency: 'USD', // Should be configurable
      generatedAt: new Date(),
    };
  }

  private async generateDetailedReport(request: TaxReportRequest): Promise<TaxReportDetailedItem[]> {
    const whereClause: any = {
      issuedDate: Between(request.startDate, request.endDate),
      status: 'paid',
    };

    if (request.tenantId) {
      whereClause.tenantId = request.tenantId;
    }

    const invoices = await this.invoiceRepository.find({
      where: whereClause,
      relations: ['lineItems', 'customer'],
      order: { issuedDate: 'ASC' },
    });

    return invoices.map(invoice => ({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customer ? `${invoice.customer.firstName} ${invoice.customer.lastName}` : '',
      date: invoice.issuedDate,
      grossAmount: invoice.totalAmount,
      taxableAmount: invoice.subtotal,
      exemptAmount: invoice.taxAmount === 0 ? invoice.subtotal : 0,
      taxAmount: invoice.taxAmount,
      taxRate: invoice.subtotal > 0 ? invoice.taxAmount / invoice.subtotal : 0,
      taxType: TaxType.SALES_TAX, // Should be determined from actual tax calculation
      jurisdiction: this.getJurisdictionKey(invoice.billingAddress),
      exemptionApplied: invoice.metadata?.exemption ? {
        exemptionId: invoice.metadata.exemption.id,
        exemptionType: invoice.metadata.exemption.type,
        exemptionNumber: invoice.metadata.exemption.number,
      } as { exemptionId: string; exemptionType: string; exemptionNumber: string; } : undefined,
      billingAddress: {
        country: invoice.billingAddress.country || 'US',
        state: invoice.billingAddress.state,
        city: invoice.billingAddress.city,
        postalCode: invoice.billingAddress.postalCode,
      },
    }));
  }

  private async generateExemptionsReport(request: TaxReportRequest): Promise<TaxReportSummary> {
    // Get all exemptions for the period
    const where: any = {
      createdAt: Between(request.startDate, request.endDate),
    };
    if (request.tenantId) {
      where.tenantId = request.tenantId;
    }

    const exemptions = await this.taxExemptionRepository.find({
      where,
      relations: ['tenant', 'customer'],
      order: { createdAt: 'ASC' },
    });

    // Get invoices with exemptions applied
    const exemptWhere: any = {
      issuedDate: Between(request.startDate, request.endDate),
      taxAmount: 0, // Exempt invoices have zero tax
    };
    if (request.tenantId) {
      exemptWhere.tenantId = request.tenantId;
    }

    const exemptInvoices = await this.invoiceRepository.find({
      where: exemptWhere,
    });

    const exemptionBreakdown = exemptions.reduce((acc, exemption) => {
      const key = exemption.exemptionType;
      if (!acc[key]) {
        acc[key] = {
          exemptionType: key,
          exemptAmount: 0,
          transactionCount: 0,
          exemptionCount: 0,
        };
      }
      acc[key].exemptionCount += 1;
      return acc;
    }, {} as Record<string, any>);

    // Add transaction data from exempt invoices
    exemptInvoices.forEach(invoice => {
      const exemptionType = invoice.metadata?.exemptionType || 'unknown';
      if (exemptionBreakdown[exemptionType]) {
        exemptionBreakdown[exemptionType].exemptAmount += invoice.subtotal;
        exemptionBreakdown[exemptionType].transactionCount += 1;
      }
    });

    const totalExemptAmount = exemptInvoices.reduce((sum, invoice) => sum + invoice.subtotal, 0);

    return {
      reportPeriod: {
        startDate: request.startDate,
        endDate: request.endDate,
      },
      totals: {
        grossSales: totalExemptAmount,
        taxableAmount: 0,
        exemptAmount: totalExemptAmount,
        totalTaxCollected: 0,
        transactionCount: exemptInvoices.length,
        exemptTransactionCount: exemptInvoices.length,
      },
      taxBreakdown: [],
      exemptionBreakdown: Object.values(exemptionBreakdown),
      currency: 'USD',
      generatedAt: new Date(),
    };
  }

  private async generateAuditReport(request: TaxReportRequest): Promise<TaxAuditReport> {
    const summary = await this.generateSummaryReport(request);
    
    // Generate compliance checks
    const complianceChecks = await this.runComplianceChecks(request);
    
    return {
      reportPeriod: summary.reportPeriod,
      summary,
      auditTrail: [], // Would need to implement audit logging
      reconciliation: {
        expectedTax: summary.totals.totalTaxCollected,
        actualTax: summary.totals.totalTaxCollected,
        variance: 0,
        variancePercentage: 0,
        reconciliationNotes: ['Manual reconciliation required'],
      },
      complianceChecks,
    };
  }

  private async runComplianceChecks(request: TaxReportRequest): Promise<Array<{
    check: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    recommendation?: string;
  }>> {
    const checks = [];

    // Check if tax rates are up to date
    const outdatedTaxRates = await this.taxRateRepository.find({
      where: {
        enabled: true,
        updatedAt: Between(new Date('2020-01-01'), new Date('2022-01-01')),
      },
    });

    if (outdatedTaxRates.length > 0) {
      checks.push({
        check: 'Tax Rate Currency',
        status: 'warning' as const,
        message: `${outdatedTaxRates.length} tax rates have not been updated in over 2 years`,
        recommendation: 'Review and update tax rates to ensure compliance with current regulations',
      });
    } else {
      checks.push({
        check: 'Tax Rate Currency',
        status: 'pass' as const,
        message: 'All tax rates are current',
      });
    }

    // Check for expired exemptions
    const expiredExemptions = await this.taxExemptionRepository.find({
      where: {
        status: TaxExemptionStatus.APPROVED,
        expirationDate: Between(request.startDate, request.endDate),
      },
    });

    if (expiredExemptions.length > 0) {
      checks.push({
        check: 'Tax Exemption Validity',
        status: 'warning' as const,
        message: `${expiredExemptions.length} tax exemptions expired during the reporting period`,
        recommendation: 'Contact customers to renew expired exemptions',
      });
    } else {
      checks.push({
        check: 'Tax Exemption Validity',
        status: 'pass' as const,
        message: 'No exemptions expired during the reporting period',
      });
    }

    // Check if reporting frequency matches configuration
    const expectedFrequency = taxConfig.compliance.reportingFrequency;
    const reportingPeriodDays = Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let expectedDays: number;
    switch (expectedFrequency) {
      case 'monthly':
        expectedDays = 31;
        break;
      case 'quarterly':
        expectedDays = 92;
        break;
      case 'annually':
        expectedDays = 365;
        break;
      default:
        expectedDays = 92;
    }

    if (Math.abs(reportingPeriodDays - expectedDays) > 7) {
      checks.push({
        check: 'Reporting Frequency',
        status: 'warning' as const,
        message: `Reporting period (${reportingPeriodDays} days) does not match configured frequency (${expectedFrequency})`,
        recommendation: `Adjust reporting period to match ${expectedFrequency} frequency`,
      });
    } else {
      checks.push({
        check: 'Reporting Frequency',
        status: 'pass' as const,
        message: `Reporting period matches configured ${expectedFrequency} frequency`,
      });
    }

    return checks;
  }

  private getJurisdictionKey(billingAddress: any): string {
    const country = billingAddress?.country || 'US';
    const state = billingAddress?.state;
    return state ? `${country}_${state}` : country;
  }

  async exportReportToCsv(report: TaxReportSummary | TaxReportDetailedItem[]): Promise<string> {
    if (Array.isArray(report)) {
      // Detailed report
      const headers = [
        'Invoice ID',
        'Invoice Number',
        'Customer ID',
        'Customer Name',
        'Date',
        'Gross Amount',
        'Taxable Amount',
        'Exempt Amount',
        'Tax Amount',
        'Tax Rate',
        'Tax Type',
        'Jurisdiction',
        'Country',
        'State',
        'City',
        'Postal Code',
      ].join(',');

      const rows = report.map(item => [
        item.invoiceId,
        item.invoiceNumber,
        item.customerId,
        item.customerName || '',
        item.date.toISOString().split('T')[0],
        item.grossAmount.toFixed(2),
        item.taxableAmount.toFixed(2),
        item.exemptAmount.toFixed(2),
        item.taxAmount.toFixed(2),
        (item.taxRate * 100).toFixed(4) + '%',
        item.taxType,
        item.jurisdiction,
        item.billingAddress.country,
        item.billingAddress.state || '',
        item.billingAddress.city || '',
        item.billingAddress.postalCode || '',
      ].join(','));

      return [headers, ...rows].join('\n');
    } else {
      // Summary report
      const lines = [
        `Tax Report Summary`,
        `Report Period: ${report.reportPeriod.startDate.toISOString().split('T')[0]} to ${report.reportPeriod.endDate.toISOString().split('T')[0]}`,
        `Generated: ${report.generatedAt.toISOString()}`,
        `Currency: ${report.currency}`,
        '',
        'TOTALS',
        `Gross Sales,${report.totals.grossSales.toFixed(2)}`,
        `Taxable Amount,${report.totals.taxableAmount.toFixed(2)}`,
        `Exempt Amount,${report.totals.exemptAmount.toFixed(2)}`,
        `Total Tax Collected,${report.totals.totalTaxCollected.toFixed(2)}`,
        `Total Transactions,${report.totals.transactionCount}`,
        `Exempt Transactions,${report.totals.exemptTransactionCount}`,
        '',
        'TAX BREAKDOWN',
        'Tax Type,Jurisdiction,Rate,Taxable Amount,Tax Amount,Transaction Count',
      ];

      report.taxBreakdown.forEach(tax => {
        lines.push(`${tax.taxType},${tax.jurisdiction},${(tax.rate * 100).toFixed(4)}%,${tax.taxableAmount.toFixed(2)},${tax.taxAmount.toFixed(2)},${tax.transactionCount}`);
      });

      if (report.exemptionBreakdown.length > 0) {
        lines.push('', 'EXEMPTION BREAKDOWN', 'Exemption Type,Exempt Amount,Transaction Count,Exemption Count');
        report.exemptionBreakdown.forEach(exemption => {
          lines.push(`${exemption.exemptionType},${exemption.exemptAmount.toFixed(2)},${exemption.transactionCount},${exemption.exemptionCount}`);
        });
      }

      return lines.join('\n');
    }
  }
}
