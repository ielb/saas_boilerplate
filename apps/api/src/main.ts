import { config } from 'dotenv';

// Load environment variables from .env file first
config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response } from 'express';
import { AppModule } from './app.module';
import { env, isDevelopment, isProduction } from '@app/config';
import { SecurityConfigService } from './common/services/security-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Initialize security configuration service
  const securityConfigService = app.get(SecurityConfigService);

  // Security middleware with enhanced configuration
  app.use(helmet(securityConfigService.getHelmetConfig()));

  // Compression middleware
  app.use(compression());

  // Rate limiting with enhanced configuration
  const rateLimitConfig = securityConfigService.getRateLimitConfig();
  app.use(rateLimit(rateLimitConfig));

  // Speed limiting
  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 100, // allow 100 requests per 15 minutes, then...
    delayMs: (hits: number) => hits * 500, // begin adding 500ms of delay per request above 100
  });
  app.use(speedLimiter);

  // CORS configuration with enhanced security
  const corsConfig = securityConfigService.getCorsConfig();
  app.enableCors(corsConfig);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  if (isDevelopment()) {
    const config = new DocumentBuilder()
      .setTitle('SaaS Boilerplate API')
      .setDescription('The SaaS Boilerplate API description')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('tenants', 'Tenant management endpoints')
      .addTag('billing', 'Payment and billing endpoints')
      .addTag('notifications', 'Communication endpoints')
      .addTag('files', 'File management endpoints')
      .addTag('admin', 'Administrative endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Health check endpoint
  app
    .getHttpAdapter()
    .getInstance()
    .get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        version: '1.0.0',
      });
    });

  const port = env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${port}/health`);
}

bootstrap().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
