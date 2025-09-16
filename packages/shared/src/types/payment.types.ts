export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REQUIRES_ACTION = 'requires_action',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
}

export enum PaymentType {
  ONE_TIME = 'one_time',
  RECURRING = 'recurring',
  REFUND = 'refund',
  CHARGEBACK = 'chargeback',
}

export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'bank_account',
  SEPA_DEBIT = 'sepa_debit',
  IDEAL = 'ideal',
  SOFORT = 'sofort',
  GIROPAY = 'giropay',
  BANCONTACT = 'bancontact',
}

export enum PaymentMethodStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

export enum RefundStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export enum RefundReason {
  DUPLICATE = 'duplicate',
  FRAUDULENT = 'fraudulent',
  REQUESTED_BY_CUSTOMER = 'requested_by_customer',
  EXPIRED_UNCOLLECTED = 'expired_uncollected',
  PARTIAL_REFUND = 'partial_refund',
  OTHER = 'other',
}

export interface PaymentMethodDetails {
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: string;
  cardExpYear?: string;
  bankName?: string;
  bankLast4?: string;
  bankCountry?: string;
  bankCurrency?: string;
}

export interface BillingDetails {
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
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  status: PaymentMethodStatus;
  isDefault: boolean;
  details: PaymentMethodDetails;
  billingDetails: BillingDetails;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  status: PaymentStatus;
  type: PaymentType;
  amount: number;
  amountRefunded: number;
  amountCaptured: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
  paymentMethod?: PaymentMethod;
  refunds?: PaymentRefund[];
  processedAt?: Date;
  failedAt?: Date;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRefund {
  id: string;
  status: RefundStatus;
  reason: RefundReason;
  amount: number;
  currency: string;
  description?: string;
  notes?: string;
  metadata?: Record<string, any>;
  refundedBy?: string;
  processedAt?: Date;
  failedAt?: Date;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentRequest {
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

export interface ConfirmPaymentRequest {
  paymentIntentId: string;
  paymentMethodId?: string;
  returnUrl?: string;
  receiptEmail?: string;
}

export interface CapturePaymentRequest {
  paymentIntentId: string;
  amount?: number;
  receiptEmail?: string;
  statementDescriptor?: string;
  statementDescriptorSuffix?: string;
}

export interface RefundPaymentRequest {
  paymentId: string;
  amount?: number;
  reason?: RefundReason;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CreatePaymentMethodRequest {
  type: PaymentMethodType;
  stripePaymentMethodId: string;
  isDefault?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdatePaymentMethodRequest {
  isDefault?: boolean;
  billingDetails?: BillingDetails;
  metadata?: Record<string, any>;
}

export interface PaymentListResponse {
  payments: Payment[];
  total: number;
  limit?: number;
  offset?: number;
}

export interface PaymentMethodListResponse {
  paymentMethods: PaymentMethod[];
  total: number;
  limit?: number;
  offset?: number;
}

export interface PaymentError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaymentSuccessResponse {
  success: boolean;
  data: Payment | PaymentMethod | PaymentRefund;
  message?: string;
}

export interface PaymentErrorResponse {
  success: false;
  error: PaymentError;
}

export type PaymentResponse = PaymentSuccessResponse | PaymentErrorResponse;


