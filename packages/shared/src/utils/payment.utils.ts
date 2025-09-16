import {
  PaymentStatus,
  PaymentType,
  PaymentMethodType,
  RefundReason,
} from '../types/payment.types';

/**
 * Format amount to currency string
 * @param amount - Amount in cents/smallest currency unit
 * @param currency - Currency code (e.g., 'usd', 'eur')
 * @param locale - Locale for formatting (e.g., 'en-US', 'de-DE')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'usd',
  locale: string = 'en-US'
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Convert from cents to dollars/euros/etc.
  const majorAmount = amount / 100;
  return formatter.format(majorAmount);
}

/**
 * Convert amount from major currency unit to smallest unit (e.g., dollars to cents)
 * @param amount - Amount in major currency unit
 * @param currency - Currency code
 * @returns Amount in smallest currency unit
 */
export function toSmallestCurrencyUnit(
  amount: number,
  currency: string = 'usd'
): number {
  // Most currencies use 2 decimal places (100 smallest units per major unit)
  const decimalPlaces = getCurrencyDecimalPlaces(currency);
  return Math.round(amount * Math.pow(10, decimalPlaces));
}

/**
 * Convert amount from smallest currency unit to major unit (e.g., cents to dollars)
 * @param amount - Amount in smallest currency unit
 * @param currency - Currency code
 * @returns Amount in major currency unit
 */
export function fromSmallestCurrencyUnit(
  amount: number,
  currency: string = 'usd'
): number {
  const decimalPlaces = getCurrencyDecimalPlaces(currency);
  return amount / Math.pow(10, decimalPlaces);
}

/**
 * Get the number of decimal places for a currency
 * @param currency - Currency code
 * @returns Number of decimal places
 */
function getCurrencyDecimalPlaces(currency: string): number {
  // Most currencies use 2 decimal places
  const standardCurrencies = ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'];

  if (currency.toLowerCase() === 'jpy') {
    return 0; // Japanese Yen has no decimal places
  }

  if (standardCurrencies.includes(currency.toLowerCase())) {
    return 2;
  }

  // Default to 2 decimal places for unknown currencies
  return 2;
}

/**
 * Validate payment amount
 * @param amount - Amount to validate
 * @param currency - Currency code
 * @returns Validation result
 */
export function validatePaymentAmount(
  amount: number,
  currency: string = 'usd'
): {
  isValid: boolean;
  error?: string;
} {
  if (amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }

  if (currency.toLowerCase() === 'jpy') {
    // Japanese Yen doesn't support decimal amounts
    if (amount % 1 !== 0) {
      return {
        isValid: false,
        error: 'Japanese Yen amounts must be whole numbers',
      };
    }
  }

  // Check for reasonable maximum amount (e.g., $1,000,000)
  const maxAmount = 100000000; // $1M in cents
  if (amount > maxAmount) {
    return { isValid: false, error: 'Amount exceeds maximum allowed limit' };
  }

  return { isValid: true };
}

/**
 * Validate currency code
 * @param currency - Currency code to validate
 * @returns Validation result
 */
export function validateCurrency(currency: string): {
  isValid: boolean;
  error?: string;
} {
  const supportedCurrencies = ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'];

  if (!currency || typeof currency !== 'string') {
    return { isValid: false, error: 'Currency code is required' };
  }

  if (!supportedCurrencies.includes(currency.toLowerCase())) {
    return { isValid: false, error: `Currency ${currency} is not supported` };
  }

  return { isValid: true };
}

/**
 * Check if payment status indicates success
 * @param status - Payment status
 * @returns True if payment is successful
 */
export function isPaymentSuccessful(status: PaymentStatus): boolean {
  return status === PaymentStatus.SUCCEEDED;
}

/**
 * Check if payment status indicates failure
 * @param status - Payment status
 * @returns True if payment failed
 */
export function isPaymentFailed(status: PaymentStatus): boolean {
  return status === PaymentStatus.FAILED || status === PaymentStatus.CANCELED;
}

/**
 * Check if payment status indicates pending action
 * @param status - Payment status
 * @returns True if payment requires action
 */
export function isPaymentPending(status: PaymentStatus): boolean {
  return [
    PaymentStatus.PENDING,
    PaymentStatus.PROCESSING,
    PaymentStatus.REQUIRES_ACTION,
    PaymentStatus.REQUIRES_CONFIRMATION,
  ].includes(status);
}

/**
 * Get payment method display name
 * @param type - Payment method type
 * @param details - Payment method details
 * @returns Display name for the payment method
 */
