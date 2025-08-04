import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './controllers/auth.controller';
import { MfaController } from './controllers/mfa.controller';
import { SessionController } from './controllers/session.controller';
import { RoleController } from './controllers/role.controller';
import { PermissionController } from './controllers/permission.controller';
import { AuthService } from './services/auth.service';
import { JwtService } from './services/jwt.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { MfaService } from './services/mfa.service';
import { EmailService } from './services/email.service';
import { SessionService } from './services/session.service';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PermissionCheckerService } from '../../common/services/permission-checker.service';
import {
  User,
  Tenant,
  RefreshToken,
  Session,
  Permission,
  Role,
} from './entities';
import { env } from '@app/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Tenant,
      RefreshToken,
      Session,
      Permission,
      Role,
    ]),
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: {
        expiresIn: env.JWT_EXPIRES_IN,
        issuer: 'saas-boilerplate',
        audience: 'saas-boilerplate-users',
      },
    }),
  ],
  controllers: [
    AuthController,
    MfaController,
    SessionController,
    RoleController,
    PermissionController,
  ],
  providers: [
    AuthService,
    JwtService,
    RefreshTokenService,
    MfaService,
    EmailService,
    SessionService,
    RoleService,
    PermissionService,
    JwtAuthGuard,
    PermissionsGuard,
    JwtStrategy,
    PermissionCheckerService,
  ],
  exports: [
    AuthService,
    JwtService,
    RefreshTokenService,
    MfaService,
    EmailService,
    SessionService,
    RoleService,
    PermissionService,
    JwtAuthGuard,
    PermissionsGuard,
    PermissionCheckerService,
  ],
})
export class AuthModule {}
