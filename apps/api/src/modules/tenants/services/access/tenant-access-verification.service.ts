import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTenantMembership } from '../../entities';
import { TenantAccessControlService } from './tenant-access-control.service';
import { TenantCacheService } from '../cache/tenant-cache.service';
import { PermissionService } from '../../../rbac/services/permission.service';
import { AuditService } from '../../../audit/services/audit.service';
import { AuditEventType } from '../../../audit/entities/audit-log.entity';
import {
  TenantAccessVerificationDto,
  TenantAccessResponseDto,
  BulkTenantAccessDto,
  BulkTenantAccessResponseDto,
} from '../../dto';

@Injectable()
export class TenantAccessVerificationService {
  private readonly logger = new Logger(TenantAccessVerificationService.name);
  private readonly ACCESS_CACHE_TTL = 60; // 1 minute

  constructor(
    @InjectRepository(UserTenantMembership)
    private readonly membershipRepository: Repository<UserTenantMembership>,
    private readonly accessControl: TenantAccessControlService,
    private readonly cacheService: TenantCacheService,
    private readonly permissionService: PermissionService,
    private readonly auditService: AuditService
  ) {}

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
    const cacheKey = this.cacheService.getUserAccessKey(
      userId,
      verificationDto.tenantId
    );
    const cached =
      await this.cacheService.get<TenantAccessResponseDto>(cacheKey);
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
      await this.cacheService.set(cacheKey, response, 30);
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

      await this.cacheService.set(cacheKey, response, 30);
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
    await this.cacheService.set(cacheKey, response, this.ACCESS_CACHE_TTL);

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
}
