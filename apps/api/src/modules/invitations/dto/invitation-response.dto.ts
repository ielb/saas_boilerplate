import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvitationResponseDto {
  @ApiProperty({ description: 'Invitation unique identifier' })
  id!: string;

  @ApiProperty({ description: 'Invited email address' })
  email!: string;

  @ApiProperty({ description: 'Invited user first name' })
  firstName!: string;

  @ApiProperty({ description: 'Invited user last name' })
  lastName!: string;

  @ApiProperty({ description: 'Invitation status' })
  status!: string;

  @ApiProperty({ description: 'Invitation token' })
  token!: string;

  @ApiProperty({ description: 'Invitation expiry date' })
  expiresAt!: Date;

  @ApiProperty({ description: 'Invitation creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'Invitation last update date' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'Role assigned to the invitation' })
  role?: string;

  @ApiPropertyOptional({ description: 'Invitation message' })
  message?: string;
}

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Invitation token' })
  token!: string;

  @ApiProperty({ description: 'User first name' })
  firstName!: string;

  @ApiProperty({ description: 'User last name' })
  lastName!: string;

  @ApiProperty({ description: 'User password' })
  password!: string;
}

export class InvitationStatsDto {
  @ApiProperty({ description: 'Total invitations' })
  total!: number;

  @ApiProperty({ description: 'Pending invitations' })
  pending!: number;

  @ApiProperty({ description: 'Accepted invitations' })
  accepted!: number;

  @ApiProperty({ description: 'Expired invitations' })
  expired!: number;

  @ApiProperty({ description: 'Rejected invitations' })
  rejected!: number;
}
