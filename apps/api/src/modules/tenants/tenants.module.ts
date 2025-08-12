import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { TenantController } from './controllers/tenant.controller';
import { TenantOnboardingController } from './controllers/tenant-onboarding.controller';
import { TenantSwitchingController } from './controllers/tenant-switching.controller';
import { TenantService } from './services/tenant.service';
import { TenantOnboardingService } from './services/tenant-onboarding.service';
import { TenantSwitchingService } from './services/tenant-switching.service';
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
  User,
  UserTenantMembership,
} from '../auth/entities';
import { AuthModule } from '../auth/auth.module';

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
  ],
  controllers: [
    TenantController,
    TenantOnboardingController,
    TenantSwitchingController,
  ],
  providers: [
    TenantService,
    TenantOnboardingService,
    TenantSwitchingService,
    TenantAccessGuard,
    TenantCacheUtil,
    TenantCacheInterceptor,
    TenantCacheInvalidationInterceptor,
  ],
  exports: [
    TenantService,
    TenantOnboardingService,
    TenantSwitchingService,
    TenantAccessGuard,
    TenantCacheUtil,
    TenantCacheInterceptor,
    TenantCacheInvalidationInterceptor,
  ],
})
export class TenantsModule {}
