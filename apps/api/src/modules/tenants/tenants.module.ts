import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantController } from './controllers/tenant.controller';
import { TenantService } from './services/tenant.service';
import { Tenant, TenantUsage, TenantFeatureFlag } from '../auth/entities';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantUsage, TenantFeatureFlag]),
    AuthModule,
  ],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantsModule {}
