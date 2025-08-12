import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TenantCacheUtil } from '../utils/tenant-cache.util';

import { User, Tenant, UserTenantMembership } from '../../auth/entities';
import { AuditEventType } from '../../auth/entities/audit-log.entity';
import { JwtService } from '../../auth/services/jwt.service';
import { AuditService } from '../../auth/services/audit.service';
import { PermissionService } from '../../auth/services/permission.service';
import {
  TenantSwitchDto,
  TenantSwitchResponseDto,
  TenantMembershipDto,
  UserTenantMembershipsResponseDto,
  TenantAccessVerificationDto,
  TenantAccessResponseDto,
  BulkTenantAccessDto,
  BulkTenantAccessResponseDto,
} from '../dto';
import { MembershipStatus, UserRole } from '@app/shared';

@Injectable()
export class TenantSwitchingService {
  private readonly logger = new Logger(TenantSwitchingService.name);
  private readonly MEMBERSHIP_CACHE_TTL = 300; // 5 minutes
  private readonly ACCESS_CACHE_TTL = 60; // 1 minute

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(UserTenantMembership)
    private readonly membershipRepository: Repository<UserTenantMembership>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly permissionService: PermissionService,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly cacheUtil: TenantCacheUtil
  ) {}

  /**
   * Get all tenant memberships for a user
   */
  async getUserTenantMemberships(
    userId: string
  ): Promise<UserTenantMembershipsResponseDto> {
    this.logger.debug(`Getting tenant memberships for user: ${userId}`);

    // Check cache first
    const cacheKey = TenantCacheUtil.getUserMembershipsKey(userId);
    const cached =
      await this.cacheUtil.get<UserTenantMembershipsResponseDto>(cacheKey);
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

    const membershipDtos: TenantMembershipDto[] = [];
    let activeCount = 0;
    let pendingCount = 0;

    for (const membership of memberships) {
      const dto: TenantMembershipDto = {
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
        isCurrentTenant: membership.tenantId === user.tenantId,
        isActive: membership.isActive,
        isExpired: membership.isExpired,
      };

      membershipDtos.push(dto);

      if (membership.status === MembershipStatus.ACTIVE) {
        activeCount++;
      } else if (membership.status === MembershipStatus.PENDING) {
        pendingCount++;
      }
    }

    const response: UserTenantMembershipsResponseDto = {
      memberships: membershipDtos,
      currentTenantId: user.tenantId,
      totalCount: memberships.length,
      activeCount,
      pendingCount,
    };

    // Cache the result
    await this.cacheUtil.set(cacheKey, response, this.MEMBERSHIP_CACHE_TTL);

    return response;
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
      const newToken = await this.jwtService.generateAccessToken({
        sub: user.id,
        email: user.email,
        tenantId: switchDto.tenantId,
        role: membership.role,
      });

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
      await this.cacheUtil.clearUserCache(userId);
      const accessKey = TenantCacheUtil.getUserAccessKey(
        userId,
        switchDto.tenantId
      );
      await this.cacheUtil.del(accessKey);

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
  async verifyTenantAccess(
    userId: string,
    verificationDto: TenantAccessVerificationDto
  ): Promise<TenantAccessResponseDto> {
    this.logger.debug(
      `Verifying tenant access for user ${userId} to tenant: ${verificationDto.tenantId}`
    );

    // Check cache first
    const cacheKey = TenantCacheUtil.getUserAccessKey(
      userId,
      verificationDto.tenantId
    );
    const cached = await this.cacheUtil.get<TenantAccessResponseDto>(cacheKey);
    if (cached && !verificationDto.permissions?.length) {
      this.logger.debug(
        `Cache hit for user access: ${userId} -> ${verificationDto.tenantId}`
      );
      return cached;
    }

    const membership = await this.membershipRepository.findOne({
      where: {
        userId,
        tenantId: verificationDto.tenantId,
      },
      relations: ['tenant', 'permissions'],
    });

    if (!membership) {
      const response: TenantAccessResponseDto = {
        hasAccess: false,
        permissions: [],
        reason: 'User is not a member of this tenant',
      };

      // Log access denied
      await this.auditService.logTenantSwitchEvent({
        eventType: AuditEventType.TENANT_ACCESS_DENIED,
        userId,
        toTenantId: verificationDto.tenantId,
        reason: 'User is not a member of this tenant',
      });

      // Cache negative result for shorter time
      await this.cacheUtil.set(cacheKey, response, 30);
      return response;
    }

    if (!membership.isActive) {
      const response: TenantAccessResponseDto = {
        hasAccess: false,
        permissions: [],
        reason: `Membership status is ${membership.status}`,
      };

      // Log access denied due to inactive membership
      await this.auditService.logTenantSwitchEvent({
        eventType: AuditEventType.TENANT_ACCESS_DENIED,
        userId,
        toTenantId: verificationDto.tenantId,
        membershipId: membership.id,
        reason: `Membership status is ${membership.status}`,
      });

      await this.cacheUtil.set(cacheKey, response, 30);
      return response;
    }

    // Get user permissions for this tenant
    const permissions = membership.permissions?.map(p => p.getFullName()) || [];

    // Add role-based permissions
    const rolePermissions = await this.permissionService.getPermissionScopes();
    permissions.push(...rolePermissions.map((p: any) => p.getFullName()));

    const response: TenantAccessResponseDto = {
      hasAccess: true,
      role: membership.role,
      status: membership.status,
      permissions: [...new Set(permissions)], // Remove duplicates
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        ...(membership.tenant.domain && { domain: membership.tenant.domain }),
        plan: membership.tenant.plan,
        features: membership.tenant.features || [],
      },
    };

    // Check specific permissions if requested
    if (verificationDto.permissions?.length) {
      response.permissionChecks = {};
      for (const permission of verificationDto.permissions) {
        response.permissionChecks[permission] =
          permissions.includes(permission);
      }
    }

    // Log successful access verification (only for explicit verification requests)
    if (verificationDto.permissions?.length || verificationDto.resource) {
      await this.auditService.logTenantSwitchEvent({
        eventType: AuditEventType.TENANT_ACCESS_VERIFIED,
        userId,
        toTenantId: verificationDto.tenantId,
        membershipId: membership.id,
        reason: `Access verified for permissions: ${verificationDto.permissions?.join(', ') || 'general access'}`,
      });
    }

    // Cache the result
    await this.cacheUtil.set(cacheKey, response, this.ACCESS_CACHE_TTL);

    return response;
  }

  /**
   * Bulk verify user access to multiple tenants
   */
  async bulkVerifyTenantAccess(
    userId: string,
    bulkDto: BulkTenantAccessDto
  ): Promise<BulkTenantAccessResponseDto> {
    this.logger.debug(
      `Bulk verifying tenant access for user ${userId} to ${bulkDto.tenantIds.length} tenants`
    );

    const results: Record<string, TenantAccessResponseDto> = {};
    let accessGranted = 0;
    let accessDenied = 0;

    // Process each tenant in parallel
    const promises = bulkDto.tenantIds.map(async tenantId => {
      try {
        const result = await this.verifyTenantAccess(userId, {
          tenantId,
          ...(bulkDto.permissions && { permissions: bulkDto.permissions }),
        });

        results[tenantId] = result;

        if (result.hasAccess) {
          accessGranted++;
        } else {
          accessDenied++;
        }
      } catch (error) {
        this.logger.error(
          `Error verifying access to tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        results[tenantId] = {
          hasAccess: false,
          permissions: [],
          reason: 'Error verifying access',
        };
        accessDenied++;
      }
    });

    await Promise.all(promises);

    return {
      results,
      summary: {
        totalChecked: bulkDto.tenantIds.length,
        accessGranted,
        accessDenied,
      },
    };
  }

  /**
   * Get current tenant context for user
   */
  async getCurrentTenantContext(userId: string): Promise<{
    tenant: Tenant;
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
    await this.cacheUtil.clearUserCache(userId);
    this.logger.debug(`Cleared tenant switching cache for user: ${userId}`);
  }

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
    await this.clearUserCache(userId);

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
    await this.clearUserCache(userId);

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
}
