import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './controllers/auth.controller';
import { MfaController } from './controllers/mfa.controller';
import { AuthService } from './services/auth.service';
import { JwtService } from './services/jwt.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { MfaService } from './services/mfa.service';
import { EmailService } from './services/email.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, Tenant, RefreshToken } from './entities';
import { env } from '@app/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant, RefreshToken]),
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: {
        expiresIn: env.JWT_EXPIRES_IN,
        issuer: 'saas-boilerplate',
        audience: 'saas-boilerplate-users',
      },
    }),
  ],
  controllers: [AuthController, MfaController],
  providers: [
    AuthService,
    JwtService,
    RefreshTokenService,
    MfaService,
    EmailService,
    JwtAuthGuard,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    JwtService,
    RefreshTokenService,
    MfaService,
    EmailService,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
