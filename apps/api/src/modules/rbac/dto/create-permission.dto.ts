import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({ description: 'Permission name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Resource name' })
  @IsString()
  resource!: string;

  @ApiProperty({ description: 'Action name' })
  @IsString()
  action!: string;

  @ApiPropertyOptional({ description: 'Permission description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Role ID' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Additional conditions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditions?: string[];
}
