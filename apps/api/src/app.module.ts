import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';

import { env } from '@app/config';

// Import modules (will be created in subsequent tasks)
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
// import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
// import { BillingModule } from './modules/billing/billing.module';
// import { NotificationsModule } from './modules/notifications/notifications.module';
// import { FilesModule } from './modules/files/files.module';
// import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [() => ({ env })],
    }),

    // Database
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: env.DATABASE_URL,
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT,
      username: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      database: env.POSTGRES_DB,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      synchronize: env.NODE_ENV === 'development', // Disable in production
      logging: env.ENABLE_SQL_LOGGING,
      ssl:
        env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      extra: {
        connectionLimit: env.DB_POOL_MAX,
        acquireTimeout: env.DB_POOL_ACQUIRE_TIMEOUT,
        timeout: env.DB_POOL_IDLE_TIMEOUT,
      },
    }),

    // Queue management
    BullModule.forRoot({
      redis: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD ?? '',
      },
      defaultJobOptions: {
        attempts: env.QUEUE_RETRY_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: env.RATE_LIMIT_WINDOW_MS,
        limit: env.RATE_LIMIT_MAX_REQUESTS,
      },
    ]),

    // Feature modules (will be uncommented as they are created)
    CommonModule,
    AuthModule,
    // UsersModule,
    TenantsModule,
    // BillingModule,
    // NotificationsModule,
    // FilesModule,
    // AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
