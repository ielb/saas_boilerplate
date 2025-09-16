import {
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus, PaymentTerms } from '@app/shared';
import { BillingAddressDto, CreateLineItemDto } from './create-invoice.dto';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  billingAddress?: BillingAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BillingAddressDto)
  shippingAddress?: BillingAddressDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLineItemDto)
  lineItems?: CreateLineItemDto[];

  @IsOptional()
  @IsEnum(PaymentTerms)
  paymentTerms?: PaymentTerms;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  footer?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

