import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantController } from './controllers/tenant.controller';
import { TenantService } from './services/tenant.service';
import { Tenant, TenantUsage, TenantFeatureFlag } from '../auth/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantUsage, TenantFeatureFlag])],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantsModule {}
