import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionUsage } from './entities/subscription-usage.entity';
import { SubscriptionInvoice } from './entities/subscription-invoice.entity';
import { SubscriptionService } from './services/subscription.service';
import { SubscriptionWebhookService } from './services/subscription-webhook.service';
import { SubscriptionValidationService } from './services/subscription-validation.service';
import { SubscriptionBusinessRulesService } from './services/subscription-business-rules.service';
import { SubscriptionUsageTrackingService } from './services/subscription-usage-tracking.service';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { SubscriptionWebhooksController } from './controllers/subscription-webhooks.controller';
import { UsageTrackingController } from './controllers/usage-tracking.controller';
import { SubscriptionPlansController } from './controllers/subscription-plans.controller';
import { StripeService } from '../payments/services/stripe.service';
import { AuthModule } from '../auth/auth.module';
import { AuthJwtModule } from '../auth/jwt.module';
import { UsersModule } from '../users/users.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      SubscriptionPlan,
      SubscriptionUsage,
      SubscriptionInvoice,
    ]),
    AuthModule,
    AuthJwtModule,
    UsersModule,
    TenantsModule,
  ],
  controllers: [
    SubscriptionsController,
    SubscriptionWebhooksController,
    UsageTrackingController,
    SubscriptionPlansController,
  ],
  providers: [
    SubscriptionService,
    SubscriptionWebhookService,
    SubscriptionValidationService,
    SubscriptionBusinessRulesService,
    SubscriptionUsageTrackingService,
    StripeService,
  ],
  exports: [
    SubscriptionService,
    SubscriptionWebhookService,
    SubscriptionValidationService,
    SubscriptionBusinessRulesService,
    SubscriptionUsageTrackingService,
  ],
})
export class SubscriptionsModule {}
