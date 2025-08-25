import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

import { JwtService } from '../services/jwt.service';
import {
  IS_PUBLIC_KEY,
  SKIP_AUTH_KEY,
} from '../../../common/decorators/auth.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService
  ) {
    super();
  }

  override canActivate(context: ExecutionContext): boolean {
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
      const payload = this.jwtService.verifyAccessToken(token);
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
