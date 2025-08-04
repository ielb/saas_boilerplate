import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  SKIP_AUTH_KEY,
  ROLES_KEY,
  TENANT_REQUIRED_KEY,
  MFA_REQUIRED_KEY,
} from '../decorators/auth.decorator';
import { JwtService } from '../services/jwt.service';
import { UserRole } from '@app/shared';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public or should skip auth
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || skipAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    // Validate JWT token
    const user = await this.validateToken(token);
    request.user = user;

    // Check role requirements
    await this.checkRoles(context, user);

    // Check tenant requirements
    await this.checkTenant(context, user);

    // Check MFA requirements
    await this.checkMfa(context, user);

    return true;
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  private async validateToken(token: string): Promise<any> {
    if (!this.jwtService.validateTokenFormat(token)) {
      throw new UnauthorizedException('Invalid token format');
    }

    const tokenType = this.jwtService.getTokenType(token);
    if (tokenType !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    if (this.jwtService.isTokenExpired(token)) {
      throw new UnauthorizedException('Token has expired');
    }

    try {
      return this.jwtService.verifyAccessToken(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private async checkRoles(
    context: ExecutionContext,
    user: any
  ): Promise<void> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return; // No roles required
    }

    const hasRole = requiredRoles.some(role => user.role === role);

    if (!hasRole) {
      const request = context.switchToHttp().getRequest();
      this.logger.warn(
        `User ${user.sub} denied access to ${request.method} ${request.url}. Required roles: ${requiredRoles.join(', ')}. User role: ${user.role}`
      );

      throw new ForbiddenException(
        `Insufficient role. Required: ${requiredRoles.join(' OR ')}. Current: ${user.role}`
      );
    }
  }

  private async checkTenant(
    context: ExecutionContext,
    user: any
  ): Promise<void> {
    const requireTenant = this.reflector.getAllAndOverride<boolean>(
      TENANT_REQUIRED_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requireTenant) {
      return; // No tenant requirement
    }

    if (!user.tenantId) {
      const request = context.switchToHttp().getRequest();
      this.logger.warn(
        `User ${user.sub} denied access to ${request.method} ${request.url}. No tenant context available.`
      );

      throw new ForbiddenException('Tenant context required');
    }
  }

  private async checkMfa(context: ExecutionContext, user: any): Promise<void> {
    const requireMfa = this.reflector.getAllAndOverride<boolean>(
      MFA_REQUIRED_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requireMfa) {
      return; // No MFA requirement
    }

    // Check if MFA is enabled and completed
    if (user.mfaEnabled && !user.mfaVerified) {
      const request = context.switchToHttp().getRequest();
      this.logger.warn(
        `User ${user.sub} denied access to ${request.method} ${request.url}. MFA verification required.`
      );

      throw new ForbiddenException('MFA verification required');
    }
  }
}
