import { Module } from '@nestjs/common';
import { SecurityConfigService } from './services/security-config.service';
import { SecurityInterceptor } from './interceptors/security.interceptor';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';
import { MfaGuard } from './guards/mfa.guard';

@Module({
  providers: [
    SecurityConfigService,
    SecurityInterceptor,
    RolesGuard,
    TenantGuard,
    MfaGuard,
  ],
  exports: [
    SecurityConfigService,
    SecurityInterceptor,
    RolesGuard,
    TenantGuard,
    MfaGuard,
  ],
})
export class CommonModule {}
