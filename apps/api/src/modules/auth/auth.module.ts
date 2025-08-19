import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './controllers/auth.controller';
import { MfaController } from './controllers/mfa.controller';
import { SessionController } from './controllers/session.controller';
import { RoleController } from './controllers/role.controller';
import { PermissionController } from './controllers/permission.controller';
import { AccountRecoveryController } from './controllers/account-recovery.controller';
import { UserLifecycleController } from './controllers/user-lifecycle.controller';
import { ProfileController } from './controllers/profile.controller';
import { AuthService } from './services/auth.service';
import { JwtService } from './services/jwt.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { MfaService } from './services/mfa.service';
import { EmailService } from './services/email.service';
import { SessionService } from './services/session.service';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { AccountRecoveryService } from './services/account-recovery.service';
import { AuditService } from './services/audit.service';
import { UserLifecycleService } from './services/user-lifecycle.service';
import { ProfileService } from './services/profile.service';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { AuthGuard } from './guards/auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PermissionCheckerService } from '../../common/services/permission-checker.service';
import {
  UserRepository,
  RoleRepository,
  AuditLogRepository,
  TenantUsageRepository,
  TenantFeatureFlagRepository,
  UserProfileRepository,
} from './repositories';
import {
  User,
  Tenant,
  RefreshToken,
  Session,
  Permission,
  Role,
  AccountRecovery,
  AuditLog,
  TenantUsage,
  TenantFeatureFlag,
  UserProfile,
} from './entities';
import { env } from '@app/config';
import { FilesModule } from '../files/files.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Tenant,
      RefreshToken,
      Session,
      Permission,
      Role,
      AccountRecovery,
      AuditLog,
      TenantUsage,
      TenantFeatureFlag,
      UserProfile,
    ]),
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: {
        expiresIn: env.JWT_EXPIRES_IN,
        issuer: 'saas-boilerplate',
        audience: 'saas-boilerplate-users',
      },
    }),
    forwardRef(() => FilesModule),
    CommonModule,
  ],
  controllers: [
    AuthController,
    MfaController,
    SessionController,
    RoleController,
    PermissionController,
    AccountRecoveryController,
    UserLifecycleController,
    ProfileController,
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
    AccountRecoveryService,
    AuditService,
    UserLifecycleService,
    ProfileService,
    AuditInterceptor,
    JwtAuthGuard,
    PermissionsGuard,
    AuthGuard,
    JwtStrategy,
    PermissionCheckerService,
    // Tenant-scoped repositories
    UserRepository,
    RoleRepository,
    AuditLogRepository,
    TenantUsageRepository,
    TenantFeatureFlagRepository,
    UserProfileRepository,
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
    AccountRecoveryService,
    AuditService,
    UserLifecycleService,
    ProfileService,
    AuditInterceptor,
    JwtAuthGuard,
    PermissionsGuard,
    AuthGuard,
    PermissionCheckerService,
    // Export tenant-scoped repositories
    UserRepository,
    RoleRepository,
    AuditLogRepository,
    TenantUsageRepository,
    TenantFeatureFlagRepository,
    UserProfileRepository,
  ],
})
export class AuthModule {}
