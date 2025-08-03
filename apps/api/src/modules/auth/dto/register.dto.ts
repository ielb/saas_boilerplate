import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    description:
      'User password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }
  )
  password!: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    minLength: 2,
  })
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  firstName!: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    minLength: 2,
  })
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  lastName!: string;

  @ApiProperty({
    description: 'Tenant/organization name',
    example: 'Acme Corporation',
    minLength: 2,
  })
  @IsNotEmpty({ message: 'Tenant name is required' })
  @MinLength(2, { message: 'Tenant name must be at least 2 characters long' })
  tenantName!: string;

  @ApiProperty({
    description: 'Acceptance of terms and conditions',
    example: true,
  })
  @IsBoolean({ message: 'Terms acceptance must be a boolean value' })
  acceptTerms!: boolean;

  @ApiPropertyOptional({
    description: 'Marketing consent for promotional emails',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Marketing consent must be a boolean value' })
  marketingConsent?: boolean;

  @ApiPropertyOptional({
    description: 'Tenant domain (optional)',
    example: 'acme.com',
  })
  @IsOptional()
  domain?: string;

  @ApiPropertyOptional({
    description: 'Tenant description',
    example: 'Leading software company specializing in SaaS solutions',
  })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Tenant contact email',
    example: 'contact@acme.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid contact email address' })
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Tenant contact phone',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Tenant address',
    example: '123 Business St',
  })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Tenant city',
    example: 'San Francisco',
  })
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'Tenant state/province',
    example: 'CA',
  })
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    description: 'Tenant postal code',
    example: '94105',
  })
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Tenant country',
    example: 'United States',
  })
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    description: 'Tenant timezone',
    example: 'America/Los_Angeles',
  })
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Tenant locale',
    example: 'en-US',
  })
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({
    description: 'Tenant currency',
    example: 'USD',
  })
  @IsOptional()
  currency?: string;
}
