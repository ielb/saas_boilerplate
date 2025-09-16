import { IsOptional, IsDateString, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class BillingAnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month';

  @IsOptional()
  @IsString()
  currency?: string = 'USD';
}

export class BillingReportDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['revenue', 'invoices', 'customers', 'usage'])
  type?: string = 'revenue';

  @IsOptional()
  @IsString()
  format?: 'json' | 'csv' | 'pdf' = 'json';
}

