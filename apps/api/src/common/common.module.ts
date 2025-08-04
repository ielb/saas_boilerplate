import { Module } from '@nestjs/common';
import { SecurityConfigService } from './services/security-config.service';
import { PermissionCheckerService } from './services/permission-checker.service';
import { SecurityInterceptor } from './interceptors/security.interceptor';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';
import { MfaGuard } from './guards/mfa.guard';
import { AuthGuard } from './guards/auth.guard';

@Module({
  providers: [
    SecurityConfigService,
    PermissionCheckerService,
    SecurityInterceptor,
    RolesGuard,
    TenantGuard,
    MfaGuard,
    AuthGuard,
  ],
  exports: [
    SecurityConfigService,
    PermissionCheckerService,
    SecurityInterceptor,
    RolesGuard,
    TenantGuard,
    MfaGuard,
    AuthGuard,
  ],
})
export class CommonModule {}
