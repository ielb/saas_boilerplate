import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsObject,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TaxType } from '@app/shared';
import { TaxExemptionType, TaxExemptionStatus } from '../entities/tax-exemption.entity';

export class TaxCalculationRequestDto {
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ValidateNested()
  @Type(() => TaxBillingAddressDto)
  billingAddress!: TaxBillingAddressDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxLineItemDto)
  lineItems?: TaxLineItemDto[];

  @IsOptional()
  @IsUUID()
  exemptionId?: string;
}

export class TaxBillingAddressDto {
  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class TaxLineItemDto {
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @IsOptional()
  @IsString()
  taxCode?: string;
}

export class CreateTaxRateDto {
  @IsString()
  @IsNotEmpty()
  jurisdictionCode!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @Transform(({ value }) => value.toUpperCase())
  country!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toUpperCase())
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsEnum(TaxType)
  taxType!: TaxType;

  @IsNumber()
  @Min(0)
  @Max(1)
  rate!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTaxRateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TaxType)
  taxType?: TaxType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateTaxExemptionDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsString()
  @IsNotEmpty()
  exemptionNumber!: string;

  @IsEnum(TaxExemptionType)
  exemptionType!: TaxExemptionType;

  @IsString()
  @IsNotEmpty()
  organizationName!: string;

  @IsString()
  @Transform(({ value }) => value.toUpperCase())
  country!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toUpperCase())
  state?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jurisdictions?: string[];

  @IsDateString()
  issueDate!: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  issuingAuthority?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentUrls?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTaxExemptionDto {
  @IsOptional()
  @IsEnum(TaxExemptionStatus)
  status?: TaxExemptionStatus;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jurisdictions?: string[];

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  issuingAuthority?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentUrls?: string[];

  @IsOptional()
  @IsObject()
  validationData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class TaxReportRequestDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsEnum(TaxType)
  taxType?: TaxType;

  @IsEnum(['summary', 'detailed', 'exemptions', 'audit'])
  reportType!: 'summary' | 'detailed' | 'exemptions' | 'audit';

  @IsOptional()
  @IsEnum(['json', 'csv', 'pdf'])
  format?: 'json' | 'csv' | 'pdf';
}

export class TaxRateQueryDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsEnum(TaxType)
  taxType?: TaxType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class TaxExemptionQueryDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsEnum(TaxExemptionStatus)
  status?: TaxExemptionStatus;

  @IsOptional()
  @IsEnum(TaxExemptionType)
  exemptionType?: TaxExemptionType;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  expiringSoon?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// Response DTOs
export class TaxCalculationResponseDto {
  subtotal!: number;
  totalTaxAmount!: number;
  totalAmount!: number;
  taxBreakdown!: Array<{
    type: TaxType;
    rate: number;
    amount: number;
    jurisdiction?: string;
    taxId?: string;
    exempt?: boolean;
    exemptionReason?: string;
  }>;
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
  calculationMethod!: 'stripe' | 'manual' | 'external';
  metadata?: Record<string, any>;
}

export class TaxRateResponseDto {
  id!: string;
  jurisdictionCode!: string;
  name!: string;
  country!: string;
  state?: string | undefined;
  city?: string | undefined;
  postalCode?: string | undefined;
  taxType!: TaxType;
  rate!: number;
  threshold?: number | undefined;
  enabled!: boolean;
  effectiveDate?: Date | undefined;
  expirationDate?: Date | undefined;
  description?: string | undefined;
  displayRate!: string;
  isValid!: boolean;
  metadata?: Record<string, any> | undefined;
  createdAt!: Date;
  updatedAt!: Date;
}

export class TaxExemptionResponseDto {
  id!: string;
  tenantId!: string;
  customerId?: string | undefined;
  exemptionNumber!: string;
  exemptionType!: TaxExemptionType;
  status!: TaxExemptionStatus;
  organizationName!: string;
  country!: string;
  state?: string | undefined;
  jurisdictions?: string[] | undefined;
  issueDate!: Date;
  expirationDate?: Date | undefined;
  issuingAuthority?: string | undefined;
  description?: string | undefined;
  notes?: string | undefined;
  documentUrls?: string[] | undefined;
  validationData?: Record<string, any> | undefined;
  metadata?: Record<string, any> | undefined;
  isValid!: boolean;
  daysUntilExpiration?: number | undefined;
  isExpiringSoon!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
