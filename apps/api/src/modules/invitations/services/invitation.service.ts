import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '../../auth/services/jwt.service';
import { randomBytes } from 'crypto';
import {
  Invitation,
  InvitationStatus,
  InvitationType,
} from '../entities/invitation.entity';
import { InvitationRepository } from '../repositories/invitation.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { RoleRepository } from '../../rbac/repositories/role.repository';
import { EmailService } from '../../email/services/email.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  CreateInvitationDto,
  UpdateInvitationDto,
  InvitationQueryDto,
  AcceptInvitationDto,
  InvitationResponseDto,
  InvitationStatsDto,
} from '../dto/invitation.dto';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../rbac/entities/role.entity';

export interface IInvitationService {
  createInvitation(
    createDto: CreateInvitationDto,
    invitedBy: User,
    tenantId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<InvitationResponseDto>;

  getInvitations(
    query: InvitationQueryDto,
    tenantId: string
  ): Promise<{
    invitations: InvitationResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  getInvitationById(
    id: string,
    tenantId: string
  ): Promise<InvitationResponseDto>;

  updateInvitation(
    id: string,
    updateDto: UpdateInvitationDto,
    tenantId: string
  ): Promise<InvitationResponseDto>;

  revokeInvitation(
    id: string,
    tenantId: string,
    revokedBy: User
  ): Promise<void>;

  acceptInvitation(
    token: string,
    acceptDto: AcceptInvitationDto,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ user: User; invitation: InvitationResponseDto }>;

  resendInvitation(
    id: string,
    tenantId: string,
    resentBy: User
  ): Promise<InvitationResponseDto>;

  getInvitationStats(tenantId: string): Promise<InvitationStatsDto>;

  cleanupExpiredInvitations(): Promise<{ expired: number; deleted: number }>;
}

@Injectable()
export class InvitationService implements IInvitationService {
  private readonly INVITATION_EXPIRY_DAYS = 14;
  private readonly TOKEN_LENGTH = 32;

  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly jwtService: JwtService
  ) {}

  async createInvitation(
    createDto: CreateInvitationDto,
    invitedBy: User,
    tenantId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<InvitationResponseDto> {
    // Check if user already exists in the tenant
    const existingUser = await this.userRepository.findByEmail(createDto.email);
    if (existingUser) {
      throw new ConflictException('User already exists in this tenant');
    }

    // Check if invitation already exists
    const existingInvitation =
      await this.invitationRepository.findByEmailAndTenant(
        createDto.email,
        tenantId
      );
    if (existingInvitation && existingInvitation.isPending()) {
      throw new ConflictException(
        'Pending invitation already exists for this email'
      );
    }

    // Validate role if provided
    let role: Role | null = null;
    if (createDto.roleId) {
      role = await this.roleRepository.findOneByIdForTenant(createDto.roleId);
      if (!role) {
        throw new BadRequestException('Invalid role ID');
      }
    }

    // Create invitation
    const invitation = new Invitation();
    invitation.email = createDto.email.toLowerCase();
    invitation.type = createDto.type || InvitationType.TEAM_MEMBER;
    invitation.message = createDto.message || null;
    invitation.token = this.generateSecureToken();
    invitation.expiresAt = this.calculateExpiryDate();
    invitation.tenantId = tenantId;
    invitation.invitedById = invitedBy.id;
    invitation.roleId = role?.id || null;
    invitation.ipAddress = requestInfo?.ipAddress || null;
    invitation.userAgent = requestInfo?.userAgent || null;

    const savedInvitation = await this.invitationRepository.save(invitation);

    // Send invitation email
    await this.sendInvitationEmail(savedInvitation, invitedBy);

    // Audit log
    await this.auditService.logInvitationCreated(savedInvitation, invitedBy);

    return this.mapToResponseDto(savedInvitation);
  }

  async getInvitations(
    query: InvitationQueryDto,
    tenantId: string
  ): Promise<{
    invitations: InvitationResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { invitations, total } =
      await this.invitationRepository.findWithFilters(query, tenantId);

    const totalPages = Math.ceil(total / (query.limit || 10));

    return {
      invitations: invitations.map(inv => this.mapToResponseDto(inv)),
      total,
      page: query.page || 1,
      limit: query.limit || 10,
      totalPages,
    };
  }

  async getInvitationById(
    id: string,
    tenantId: string
  ): Promise<InvitationResponseDto> {
    const invitation = await this.invitationRepository.findByIdAndTenant(
      id,
      tenantId
    );
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return this.mapToResponseDto(invitation);
  }

  async updateInvitation(
    id: string,
    updateDto: UpdateInvitationDto,
    tenantId: string
  ): Promise<InvitationResponseDto> {
    const invitation = await this.invitationRepository.findByIdAndTenant(
      id,
      tenantId
    );
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (!invitation.canBeRevoked()) {
      throw new BadRequestException('Invitation cannot be updated');
    }

    // Validate role if provided
    if (updateDto.roleId) {
      const role = await this.roleRepository.findOneByIdForTenant(
        updateDto.roleId
      );
      if (!role) {
        throw new BadRequestException('Invalid role ID');
      }
      invitation.roleId = role.id;
    }

    if (updateDto.type !== undefined) {
      invitation.type = updateDto.type;
    }

    if (updateDto.message !== undefined) {
      invitation.message = updateDto.message;
    }

    const updatedInvitation = await this.invitationRepository.save(invitation);

    return this.mapToResponseDto(updatedInvitation);
  }

  async revokeInvitation(
    id: string,
    tenantId: string,
    revokedBy: User
  ): Promise<void> {
    const invitation = await this.invitationRepository.findByIdAndTenant(
      id,
      tenantId
    );
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (!invitation.canBeRevoked()) {
      throw new BadRequestException('Invitation cannot be revoked');
    }

    invitation.revoke();
    await this.invitationRepository.save(invitation);

    // Audit log
    await this.auditService.logInvitationRevoked(invitation, revokedBy);
  }

  async acceptInvitation(
    token: string,
    acceptDto: AcceptInvitationDto,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ user: User; invitation: InvitationResponseDto }> {
    const invitation = await this.invitationRepository.findByToken(token);
    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (!invitation.canBeAccepted()) {
      throw new BadRequestException('Invitation cannot be accepted');
    }

    // Check if user already exists
    let user = await this.userRepository.findByEmail(invitation.email);
    if (user) {
      // For now, we'll allow existing users to accept invitations
      // In a real implementation, you would check if they're already a member of this tenant
      // const existingMembership = await this.userRepository.findByEmailAndTenant(invitation.email, invitation.tenantId);
      // if (existingMembership) {
      //   throw new ConflictException('User is already a member of this tenant');
      // }
    } else {
      // Create new user
      const newUser = new User();
      newUser.email = invitation.email;
      newUser.firstName = acceptDto.firstName;
      newUser.lastName = acceptDto.lastName;
      newUser.password = acceptDto.password;
      newUser.emailVerified = true; // Invitation implies email verification
      user = await this.userRepository.save(newUser);
    }

    // Note: Tenant membership creation would be handled by the user lifecycle service
    // For now, we'll just save the user with the tenant context

    // Accept invitation
    invitation.accept(user);
    invitation.ipAddress = requestInfo?.ipAddress || null;
    invitation.userAgent = requestInfo?.userAgent || null;
    await this.invitationRepository.save(invitation);

    // Send welcome email
    await this.sendWelcomeEmail(invitation, user);

    // Audit log
    await this.auditService.logInvitationAccepted(invitation, user);

    return {
      user,
      invitation: this.mapToResponseDto(invitation),
    };
  }

  async resendInvitation(
    id: string,
    tenantId: string,
    resentBy: User
  ): Promise<InvitationResponseDto> {
    const invitation = await this.invitationRepository.findByIdAndTenant(
      id,
      tenantId
    );
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (!invitation.isPending()) {
      throw new BadRequestException('Only pending invitations can be resent');
    }

    // Generate new token and extend expiry
    invitation.token = this.generateSecureToken();
    invitation.expiresAt = this.calculateExpiryDate();
    invitation.ipAddress = null;
    invitation.userAgent = null;

    const updatedInvitation = await this.invitationRepository.save(invitation);

    // Resend invitation email
    await this.sendInvitationEmail(updatedInvitation, resentBy);

    // Audit log
    await this.auditService.logInvitationResent(updatedInvitation, resentBy);

    return this.mapToResponseDto(updatedInvitation);
  }

  async getInvitationStats(tenantId: string): Promise<InvitationStatsDto> {
    return this.invitationRepository.getStats(tenantId);
  }

  async cleanupExpiredInvitations(): Promise<{
    expired: number;
    deleted: number;
  }> {
    const expired = await this.invitationRepository.markExpiredInvitations();
    const deleted = await this.invitationRepository.deleteExpiredInvitations();

    return { expired, deleted };
  }

  private generateSecureToken(): string {
    return randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  private calculateExpiryDate(): Date {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.INVITATION_EXPIRY_DAYS);
    return expiryDate;
  }

  private async sendInvitationEmail(
    invitation: Invitation,
    invitedBy: User
  ): Promise<void> {
    const invitationUrl = `${process.env.FRONTEND_URL}/invite/${invitation.token}`;

    await this.emailService.sendInvitationEmail({
      to: invitation.email,
      invitationUrl,
      invitedBy: invitedBy,
      invitation: invitation,
      tenant: invitation.tenant,
    });
  }

  private async sendWelcomeEmail(
    invitation: Invitation,
    user: User
  ): Promise<void> {
    await this.emailService.sendWelcomeEmail(user, {
      invitation: invitation,
      tenant: invitation.tenant,
    });
  }

  private mapToResponseDto(invitation: Invitation): InvitationResponseDto {
    const dto: InvitationResponseDto = {
      id: invitation.id,
      email: invitation.email,
      type: invitation.type,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      tenantId: invitation.tenantId,
      invitedById: invitation.invitedById,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
      isExpired: invitation.isExpired(),
      canBeAccepted: invitation.canBeAccepted(),
      canBeRevoked: invitation.canBeRevoked(),
    };

    if (invitation.message) dto.message = invitation.message;
    if (invitation.acceptedAt) dto.acceptedAt = invitation.acceptedAt;
    if (invitation.revokedAt) dto.revokedAt = invitation.revokedAt;
    if (invitation.roleId) dto.roleId = invitation.roleId;
    if (invitation.acceptedById) dto.acceptedById = invitation.acceptedById;

    return dto;
  }
}
