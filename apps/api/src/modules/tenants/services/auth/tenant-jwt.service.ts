import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '../../../auth/services/jwt.service';
import { UserRole } from '@app/shared';

@Injectable()
export class TenantJwtService {
  private readonly logger = new Logger(TenantJwtService.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Generate new JWT token with updated tenant context
   */
  async generateTenantSwitchToken(
    userId: string,
    email: string,
    tenantId: string,
    role: UserRole
  ): Promise<string> {
    this.logger.debug(
      `Generating tenant switch token for user ${userId} to tenant ${tenantId}`
    );

    const token = await this.jwtService.generateAccessToken({
      sub: userId,
      email,
      tenantId,
      role,
    });

    this.logger.debug(`Generated tenant switch token for user ${userId}`);
    return token;
  }

  /**
   * Validate JWT token for tenant context
   */
  async validateTenantToken(token: string): Promise<{
    userId: string;
    email: string;
    tenantId: string;
    role: UserRole;
  }> {
    try {
      const payload = this.jwtService.verifyAccessToken(token);
      return {
        userId: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        role: payload.role,
      };
    } catch (error) {
      this.logger.warn(
        `Invalid tenant token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }
}
