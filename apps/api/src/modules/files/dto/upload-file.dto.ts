import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FileVisibility } from '../entities/file.entity';

export class FileMetadataDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  version?: string;
}

export class FilePermissionsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  read?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  write?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  delete?: string[];
}

export class UploadFileDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsEnum(FileVisibility)
  visibility?: FileVisibility;

  @IsOptional()
  @ValidateNested()
  @Type(() => FileMetadataDto)
  metadata?: FileMetadataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FilePermissionsDto)
  permissions?: FilePermissionsDto;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  uploadSessionId?: string;

  @IsOptional()
  @IsBoolean()
  virusScan?: boolean = true;

  @IsOptional()
  @IsBoolean()
  generateThumbnail?: boolean = false;

  @IsOptional()
  @IsNumber()
  maxFileSize?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedExtensions?: string[];
}


