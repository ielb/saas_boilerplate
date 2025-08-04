import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/auth.decorator';
import { UserRole } from '@app/shared';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.some(role => user.role === role);

    if (!hasRole) {
      this.logger.warn(
        `User ${user.id} denied access to ${request.method} ${request.url}. Required roles: ${requiredRoles.join(', ')}. User role: ${user.role}`
      );

      throw new ForbiddenException(
        `Insufficient role. Required: ${requiredRoles.join(' OR ')}. Current: ${user.role}`
      );
    }

    return true;
  }
}
