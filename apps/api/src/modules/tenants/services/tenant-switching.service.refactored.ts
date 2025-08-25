import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserTenantMembership } from '../entities';
import { AuditEventType } from '../../audit/entities/audit-log.entity';
import { AuditService } from '../../audit/services/audit.service';
import { TenantAccessControlService } from './access/tenant-access-control.service';
import { TenantAccessVerificationService } from './access/tenant-access-verification.service';
import { TenantMembershipService } from './membership/tenant-membership.service';
import { TenantCacheService } from './cache/tenant-cache.service';
import { TenantJwtService } from './auth/tenant-jwt.service';
import {
  TenantSwitchDto,
  TenantSwitchResponseDto,
  TenantMembershipDto,
  UserTenantMembershipsResponseDto,
} from '../dto';
import { MembershipStatus } from '@app/shared';

@Injectable()
export class TenantSwitchingService {
  private readonly logger = new Logger(TenantSwitchingService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserTenantMembership)
    private readonly membershipRepository: Repository<UserTenantMembership>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    private readonly accessControl: TenantAccessControlService,
    private readonly accessVerification: TenantAccessVerificationService,
    private readonly membershipService: TenantMembershipService,
    private readonly cacheService: TenantCacheService,
    private readonly jwtService: TenantJwtService
  ) {}

  /**
   * Get all tenant memberships for a user
   */
  async getUserTenantMemberships(
    userId: string
  ): Promise<UserTenantMembershipsResponseDto> {
    this.logger.debug(`Getting tenant memberships for user: ${userId}`);

    const result =
      await this.membershipService.getUserTenantMemberships(userId);

    // Transform to DTO format
    const membershipDtos: TenantMembershipDto[] = result.memberships.map(
      membership => ({
        id: membership.id,
        tenant: {
          id: membership.tenant.id,
          name: membership.tenant.name,
          ...(membership.tenant.domain && { domain: membership.tenant.domain }),
          plan: membership.tenant.plan,
          features: membership.tenant.features || [],
          settings: membership.tenant.settings || {},
        },
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt,
        ...(membership.lastAccessedAt && {
          lastAccessedAt: membership.lastAccessedAt,
        }),
        ...(membership.expiresAt && { expiresAt: membership.expiresAt }),
        permissions: membership.permissions?.map(p => p.getFullName()) || [],
        isCurrentTenant: membership.tenantId === result.currentTenantId,
        isActive: membership.isActive,
        isExpired: membership.isExpired,
      })
    );

    return {
      memberships: membershipDtos,
      currentTenantId: result.currentTenantId || '',
      totalCount: result.totalCount,
      activeCount: result.activeCount,
      pendingCount: result.pendingCount,
    };
  }

  /**
   * Switch user's current tenant context
   */
  async switchTenant(
    userId: string,
    switchDto: TenantSwitchDto
  ): Promise<TenantSwitchResponseDto> {
    this.logger.debug(
      `User ${userId} attempting to switch to tenant: ${switchDto.tenantId}`
    );

    return await this.dataSource.transaction(async manager => {
      // Verify user has access to the target tenant
      const membership = await manager.findOne(UserTenantMembership, {
        where: {
          userId,
          tenantId: switchDto.tenantId,
          status: MembershipStatus.ACTIVE,
        },
        relations: ['tenant', 'permissions'],
      });

      if (!membership) {
        this.logger.warn(
          `User ${userId} attempted to switch to unauthorized tenant: ${switchDto.tenantId}`
        );
        throw new ForbiddenException('You do not have access to this tenant');
      }

      if (!membership.isActive) {
        throw new ForbiddenException(
          'Your membership to this tenant is not active'
        );
      }

      // Get user and update current tenant
      const user = await manager.findOne(User, {
        where: { id: userId },
        select: ['id', 'email', 'tenantId', 'role'],
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const previousTenantId = user.tenantId;

      // Update user's current tenant
      await manager.update(
        User,
        { id: userId },
        { tenantId: switchDto.tenantId }
      );

      // Update membership's last accessed time
      membership.updateLastAccessed();
      await manager.save(UserTenantMembership, membership);

      // Generate new JWT with updated tenant context
      const newToken = await this.jwtService.generateTenantSwitchToken(
        user.id,
        user.email,
        switchDto.tenantId,
        membership.role
      );

      // Log the tenant switch for audit
      await this.auditService.logTenantSwitchEvent({
        eventType: AuditEventType.TENANT_SWITCHED,
        userId,
        userEmail: user.email,
        fromTenantId: previousTenantId,
        toTenantId: switchDto.tenantId,
        membershipId: membership.id,
        ...(switchDto.reason && { reason: switchDto.reason }),
      });

      // Clear user's membership cache
      await this.cacheService.clearUserCache(userId);
      const accessKey = this.cacheService.getUserAccessKey(
        userId,
        switchDto.tenantId
      );
      await this.cacheService.del(accessKey);

      this.logger.log(
        `User ${userId} successfully switched from tenant ${previousTenantId} to ${switchDto.tenantId}`
      );

      return {
        success: true,
        message: `Successfully switched to tenant: ${membership.tenant.name}`,
        tenantContext: {
          id: membership.tenant.id,
          name: membership.tenant.name,
          ...(membership.tenant.domain && { domain: membership.tenant.domain }),
          plan: membership.tenant.plan,
          features: membership.tenant.features || [],
          settings: membership.tenant.settings || {},
        },
        membership: {
          role: membership.role,
          status: membership.status,
          joinedAt: membership.joinedAt,
          lastAccessedAt: membership.lastAccessedAt || new Date(),
          permissions: membership.permissions?.map(p => p.getFullName()) || [],
        },
        accessToken: newToken,
      };
    });
  }

  /**
   * Verify user access to a specific tenant
   */
  async verifyTenantAccess(userId: string, verificationDto: any): Promise<any> {
    return await this.accessVerification.verifyTenantAccess(
      userId,
      verificationDto
    );
  }

  /**
   * Bulk verify user access to multiple tenants
   */
  async bulkVerifyTenantAccess(userId: string, bulkDto: any): Promise<any> {
    return await this.accessVerification.bulkVerifyTenantAccess(
      userId,
      bulkDto
    );
  }

  /**
   * Get current tenant context for user
   */
  async getCurrentTenantContext(userId: string): Promise<{
    tenant: any;
    membership: UserTenantMembership;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'tenantId'],
    });

    if (!user || !user.tenantId) {
      throw new NotFoundException('User has no current tenant context');
    }

    const membership = await this.membershipRepository.findOne({
      where: {
        userId,
        tenantId: user.tenantId,
      },
      relations: ['tenant', 'permissions'],
    });

    if (!membership) {
      throw new NotFoundException(
        'User membership not found for current tenant'
      );
    }

    return {
      tenant: membership.tenant,
      membership,
    };
  }

  /**
   * Clear user's tenant switching cache
   */
  async clearUserCache(userId: string): Promise<void> {
    await this.cacheService.clearUserCache(userId);
    this.logger.debug(`Cleared tenant switching cache for user: ${userId}`);
  }

  /**
   * Add user to tenant (create membership)
   */
  async addUserToTenant(
    userId: string,
    tenantId: string,
    role: any = 'member',
    invitedBy?: string
  ): Promise<UserTenantMembership> {
    return await this.membershipService.addUserToTenant(
      userId,
      tenantId,
      role,
      invitedBy
    );
  }

  /**
   * Remove user from tenant (delete membership)
   */
  async removeUserFromTenant(userId: string, tenantId: string): Promise<void> {
    return await this.membershipService.removeUserFromTenant(userId, tenantId);
  }
}
