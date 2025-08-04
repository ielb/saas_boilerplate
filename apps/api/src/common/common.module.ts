import { Module } from '@nestjs/common';
import { SecurityConfigService } from './services/security-config.service';
import { BruteForceProtectionService } from './services/brute-force-protection.service';
import { PermissionCheckerService } from './services/permission-checker.service';
import { SecurityInterceptor } from './interceptors/security.interceptor';

@Module({
  providers: [
    SecurityConfigService,
    BruteForceProtectionService,
    PermissionCheckerService,
    SecurityInterceptor,
  ],
  exports: [
    SecurityConfigService,
    BruteForceProtectionService,
    PermissionCheckerService,
    SecurityInterceptor,
  ],
})
export class CommonModule {}
