import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenantIsolationMiddleware } from './tenant-isolation.middleware';
import { TenantsModule } from '../../modules/tenants/tenants.module';
import { env } from '@app/config';

@Module({
  imports: [
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: env.JWT_EXPIRES_IN },
    }),
    TenantsModule,
  ],
  providers: [TenantIsolationMiddleware],
  exports: [TenantIsolationMiddleware, JwtModule],
})
export class TenantMiddlewareModule {}
