import { env } from '@app/config';

export interface TaxConfig {
  provider: 'stripe' | 'manual' | 'external';
  stripeConfig?: {
    enabled: boolean;
    automaticTax: boolean;
    taxBehavior: 'inclusive' | 'exclusive';
  };
  manualConfig?: {
    defaultTaxRate: number;
    enableRegionalTax: boolean;
  };
  externalConfig?: {
    apiUrl: string;
    apiKey: string;
    provider: string;
  };
  taxJurisdictions: TaxJurisdiction[];
  exemptionConfig: {
    enabled: boolean;
    requiresValidation: boolean;
    exemptionCodes: string[];
  };
  compliance: {
    enableTaxReporting: boolean;
    reportingFrequency: 'monthly' | 'quarterly' | 'annually';
    retentionPeriod: number; // in years
  };
}

export interface TaxJurisdiction {
  code: string;
  name: string;
  country: string;
  state?: string;
  taxType: 'sales_tax' | 'vat' | 'gst' | 'hst' | 'pst' | 'qst';
  rate: number;
  threshold?: number; // minimum amount before tax applies
  enabled: boolean;
}

export const taxConfig: TaxConfig = {
  provider: (env.TAX_PROVIDER as 'stripe' | 'manual' | 'external') || 'manual',
  stripeConfig: {
    enabled: env.STRIPE_TAX_ENABLED,
    automaticTax: env.STRIPE_AUTOMATIC_TAX,
    taxBehavior: (env.STRIPE_TAX_BEHAVIOR as 'inclusive' | 'exclusive') || 'exclusive',
  },
  manualConfig: {
    defaultTaxRate: parseFloat(env.DEFAULT_TAX_RATE || '0.08'), // 8% default
    enableRegionalTax: env.ENABLE_REGIONAL_TAX,
  },
  externalConfig: {
    apiUrl: env.EXTERNAL_TAX_API_URL || '',
    apiKey: env.EXTERNAL_TAX_API_KEY || '',
    provider: env.EXTERNAL_TAX_PROVIDER || '',
  },
  taxJurisdictions: [
    // US States
    {
      code: 'US_CA',
      name: 'California',
      country: 'US',
      state: 'CA',
      taxType: 'sales_tax',
      rate: 0.0725, // 7.25%
      enabled: true,
    },
    {
      code: 'US_NY',
      name: 'New York',
      country: 'US',
      state: 'NY',
      taxType: 'sales_tax',
      rate: 0.08, // 8%
      enabled: true,
    },
    {
      code: 'US_TX',
      name: 'Texas',
      country: 'US',
      state: 'TX',
      taxType: 'sales_tax',
      rate: 0.0625, // 6.25%
      enabled: true,
    },
    // Canada
    {
      code: 'CA_ON',
      name: 'Ontario',
      country: 'CA',
      state: 'ON',
      taxType: 'hst',
      rate: 0.13, // 13% HST
      enabled: true,
    },
    {
      code: 'CA_BC',
      name: 'British Columbia',
      country: 'CA',
      state: 'BC',
      taxType: 'gst',
      rate: 0.12, // 5% GST + 7% PST
      enabled: true,
    },
    // EU Countries
    {
      code: 'EU_DE',
      name: 'Germany',
      country: 'DE',
      taxType: 'vat',
      rate: 0.19, // 19% VAT
      enabled: true,
    },
    {
      code: 'EU_FR',
      name: 'France',
      country: 'FR',
      taxType: 'vat',
      rate: 0.20, // 20% VAT
      enabled: true,
    },
    {
      code: 'EU_GB',
      name: 'United Kingdom',
      country: 'GB',
      taxType: 'vat',
      rate: 0.20, // 20% VAT
      enabled: true,
    },
  ],
  exemptionConfig: {
    enabled: true,
    requiresValidation: true,
    exemptionCodes: [
      'NONPROFIT',
      'GOVERNMENT',
      'RESALE',
      'EXPORT',
      'EDUCATIONAL',
      'RELIGIOUS',
      'MEDICAL',
    ],
  },
  compliance: {
    enableTaxReporting: env.ENABLE_TAX_REPORTING,
    reportingFrequency: (env.TAX_REPORTING_FREQUENCY as 'monthly' | 'quarterly' | 'annually') || 'quarterly',
    retentionPeriod: parseInt(env.TAX_RETENTION_PERIOD || '7'), // 7 years default
  },
};

export const getTaxConfig = (): TaxConfig => taxConfig;

export const getTaxJurisdictionByLocation = (
  country: string,
  state?: string
): TaxJurisdiction | null => {
  const jurisdictionCode = state ? `${country}_${state}` : country;
  return taxConfig.taxJurisdictions.find(
    (jurisdiction) => jurisdiction.code === jurisdictionCode && jurisdiction.enabled
  ) || null;
};

export const getDefaultTaxRate = (): number => {
  return taxConfig.manualConfig?.defaultTaxRate || 0;
};
