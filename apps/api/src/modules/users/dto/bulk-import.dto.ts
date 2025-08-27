import {
  IsOptional,
  IsBoolean,
  IsObject,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FieldMappingDto {
  @ApiProperty({
    description: 'CSV column name for email field',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'CSV column name for first name field',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'CSV column name for last name field',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'CSV column name for role field',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({
    description: 'CSV column name for team field',
    required: false,
  })
  @IsOptional()
  @IsString()
  team?: string;

  @ApiProperty({
    description: 'CSV column name for phone field',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'CSV column name for status field',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class ValidationRulesDto {
  @ApiProperty({ description: 'Whether to require email field', default: true })
  @IsOptional()
  @IsBoolean()
  requireEmail?: boolean = true;

  @ApiProperty({
    description: 'Whether to allow duplicate emails',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowDuplicateEmails?: boolean = false;

  @ApiProperty({
    description: 'Default role for imported users',
    required: false,
  })
  @IsOptional()
  @IsString()
  defaultRole?: string;

  @ApiProperty({
    description: 'Default team for imported users',
    required: false,
  })
  @IsOptional()
  @IsString()
  defaultTeam?: string;

  @ApiProperty({ description: 'Whether to skip header row', default: true })
  @IsOptional()
  @IsBoolean()
  skipHeaderRow?: boolean = true;

  @ApiProperty({
    description: 'Maximum number of records to process',
    required: false,
  })
  @IsOptional()
  @IsString()
  maxRecords?: string;
}

export class BulkImportDto {
  @ApiProperty({ description: 'Field mapping configuration', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => FieldMappingDto)
  mapping?: FieldMappingDto;

  @ApiProperty({ description: 'Validation rules for import', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidationRulesDto)
  validationRules?: ValidationRulesDto;

  @ApiProperty({
    description: 'Additional options for import',
    required: false,
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}
