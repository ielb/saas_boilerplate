import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantController } from './controllers/tenant.controller';
import { TenantOnboardingController } from './controllers/tenant-onboarding.controller';
import { TenantService } from './services/tenant.service';
import { TenantOnboardingService } from './services/tenant-onboarding.service';
import {
  Tenant,
  TenantUsage,
  TenantFeatureFlag,
  TenantOnboarding,
  User,
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
    ]),
    AuthModule,
  ],
  controllers: [TenantController, TenantOnboardingController],
  providers: [TenantService, TenantOnboardingService],
  exports: [TenantService, TenantOnboardingService],
})
export class TenantsModule {}
