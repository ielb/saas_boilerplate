import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

import { User } from '../entities/user.entity';
import { TwoFactorAuthSetup } from '@app/shared';

// Define local interfaces for now
interface TwoFactorAuthStatus {
  isEnabled: boolean;
  isVerified: boolean;
  backupCodesRemaining: number;
}

interface BackupCode {
  code: string;
  isUsed: boolean;
  usedAt?: Date;
}

interface MFAConfig {
  issuer: string;
  algorithm: 'sha1' | 'sha256' | 'sha512';
  digits: number;
  period: number;
  window: number;
}

@Injectable()
export class MfaService {
  private readonly mfaConfig: MFAConfig = {
    issuer: 'SaaS Boilerplate',
    algorithm: 'sha1',
    digits: 6,
    period: 30,
    window: 1,
  };

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  /**
   * Generate TOTP secret for user
   */
  async generateSecret(user: User): Promise<string> {
    const secret = speakeasy.generateSecret({
      name: user.email,
      issuer: this.mfaConfig.issuer,
      length: 32,
    });

    return secret.base32!;
  }

  /**
   * Generate QR code for TOTP setup
   */
  async generateQRCode(user: User, secret: string): Promise<string> {
    const otpauthUrl = speakeasy.otpauthURL({
      secret,
      label: user.email,
      issuer: this.mfaConfig.issuer,
      algorithm: this.mfaConfig.algorithm,
      digits: this.mfaConfig.digits,
      period: this.mfaConfig.period,
    });

    return QRCode.toDataURL(otpauthUrl);
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(
        speakeasy.generateSecret({ length: 10 }).base32!.toUpperCase()
      );
    }
    return codes;
  }

  /**
   * Verify TOTP token
   */
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      token,
      window: this.mfaConfig.window,
      algorithm: this.mfaConfig.algorithm,
      digits: this.mfaConfig.digits,
    });
  }

  /**
   * Setup two-factor authentication for user
   */
  async setupTwoFactorAuth(user: User): Promise<TwoFactorAuthSetup> {
    // Generate new secret
    const secret = await this.generateSecret(user);

    // Generate QR code
    const qrCode = await this.generateQRCode(user, secret);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Update user with secret and backup codes
    user.twoFactorSecret = secret;
    user.backupCodes = backupCodes;
    await this.userRepository.save(user);

    return {
      secret,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactorAuth(user: User, token: string): Promise<void> {
    if (!user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication not set up');
    }

    // Verify the token
    const isValid = this.verifyToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.twoFactorVerified = true;
    user.twoFactorEnabledAt = new Date();
    await this.userRepository.save(user);
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactorAuth(user: User, token: string): Promise<void> {
    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Verify the token
    const isValid = this.verifyToken(user.twoFactorSecret!, token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorVerified = false;
    user.twoFactorSecret = null;
    user.backupCodes = null;
    user.twoFactorEnabledAt = null;
    await this.userRepository.save(user);
  }

  /**
   * Verify two-factor authentication during login
   */
  async verifyTwoFactorAuth(user: User, token: string): Promise<boolean> {
    if (!user.twoFactorEnabled) {
      return true; // 2FA not enabled, consider it verified
    }

    // Check if using backup code
    if (token.length === 10 && user.backupCodes) {
      const backupCodeIndex = user.backupCodes.indexOf(token);
      if (backupCodeIndex !== -1) {
        // Mark backup code as used
        user.backupCodes.splice(backupCodeIndex, 1);
        await this.userRepository.save(user);
        return true;
      }
    }

    // Verify TOTP token
    if (!user.twoFactorSecret) {
      return false;
    }

    const isValid = this.verifyToken(user.twoFactorSecret, token);

    // Update attempt tracking
    user.lastTwoFactorAttempt = new Date();
    if (!isValid) {
      user.twoFactorAttempts += 1;
    } else {
      user.twoFactorAttempts = 0;
    }
    await this.userRepository.save(user);

    return isValid;
  }

  /**
   * Get two-factor authentication status
   */
  async getTwoFactorStatus(user: User): Promise<TwoFactorAuthStatus> {
    return {
      isEnabled: user.twoFactorEnabled,
      isVerified: user.twoFactorVerified,
      backupCodesRemaining: user.backupCodes?.length || 0,
    };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(user: User, token: string): Promise<string[]> {
    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Verify the token
    const isValid = this.verifyToken(user.twoFactorSecret!, token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();
    user.backupCodes = backupCodes;
    await this.userRepository.save(user);

    return backupCodes;
  }

  /**
   * Check if user has exceeded MFA attempt limits
   */
  hasExceededAttempts(user: User): boolean {
    const maxAttempts = 5;
    const lockoutDuration = 15 * 60 * 1000; // 15 minutes

    if (user.twoFactorAttempts >= maxAttempts && user.lastTwoFactorAttempt) {
      const timeSinceLastAttempt =
        Date.now() - user.lastTwoFactorAttempt.getTime();
      return timeSinceLastAttempt < lockoutDuration;
    }

    return false;
  }

  /**
   * Reset MFA attempt counter
   */
  async resetAttempts(user: User): Promise<void> {
    user.twoFactorAttempts = 0;
    user.lastTwoFactorAttempt = null;
    await this.userRepository.save(user);
  }
}
