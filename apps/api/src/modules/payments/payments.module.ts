import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { PaymentsController } from './controllers/payments.controller';
import { PaymentMethodsController } from './controllers/payment-methods.controller';
import { PaymentWebhooksController } from './controllers/payment-webhooks.controller';

import { PaymentService } from './services/payment.service';
import { PaymentMethodService } from './services/payment-method.service';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { StripeService } from './services/stripe.service';

import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentIntent } from './entities/payment-intent.entity';
import { PaymentRefund } from './entities/payment-refund.entity';

import { PaymentGuard } from './guards/payment.guard';
import { PaymentWebhookGuard } from './guards/payment-webhook.guard';

import { PaymentInterceptor } from './interceptors/payment.interceptor';
import { PaymentLoggingInterceptor } from './interceptors/payment-logging.interceptor';
import { AuthModule } from '../auth/auth.module';
import { AuthJwtModule } from '../auth/jwt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      PaymentMethod,
      PaymentIntent,
      PaymentRefund,
    ]),
    BullModule.registerQueue({
      name: 'payments',
    }),
    AuthModule,
    AuthJwtModule,
  ],
  controllers: [
    PaymentsController,
    PaymentMethodsController,
    PaymentWebhooksController,
  ],
  providers: [
    PaymentService,
    PaymentMethodService,
    PaymentWebhookService,
    StripeService,
    PaymentGuard,
    PaymentWebhookGuard,
    PaymentInterceptor,
    PaymentLoggingInterceptor,
  ],
  exports: [PaymentService, PaymentMethodService, StripeService, TypeOrmModule],
})
export class PaymentsModule {}
