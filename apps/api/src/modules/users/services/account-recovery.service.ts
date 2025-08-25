import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

import { User } from '../entities/user.entity';
import { AccountRecovery } from '../entities/account-recovery.entity';
import { EmailService } from '../../email/services/email.service';
import { JwtService } from '../../auth/services/jwt.service';

interface RecoverySession {
  recoverySessionToken: string;
  expiresAt: Date;
  remainingAttempts: number;
}

interface RecoverySetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

@Injectable()
export class AccountRecoveryService {
  private readonly recoveryTokenExpiry = 15 * 60 * 1000; // 15 minutes
  private readonly recoverySessionExpiry = 30 * 60 * 1000; // 30 minutes
  private readonly maxRecoveryAttempts = 3;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AccountRecovery)
    private readonly accountRecoveryRepository: Repository<AccountRecovery>,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService
  ) {}

  /**
   * Initiate account recovery process
   */
  async initiateRecovery(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ message: string }> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'firstName', 'lastName', 'twoFactorEnabled'],
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message:
          'If an account with this email exists, a recovery email has been sent.',
      };
    }

    // Check if user has MFA enabled
    if (!user.twoFactorEnabled) {
      throw new BadRequestException(
        'Account recovery is only available for accounts with MFA enabled'
      );
    }

    // Check if there's already an active recovery session
    const existingRecovery = await this.accountRecoveryRepository.findOne({
      where: { userId: user.id, isCompleted: false },
    });

    if (existingRecovery && existingRecovery.isValid()) {
      throw new ConflictException(
        'Recovery process already in progress. Please check your email or wait for the current session to expire.'
      );
    }

    // Generate recovery tokens
    const recoveryToken = this.generateSecureToken();
    const recoverySessionToken = this.generateSecureToken();

    // Calculate expiry times
    const recoveryTokenExpiresAt = new Date(
      Date.now() + this.recoveryTokenExpiry
    );
    const recoverySessionExpiresAt = new Date(
      Date.now() + this.recoverySessionExpiry
    );

    // Create recovery session
    const recovery = this.accountRecoveryRepository.create({
      userId: user.id,
      recoveryToken,
      recoverySessionToken,
      expiresAt: recoverySessionExpiresAt,
      maxAttempts: this.maxRecoveryAttempts,
      ...(ipAddress && { ipAddress }),
      ...(userAgent && { userAgent }),
    });

    await this.accountRecoveryRepository.save(recovery);

    // Send recovery email
    await this.emailService.sendAccountRecoveryEmail(
      user.email,
      user.firstName,
      recoveryToken,
      recoveryTokenExpiresAt
    );

    return {
      message:
        'If an account with this email exists, a recovery email has been sent.',
    };
  }

  /**
   * Verify recovery token and backup code
   */
  async verifyRecovery(
    recoveryToken: string,
    backupCode: string
  ): Promise<RecoverySession> {
    // Find recovery session by token
    const recovery = await this.accountRecoveryRepository.findOne({
      where: { recoveryToken },
      relations: ['user'],
    });

    if (!recovery || !recovery.user) {
      throw new NotFoundException('Invalid recovery token');
    }

    // Check if recovery session is valid
    if (!recovery.isValid()) {
      if (recovery.isExpired()) {
        throw new BadRequestException('Recovery session has expired');
      }
      if (recovery.hasExceededAttempts()) {
        throw new BadRequestException(
          'Too many failed attempts. Please initiate a new recovery.'
        );
      }
      if (recovery.isCompleted) {
        throw new BadRequestException(
          'Recovery session has already been completed'
        );
      }
    }

    // Verify backup code
    const isValidBackupCode = await this.verifyBackupCode(
      recovery.user,
      backupCode
    );
    if (!isValidBackupCode) {
      // Increment attempt counter
      recovery.incrementAttempts();
      await this.accountRecoveryRepository.save(recovery);

      throw new UnauthorizedException('Invalid backup code');
    }

    return {
      recoverySessionToken: recovery.recoverySessionToken,
      expiresAt: recovery.expiresAt,
      remainingAttempts: recovery.getRemainingAttempts(),
    };
  }

  /**
   * Complete account recovery and reset MFA
   */
  async completeRecovery(
    recoverySessionToken: string,
    newTotpSecret?: string
  ): Promise<RecoverySetup> {
    // Find recovery session
    const recovery = await this.accountRecoveryRepository.findOne({
      where: { recoverySessionToken },
      relations: ['user'],
    });

    if (!recovery || !recovery.user) {
      throw new NotFoundException('Invalid recovery session');
    }

    // Check if recovery session is valid
    if (!recovery.isValid()) {
      if (recovery.isExpired()) {
        throw new BadRequestException('Recovery session has expired');
      }
      if (recovery.hasExceededAttempts()) {
        throw new BadRequestException('Too many failed attempts');
      }
      if (recovery.isCompleted) {
        throw new BadRequestException(
          'Recovery session has already been completed'
        );
      }
    }

    // Generate new MFA setup
    const secret =
      newTotpSecret || (await this.generateNewTotpSecret(recovery.user));
    const qrCode = await this.generateQRCode(recovery.user, secret);
    const backupCodes = this.generateBackupCodes();

    // Update user with new MFA setup
    recovery.user.twoFactorSecret = secret;
    recovery.user.backupCodes = backupCodes;
    recovery.user.twoFactorEnabled = false; // User needs to re-enable
    recovery.user.twoFactorVerified = false;
    recovery.user.twoFactorAttempts = 0;
    recovery.user.lastTwoFactorAttempt = null;

    await this.userRepository.save(recovery.user);

    // Mark recovery as completed
    recovery.markCompleted();
    await this.accountRecoveryRepository.save(recovery);

    // Send notification email
    await this.emailService.sendAccountRecoveryCompletedEmail(
      recovery.user.email,
      recovery.user.firstName
    );

    return {
      secret,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Get recovery status
   */
  async getRecoveryStatus(recoverySessionToken: string): Promise<{
    isRecoveryInProgress: boolean;
    recoverySessionExpiresAt: string;
    remainingAttempts: number;
  }> {
    const recovery = await this.accountRecoveryRepository.findOne({
      where: { recoverySessionToken },
    });

    if (!recovery) {
      return {
        isRecoveryInProgress: false,
        recoverySessionExpiresAt: '',
        remainingAttempts: 0,
      };
    }

    return {
      isRecoveryInProgress: recovery.isValid(),
      recoverySessionExpiresAt: recovery.expiresAt.toISOString(),
      remainingAttempts: recovery.getRemainingAttempts(),
    };
  }

  /**
   * Clean up expired recovery sessions
   */
  async cleanupExpiredRecoveries(): Promise<number> {
    const result = await this.accountRecoveryRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }

  /**
   * Verify backup code for a user
   */
  private async verifyBackupCode(
    user: User,
    backupCode: string
  ): Promise<boolean> {
    if (!user.backupCodes || user.backupCodes.length === 0) {
      return false;
    }

    const backupCodeIndex = user.backupCodes.indexOf(backupCode);
    if (backupCodeIndex === -1) {
      return false;
    }

    // Remove used backup code
    user.backupCodes.splice(backupCodeIndex, 1);
    await this.userRepository.save(user);

    return true;
  }

  /**
   * Generate new TOTP secret
   */
  private async generateNewTotpSecret(user: User): Promise<string> {
    const secret = speakeasy.generateSecret({
      name: user.email,
      issuer: 'SaaS Boilerplate',
      length: 32,
    });

    return secret.base32!;
  }

  /**
   * Generate QR code for TOTP setup
   */
  private async generateQRCode(user: User, secret: string): Promise<string> {
    const otpauthUrl = speakeasy.otpauthURL({
      secret,
      label: user.email,
      issuer: 'SaaS Boilerplate',
      algorithm: 'sha1',
      digits: 6,
      period: 30,
    });

    return QRCode.toDataURL(otpauthUrl);
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(
        speakeasy.generateSecret({ length: 10 }).base32!.toUpperCase()
      );
    }
    return codes;
  }

  /**
   * Generate secure token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
