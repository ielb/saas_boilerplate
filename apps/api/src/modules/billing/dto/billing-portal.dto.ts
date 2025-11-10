import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsUUID,
  Min,
  Max,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  InvoiceStatus,
  SubscriptionStatus,
  SubscriptionBillingCycle,
  PaymentStatus,
} from '@app/shared';

// Query DTOs
export class BillingPortalQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

// Response DTOs
export class BillingPortalRecentPaymentDto {
  id!: string;
  amount!: number;
  currency!: string;
  status!: PaymentStatus;
  createdAt!: Date;
  invoiceNumber?: string;
}

export class BillingPortalSummaryDto {
  activeSubscriptions!: number;
  totalAmountDue!: number;
  unpaidInvoiceCount!: number;
  nextInvoiceDate?: Date;
  paymentMethodsCount!: number;
  recentPayments!: BillingPortalRecentPaymentDto[];
}

export class BillingPortalInvoiceLineItemDto {
  id!: string;
  description!: string;
  quantity!: number;
  unitPrice!: number;
  totalAmount!: number;
}

export class BillingPortalInvoiceDto {
  id!: string;
  invoiceNumber!: string;
  status!: InvoiceStatus;
  totalAmount!: number;
  currency!: string;
  issuedDate!: Date;
  dueDate?: Date;
  paidDate?: Date | null;
  description?: string | undefined;
  lineItems!: BillingPortalInvoiceLineItemDto[];
  downloadUrl!: string;
}

export class BillingPortalSubscriptionDto {
  id!: string;
  name!: string;
  description?: string | null;
  status!: SubscriptionStatus;
  billingCycle!: SubscriptionBillingCycle;
  amount!: number;
  currency!: string;
  currentPeriodStart?: Date | undefined;
  currentPeriodEnd?: Date | undefined;
  cancelAtPeriodEnd?: Date | undefined;
  trialEndDate?: Date | undefined;
  isTrial!: boolean;
  planName?: string | null;
  features!: Record<string, any>;
  limits!: Record<string, any>;
  canCancel!: boolean;
  canUpgrade!: boolean;
  canDowngrade!: boolean;
}

export class BillingPortalPaymentMethodDto {
  id!: string;
  type!: string;
  last4!: string;
  brand?: string | null;
  expiryMonth?: number | undefined;
  expiryYear?: number | undefined;
  isDefault!: boolean;
  isActive!: boolean;
  createdAt!: Date;
  canDelete!: boolean;
}

// Paginated response wrapper
export class PaginatedInvoicesDto {
  invoices!: BillingPortalInvoiceDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
  hasNext!: boolean;
  hasPrevious!: boolean;
}

// Success response DTOs
export class BillingPortalSuccessDto {
  success!: boolean;
  message!: string;
}

export class DownloadUrlDto {
  downloadUrl!: string;
  expiresAt!: Date;
}
