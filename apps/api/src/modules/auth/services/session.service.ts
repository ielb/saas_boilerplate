import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Session, SessionStatus, DeviceType } from '../entities/session.entity';
import { User } from '../../users/entities/user.entity';
import {
  CreateSessionDto,
  UpdateSessionDto,
  RevokeSessionDto,
} from '../dto/session.dto';
import { JwtService } from './jwt.service';
import { RefreshTokenService } from './refresh-token.service';
import * as crypto from 'crypto';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService
  ) {}

  /**
   * Create a new session for a user
   */
  async createSession(createSessionDto: CreateSessionDto): Promise<Session> {
    const { userId, refreshTokenHash, ...sessionData } = createSessionDto;

    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for existing active session with same device fingerprint
    const existingSession = await this.sessionRepository.findOne({
      where: {
        userId,
        deviceFingerprint: sessionData.deviceFingerprint,
        status: SessionStatus.ACTIVE,
      },
    });

    if (existingSession) {
      // Update existing session instead of creating new one
      existingSession.updateActivity();
      return this.sessionRepository.save(existingSession);
    }

    // Check concurrent session limits
    await this.enforceSessionLimits(userId);

    // Create new session
    const session = this.sessionRepository.create({
      userId,
      refreshTokenHash: refreshTokenHash || null,
      lastActivityAt: new Date(),
      expiresAt: sessionData.expiresAt
        ? new Date(sessionData.expiresAt)
        : this.calculateExpiration(sessionData.isRememberMe),
      ...sessionData,
    });

    const savedSession = await this.sessionRepository.save(session);
    this.logger.log(`Created session ${savedSession.id} for user ${userId}`);

    return savedSession;
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { userId },
      order: { lastActivityAt: 'DESC' },
    });
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
        expiresAt: MoreThan(new Date()),
      },
      order: { lastActivityAt: 'DESC' },
    });
  }

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['user'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  /**
   * Update session information
   */
  async updateSession(
    sessionId: string,
    updateSessionDto: UpdateSessionDto
  ): Promise<Session> {
    const session = await this.getSession(sessionId);

    // Update session properties
    Object.assign(session, updateSessionDto);
    session.updateActivity();

    const updatedSession = await this.sessionRepository.save(session);
    this.logger.log(`Updated session ${sessionId}`);

    return updatedSession;
  }

  /**
   * Revoke a session
   */
  async revokeSession(
    sessionId: string,
    revokeSessionDto: RevokeSessionDto = {}
  ): Promise<void> {
    const session = await this.getSession(sessionId);

    session.revoke(revokeSessionDto.reason);
    await this.sessionRepository.save(session);

    // Also revoke associated refresh token if exists
    if (session.refreshTokenHash) {
      // Note: We would need to implement a method to revoke by hash
      // For now, we'll just log this for future implementation
      this.logger.warn(
        `Session ${sessionId} has refresh token hash but no method to revoke by hash`
      );
    }

    this.logger.log(
      `Revoked session ${sessionId}${revokeSessionDto.reason ? `: ${revokeSessionDto.reason}` : ''}`
    );
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string, reason?: string): Promise<void> {
    const sessions = await this.getActiveSessions(userId);

    for (const session of sessions) {
      await this.revokeSession(session.id, { reason: reason || undefined });
    }

    this.logger.log(`Revoked all sessions for user ${userId}`);
  }

  /**
   * Revoke all sessions except the current one
   */
  async revokeOtherSessions(
    userId: string,
    currentSessionId: string,
    reason?: string
  ): Promise<void> {
    const sessions = await this.getActiveSessions(userId);

    for (const session of sessions) {
      if (session.id !== currentSessionId) {
        await this.revokeSession(session.id, { reason });
      }
    }

    this.logger.log(
      `Revoked other sessions for user ${userId}, keeping ${currentSessionId}`
    );
  }

  /**
   * Mark a device as trusted
   */
  async markDeviceAsTrusted(sessionId: string): Promise<Session> {
    const session = await this.getSession(sessionId);

    session.isTrusted = true;
    const updatedSession = await this.sessionRepository.save(session);

    this.logger.log(`Marked device as trusted for session ${sessionId}`);
    return updatedSession;
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);

    if (!session.isActive()) {
      throw new BadRequestException('Session is not active');
    }

    session.updateActivity();
    await this.sessionRepository.save(session);
  }

  /**
   * Extend session expiration
   */
  async extendSession(
    sessionId: string,
    additionalMinutes: number
  ): Promise<Session> {
    const session = await this.getSession(sessionId);

    if (!session.isActive()) {
      throw new BadRequestException('Session is not active');
    }

    session.extendExpiration(additionalMinutes);
    const updatedSession = await this.sessionRepository.save(session);

    this.logger.log(
      `Extended session ${sessionId} by ${additionalMinutes} minutes`
    );
    return updatedSession;
  }

  /**
   * Mark session as suspicious
   */
  async markSessionAsSuspicious(sessionId: string): Promise<Session> {
    const session = await this.getSession(sessionId);

    session.markAsSuspicious();
    const updatedSession = await this.sessionRepository.save(session);

    this.logger.log(`Marked session ${sessionId} as suspicious`);
    return updatedSession;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const expiredSessions = await this.sessionRepository.find({
      where: {
        status: SessionStatus.ACTIVE,
        expiresAt: LessThan(new Date()),
      },
    });

    for (const session of expiredSessions) {
      session.status = SessionStatus.EXPIRED;
      await this.sessionRepository.save(session);
    }

    this.logger.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    return expiredSessions.length;
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStats(userId: string): Promise<{
    total: number;
    active: number;
    trusted: number;
    suspicious: number;
    expired: number;
    revoked: number;
  }> {
    const [total, active, trusted, suspicious, expired, revoked] =
      await Promise.all([
        this.sessionRepository.count({ where: { userId } }),
        this.sessionRepository.count({
          where: {
            userId,
            status: SessionStatus.ACTIVE,
            expiresAt: MoreThan(new Date()),
          },
        }),
        this.sessionRepository.count({
          where: {
            userId,
            isTrusted: true,
            status: SessionStatus.ACTIVE,
          },
        }),
        this.sessionRepository.count({
          where: {
            userId,
            status: SessionStatus.SUSPICIOUS,
          },
        }),
        this.sessionRepository.count({
          where: {
            userId,
            status: SessionStatus.EXPIRED,
          },
        }),
        this.sessionRepository.count({
          where: {
            userId,
            status: SessionStatus.REVOKED,
          },
        }),
      ]);

    return { total, active, trusted, suspicious, expired, revoked };
  }

  /**
   * Detect suspicious activity
   */
  async detectSuspiciousActivity(
    sessionId: string,
    currentIpAddress: string
  ): Promise<boolean> {
    const session = await this.getSession(sessionId);

    // Check for IP address change
    if (session.ipAddress !== currentIpAddress) {
      this.logger.warn(
        `IP address change detected for session ${sessionId}: ${session.ipAddress} -> ${currentIpAddress}`
      );
      return true;
    }

    // Check for unusual activity patterns (implement more sophisticated logic as needed)
    const timeSinceLastActivity = Date.now() - session.lastActivityAt.getTime();
    const suspiciousTimeThreshold = 24 * 60 * 60 * 1000; // 24 hours

    if (timeSinceLastActivity > suspiciousTimeThreshold) {
      this.logger.warn(
        `Unusual activity pattern detected for session ${sessionId}`
      );
      return true;
    }

    return false;
  }

  /**
   * Generate device fingerprint from request data
   */
  generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    const fingerprintData = `${userAgent}|${ipAddress}`;
    return crypto.createHash('sha256').update(fingerprintData).digest('hex');
  }

  /**
   * Detect device type from user agent
   */
  detectDeviceType(userAgent: string): DeviceType {
    const ua = userAgent.toLowerCase();

    if (
      ua.includes('mobile') ||
      ua.includes('android') ||
      ua.includes('iphone')
    ) {
      return DeviceType.MOBILE;
    }

    if (ua.includes('tablet') || ua.includes('ipad')) {
      return DeviceType.TABLET;
    }

    if (
      ua.includes('windows') ||
      ua.includes('macintosh') ||
      ua.includes('linux')
    ) {
      return DeviceType.DESKTOP;
    }

    return DeviceType.UNKNOWN;
  }

  /**
   * Parse browser information from user agent
   */
  parseBrowserInfo(userAgent: string): {
    browser: string;
    browserVersion: string;
  } {
    const ua = userAgent.toLowerCase();

    if (ua.includes('chrome')) {
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      return {
        browser: 'Chrome',
        browserVersion: match?.[1] || 'Unknown',
      };
    }

    if (ua.includes('firefox')) {
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      return {
        browser: 'Firefox',
        browserVersion: match?.[1] || 'Unknown',
      };
    }

    if (ua.includes('safari')) {
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      return {
        browser: 'Safari',
        browserVersion: match?.[1] ?? 'Unknown',
      };
    }

    if (ua.includes('edge')) {
      const match = userAgent.match(/Edge\/(\d+\.\d+)/);
      return {
        browser: 'Edge',
        browserVersion: match?.[1] ?? 'Unknown',
      };
    }

    return {
      browser: 'Unknown',
      browserVersion: 'Unknown',
    };
  }

  /**
   * Parse operating system from user agent
   */
  parseOperatingSystem(userAgent: string): {
    operatingSystem: string;
    osVersion: string;
  } {
    const ua = userAgent.toLowerCase();

    if (ua.includes('windows')) {
      const match = userAgent.match(/Windows NT (\d+\.\d+)/);
      return {
        operatingSystem: 'Windows',
        osVersion: match?.[1] ?? 'Unknown',
      };
    }

    if (ua.includes('android')) {
      const match = userAgent.match(/Android (\d+\.\d+)/);
      return {
        operatingSystem: 'Android',
        osVersion: match?.[1] ?? 'Unknown',
      };
    }

    if (ua.includes('iphone') || ua.includes('ipad')) {
      const match = userAgent.match(/OS (\d+[._]\d+)/);
      return {
        operatingSystem: 'iOS',
        osVersion: match?.[1]?.replace('_', '.') ?? 'Unknown',
      };
    }

    if (ua.includes('macintosh') || ua.includes('mac os')) {
      const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
      return {
        operatingSystem: 'macOS',
        osVersion: match?.[1]?.replace('_', '.') ?? 'Unknown',
      };
    }

    if (ua.includes('linux')) {
      return {
        operatingSystem: 'Linux',
        osVersion: 'Unknown',
      };
    }

    return {
      operatingSystem: 'Unknown',
      osVersion: 'Unknown',
    };
  }

  /**
   * Calculate session expiration time
   */
  private calculateExpiration(isRememberMe: boolean = false): Date {
    const now = new Date();
    const expirationMinutes = isRememberMe ? 30 * 24 * 60 : 24 * 60; // 30 days vs 24 hours
    return new Date(now.getTime() + expirationMinutes * 60 * 1000);
  }

  /**
   * Enforce session limits per user
   */
  private async enforceSessionLimits(userId: string): Promise<void> {
    const activeSessions = await this.getActiveSessions(userId);
    const maxSessions = 5; // Configurable limit

    if (activeSessions.length >= maxSessions) {
      // Revoke oldest session
      const oldestSession = activeSessions[activeSessions.length - 1];
      if (oldestSession) {
        await this.revokeSession(oldestSession.id, {
          reason: 'Session limit exceeded',
        });
      }
    }
  }
}
