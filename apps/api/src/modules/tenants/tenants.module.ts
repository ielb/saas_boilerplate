import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { TenantController } from './controllers/tenant.controller';
import { TenantOnboardingController } from './controllers/tenant-onboarding.controller';
import { TenantSwitchingController } from './controllers/tenant-switching.controller';
import { TenantBrandingController } from './controllers/tenant-branding.controller';
import { TenantService } from './services/tenant.service';
import { TenantOnboardingService } from './services/tenant-onboarding.service';
import { TenantSwitchingService } from './services/tenant-switching.service';
import { TenantBrandingService } from './services/tenant-branding.service';
import { TenantBrandingValidationService } from './services/branding/tenant-branding-validation.service';
import { TenantBrandingDataService } from './services/branding/tenant-branding-data.service';
import { TenantBrandingExportService } from './services/branding/tenant-branding-export.service';
import { TenantBrandingPreviewService } from './services/branding/tenant-branding-preview.service';
import { BrandingValidatorService } from './services/validators/branding-validator.service';
import { ColorValidatorService } from './services/validators/color-validator.service';
import { LogoValidatorService } from './services/validators/logo-validator.service';
import { CssValidatorService } from './services/validators/css-validator.service';
import { TenantBrandingCacheService } from './services/cache/tenant-branding-cache.service';
import { TenantAccessControlService } from './services/access/tenant-access-control.service';
import { TenantAccessVerificationService } from './services/access/tenant-access-verification.service';
import { TenantMembershipService } from './services/membership/tenant-membership.service';
import { TenantCacheService } from './services/cache/tenant-cache.service';
import { TenantJwtService } from './services/auth/tenant-jwt.service';
import { TenantAccessGuard } from './guards/tenant-access.guard';
import { TenantCacheUtil } from './utils/tenant-cache.util';
import {
  TenantCacheInterceptor,
  TenantCacheInvalidationInterceptor,
} from './interceptors/tenant-cache.interceptor';
import {
  Tenant,
  TenantUsage,
  TenantFeatureFlag,
  TenantOnboarding,
  UserTenantMembership,
} from './entities';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { RBACModule } from '../rbac/rbac.module';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';
import { AuthJwtModule } from '../auth/jwt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      TenantUsage,
      TenantFeatureFlag,
      TenantOnboarding,
      User,
      UserTenantMembership,
    ]),
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 1000, // Maximum number of items in cache
    }),
    AuthModule,
    RBACModule,
    EmailModule,
    AuditModule,
    AuthJwtModule,
  ],
  controllers: [
    TenantController,
    TenantOnboardingController,
    TenantSwitchingController,
    TenantBrandingController,
  ],
  providers: [
    TenantService,
    TenantOnboardingService,
    TenantSwitchingService,
    TenantBrandingService,
    TenantAccessGuard,
    TenantCacheUtil,
    TenantCacheInterceptor,
    TenantCacheInvalidationInterceptor,
    // Validator services
    BrandingValidatorService,
    ColorValidatorService,
    LogoValidatorService,
    CssValidatorService,
    // Branding services
    TenantBrandingValidationService,
    TenantBrandingDataService,
    TenantBrandingExportService,
    TenantBrandingPreviewService,
    // Cache services
    TenantBrandingCacheService,
    TenantCacheService,
    // Access control services
    TenantAccessControlService,
    TenantAccessVerificationService,
    // Membership services
    TenantMembershipService,
    // JWT services
    TenantJwtService,
  ],
  exports: [
    TenantService,
    TenantOnboardingService,
    TenantSwitchingService,
    TenantBrandingService,
    TenantAccessGuard,
    TenantCacheUtil,
    TenantCacheInterceptor,
    TenantCacheInvalidationInterceptor,
    // Validator services (reusable across modules)
    BrandingValidatorService,
    ColorValidatorService,
    LogoValidatorService,
    CssValidatorService,
    // Branding services
    TenantBrandingValidationService,
    TenantBrandingDataService,
    TenantBrandingExportService,
    TenantBrandingPreviewService,
    // Cache services
    TenantBrandingCacheService,
    TenantCacheService,
    // Access control services
    TenantAccessControlService,
    TenantAccessVerificationService,
    // Membership services
    TenantMembershipService,
    // JWT services
    TenantJwtService,
  ],
})
export class TenantsModule {}
