export enum BillingStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PAID = 'paid',
  VOIDED = 'voided',
  OVERDUE = 'overdue',
  PARTIALLY_PAID = 'partially_paid',
  UNCOLLECTIBLE = 'uncollectible',
  CANCELLED = 'cancelled',
}

export enum BillingType {
  SUBSCRIPTION = 'subscription',
  USAGE = 'usage',
  ONE_TIME = 'one_time',
  CREDIT = 'credit',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
}

export enum BillingCycle {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUALLY = 'semi_annually',
  ANNUALLY = 'annually',
  CUSTOM = 'custom',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SENT = 'sent',
  PAID = 'paid',
  VOIDED = 'voided',
  OVERDUE = 'overdue',
  PARTIALLY_PAID = 'partially_paid',
  UNCOLLECTIBLE = 'uncollectible',
  CANCELLED = 'cancelled',
}

export enum InvoiceType {
  SUBSCRIPTION = 'subscription',
  USAGE = 'usage',
  ONE_TIME = 'one_time',
  CREDIT = 'credit',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
}

export enum PaymentTerms {
  DUE_ON_RECEIPT = 'due_on_receipt',
  NET_15 = 'net_15',
  NET_30 = 'net_30',
  NET_45 = 'net_45',
  NET_60 = 'net_60',
  NET_90 = 'net_90',
  CUSTOM = 'custom',
}

export enum TaxType {
  SALES_TAX = 'sales_tax',
  VAT = 'vat',
  GST = 'gst',
  HST = 'hst',
  PST = 'pst',
  QST = 'qst',
  CUSTOM = 'custom',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  FREE_TRIAL = 'free_trial',
  CREDIT = 'credit',
}

export enum LineItemType {
  SUBSCRIPTION = 'subscription',
  USAGE = 'usage',
  ONE_TIME = 'one_time',
  TAX = 'tax',
  DISCOUNT = 'discount',
  CREDIT = 'credit',
  ADJUSTMENT = 'adjustment',
}

export interface BillingAddress {
  name?: string;
  company?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  email?: string;
}

export interface TaxInfo {
  type: TaxType;
  rate: number;
  amount: number;
  jurisdiction?: string;
  taxId?: string;
  exempt?: boolean;
  exemptionReason?: string;
}

export interface DiscountInfo {
  type: DiscountType;
  value: number;
  description?: string;
  appliesTo?: string[];
  validFrom?: Date;
  validUntil?: Date;
  maxUses?: number;
  usedCount?: number;
}

export interface LineItem {
  id: string;
  type: LineItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: string;
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  metadata?: Record<string, any>;
  subscriptionId?: string;
  usageRecordId?: string;
  periodStart?: Date;
  periodEnd?: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  tenantId: string;
  customerId: string;
  subscriptionId?: string;
  billingAddress: BillingAddress;
  shippingAddress?: BillingAddress;
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  paymentTerms: PaymentTerms;
  dueDate: Date;
  issuedDate: Date;
  paidDate?: Date;
  voidedDate?: Date;
  notes?: string;
  footer?: string;
  metadata?: Record<string, any>;
  pdfUrl?: string;
  emailSent?: boolean;
  emailSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingCycleEntity {
  id: string;
  tenantId: string;
  subscriptionId?: string;
  cycleType: BillingCycle;
  startDate: Date;
  endDate: Date;
  billingDate: Date;
  status: BillingStatus;
  totalAmount: number;
  currency: string;
  invoiceId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingHistory {
  id: string;
  tenantId: string;
  type: BillingType;
  description: string;
  amount: number;
  currency: string;
  status: BillingStatus;
  referenceId?: string;
  referenceType?: string;
  invoiceId?: string;
  paymentId?: string;
  subscriptionId?: string;
  metadata?: Record<string, any>;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageBilling {
  id: string;
  tenantId: string;
  subscriptionId: string;
  billingPeriod: {
    startDate: Date;
    endDate: Date;
  };
  usageRecords: {
    metricType: string;
    metricName: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: BillingStatus;
  invoiceId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingTemplate {
  id: string;
  name: string;
  type: InvoiceType;
  tenantId?: string;
  isDefault: boolean;
  template: {
    header?: string;
    footer?: string;
    styles?: Record<string, any>;
    layout?: Record<string, any>;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoiceRequest {
  type: InvoiceType;
  tenantId: string;
  customerId: string;
  subscriptionId?: string;
  billingAddress: BillingAddress;
  shippingAddress?: BillingAddress;
  lineItems: Omit<LineItem, 'id'>[];
  paymentTerms?: PaymentTerms;
  dueDate?: Date;
  notes?: string;
  footer?: string;
  metadata?: Record<string, any>;
}

export interface UpdateInvoiceRequest {
  status?: InvoiceStatus;
  billingAddress?: BillingAddress;
  shippingAddress?: BillingAddress;
  lineItems?: LineItem[];
  paymentTerms?: PaymentTerms;
  dueDate?: Date;
  notes?: string;
  footer?: string;
  metadata?: Record<string, any>;
}

export interface CreateBillingCycleRequest {
  tenantId: string;
  subscriptionId?: string;
  cycleType: BillingCycle;
  startDate: Date;
  endDate: Date;
  billingDate: Date;
  metadata?: Record<string, any>;
}

export interface BillingAnalytics {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  averageInvoiceAmount: number;
  averagePaymentTime: number;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    invoices: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    totalRevenue: number;
    invoiceCount: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
}

export interface BillingReport {
  id: string;
  type: 'revenue' | 'invoices' | 'customers' | 'usage';
  tenantId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  filters?: Record<string, any>;
  data: any;
  generatedAt: Date;
  generatedBy: string;
  metadata?: Record<string, any>;
}

export interface BillingError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface BillingSuccessResponse {
  success: true;
  data:
    | Invoice
    | BillingCycle
    | BillingHistory
    | BillingAnalytics
    | BillingReport;
  message?: string;
}

export interface BillingErrorResponse {
  success: false;
  error: BillingError;
}

export type BillingResponse = BillingSuccessResponse | BillingErrorResponse;
