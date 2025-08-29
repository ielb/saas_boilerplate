import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { UserStatus } from '@app/shared';

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
}

export class BulkExportDto {
  @ApiProperty({ description: 'Fields to include in export', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(field => field.trim());
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  fields?: string[] = ['email', 'firstName', 'lastName', 'role', 'status'];

  @ApiProperty({
    description: 'Export format',
    enum: ExportFormat,
    default: ExportFormat.CSV,
  })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.CSV;

  @ApiProperty({ description: 'Filter by role', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ description: 'Filter by team', required: false })
  @IsOptional()
  @IsString()
  team?: string;

  @ApiProperty({ description: 'Filter by status', required: false })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({
    description: 'Filter by creation date (after)',
    required: false,
  })
  @IsOptional()
  @IsString()
  createdAfter?: string;

  @ApiProperty({
    description: 'Filter by creation date (before)',
    required: false,
  })
  @IsOptional()
  @IsString()
  createdBefore?: string;

  @ApiProperty({ description: 'Include inactive users', default: false })
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean = false;

  @ApiProperty({
    description: 'Maximum number of records to export',
    required: false,
  })
  @IsOptional()
  @IsString()
  maxRecords?: string;
}
