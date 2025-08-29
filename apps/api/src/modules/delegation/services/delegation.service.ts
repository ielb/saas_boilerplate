import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  Delegation,
  DelegationStatus,
  DelegationType,
  DelegationRepository,
  DelegationAuditLog,
} from '../entities/delegation.entity';
import {
  CreateDelegationDto,
  UpdateDelegationDto,
  ApproveDelegationDto,
  RejectDelegationDto,
  RevokeDelegationDto,
  ActivateDelegationDto,
  DelegationQueryDto,
  DelegationResponseDto,
  DelegationStatsDto,
} from '../dto/delegation.dto';
import { User } from '../../users/entities/user.entity';
import { Permission } from '../../rbac/entities/permission.entity';
import { EmailService } from '../../email/services/email.service';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class DelegationService {
  constructor(
    @InjectRepository(Delegation)
    private readonly delegationRepository: DelegationRepository,
    @InjectRepository(DelegationAuditLog)
    private readonly auditLogRepository: Repository<DelegationAuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Create a new delegation request
   */
  async createDelegation(
    createDelegationDto: CreateDelegationDto,
    delegatorId: string,
    tenantId: string,
    requestMetadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<DelegationResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate delegate exists and is in the same tenant
      const delegate = await this.userRepository.findOne({
        where: { id: createDelegationDto.delegateId, tenantId },
      });
      if (!delegate) {
        throw new NotFoundException('Delegate not found');
      }

      // Validate delegator exists
      const delegator = await this.userRepository.findOne({
        where: { id: delegatorId, tenantId },
      });
      if (!delegator) {
        throw new NotFoundException('Delegator not found');
      }

      // Validate approver if specified
      if (createDelegationDto.approverId) {
        const approver = await this.userRepository.findOne({
          where: { id: createDelegationDto.approverId, tenantId },
        });
        if (!approver) {
          throw new NotFoundException('Approver not found');
        }
      }

      // Validate permissions if specified
      let permissions: Permission[] = [];
      if (
        createDelegationDto.permissionIds &&
        createDelegationDto.permissionIds.length > 0
      ) {
        permissions = await this.permissionRepository.findByIds(
          createDelegationDto.permissionIds
        );
        if (permissions.length !== createDelegationDto.permissionIds.length) {
          throw new BadRequestException('Some permissions not found');
        }
      }

      // Validate expiration date
      if (new Date(createDelegationDto.expiresAt) <= new Date()) {
        throw new BadRequestException('Expiration date must be in the future');
      }

      // Determine initial status
      let status = DelegationStatus.PENDING;
      if (
        !createDelegationDto.requiresApproval &&
        !createDelegationDto.approverId
      ) {
        status = DelegationStatus.APPROVED;
      }

      // Create delegation
      const delegation = this.delegationRepository.create({
        ...createDelegationDto,
        delegatorId,
        tenantId,
        status,
        requestedAt: new Date(),
        permissions,
      });

      const savedDelegation = await queryRunner.manager.save(delegation);

      // Create audit log
      await this.createAuditLog(
        savedDelegation.id,
        delegatorId,
        tenantId,
        'delegation_created',
        'Delegation request created',
        requestMetadata
      );

      // Send notifications
      await this.sendDelegationNotifications(savedDelegation, 'created');

      await queryRunner.commitTransaction();

      return this.mapToResponseDto(savedDelegation);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Approve a delegation request
   */
  async approveDelegation(
    delegationId: string,
    approverId: string,
    tenantId: string,
    approveDto: ApproveDelegationDto,
    requestMetadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<DelegationResponseDto> {
    const delegation = await this.delegationRepository.findOneWithTenantScope({
      where: { id: delegationId },
      relations: ['permissions', 'delegator', 'delegate', 'approver'],
    });

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    if (delegation.status !== DelegationStatus.PENDING) {
      throw new BadRequestException('Delegation is not pending approval');
    }

    if (delegation.approverId && delegation.approverId !== approverId) {
      throw new ForbiddenException(
        'You are not authorized to approve this delegation'
      );
    }

    // Update delegation
    delegation.status = DelegationStatus.APPROVED;
    delegation.approvedAt = new Date();
    if (approveDto.approvalNotes) {
      delegation.approvalNotes = approveDto.approvalNotes;
    }

    const savedDelegation =
      await this.delegationRepository.saveWithTenantScope(delegation);

    // Create audit log
    await this.createAuditLog(
      delegationId,
      approverId,
      tenantId,
      'delegation_approved',
      `Delegation approved${approveDto.approvalNotes ? `: ${approveDto.approvalNotes}` : ''}`,
      requestMetadata
    );

    // Send notifications
    await this.sendDelegationNotifications(savedDelegation, 'approved');

    return this.mapToResponseDto(savedDelegation);
  }

  /**
   * Reject a delegation request
   */
  async rejectDelegation(
    delegationId: string,
    rejectorId: string,
    tenantId: string,
    rejectDto: RejectDelegationDto,
    requestMetadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<DelegationResponseDto> {
    const delegation = await this.delegationRepository.findOneWithTenantScope({
      where: { id: delegationId },
      relations: ['permissions', 'delegator', 'delegate', 'approver'],
    });

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    if (delegation.status !== DelegationStatus.PENDING) {
      throw new BadRequestException('Delegation is not pending approval');
    }

    if (delegation.approverId && delegation.approverId !== rejectorId) {
      throw new ForbiddenException(
        'You are not authorized to reject this delegation'
      );
    }

    // Update delegation
    delegation.status = DelegationStatus.REJECTED;
    delegation.rejectedAt = new Date();
    if (rejectDto.rejectionReason) {
      delegation.rejectionReason = rejectDto.rejectionReason;
    }

    const savedDelegation =
      await this.delegationRepository.saveWithTenantScope(delegation);

    // Create audit log
    await this.createAuditLog(
      delegationId,
      rejectorId,
      tenantId,
      'delegation_rejected',
      `Delegation rejected: ${rejectDto.rejectionReason}`,
      requestMetadata
    );

    // Send notifications
    await this.sendDelegationNotifications(savedDelegation, 'rejected');

    return this.mapToResponseDto(savedDelegation);
  }

  /**
   * Activate a delegation (make it active)
   */
  async activateDelegation(
    delegationId: string,
    userId: string,
    tenantId: string,
    activateDto: ActivateDelegationDto,
    requestMetadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<DelegationResponseDto> {
    const delegation = await this.delegationRepository.findOneWithTenantScope({
      where: { id: delegationId },
      relations: ['permissions', 'delegator', 'delegate', 'approver'],
    });

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    if (!delegation.canBeActivated()) {
      throw new BadRequestException('Delegation cannot be activated');
    }

    if (delegation.delegateId !== userId) {
      throw new ForbiddenException(
        'Only the delegate can activate the delegation'
      );
    }

    // Update delegation
    delegation.status = DelegationStatus.ACTIVE;
    delegation.activatedAt = new Date();

    const savedDelegation =
      await this.delegationRepository.saveWithTenantScope(delegation);

    // Create audit log
    await this.createAuditLog(
      delegationId,
      userId,
      tenantId,
      'delegation_activated',
      'Delegation activated',
      requestMetadata
    );

    // Send notifications
    await this.sendDelegationNotifications(savedDelegation, 'activated');

    return this.mapToResponseDto(savedDelegation);
  }

  /**
   * Revoke a delegation
   */
  async revokeDelegation(
    delegationId: string,
    revokerId: string,
    tenantId: string,
    revokeDto: RevokeDelegationDto,
    requestMetadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<DelegationResponseDto> {
    const delegation = await this.delegationRepository.findOneWithTenantScope({
      where: { id: delegationId },
      relations: ['permissions', 'delegator', 'delegate', 'approver'],
    });

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    if (!delegation.canBeRevoked()) {
      throw new BadRequestException('Delegation cannot be revoked');
    }

    // Check if user can revoke (delegator, delegate, or approver)
    const canRevoke =
      delegation.delegatorId === revokerId ||
      delegation.delegateId === revokerId ||
      delegation.approverId === revokerId;

    if (!canRevoke) {
      throw new ForbiddenException(
        'You are not authorized to revoke this delegation'
      );
    }

    // Update delegation
    delegation.status = DelegationStatus.REVOKED;
    delegation.revokedAt = new Date();
    if (revokeDto.revocationReason) {
      delegation.revocationReason = revokeDto.revocationReason;
    }

    const savedDelegation =
      await this.delegationRepository.saveWithTenantScope(delegation);

    // Create audit log
    await this.createAuditLog(
      delegationId,
      revokerId,
      tenantId,
      'delegation_revoked',
      `Delegation revoked: ${revokeDto.revocationReason}`,
      requestMetadata
    );

    // Send notifications
    await this.sendDelegationNotifications(savedDelegation, 'revoked');

    return this.mapToResponseDto(savedDelegation);
  }

  /**
   * Get delegation by ID
   */
  async getDelegationById(
    delegationId: string,
    tenantId: string
  ): Promise<DelegationResponseDto> {
    const delegation = await this.delegationRepository.findOneWithTenantScope({
      where: { id: delegationId },
      relations: ['permissions', 'delegator', 'delegate', 'approver'],
    });

    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    return this.mapToResponseDto(delegation);
  }

  /**
   * Get delegations with filtering and pagination
   */
  async getDelegations(
    query: DelegationQueryDto,
    tenantId: string
  ): Promise<{
    delegations: DelegationResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryBuilder = this.delegationRepository
      .createQueryBuilder('delegation')
      .leftJoinAndSelect('delegation.permissions', 'permissions')
      .leftJoinAndSelect('delegation.delegator', 'delegator')
      .leftJoinAndSelect('delegation.delegate', 'delegate')
      .leftJoinAndSelect('delegation.approver', 'approver')
      .where('delegation.tenantId = :tenantId', { tenantId });

    // Apply filters
    if (query.status) {
      queryBuilder.andWhere('delegation.status = :status', {
        status: query.status,
      });
    }

    if (query.delegationType) {
      queryBuilder.andWhere('delegation.delegationType = :delegationType', {
        delegationType: query.delegationType,
      });
    }

    if (query.delegatorId) {
      queryBuilder.andWhere('delegation.delegatorId = :delegatorId', {
        delegatorId: query.delegatorId,
      });
    }

    if (query.delegateId) {
      queryBuilder.andWhere('delegation.delegateId = :delegateId', {
        delegateId: query.delegateId,
      });
    }

    if (query.approverId) {
      queryBuilder.andWhere('delegation.approverId = :approverId', {
        approverId: query.approverId,
      });
    }

    if (query.isEmergency !== undefined) {
      queryBuilder.andWhere('delegation.isEmergency = :isEmergency', {
        isEmergency: query.isEmergency,
      });
    }

    if (query.isExpired !== undefined) {
      if (query.isExpired) {
        queryBuilder.andWhere('delegation.expiresAt <= :now', {
          now: new Date(),
        });
      } else {
        queryBuilder.andWhere('delegation.expiresAt > :now', {
          now: new Date(),
        });
      }
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(delegation.title ILIKE :search OR delegation.description ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    queryBuilder
      .orderBy('delegation.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const delegations = await queryBuilder.getMany();

    return {
      delegations: delegations.map(delegation =>
        this.mapToResponseDto(delegation)
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get active delegations for a user
   */
  async getActiveDelegationsForUser(
    userId: string,
    tenantId: string
  ): Promise<DelegationResponseDto[]> {
    const delegations =
      await this.delegationRepository.findActiveDelegationsForUser(
        userId,
        tenantId
      );
    return delegations.map(delegation => this.mapToResponseDto(delegation));
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovalsForUser(
    userId: string,
    tenantId: string
  ): Promise<DelegationResponseDto[]> {
    const delegations =
      await this.delegationRepository.findPendingApprovalsForUser(
        userId,
        tenantId
      );
    return delegations.map(delegation => this.mapToResponseDto(delegation));
  }

  /**
   * Get delegation statistics
   */
  async getDelegationStats(tenantId: string): Promise<DelegationStatsDto> {
    // Calculate date range for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const [
      totalDelegations,
      activeDelegations,
      pendingApprovals,
      expiredDelegations,
      revokedDelegations,
      emergencyDelegations,
      delegationsThisMonth,
    ] = await Promise.all([
      this.delegationRepository.count({ where: { tenantId } }),
      this.delegationRepository.count({
        where: {
          tenantId,
          status: DelegationStatus.ACTIVE,
        },
      }),
      this.delegationRepository.count({
        where: {
          tenantId,
          status: DelegationStatus.PENDING,
        },
      }),
      this.delegationRepository.count({
        where: {
          tenantId,
          status: DelegationStatus.EXPIRED,
        },
      }),
      this.delegationRepository.count({
        where: {
          tenantId,
          status: DelegationStatus.REVOKED,
        },
      }),
      this.delegationRepository.count({
        where: {
          tenantId,
          isEmergency: true,
        },
      }),
      this.delegationRepository.count({
        where: {
          tenantId,
          createdAt: Between(startOfMonth, endOfMonth),
        },
      }),
    ]);

    // Calculate average delegation duration
    // Get full delegation entities to access the getDurationInHours method
    const delegations = await this.delegationRepository.find({
      where: { tenantId },
    });

    const totalDuration = delegations.reduce((sum, delegation) => {
      return sum + delegation.getDurationInHours();
    }, 0);

    const averageDelegationDuration =
      delegations.length > 0 ? totalDuration / delegations.length : 0;

    return {
      totalDelegations,
      activeDelegations,
      pendingApprovals,
      expiredDelegations,
      revokedDelegations,
      emergencyDelegations,
      delegationsThisMonth,
      averageDelegationDuration,
    };
  }

  /**
   * Check if user has active delegation for specific permissions
   */
  async hasActiveDelegation(
    userId: string,
    tenantId: string,
    permissionIds: string[]
  ): Promise<boolean> {
    const activeDelegations =
      await this.delegationRepository.findActiveDelegationsForUser(
        userId,
        tenantId
      );

    return activeDelegations.some(delegation =>
      permissionIds.some(permissionId => delegation.hasPermission(permissionId))
    );
  }

  /**
   * Get delegation audit logs
   */
  async getDelegationAuditLogs(
    delegationId: string,
    tenantId: string
  ): Promise<any[]> {
    const auditLogs = await this.auditLogRepository.find({
      where: { delegationId, tenantId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return auditLogs.map(log => ({
      id: log.id,
      action: log.action,
      details: log.details,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      user: log.user
        ? {
            id: log.user.id,
            email: log.user.email,
            firstName: log.user.firstName,
            lastName: log.user.lastName,
            fullName: log.user.fullName,
          }
        : null,
    }));
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    delegationId: string,
    userId: string,
    tenantId: string,
    action: string,
    details: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const auditLogData: any = {
      delegationId,
      userId,
      tenantId,
      action,
      details,
    };

    if (metadata?.ipAddress) {
      auditLogData.ipAddress = metadata.ipAddress;
    }

    if (metadata?.userAgent) {
      auditLogData.userAgent = metadata.userAgent;
    }

    const auditLog = this.auditLogRepository.create(auditLogData);

    await this.auditLogRepository.save(auditLog);
  }

  /**
   * Send delegation notifications
   */
  private async sendDelegationNotifications(
    delegation: Delegation,
    event: 'created' | 'approved' | 'rejected' | 'activated' | 'revoked'
  ): Promise<void> {
    try {
      // This would integrate with the notification system
      // For now, we'll just log the event
      console.log(`Delegation ${event}: ${delegation.id}`);

      // TODO: Implement actual notification sending
      // await this.emailService.sendDelegationNotification(delegation, event);
    } catch (error) {
      console.error('Failed to send delegation notification:', error);
    }
  }

  /**
   * Map delegation entity to response DTO
   */
  private mapToResponseDto(delegation: Delegation): DelegationResponseDto {
    const response: any = {
      id: delegation.id,
      tenantId: delegation.tenantId,
      delegatorId: delegation.delegatorId,
      delegateId: delegation.delegateId,
    };

    if (delegation.approverId) {
      response.approverId = delegation.approverId;
    }

    response.title = delegation.title;
    response.description = delegation.description;
    response.delegationType = delegation.delegationType;
    response.status = delegation.status;
    response.requestedAt = delegation.requestedAt;
    response.approvedAt = delegation.approvedAt;
    response.rejectedAt = delegation.rejectedAt;
    response.revokedAt = delegation.revokedAt;
    response.expiresAt = delegation.expiresAt;
    response.activatedAt = delegation.activatedAt;
    response.approvalNotes = delegation.approvalNotes;
    response.rejectionReason = delegation.rejectionReason;
    response.revocationReason = delegation.revocationReason;
    response.requiresApproval = delegation.requiresApproval;
    response.isEmergency = delegation.isEmergency;
    response.isRecurring = delegation.isRecurring;
    response.recurrencePattern = delegation.recurrencePattern;
    response.metadata = delegation.metadata;
    response.createdAt = delegation.createdAt;
    response.updatedAt = delegation.updatedAt;
    response.isActive = delegation.isActive();
    response.isExpired = delegation.isExpired();
    response.remainingTimeInHours = delegation.getRemainingTimeInHours();
    response.durationInHours = delegation.getDurationInHours();
    response.permissionNames = delegation.getPermissionNames();

    if (delegation.delegator) {
      response.delegator = {
        id: delegation.delegator.id,
        email: delegation.delegator.email,
        firstName: delegation.delegator.firstName,
        lastName: delegation.delegator.lastName,
        fullName: delegation.delegator.fullName,
      };
    }

    if (delegation.delegate) {
      response.delegate = {
        id: delegation.delegate.id,
        email: delegation.delegate.email,
        firstName: delegation.delegate.firstName,
        lastName: delegation.delegate.lastName,
        fullName: delegation.delegate.fullName,
      };
    }

    if (delegation.approver) {
      response.approver = {
        id: delegation.approver.id,
        email: delegation.approver.email,
        firstName: delegation.approver.firstName,
        lastName: delegation.approver.lastName,
        fullName: delegation.approver.fullName,
      };
    }

    response.permissions =
      delegation.permissions?.map(permission => ({
        id: permission.id,
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope,
      })) || [];

    return response;
  }

  /**
   * Cron job to expire delegations
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredDelegations(): Promise<void> {
    try {
      const expiredDelegations =
        await this.delegationRepository.findExpiredDelegations();

      for (const delegation of expiredDelegations) {
        delegation.status = DelegationStatus.EXPIRED;
        await this.delegationRepository.save(delegation);

        // Create audit log
        await this.createAuditLog(
          delegation.id,
          delegation.delegatorId,
          delegation.tenantId,
          'delegation_expired',
          'Delegation expired automatically'
        );

        // Send notification
        await this.sendDelegationNotifications(delegation, 'expired' as any);
      }

      if (expiredDelegations.length > 0) {
        console.log(`Expired ${expiredDelegations.length} delegations`);
      }
    } catch (error) {
      console.error('Error handling expired delegations:', error);
    }
  }
}
