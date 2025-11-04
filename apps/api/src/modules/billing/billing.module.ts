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
import { TaxRate } from './entities/tax-rate.entity';
import { TaxExemption } from './entities/tax-exemption.entity';
import { SubscriptionHistory } from './entities/subscription-history.entity';
import { InvoiceService } from './services/invoice.service';
import { PdfGenerationService } from './services/pdf-generation.service';
import { BillingAnalyticsService } from './services/billing-analytics.service';
import { BillingCycleService } from './services/billing-cycle.service';
import { BillingHistoryService } from './services/billing-history.service';
import { UsageBillingService } from './services/usage-billing.service';
import { TaxCalculationService } from './services/tax-calculation.service';
import { TaxReportingService } from './services/tax-reporting.service';
import { TemplateService } from './services/template.service';
import { BillingPortalService } from './services/billing-portal.service';
import { InvoiceController } from './controllers/invoice.controller';
import { BillingAnalyticsController } from './controllers/billing-analytics.controller';
import { BillingCycleController } from './controllers/billing-cycle.controller';
import { BillingHistoryController } from './controllers/billing-history.controller';
import { UsageBillingController } from './controllers/usage-billing.controller';
import { TaxController } from './controllers/tax.controller';
import { BillingPortalController } from './controllers/billing-portal.controller';
import { SubscriptionUsage } from '../subscriptions/entities/subscription-usage.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { PaymentMethod } from '../payments/entities/payment-method.entity';
import { Payment } from '../payments/entities/payment.entity';
import { AuthModule } from '../auth/auth.module';
import { AuthJwtModule } from '../auth/jwt.module';
import { PaymentsModule } from '../payments/payments.module';

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
      TaxRate,
      TaxExemption,
      SubscriptionHistory,
      SubscriptionUsage,
      Subscription,
      PaymentMethod,
      Payment,
    ]),
    AuthModule,
    AuthJwtModule,
    PaymentsModule,
  ],
  controllers: [
    InvoiceController,
    BillingAnalyticsController,
    BillingCycleController,
    BillingHistoryController,
    UsageBillingController,
    TaxController,
    BillingPortalController,
  ],
  providers: [
    InvoiceService,
    PdfGenerationService,
    BillingAnalyticsService,
    BillingCycleService,
    BillingHistoryService,
    UsageBillingService,
    TaxCalculationService,
    TaxReportingService,
    TemplateService,
    BillingPortalService,
  ],
  exports: [
    InvoiceService,
    PdfGenerationService,
    BillingAnalyticsService,
    BillingCycleService,
    BillingHistoryService,
    UsageBillingService,
    TaxCalculationService,
    TaxReportingService,
    TemplateService,
    BillingPortalService,
  ],
})
export class BillingModule {}
