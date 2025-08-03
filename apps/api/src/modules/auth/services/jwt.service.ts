import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';

import {
  JwtPayload,
  RefreshTokenPayload,
  UserRole,
  UserStatus,
} from '@app/shared';
import { jwtConfig } from '@app/config';

@Injectable()
export class JwtService {
  constructor(private readonly jwtService: NestJwtService) {}

  /**
   * Generate access token
   */
  generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return this.jwtService.sign(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.expiresIn,
      issuer: 'saas-boilerplate',
      audience: 'saas-boilerplate-users',
    });
  }

  /**
   * Generate refresh token with token ID
   */
  generateRefreshToken(userId: string, tokenId: string): string {
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      sub: userId,
      tokenId,
    };

    return this.jwtService.sign(payload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: jwtConfig.refreshExpiresIn,
      issuer: 'saas-boilerplate',
      audience: 'saas-boilerplate-refresh',
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: jwtConfig.secret,
        issuer: 'saas-boilerplate',
        audience: 'saas-boilerplate-users',
      });

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: jwtConfig.refreshSecret,
        issuer: 'saas-boilerplate',
        audience: 'saas-boilerplate-refresh',
      });

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return true;
    }
    return expiration < new Date();
  }

  /**
   * Generate token pair (access + refresh)
   */
  generateTokenPair(user: {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    tenantId: string;
  }): { accessToken: string; refreshToken: string; expiresIn: number } {
    const accessToken = this.generateAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    const tokenId = uuidv4();
    const refreshToken = this.generateRefreshToken(user.id, tokenId);

    // Calculate expiration time in seconds
    const expiresIn = this.getTokenExpirationInSeconds(accessToken);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(
    refreshToken: string,
    user: {
      id: string;
      email: string;
      role: UserRole;
      status: UserStatus;
      tenantId: string;
    }
  ): { accessToken: string; expiresIn: number } {
    // Verify refresh token
    const payload = this.verifyRefreshToken(refreshToken);

    // Check if user ID matches
    if (payload.sub !== user.id) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    const expiresIn = this.getTokenExpirationInSeconds(accessToken);

    return {
      accessToken,
      expiresIn,
    };
  }

  /**
   * Get token expiration time in seconds
   */
  private getTokenExpirationInSeconds(token: string): number {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return 0;
    }
    return Math.floor((expiration.getTime() - Date.now()) / 1000);
  }

  /**
   * Extract token from authorization header
   */
  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Validate token format
   */
  validateTokenFormat(token: string): boolean {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Get token type (access or refresh)
   */
  getTokenType(token: string): 'access' | 'refresh' | 'unknown' {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (decoded && decoded.aud) {
        if (decoded.aud === 'saas-boilerplate-users') {
          return 'access';
        }
        if (decoded.aud === 'saas-boilerplate-refresh') {
          return 'refresh';
        }
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
