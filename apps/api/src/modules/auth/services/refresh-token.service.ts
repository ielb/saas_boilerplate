import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../users/entities/user.entity';
import { jwtConfig } from '@app/config';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  /**
   * Create a new refresh token
   */
  async createRefreshToken(
    user: User,
    deviceInfo?: {
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
      deviceName?: string;
      deviceType?: string;
      location?: string;
    }
  ): Promise<RefreshToken> {
    const tokenId = uuidv4();

    const refreshToken = this.refreshTokenRepository.create({
      userId: user.id,
      tokenId,
      tokenHash: '', // Will be set after JWT is generated
      expiresAt: new Date(
        Date.now() +
          (typeof jwtConfig.refreshExpiresIn === 'string'
            ? parseInt(jwtConfig.refreshExpiresIn)
            : jwtConfig.refreshExpiresIn) *
            1000
      ),
      ...(deviceInfo?.ipAddress && { ipAddress: deviceInfo.ipAddress }),
      ...(deviceInfo?.userAgent && { userAgent: deviceInfo.userAgent }),
      ...(deviceInfo?.deviceId && { deviceId: deviceInfo.deviceId }),
      ...(deviceInfo?.deviceName && { deviceName: deviceInfo.deviceName }),
      ...(deviceInfo?.deviceType && { deviceType: deviceInfo.deviceType }),
      ...(deviceInfo?.location && { location: deviceInfo.location }),
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  /**
   * Validate refresh token and return user
   */
  async validateRefreshToken(token: string): Promise<User> {
    // Extract token ID from JWT payload
    const tokenId = this.extractTokenIdFromJwt(token);
    if (!tokenId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find token in database
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { tokenId },
      relations: ['user'],
    });

    if (!refreshToken || !refreshToken.user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is valid
    if (!refreshToken.isValid()) {
      throw new UnauthorizedException('Refresh token is expired or revoked');
    }

    // Verify token hash
    const tokenHash = this.hashToken(token);
    if (refreshToken.tokenHash !== tokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return refreshToken.user;
  }

  /**
   * Rotate refresh token (invalidate old, create new)
   */
  async rotateRefreshToken(
    oldToken: string,
    user: User,
    deviceInfo?: {
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
      deviceName?: string;
      deviceType?: string;
      location?: string;
    }
  ): Promise<{ newToken: RefreshToken; oldTokenId: string }> {
    // Extract old token ID
    const oldTokenId = this.extractTokenIdFromJwt(oldToken);
    if (!oldTokenId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find and validate old token
    const oldRefreshToken = await this.refreshTokenRepository.findOne({
      where: { tokenId: oldTokenId },
    });

    if (!oldRefreshToken || !oldRefreshToken.isValid()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Create new refresh token
    const newRefreshToken = await this.createRefreshToken(user, deviceInfo);

    // Mark old token as replaced
    oldRefreshToken.markAsReplaced(newRefreshToken.tokenId);
    newRefreshToken.setReplacesToken(oldTokenId);

    // Save both tokens
    await this.refreshTokenRepository.save([oldRefreshToken, newRefreshToken]);

    return {
      newToken: newRefreshToken,
      oldTokenId,
    };
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { tokenId },
    });

    if (refreshToken) {
      refreshToken.revoke();
      await this.refreshTokenRepository.save(refreshToken);
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true }
    );
  }

  /**
   * Get all active refresh tokens for a user
   */
  async getUserTokens(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({
      where: { userId, isRevoked: false },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: new Date(),
    });
    return result.affected || 0;
  }

  /**
   * Hash token for secure storage
   */
  hashToken(token: string): string {
    // For JWT tokens, hash only the payload part (first two parts)
    const parts = token.split('.');
    if (parts.length === 3) {
      // Hash only the header and payload parts (first two parts)
      const headerAndPayload = parts[0] + '.' + parts[1];
      return crypto.createHash('sha256').update(headerAndPayload).digest('hex');
    }
    // For non-JWT tokens, hash the entire token
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Update token hash
   */
  async updateTokenHash(tokenId: string, tokenHash: string): Promise<void> {
    await this.refreshTokenRepository.update({ tokenId }, { tokenHash });
  }

  /**
   * Extract token ID from JWT payload
   */
  private extractTokenIdFromJwt(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) {
        return null;
      }
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.tokenId || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is being reused (security measure)
   */
  async detectTokenReuse(token: string): Promise<boolean> {
    const tokenId = this.extractTokenIdFromJwt(token);
    if (!tokenId) {
      return false;
    }

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { tokenId },
    });

    // If token exists but is revoked, it might be a reuse attempt
    return refreshToken?.isRevoked === true;
  }

  /**
   * Get token statistics for a user
   */
  async getUserTokenStats(userId: string): Promise<{
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
    revokedTokens: number;
  }> {
    const [total, active, expired, revoked] = await Promise.all([
      this.refreshTokenRepository.count({ where: { userId } }),
      this.refreshTokenRepository.count({
        where: { userId, isRevoked: false },
      }),
      this.refreshTokenRepository.count({
        where: { userId, isRevoked: false },
      }),
      this.refreshTokenRepository.count({
        where: { userId, isRevoked: true },
      }),
    ]);

    return {
      totalTokens: total,
      activeTokens: active,
      expiredTokens: expired,
      revokedTokens: revoked,
    };
  }
}
