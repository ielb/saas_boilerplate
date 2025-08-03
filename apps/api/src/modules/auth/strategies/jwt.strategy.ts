import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload } from '@app/shared';
import { jwtConfig } from '@app/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
      issuer: 'saas-boilerplate',
      audience: 'saas-boilerplate-users',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Additional validation can be added here
    // For example, check if user still exists in database
    // or if user is still active

    if (!payload.sub || !payload.email || !payload.tenantId || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
      iat: payload.iat ?? 0,
      exp: payload.exp ?? 0,
    };
  }
}
