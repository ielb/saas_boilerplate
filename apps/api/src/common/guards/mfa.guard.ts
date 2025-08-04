import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MFA_REQUIRED_KEY } from '../decorators/auth.decorator';

@Injectable()
export class MfaGuard implements CanActivate {
  private readonly logger = new Logger(MfaGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireMfa = this.reflector.getAllAndOverride<boolean>(
      MFA_REQUIRED_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requireMfa) {
      return true; // No MFA requirement
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if MFA is enabled and completed
    if (user.mfaEnabled && !user.mfaVerified) {
      this.logger.warn(
        `User ${user.id} denied access to ${request.method} ${request.url}. MFA verification required.`
      );

      throw new ForbiddenException('MFA verification required');
    }

    return true;
  }
}
