import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationType } from '../entities/invitation.entity';

export class CreateInvitationDto {
  @ApiProperty({ description: 'Email address to invite' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'First name of the invitee' })
  @IsString()
  firstName!: string;

  @ApiProperty({ description: 'Last name of the invitee' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ description: 'Invitation type', enum: InvitationType })
  @IsOptional()
  @IsEnum(InvitationType)
  type?: InvitationType;

  @ApiPropertyOptional({ description: 'Role ID to assign' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Team IDs to add the user to' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamIds?: string[];

  @ApiPropertyOptional({ description: 'Custom message for the invitation' })
  @IsOptional()
  @IsString()
  message?: string;
}
