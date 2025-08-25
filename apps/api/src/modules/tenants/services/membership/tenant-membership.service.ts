import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Tenant, UserTenantMembership } from '../../entities';
import { User } from '../../../users/entities/user.entity';
import { AuditEventType } from '../../../audit/entities/audit-log.entity';
import { AuditService } from '../../../audit/services/audit.service';
import { TenantCacheService } from '../cache/tenant-cache.service';
import { MembershipStatus, UserRole } from '@app/shared';

@Injectable()
export class TenantMembershipService {
  private readonly logger = new Logger(TenantMembershipService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(UserTenantMembership)
    private readonly membershipRepository: Repository<UserTenantMembership>,
    private readonly auditService: AuditService,
    private readonly cacheService: TenantCacheService
  ) {}

  /**
   * Add user to tenant (create membership)
   */
  async addUserToTenant(
    userId: string,
    tenantId: string,
    role: UserRole = UserRole.MEMBER,
    invitedBy?: string
  ): Promise<UserTenantMembership> {
    this.logger.debug(
      `Adding user ${userId} to tenant ${tenantId} with role ${role}`
    );

    // Check if membership already exists
    const existing = await this.membershipRepository.findOne({
      where: { userId, tenantId },
    });

    if (existing) {
      throw new BadRequestException('User is already a member of this tenant');
    }

    // Verify tenant exists
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Create membership
    const membership = this.membershipRepository.create({
      userId,
      tenantId,
      role,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
      ...(invitedBy && { invitedBy }),
    });

    const savedMembership = await this.membershipRepository.save(membership);

    // Clear user cache
    await this.cacheService.clearUserCache(userId);

    // Log the addition
    await this.auditService.logTenantSwitchEvent({
      eventType: AuditEventType.TENANT_MEMBERSHIP_CREATED,
      userId,
      toTenantId: tenantId,
      membershipId: Array.isArray(savedMembership)
        ? savedMembership[0]?.id
        : savedMembership.id,
      reason: `Added with role: ${role}`,
    });

    this.logger.log(
      `User ${userId} added to tenant ${tenantId} with role ${role}`
    );

    return Array.isArray(savedMembership)
      ? savedMembership[0]
      : savedMembership;
  }

  /**
   * Remove user from tenant (delete membership)
   */
  async removeUserFromTenant(userId: string, tenantId: string): Promise<void> {
    this.logger.debug(`Removing user ${userId} from tenant ${tenantId}`);

    const membership = await this.membershipRepository.findOne({
      where: { userId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('User membership not found');
    }

    // Check if this is the user's current tenant
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'tenantId'],
    });

    if (user?.tenantId === tenantId) {
      // Find another active membership to switch to
      const otherMembership = await this.membershipRepository.findOne({
        where: {
          userId,
          tenantId: Not(tenantId),
          status: MembershipStatus.ACTIVE,
        },
        order: { lastAccessedAt: 'DESC' },
      });

      if (otherMembership) {
        // Switch to another tenant
        await this.userRepository.update(
          { id: userId },
          { tenantId: otherMembership.tenantId }
        );
      } else {
        // No other active memberships, set tenantId to null
        await this.userRepository.update({ id: userId }, { tenantId: '' });
      }
    }

    // Soft delete the membership
    await this.membershipRepository.softDelete(membership.id);

    // Clear user cache
    await this.cacheService.clearUserCache(userId);

    // Log the removal
    await this.auditService.logTenantSwitchEvent({
      eventType: AuditEventType.TENANT_MEMBERSHIP_DELETED,
      userId,
      toTenantId: tenantId,
      membershipId: membership.id,
      reason: `Membership removed`,
    });

    this.logger.log(`User ${userId} removed from tenant ${tenantId}`);
  }

  /**
   * Get all tenant memberships for a user
   */
  async getUserTenantMemberships(userId: string): Promise<{
    memberships: UserTenantMembership[];
    currentTenantId: string | null;
    totalCount: number;
    activeCount: number;
    pendingCount: number;
  }> {
    this.logger.debug(`Getting tenant memberships for user: ${userId}`);

    // Check cache first
    const cacheKey = this.cacheService.getUserMembershipsKey(userId);
    const cached = await this.cacheService.get<{
      memberships: UserTenantMembership[];
      currentTenantId: string | null;
      totalCount: number;
      activeCount: number;
      pendingCount: number;
    }>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for user memberships: ${userId}`);
      return cached;
    }

    // Get user to find current tenant
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'tenantId'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all memberships with tenant and permission details
    const memberships = await this.membershipRepository.find({
      where: { userId },
      relations: ['tenant', 'permissions'],
      order: { lastAccessedAt: 'DESC', joinedAt: 'DESC' },
    });

    let activeCount = 0;
    let pendingCount = 0;

    for (const membership of memberships) {
      if (membership.status === MembershipStatus.ACTIVE) {
        activeCount++;
      } else if (membership.status === MembershipStatus.PENDING) {
        pendingCount++;
      }
    }

    const response = {
      memberships,
      currentTenantId: user.tenantId,
      totalCount: memberships.length,
      activeCount,
      pendingCount,
    };

    // Cache the result
    await this.cacheService.set(cacheKey, response, 300); // 5 minutes

    return response;
  }
}
