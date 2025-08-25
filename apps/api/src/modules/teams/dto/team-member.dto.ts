import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddTeamMemberDto {
  @ApiProperty({ description: 'User ID to add to team' })
  @IsString()
  userId!: string;

  @ApiPropertyOptional({ description: 'Role ID for the user in the team' })
  @IsOptional()
  @IsString()
  roleId?: string;
}

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({ description: 'Role ID for the user in the team' })
  @IsOptional()
  @IsString()
  roleId?: string;
}

export class TeamMemberResponseDto {
  @ApiProperty({ description: 'Team membership ID' })
  id!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'User email' })
  email!: string;

  @ApiProperty({ description: 'User first name' })
  firstName!: string;

  @ApiProperty({ description: 'User last name' })
  lastName!: string;

  @ApiPropertyOptional({ description: 'User avatar URL' })
  avatarUrl?: string;

  @ApiProperty({ description: 'Role in team' })
  role!: string;

  @ApiProperty({ description: 'Joined date' })
  joinedAt!: Date;
}

export class InviteTeamMemberDto {
  @ApiProperty({ description: 'Email address to invite' })
  @IsString()
  email!: string;

  @ApiProperty({ description: 'First name' })
  @IsString()
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ description: 'Role ID for the invited user' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Invitation message' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class TeamInvitationResponseDto {
  @ApiProperty({ description: 'Invitation ID' })
  id!: string;

  @ApiProperty({ description: 'Invited email' })
  email!: string;

  @ApiProperty({ description: 'Invitation status' })
  status!: string;

  @ApiProperty({ description: 'Invitation token' })
  token!: string;

  @ApiProperty({ description: 'Expires at' })
  expiresAt!: Date;

  @ApiProperty({ description: 'Created at' })
  createdAt!: Date;
}

export class AcceptTeamInvitationDto {
  @ApiProperty({ description: 'Invitation token' })
  @IsString()
  token!: string;
}

export class TeamAnalyticsDto {
  @ApiProperty({ description: 'Total team members' })
  totalMembers!: number;

  @ApiProperty({ description: 'Active members' })
  activeMembers!: number;

  @ApiProperty({ description: 'Team creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last activity date' })
  lastActivity!: Date;
}
