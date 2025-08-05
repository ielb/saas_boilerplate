import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsEmail,
  IsBoolean,
  IsArray,
  MinLength,
  MaxLength,
  Matches,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({
    description: 'Tenant name',
    example: 'Acme Corporation',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    description: 'Custom domain for the tenant',
    example: 'acme.example.com',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    {
      message: 'Domain must be a valid domain name (e.g., example.com)',
    }
  )
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({
    description: 'Tenant logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  logo?: string;

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
  primaryColor?: string;

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
  secondaryColor?: string;

  @ApiPropertyOptional({
    description: 'Tenant description',
    example: 'A leading technology company',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'contact@acme.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Street address',
    example: '123 Main Street',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'San Francisco',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'State or province',
    example: 'CA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '94105',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Timezone',
    example: 'America/Los_Angeles',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Locale',
    example: 'en-US',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Subscription plan',
    example: 'pro',
    default: 'free',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  plan?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of users (0 for unlimited)',
    example: 100,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUsers?: number;

  @ApiPropertyOptional({
    description: 'Maximum storage in bytes (0 for unlimited)',
    example: 1073741824, // 1GB
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStorage?: number;

  @ApiPropertyOptional({
    description: 'Enabled features',
    example: ['mfa_enforcement', 'advanced_analytics'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({
    description: 'Tenant settings',
    example: { theme: 'dark', notifications: true },
  })
  @IsOptional()
  settings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { industry: 'technology', size: 'enterprise' },
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Trial end date',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  trialEndsAt?: Date;

  @ApiPropertyOptional({
    description: 'Whether tenant is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
