import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  PermissionScope,
  PermissionResource,
} from '../entities/permission.entity';

export class PermissionQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by permission scope',
    enum: PermissionScope,
    example: PermissionScope.TENANT,
  })
  @IsOptional()
  @IsEnum(PermissionScope, { message: 'Invalid permission scope' })
  scope?: PermissionScope;

  @ApiPropertyOptional({
    description: 'Filter by permission resource',
    enum: PermissionResource,
    example: PermissionResource.USERS,
  })
  @IsOptional()
  @IsEnum(PermissionResource, { message: 'Invalid permission resource' })
  resource?: PermissionResource;
}
