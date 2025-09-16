import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { SubscriptionBillingCycle, SubscriptionStatus } from '@app/shared';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsEnum(SubscriptionBillingCycle)
  billingCycle?: SubscriptionBillingCycle;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  trialEndDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  trialDays?: number;

  @IsOptional()
  @IsBoolean()
  isTrial?: boolean;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsString()
  stripePriceId?: string;

  @IsOptional()
  @IsString()
  stripeProductId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  features?: Record<string, any>;

  @IsOptional()
  @IsObject()
  limits?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  gracePeriodDays?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
