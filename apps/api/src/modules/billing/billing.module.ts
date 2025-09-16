import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Invoice,
  InvoiceLineItem,
  BillingCycleEntity,
  BillingHistory,
  UsageBilling,
  UsageBillingRecord,
  BillingTemplate,
} from './entities';
import { InvoiceService } from './services/invoice.service';
import { PdfGenerationService } from './services/pdf-generation.service';
import { BillingAnalyticsService } from './services/billing-analytics.service';
import { BillingCycleService } from './services/billing-cycle.service';
import { BillingHistoryService } from './services/billing-history.service';
import { UsageBillingService } from './services/usage-billing.service';
import { InvoiceController } from './controllers/invoice.controller';
import { BillingAnalyticsController } from './controllers/billing-analytics.controller';
import { BillingCycleController } from './controllers/billing-cycle.controller';
import { BillingHistoryController } from './controllers/billing-history.controller';
import { UsageBillingController } from './controllers/usage-billing.controller';
import { SubscriptionUsage } from '../subscriptions/entities/subscription-usage.entity';
import { AuthModule } from '../auth/auth.module';
import { AuthJwtModule } from '../auth/jwt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceLineItem,
      BillingCycleEntity,
      BillingHistory,
      UsageBilling,
      UsageBillingRecord,
      BillingTemplate,
      SubscriptionUsage,
    ]),
    AuthModule,
    AuthJwtModule,
  ],
  controllers: [
    InvoiceController,
    BillingAnalyticsController,
    BillingCycleController,
    BillingHistoryController,
    UsageBillingController,
  ],
  providers: [
    InvoiceService,
    PdfGenerationService,
    BillingAnalyticsService,
    BillingCycleService,
    BillingHistoryService,
    UsageBillingService,
  ],
  exports: [
    InvoiceService,
    PdfGenerationService,
    BillingAnalyticsService,
    BillingCycleService,
    BillingHistoryService,
    UsageBillingService,
  ],
})
export class BillingModule {}
