import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';

export enum CancellationReason {
  USER_REQUEST = 'user_request',
  PAYMENT_FAILED = 'payment_failed',
  VIOLATION_TERMS = 'violation_terms',
  BUSINESS_DECISION = 'business_decision',
  TECHNICAL_ISSUES = 'technical_issues',
  OTHER = 'other',
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsEnum(CancellationReason)
  reason?: CancellationReason;

  @IsOptional()
  @IsString()
  customReason?: string;

  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @IsOptional()
  @IsBoolean()
  prorate?: boolean;

  @IsOptional()
  @IsBoolean()
  invoiceNow?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

