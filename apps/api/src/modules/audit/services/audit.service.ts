import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { Request } from 'express';

import {
  AuditLog,
  AuditEventType,
  AuditEventStatus,
  AuditEventSeverity,
} from '../entities/audit-log.entity';
import { User } from '../../users/entities/user.entity';

export interface AuditLogData {
  eventType: AuditEventType;
  userId?: string | undefined;
  tenantId?: string | undefined;
  sessionId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  userEmail?: string | undefined;
  targetUserId?: string | undefined;
  targetUserEmail?: string | undefined;
  description?: string | undefined;
  metadata?: Record<string, any> | undefined;
  requestData?: Record<string, any> | undefined;
  responseData?: Record<string, any> | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  source?: string | undefined;
  severity?: AuditEventSeverity | undefined;
  status?: AuditEventStatus | undefined;
}

export interface SuspiciousActivityConfig {
  maxFailedLoginsPerHour: number;
  maxFailedLoginsPerDay: number;
  maxFailedPasswordResetsPerHour: number;
  maxFailedMfaAttemptsPerHour: number;
  maxAccountRecoveryAttemptsPerHour: number;
  suspiciousIpChangesThreshold: number;
  suspiciousUserAgents: string[];
  suspiciousCountries: string[];
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly suspiciousActivityConfig: SuspiciousActivityConfig = {
    maxFailedLoginsPerHour: 5,
    maxFailedLoginsPerDay: 20,
    maxFailedPasswordResetsPerHour: 3,
    maxFailedMfaAttemptsPerHour: 10,
    maxAccountRecoveryAttemptsPerHour: 3,
    suspiciousIpChangesThreshold: 3,
    suspiciousUserAgents: [
      'bot',
      'crawler',
      'spider',
      'scraper',
      'curl',
      'wget',
      'python',
      'java',
    ],
    suspiciousCountries: ['XX'], // Placeholder for suspicious countries
  };

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  /**
   * Log an authentication event
   */
  async logAuthEvent(data: AuditLogData, req?: Request): Promise<AuditLog> {
    try {
      // Extract additional data from request if provided
      if (req) {
        data.ipAddress =
          data.ipAddress || req.ip || req.connection.remoteAddress;
        data.userAgent =
          data.userAgent || (req.headers['user-agent'] as string);
        data.source = data.source || 'api';
      }

      // Create audit log entry
      const auditLog = new AuditLog();
      auditLog.eventType = data.eventType;
      if (data.userId) auditLog.userId = data.userId;
      if (data.tenantId) auditLog.tenantId = data.tenantId;
      if (data.sessionId) auditLog.sessionId = data.sessionId;
      if (data.ipAddress) auditLog.ipAddress = data.ipAddress;
      if (data.userAgent) auditLog.userAgent = data.userAgent;
      if (data.userEmail) auditLog.userEmail = data.userEmail;
      if (data.targetUserId) auditLog.targetUserId = data.targetUserId;
      if (data.targetUserEmail) auditLog.targetUserEmail = data.targetUserEmail;
      if (data.description) auditLog.description = data.description;
      if (data.metadata) auditLog.metadata = data.metadata;
      if (data.requestData) auditLog.requestData = data.requestData;
      if (data.responseData) auditLog.responseData = data.responseData;
      if (data.errorCode) auditLog.errorCode = data.errorCode;
      if (data.errorMessage) auditLog.errorMessage = data.errorMessage;
      if (data.source) auditLog.source = data.source;
      auditLog.severity = data.severity || AuditEventSeverity.LOW;
      auditLog.status = data.status || AuditEventStatus.SUCCESS;

      // Analyze for suspicious activity
      await this.analyzeSuspiciousActivity(auditLog);

      // Save the audit log
      const savedLog = await this.auditLogRepository.save(auditLog);

      this.logger.log(
        `Audit log created: ${data.eventType} for user: ${data.userEmail || data.userId}`
      );

      return savedLog;
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  /**
   * General audit logging method for any event type
   */
  async logEvent(
    data: {
      eventType: AuditEventType;
      userId?: string;
      tenantId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      userEmail?: string;
      targetUserId?: string;
      targetUserEmail?: string;
      description?: string;
      metadata?: Record<string, any>;
      requestData?: Record<string, any>;
      responseData?: Record<string, any>;
      errorCode?: string;
      errorMessage?: string;
      source?: string;
      severity?: AuditEventSeverity;
      status?: AuditEventStatus;
    },
    req?: Request
  ): Promise<AuditLog> {
    return this.logAuthEvent(
      {
        eventType: data.eventType,
        userId: data.userId,
        tenantId: data.tenantId,
        sessionId: data.sessionId,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        userEmail: data.userEmail,
        targetUserId: data.targetUserId,
        targetUserEmail: data.targetUserEmail,
        description: data.description,
        metadata: data.metadata,
        requestData: data.requestData,
        responseData: data.responseData,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        source: data.source,
        severity: data.severity,
        status: data.status,
      },
      req
    );
  }

  /**
   * Log tenant switching events
   */
  async logTenantSwitchEvent(
    data: {
      eventType: AuditEventType;
      userId: string;
      userEmail?: string;
      fromTenantId?: string;
      toTenantId: string;
      membershipId?: string;
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
      status?: AuditEventStatus;
      errorMessage?: string;
    },
    req?: Request
  ): Promise<AuditLog> {
    const metadata: Record<string, any> = {
      fromTenantId: data.fromTenantId,
      toTenantId: data.toTenantId,
      membershipId: data.membershipId,
      reason: data.reason,
    };

    const logData: any = {
      eventType: data.eventType,
      userId: data.userId,
      tenantId: data.toTenantId,
      description: this.getTenantSwitchDescription(
        data.eventType,
        data.fromTenantId,
        data.toTenantId
      ),
      metadata,
      status: data.status || AuditEventStatus.SUCCESS,
      severity: AuditEventSeverity.MEDIUM,
    };

    // Only add optional fields if they have values
    if (data.userEmail) logData.userEmail = data.userEmail;
    if (data.ipAddress) logData.ipAddress = data.ipAddress;
    if (data.userAgent) logData.userAgent = data.userAgent;
    if (data.errorMessage) logData.errorMessage = data.errorMessage;

    return this.logEvent(logData, req);
  }

  private getTenantSwitchDescription(
    eventType: AuditEventType,
    fromTenantId?: string,
    toTenantId?: string
  ): string {
    switch (eventType) {
      case AuditEventType.TENANT_SWITCHED:
        return `User switched from tenant ${fromTenantId || 'none'} to tenant ${toTenantId}`;
      case AuditEventType.TENANT_ACCESS_VERIFIED:
        return `User access to tenant ${toTenantId} verified`;
      case AuditEventType.TENANT_ACCESS_DENIED:
        return `User access to tenant ${toTenantId} denied`;
      case AuditEventType.TENANT_MEMBERSHIP_CREATED:
        return `User membership created for tenant ${toTenantId}`;
      case AuditEventType.TENANT_MEMBERSHIP_DELETED:
        return `User membership deleted for tenant ${toTenantId}`;
      case AuditEventType.TENANT_MEMBERSHIP_SUSPENDED:
        return `User membership suspended for tenant ${toTenantId}`;
      case AuditEventType.TENANT_MEMBERSHIP_ACTIVATED:
        return `User membership activated for tenant ${toTenantId}`;
      default:
        return `Tenant event: ${eventType}`;
    }
  }

  /**
   * Log user registration event
   */
  async logUserRegistration(user: User, req?: Request): Promise<AuditLog> {
    return this.logAuthEvent(
      {
        eventType: AuditEventType.USER_REGISTERED,
        userId: user.id,
        tenantId: user.tenantId,
        userEmail: user.email,
        description: `User registered: ${user.email}`,
        metadata: {
          firstName: user.firstName,
          lastName: user.lastName,
          authProvider: user.authProvider,
        },
        severity: AuditEventSeverity.MEDIUM,
      },
      req
    );
  }

  /**
   * Log successful login event
   */
  async logUserLogin(
    user: User,
    req?: Request,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.logAuthEvent(
      {
        eventType: AuditEventType.USER_LOGIN,
        userId: user.id,
        tenantId: user.tenantId,
        userEmail: user.email,
        description: `User logged in: ${user.email}`,
        metadata: {
          lastLoginAt: user.lastLoginAt,
          ...metadata,
        },
        severity: AuditEventSeverity.LOW,
        status: AuditEventStatus.SUCCESS,
      },
      req
    );
  }

  /**
   * Log failed login event
   */
  async logLoginFailed(
    email: string,
    reason: string,
    req?: Request
  ): Promise<AuditLog> {
    return this.logAuthEvent(
      {
        eventType: AuditEventType.LOGIN_FAILED,
        userEmail: email,
        description: `Login failed for: ${email}`,
        errorMessage: reason,
        metadata: {
          failedEmail: email,
          reason,
        },
        severity: AuditEventSeverity.MEDIUM,
        status: AuditEventStatus.FAILURE,
      },
      req
    );
  }

  /**
   * Log user logout event
   */
  async logUserLogout(
    user: User,
    sessionId: string,
    req?: Request
  ): Promise<AuditLog> {
    return this.logAuthEvent(
      {
        eventType: AuditEventType.USER_LOGOUT,
        userId: user.id,
        tenantId: user.tenantId,
        sessionId,
        userEmail: user.email,
        description: `User logged out: ${user.email}`,
        severity: AuditEventSeverity.LOW,
        status: AuditEventStatus.SUCCESS,
      },
      req
    );
  }

  /**
   * Log password reset request
   */
  async logPasswordResetRequested(
    email: string,
    req?: Request
  ): Promise<AuditLog> {
    return this.logAuthEvent(
      {
        eventType: AuditEventType.PASSWORD_RESET_REQUESTED,
        userEmail: email,
        description: `Password reset requested for: ${email}`,
        severity: AuditEventSeverity.MEDIUM,
        status: AuditEventStatus.INFO,
      },
      req
    );
  }

  /**
   * Log password reset completion
   */
  async logPasswordResetCompleted(
    user: User,
    req?: Request
  ): Promise<AuditLog> {
    return this.logAuthEvent(
      {
        eventType: AuditEventType.PASSWORD_RESET_COMPLETED,
        userId: user.id,
        tenantId: user.tenantId,
        userEmail: user.email,
        description: `Password reset completed for: ${user.email}`,
        severity: AuditEventSeverity.HIGH,
        status: AuditEventStatus.SUCCESS,
      },
      req
    );
  }

  /**
   * Log MFA verification
   */
  async logMfaVerification(
    user: User,
    success: boolean,
    req?: Request
  ): Promise<AuditLog> {
    return this.logAuthEvent(
      {
        eventType: success
          ? AuditEventType.MFA_VERIFIED
          : AuditEventType.MFA_FAILED,
        userId: user.id,
        tenantId: user.tenantId,
        userEmail: user.email,
        description: `MFA ${success ? 'verified' : 'failed'} for: ${user.email}`,
        severity: success ? AuditEventSeverity.LOW : AuditEventSeverity.MEDIUM,
        status: success ? AuditEventStatus.SUCCESS : AuditEventStatus.FAILURE,
      },
      req
    );
  }

  /**
   * Log account recovery events
   */
  async logAccountRecoveryEvent(
    eventType: AuditEventType,
    user: User,
    success: boolean,
    req?: Request,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.logAuthEvent(
      {
        eventType,
        userId: user.id,
        tenantId: user.tenantId,
        userEmail: user.email,
        description: `Account recovery ${eventType} for: ${user.email}`,
        metadata,
        severity: success ? AuditEventSeverity.MEDIUM : AuditEventSeverity.HIGH,
        status: success ? AuditEventStatus.SUCCESS : AuditEventStatus.FAILURE,
      },
      req
    );
  }

  /**
   * Log session events
   */
  async logSessionEvent(
    eventType: AuditEventType,
    user: User,
    sessionId: string,
    req?: Request
  ): Promise<AuditLog> {
    return this.logAuthEvent(
      {
        eventType,
        userId: user.id,
        tenantId: user.tenantId,
        sessionId,
        userEmail: user.email,
        description: `Session ${eventType} for: ${user.email}`,
        severity: AuditEventSeverity.LOW,
        status: AuditEventStatus.SUCCESS,
      },
      req
    );
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    eventType: AuditEventType,
    user?: User,
    req?: Request,
    metadata?: Record<string, any>
  ): Promise<AuditLog> {
    return this.logAuthEvent(
      {
        eventType,
        userId: user?.id,
        tenantId: user?.tenantId,
        userEmail: user?.email,
        description: `Security event: ${eventType}`,
        metadata,
        severity: AuditEventSeverity.HIGH,
        status: AuditEventStatus.WARNING,
      },
      req
    );
  }

  /**
   * Analyze audit log for suspicious activity
   */
  private async analyzeSuspiciousActivity(auditLog: AuditLog): Promise<void> {
    try {
      // Check for suspicious user agents
      if (auditLog.userAgent) {
        const userAgent = auditLog.userAgent.toLowerCase();
        const isSuspiciousUserAgent =
          this.suspiciousActivityConfig.suspiciousUserAgents.some(suspicious =>
            userAgent.includes(suspicious)
          );

        if (isSuspiciousUserAgent) {
          auditLog.markAsSuspicious();
          auditLog.addMetadata('suspiciousUserAgent', true);
        }
      }

      // Check for failed login attempts
      if (
        auditLog.eventType === AuditEventType.LOGIN_FAILED &&
        auditLog.userEmail
      ) {
        const failedLoginsLastHour = await this.getFailedLoginsCount(
          auditLog.userEmail,
          new Date(Date.now() - 60 * 60 * 1000)
        );

        if (
          failedLoginsLastHour >=
          this.suspiciousActivityConfig.maxFailedLoginsPerHour
        ) {
          auditLog.markAsSuspicious();
          auditLog.addMetadata('excessiveFailedLogins', failedLoginsLastHour);
        }
      }

      // Check for failed password reset attempts
      if (
        auditLog.eventType === AuditEventType.PASSWORD_RESET_REQUESTED &&
        auditLog.userEmail
      ) {
        const failedResetsLastHour = await this.getFailedPasswordResetsCount(
          auditLog.userEmail,
          new Date(Date.now() - 60 * 60 * 1000)
        );

        if (
          failedResetsLastHour >=
          this.suspiciousActivityConfig.maxFailedPasswordResetsPerHour
        ) {
          auditLog.markAsSuspicious();
          auditLog.addMetadata('excessivePasswordResets', failedResetsLastHour);
        }
      }

      // Check for failed MFA attempts
      if (auditLog.eventType === AuditEventType.MFA_FAILED && auditLog.userId) {
        const failedMfaLastHour = await this.getFailedMfaAttemptsCount(
          auditLog.userId,
          new Date(Date.now() - 60 * 60 * 1000)
        );

        if (
          failedMfaLastHour >=
          this.suspiciousActivityConfig.maxFailedMfaAttemptsPerHour
        ) {
          auditLog.markAsSuspicious();
          auditLog.addMetadata('excessiveMfaFailures', failedMfaLastHour);
        }
      }

      // Check for account recovery failures
      if (
        auditLog.eventType === AuditEventType.ACCOUNT_RECOVERY_FAILED &&
        auditLog.userEmail
      ) {
        const failedRecoveriesLastHour =
          await this.getFailedAccountRecoveriesCount(
            auditLog.userEmail,
            new Date(Date.now() - 60 * 60 * 1000)
          );

        if (
          failedRecoveriesLastHour >=
          this.suspiciousActivityConfig.maxAccountRecoveryAttemptsPerHour
        ) {
          auditLog.markAsSuspicious();
          auditLog.addMetadata(
            'excessiveRecoveryFailures',
            failedRecoveriesLastHour
          );
        }
      }

      // Check for IP address changes
      if (
        auditLog.eventType === AuditEventType.USER_LOGIN &&
        auditLog.userId &&
        auditLog.ipAddress
      ) {
        const recentLogins = await this.getRecentLoginsByUser(
          auditLog.userId,
          10
        );
        const uniqueIps = new Set(
          recentLogins.map(log => log.ipAddress).filter(Boolean)
        );

        if (
          uniqueIps.size >=
          this.suspiciousActivityConfig.suspiciousIpChangesThreshold
        ) {
          auditLog.markAsSuspicious();
          auditLog.addMetadata('multipleIpAddresses', Array.from(uniqueIps));
        }
      }
    } catch (error) {
      this.logger.error(
        `Error analyzing suspicious activity: ${(error as Error).message}`,
        (error as Error).stack
      );
    }
  }

  /**
   * Get failed login attempts count for a user
   */
  private async getFailedLoginsCount(
    userEmail: string,
    since: Date
  ): Promise<number> {
    return this.auditLogRepository.count({
      where: {
        eventType: AuditEventType.LOGIN_FAILED,
        userEmail,
        createdAt: Between(since, new Date()),
      },
    });
  }

  /**
   * Get failed password reset attempts count for a user
   */
  private async getFailedPasswordResetsCount(
    userEmail: string,
    since: Date
  ): Promise<number> {
    return this.auditLogRepository.count({
      where: {
        eventType: AuditEventType.PASSWORD_RESET_REQUESTED,
        userEmail,
        createdAt: Between(since, new Date()),
      },
    });
  }

  /**
   * Get failed MFA attempts count for a user
   */
  private async getFailedMfaAttemptsCount(
    userId: string,
    since: Date
  ): Promise<number> {
    return this.auditLogRepository.count({
      where: {
        eventType: AuditEventType.MFA_FAILED,
        userId,
        createdAt: Between(since, new Date()),
      },
    });
  }

  /**
   * Get failed account recovery attempts count for a user
   */
  private async getFailedAccountRecoveriesCount(
    userEmail: string,
    since: Date
  ): Promise<number> {
    return this.auditLogRepository.count({
      where: {
        eventType: AuditEventType.ACCOUNT_RECOVERY_FAILED,
        userEmail,
        createdAt: Between(since, new Date()),
      },
    });
  }

  /**
   * Get recent logins by user
   */
  private async getRecentLoginsByUser(
    userId: string,
    limit: number
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: {
        eventType: AuditEventType.USER_LOGIN,
        userId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters: {
    userId?: string;
    tenantId?: string;
    eventType?: AuditEventType;
    status?: AuditEventStatus;
    severity?: AuditEventSeverity;
    startDate?: Date;
    endDate?: Date;
    isSuspicious?: boolean;
    requiresReview?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('auditLog');

    if (filters.userId) {
      queryBuilder.andWhere('auditLog.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters.tenantId) {
      queryBuilder.andWhere('auditLog.tenantId = :tenantId', {
        tenantId: filters.tenantId,
      });
    }

    if (filters.eventType) {
      queryBuilder.andWhere('auditLog.eventType = :eventType', {
        eventType: filters.eventType,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('auditLog.status = :status', {
        status: filters.status,
      });
    }

    if (filters.severity) {
      queryBuilder.andWhere('auditLog.severity = :severity', {
        severity: filters.severity,
      });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('auditLog.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('auditLog.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.isSuspicious !== undefined) {
      queryBuilder.andWhere('auditLog.isSuspicious = :isSuspicious', {
        isSuspicious: filters.isSuspicious,
      });
    }

    if (filters.requiresReview !== undefined) {
      queryBuilder.andWhere('auditLog.requiresReview = :requiresReview', {
        requiresReview: filters.requiresReview,
      });
    }

    const total = await queryBuilder.getCount();

    // Apply safe pagination
    const safeOffset = Math.max(0, filters.offset || 0);
    const safeLimit = Math.min(Math.max(1, filters.limit || 50), 100);

    queryBuilder
      .orderBy('auditLog.createdAt', 'DESC')
      .skip(safeOffset)
      .take(safeLimit);

    const logs = await queryBuilder.getMany();

    return { logs, total };
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldAuditLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    );

    const result = await this.auditLogRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    this.logger.log(
      `Cleaned up ${result.affected} old audit logs older than ${retentionDays} days`
    );

    return result.affected || 0;
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(
    tenantId?: string,
    days: number = 30
  ): Promise<{
    totalEvents: number;
    suspiciousEvents: number;
    failedEvents: number;
    eventsByType: Record<string, number>;
    eventsByStatus: Record<string, number>;
    eventsBySeverity: Record<string, number>;
  }> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .where('auditLog.createdAt >= :startDate', { startDate });

    if (tenantId) {
      queryBuilder.andWhere('auditLog.tenantId = :tenantId', { tenantId });
    }

    const logs = await queryBuilder.getMany();

    const eventsByType: Record<string, number> = {};
    const eventsByStatus: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    let suspiciousEvents = 0;
    let failedEvents = 0;

    logs.forEach(log => {
      // Count by type
      eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;

      // Count by status
      eventsByStatus[log.status] = (eventsByStatus[log.status] || 0) + 1;

      // Count by severity
      eventsBySeverity[log.severity] =
        (eventsBySeverity[log.severity] || 0) + 1;

      // Count suspicious events
      if (log.isSuspicious) {
        suspiciousEvents++;
      }

      // Count failed events
      if (log.status === AuditEventStatus.FAILURE) {
        failedEvents++;
      }
    });

    return {
      totalEvents: logs.length,
      suspiciousEvents,
      failedEvents,
      eventsByType,
      eventsByStatus,
      eventsBySeverity,
    };
  }

  /**
   * Log invitation created event
   */
  async logInvitationCreated(
    invitation: any,
    invitedBy: User
  ): Promise<AuditLog> {
    return this.logEvent({
      eventType: AuditEventType.INVITATION_CREATED,
      userId: invitedBy.id,
      tenantId: invitation.tenantId,
      userEmail: invitedBy.email,
      targetUserEmail: invitation.email,
      description: `Invitation created for ${invitation.email}`,
      metadata: {
        invitationId: invitation.id,
        invitationType: invitation.type,
        roleId: invitation.roleId,
        expiresAt: invitation.expiresAt,
      },
      severity: AuditEventSeverity.LOW,
    });
  }

  /**
   * Log invitation accepted event
   */
  async logInvitationAccepted(
    invitation: any,
    acceptedBy: User
  ): Promise<AuditLog> {
    return this.logEvent({
      eventType: AuditEventType.INVITATION_ACCEPTED,
      userId: acceptedBy.id,
      tenantId: invitation.tenantId,
      userEmail: acceptedBy.email,
      targetUserEmail: invitation.email,
      description: `Invitation accepted by ${acceptedBy.email}`,
      metadata: {
        invitationId: invitation.id,
        invitationType: invitation.type,
        roleId: invitation.roleId,
        acceptedAt: invitation.acceptedAt,
      },
      severity: AuditEventSeverity.LOW,
    });
  }

  /**
   * Log invitation revoked event
   */
  async logInvitationRevoked(
    invitation: any,
    revokedBy: User
  ): Promise<AuditLog> {
    return this.logEvent({
      eventType: AuditEventType.INVITATION_REVOKED,
      userId: revokedBy.id,
      tenantId: invitation.tenantId,
      userEmail: revokedBy.email,
      targetUserEmail: invitation.email,
      description: `Invitation revoked for ${invitation.email}`,
      metadata: {
        invitationId: invitation.id,
        invitationType: invitation.type,
        roleId: invitation.roleId,
        revokedAt: invitation.revokedAt,
      },
      severity: AuditEventSeverity.MEDIUM,
    });
  }

  /**
   * Log invitation resent event
   */
  async logInvitationResent(
    invitation: any,
    resentBy: User
  ): Promise<AuditLog> {
    return this.logEvent({
      eventType: AuditEventType.INVITATION_RESENT,
      userId: resentBy.id,
      tenantId: invitation.tenantId,
      userEmail: resentBy.email,
      targetUserEmail: invitation.email,
      description: `Invitation resent to ${invitation.email}`,
      metadata: {
        invitationId: invitation.id,
        invitationType: invitation.type,
        roleId: invitation.roleId,
        expiresAt: invitation.expiresAt,
      },
      severity: AuditEventSeverity.LOW,
    });
  }
}
