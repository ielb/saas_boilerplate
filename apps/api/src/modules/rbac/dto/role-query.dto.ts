import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { RoleLevel } from '../entities/role.entity';

export class RoleQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by role level',
    enum: RoleLevel,
    example: RoleLevel.MEMBER,
  })
  @IsOptional()
  @IsEnum(RoleLevel, { message: 'Invalid role level' })
  level?: RoleLevel;
}
