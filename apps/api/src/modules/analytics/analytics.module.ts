import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import {
  UsageAnalytics,
  AnalyticsAggregate,
  AnalyticsAlert,
} from './entities/usage-analytics.entity';

import { EmailModule } from '../email/email.module';
import { AuthJwtModule } from '../auth/jwt.module';
import { PermissionCheckerService } from '@/common/services/permission-checker.service';
import { RBACModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsageAnalytics,
      AnalyticsAggregate,
      AnalyticsAlert,
    ]),
    ScheduleModule.forRoot(),
    EmailModule,
    AuthJwtModule,
    RBACModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PermissionCheckerService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
