import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Role level (numeric)' })
  @IsOptional()
  level?: number;

  @ApiPropertyOptional({ description: 'Parent role ID' })
  @IsOptional()
  @IsString()
  parentRoleId?: string;

  @ApiPropertyOptional({ description: 'Whether this is a system role' })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ description: 'Permission IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}
