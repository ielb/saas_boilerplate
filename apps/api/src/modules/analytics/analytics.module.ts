import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import {
  UsageAnalytics,
  AnalyticsAggregate,
  AnalyticsAlert,
  AnalyticsReport,
} from './entities/usage-analytics.entity';

import { EmailModule } from '../email/email.module';
import { AuthJwtModule } from '../auth/jwt.module';
import { PermissionCheckerService } from '@/common/services/permission-checker.service';
import { RBACModule } from '../rbac/rbac.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsageAnalytics,
      AnalyticsAggregate,
      AnalyticsAlert,
      AnalyticsReport,
    ]),
    ScheduleModule.forRoot(),
    EmailModule,
    AuthJwtModule,
    RBACModule,
    FilesModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PdfGeneratorService, PermissionCheckerService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
