import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
  IsObject,
  IsUUID,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UsageMetricType } from '@app/shared';

export class RecordUsageDto {
  @IsUUID()
  subscriptionId!: string;

  @IsUUID()
  tenantId!: string;

  @IsEnum(UsageMetricType)
  metricType!: UsageMetricType;

  @IsString()
  metricName!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  tags?: Record<string, string>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkRecordUsageDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordUsageDto)
  usageRecords!: RecordUsageDto[];
}

export class GetUsageAnalyticsDto {
  @IsUUID()
  subscriptionId!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class GetUsageHistoryDto {
  @IsUUID()
  subscriptionId!: string;

  @IsOptional()
  @IsString()
  metricName?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class GetTenantUsageSummaryDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UsageLimitResponseDto {
  @IsString()
  metricName!: string;

  @IsNumber()
  limit!: number;

  @IsNumber()
  currentUsage!: number;

  @IsNumber()
  percentage!: number;

  @IsOptional()
  isExceeded!: boolean;

  @IsOptional()
  isNearLimit!: boolean;
}

export class UsageAnalyticsResponseDto {
  @IsNumber()
  totalUsage!: number;

  @IsObject()
  usageByMetric!: Record<string, number>;

  @IsArray()
  usageTrends!: Array<{
    period: string;
    usage: number;
  }>;

  @IsArray()
  topMetrics!: Array<{
    metricName: string;
    usage: number;
    percentage: number;
  }>;
}

export class UsageAlertResponseDto {
  @IsString()
  type!: 'limit_exceeded' | 'near_limit' | 'usage_spike';

  @IsString()
  metricName!: string;

  @IsNumber()
  currentUsage!: number;

  @IsNumber()
  limit!: number;

  @IsNumber()
  percentage!: number;

  @IsString()
  message!: string;

  @IsString()
  severity!: 'low' | 'medium' | 'high' | 'critical';
}

export class TenantUsageSummaryResponseDto {
  @IsNumber()
  totalSubscriptions!: number;

  @IsNumber()
  activeSubscriptions!: number;

  @IsNumber()
  totalUsage!: number;

  @IsObject()
  usageByMetric!: Record<string, number>;

  @IsArray()
  topSubscriptions!: Array<{
    subscriptionId: string;
    totalUsage: number;
  }>;
}

