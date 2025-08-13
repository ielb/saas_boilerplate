import {
  IsString,
  IsOptional,
  IsUrl,
  IsBoolean,
  IsArray,
  IsObject,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BrandingTheme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

export enum LogoType {
  IMAGE = 'image',
  SVG = 'svg',
  TEXT = 'text',
}

export class LogoDto {
  @ApiPropertyOptional({
    description: 'Logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  url?: string;

  @ApiPropertyOptional({
    description: 'Logo type',
    enum: LogoType,
    example: LogoType.IMAGE,
  })
  @IsOptional()
  @IsEnum(LogoType)
  type?: LogoType;

  @ApiPropertyOptional({
    description: 'Logo alt text',
    example: 'Company Logo',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({
    description: 'Logo width in pixels',
    example: 200,
    minimum: 50,
    maximum: 1000,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'Width must be a number' })
  width?: string;

  @ApiPropertyOptional({
    description: 'Logo height in pixels',
    example: 60,
    minimum: 20,
    maximum: 300,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'Height must be a number' })
  height?: string;
}

export class ColorSchemeDto {
  @ApiPropertyOptional({
    description: 'Primary brand color (hex format)',
    example: '#FF5733',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Primary color must be a valid hex color (e.g., #FF5733)',
  })
  @MaxLength(7)
  primary?: string;

  @ApiPropertyOptional({
    description: 'Secondary brand color (hex format)',
    example: '#33FF57',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Secondary color must be a valid hex color (e.g., #33FF57)',
  })
  @MaxLength(7)
  secondary?: string;

  @ApiPropertyOptional({
    description: 'Accent color (hex format)',
    example: '#3357FF',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Accent color must be a valid hex color (e.g., #3357FF)',
  })
  @MaxLength(7)
  accent?: string;

  @ApiPropertyOptional({
    description: 'Background color (hex format)',
    example: '#FFFFFF',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Background color must be a valid hex color (e.g., #FFFFFF)',
  })
  @MaxLength(7)
  background?: string;

  @ApiPropertyOptional({
    description: 'Text color (hex format)',
    example: '#000000',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Text color must be a valid hex color (e.g., #000000)',
  })
  @MaxLength(7)
  text?: string;

  @ApiPropertyOptional({
    description: 'Success color (hex format)',
    example: '#28A745',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Success color must be a valid hex color (e.g., #28A745)',
  })
  @MaxLength(7)
  success?: string;

  @ApiPropertyOptional({
    description: 'Warning color (hex format)',
    example: '#FFC107',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Warning color must be a valid hex color (e.g., #FFC107)',
  })
  @MaxLength(7)
  warning?: string;

  @ApiPropertyOptional({
    description: 'Error color (hex format)',
    example: '#DC3545',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Error color must be a valid hex color (e.g., #DC3545)',
  })
  @MaxLength(7)
  error?: string;
}

export class TypographyDto {
  @ApiPropertyOptional({
    description: 'Primary font family',
    example: 'Inter, sans-serif',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryFont?: string;

  @ApiPropertyOptional({
    description: 'Secondary font family',
    example: 'Roboto, sans-serif',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  secondaryFont?: string;

  @ApiPropertyOptional({
    description: 'Heading font family',
    example: 'Poppins, sans-serif',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  headingFont?: string;

  @ApiPropertyOptional({
    description: 'Base font size in pixels',
    example: '16',
    pattern: '^\\d+$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'Base font size must be a number' })
  baseFontSize?: string;

  @ApiPropertyOptional({
    description: 'Line height ratio',
    example: '1.5',
    pattern: '^\\d+(\\.\\d+)?$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d+)?$/, { message: 'Line height must be a valid number' })
  lineHeight?: string;
}

export class UpdateTenantBrandingDto {
  @ApiPropertyOptional({
    description: 'Tenant logo configuration',
    type: LogoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LogoDto)
  logo?: LogoDto;

  @ApiPropertyOptional({
    description: 'Color scheme configuration',
    type: ColorSchemeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ColorSchemeDto)
  colors?: ColorSchemeDto;

  @ApiPropertyOptional({
    description: 'Typography configuration',
    type: TypographyDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TypographyDto)
  typography?: TypographyDto;

  @ApiPropertyOptional({
    description: 'Theme preference',
    enum: BrandingTheme,
    example: BrandingTheme.LIGHT,
  })
  @IsOptional()
  @IsEnum(BrandingTheme)
  theme?: BrandingTheme;

  @ApiPropertyOptional({
    description: 'Custom CSS for additional styling',
    example: '.custom-button { border-radius: 8px; }',
    maxLength: 10000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  customCss?: string;

  @ApiPropertyOptional({
    description: 'Favicon URL',
    example: 'https://example.com/favicon.ico',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  favicon?: string;

  @ApiPropertyOptional({
    description: 'Enable custom branding',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableCustomBranding?: boolean;

  @ApiPropertyOptional({
    description: 'Show tenant name in header',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  showTenantName?: boolean;

  @ApiPropertyOptional({
    description: 'Show tenant logo in header',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiPropertyOptional({
    description: 'Custom header text',
    example: 'Welcome to Our Platform',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  headerText?: string;

  @ApiPropertyOptional({
    description: 'Custom footer text',
    example: '© 2024 Our Company. All rights reserved.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerText?: string;

  @ApiPropertyOptional({
    description: 'Additional branding metadata',
    example: { brandGuidelines: 'https://example.com/guidelines' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class TenantBrandingResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Tenant branding updated successfully',
  })
  message!: string;

  @ApiProperty({
    description: 'Updated branding configuration',
    type: UpdateTenantBrandingDto,
  })
  branding!: UpdateTenantBrandingDto;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt!: Date;
}

export class GetTenantBrandingResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Tenant branding configuration',
    type: UpdateTenantBrandingDto,
  })
  branding!: UpdateTenantBrandingDto;

  @ApiProperty({
    description: 'Tenant information',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Acme Corporation',
      domain: 'acme.example.com',
    },
  })
  tenant!: {
    id: string;
    name: string;
    domain?: string;
  };

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt!: Date;
}

export class ValidateBrandingDto {
  @ApiProperty({
    description: 'Branding configuration to validate',
    type: UpdateTenantBrandingDto,
  })
  @ValidateNested()
  @Type(() => UpdateTenantBrandingDto)
  branding!: UpdateTenantBrandingDto;
}

export class BrandingValidationResponseDto {
  @ApiProperty({
    description: 'Validation success status',
    example: true,
  })
  isValid!: boolean;

  @ApiProperty({
    description: 'Validation errors if any',
    example: ['Primary color must be a valid hex color'],
    type: [String],
  })
  errors!: string[];

  @ApiProperty({
    description: 'Validation warnings if any',
    example: ['Logo URL is not accessible'],
    type: [String],
  })
  warnings!: string[];

  @ApiProperty({
    description: 'Preview URL for the branding configuration',
    example: 'https://preview.example.com/branding/123',
  })
  previewUrl?: string;
}
