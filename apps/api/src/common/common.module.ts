import { Module } from '@nestjs/common';
import { SecurityConfigService } from './services/security-config.service';
import { SecurityInterceptor } from './interceptors/security.interceptor';
import { TenantInterceptor } from './interceptors/tenant.interceptor';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';
import { TenantScopedGuard } from './guards/tenant-scoped.guard';
import { MfaGuard } from './guards/mfa.guard';
import { TenantContextService } from './services/tenant-context.service';
import { TenantIsolationService } from './services/tenant-isolation.service';

@Module({
  providers: [
    SecurityConfigService,
    SecurityInterceptor,
    TenantInterceptor,
    RolesGuard,
    TenantGuard,
    TenantScopedGuard,
    MfaGuard,
    TenantContextService,
    TenantIsolationService,
  ],
  exports: [
    SecurityConfigService,
    SecurityInterceptor,
    TenantInterceptor,
    RolesGuard,
    TenantGuard,
    TenantScopedGuard,
    MfaGuard,
    TenantContextService,
    TenantIsolationService,
  ],
})
export class CommonModule {}
