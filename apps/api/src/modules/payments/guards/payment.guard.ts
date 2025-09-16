import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import { UserRole, UserStatus } from '@app/shared';

@Injectable()
export class PaymentGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as User;

    // Check if user is authenticated
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required for payment operations'
      );
    }

    // Check if user is active (using status)
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Inactive user cannot perform payment operations'
      );
    }

    // Check if user has verified email
    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Email verification required for payment operations'
      );
    }

    // Check if user has appropriate role for payment operations
    const requiredRoles = this.reflector.get<string[]>(
      'paymentRoles',
      context.getHandler()
    );

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(user.role);

      if (!hasRole) {
        throw new ForbiddenException('Insufficient role for payment operation');
      }
    }

    return true;
  }
}