export function getPaymentMethodDisplayName(
  type: PaymentMethodType,
  details?: {
    cardBrand?: string;
    cardLast4?: string;
    bankName?: string;
    bankLast4?: string;
  }
): string {
  switch (type) {
    case PaymentMethodType.CARD:
      if (details?.cardBrand && details?.cardLast4) {
        return `${details.cardBrand} •••• ${details.cardLast4}`;
      }
      return 'Credit/Debit Card';

    case PaymentMethodType.BANK_ACCOUNT:
      if (details?.bankName && details?.bankLast4) {
        return `${details.bankName} •••• ${details.bankLast4}`;
      }
      return 'Bank Account';

    case PaymentMethodType.SEPA_DEBIT:
      return 'SEPA Direct Debit';

    case PaymentMethodType.IDEAL:
      return 'iDEAL';

    case PaymentMethodType.SOFORT:
      return 'Sofort';

    case PaymentMethodType.GIROPAY:
      return 'GiroPay';

    case PaymentMethodType.BANCONTACT:
      return 'Bancontact';

    default:
      return (type as string).replace('_', ' ').toUpperCase();
  }
}

/**
 * Mask sensitive payment information
 * @param value - Value to mask
 * @param type - Type of value to mask
 * @returns Masked value
 */
export function maskPaymentData(
  value: string,
  type: 'card' | 'bank' | 'email' | 'phone'
): string {
  if (!value) return value;

  switch (type) {
    case 'card':
      // Mask all but last 4 digits
      return value.replace(/\d(?=\d{4})/g, '*');

    case 'bank':
      // Mask all but last 4 digits
      return value.replace(/\d(?=\d{4})/g, '*');

    case 'email':
      // Mask middle part of email
      const [localPart, domain] = value.split('@');
      if (localPart && domain) {
        const maskedLocal =
          localPart.length > 2
            ? `${localPart.charAt(0)}***${localPart.charAt(localPart.length - 1)}`
            : localPart;
        return `${maskedLocal}@${domain}`;
      }
      return value;

    case 'phone':
      // Mask middle digits
      return value.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');

    default:
      return value;
  }
}

/**
 * Calculate refund amount based on payment and refund reason
 * @param paymentAmount - Original payment amount
 * @param refundReason - Reason for refund
 * @returns Suggested refund amount
 */
export function calculateRefundAmount(
  paymentAmount: number,
  refundReason: RefundReason
): number {
  switch (refundReason) {
    case RefundReason.FRAUDULENT:
      // Full refund for fraudulent charges
      return paymentAmount;

    case RefundReason.DUPLICATE:
      // Full refund for duplicate charges
      return paymentAmount;

    case RefundReason.REQUESTED_BY_CUSTOMER:
      // Full refund for customer requests
      return paymentAmount;

    case RefundReason.EXPIRED_UNCOLLECTED:
      // Full refund for expired/uncollected payments
      return paymentAmount;

    case RefundReason.PARTIAL_REFUND:
      // Partial refund - return 50% as default
      return Math.round(paymentAmount * 0.5);

    case RefundReason.OTHER:
      // Other reasons - return 75% as default
      return Math.round(paymentAmount * 0.75);

    default:
      return paymentAmount;
  }
}

/**
 * Generate payment reference number
 * @param prefix - Prefix for the reference
 * @param timestamp - Timestamp for uniqueness
 * @returns Generated reference number
 */
export function generatePaymentReference(
  prefix: string = 'PAY',
  timestamp?: number
): string {
  const ts = timestamp || Date.now();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${prefix}-${ts}-${random}`;
}

/**
 * Validate payment method type
 * @param type - Payment method type to validate
 * @returns Validation result
 */
export function validatePaymentMethodType(type: string): {
  isValid: boolean;
  error?: string;
} {
  const validTypes = Object.values(PaymentMethodType);

  if (!validTypes.includes(type as PaymentMethodType)) {
    return {
      isValid: false,
      error: `Invalid payment method type. Must be one of: ${validTypes.join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Check if payment method type supports recurring payments
 * @param type - Payment method type
 * @returns True if type supports recurring payments
 */
export function supportsRecurringPayments(type: PaymentMethodType): boolean {
  const recurringTypes = [
    PaymentMethodType.CARD,
    PaymentMethodType.SEPA_DEBIT,
    PaymentMethodType.BANK_ACCOUNT,
  ];

  return recurringTypes.includes(type);
}
