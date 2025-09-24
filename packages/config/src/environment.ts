import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables from .env file
config({
  path: '../../.env',
});

// Environment variable schema validation
const envSchema = z.object({
  // Application Configuration
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().transform(Number).default('3001'),
  API_URL: z.string().url().default('http://localhost:3001'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  MOBILE_URL: z.string().url().default('http://localhost:19000'),

  // Database Configuration
  DATABASE_URL: z.string().url(),
  POSTGRES_DB: z.string().default('saas_boilerplate'),
  POSTGRES_USER: z.string().default('saas_user'),
  POSTGRES_PASSWORD: z.string().default('saas_password'),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.string().transform(Number).default('5432'),

  // Test Database Configuration
  POSTGRES_TEST_DB: z.string().default('test_db'),

  // Redis Configuration
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional(),

  // JWT Configuration
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Authentication & Security
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
  SESSION_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),

  // Email Configuration
  EMAIL_PROVIDER: z
    .enum(['smtp', 'ses', 'sendgrid', 'postmark'])
    .default('smtp'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.string().transform(Number).default('1025'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .transform((val: string) => val === 'true')
    .default('false'),
  SENDGRID_API_KEY: z.string().optional(),
  AWS_SES_ACCESS_KEY_ID: z.string().optional(),
  AWS_SES_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SES_REGION: z.string().default('us-east-1'),
  POSTMARK_API_KEY: z.string().optional(),

  // SMS Configuration (Twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // File Storage Configuration
  STORAGE_PROVIDER: z.enum(['local', 's3', 'gcs']).default('local'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_STORAGE_BUCKET: z.string().optional(),
  GOOGLE_CLOUD_KEY_FILE: z.string().optional(),

  // Payment Configuration (Stripe)
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID: z.string().optional(),

  // Tax Configuration
  TAX_PROVIDER: z.enum(['stripe', 'manual', 'external']).default('manual'),
  STRIPE_TAX_ENABLED: z
    .string()
    .transform((val: string) => val === 'true')
    .default('false'),
  STRIPE_AUTOMATIC_TAX: z
    .string()
    .transform((val: string) => val === 'true')
    .default('false'),
  STRIPE_TAX_BEHAVIOR: z.enum(['inclusive', 'exclusive']).default('exclusive'),
  DEFAULT_TAX_RATE: z.string().default('0.08'),
  ENABLE_REGIONAL_TAX: z
    .string()
    .transform((val: string) => val === 'true')
    .default('false'),
  EXTERNAL_TAX_API_URL: z.string().optional(),
  EXTERNAL_TAX_API_KEY: z.string().optional(),
  EXTERNAL_TAX_PROVIDER: z.string().optional(),
  ENABLE_TAX_REPORTING: z
    .string()
    .transform((val: string) => val === 'true')
    .default('false'),
  TAX_REPORTING_FREQUENCY: z
    .enum(['monthly', 'quarterly', 'annually'])
    .default('quarterly'),
  TAX_RETENTION_PERIOD: z.string().default('7'),

  // Push Notifications
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),

  // Monitoring & Analytics
  SENTRY_DSN: z.string().optional(),
  DATADOG_API_KEY: z.string().optional(),
  NEW_RELIC_LICENSE_KEY: z.string().optional(),

  // Third Party Services
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Development Tools
  MAILHOG_HOST: z.string().default('localhost'),
  MAILHOG_PORT: z.string().transform(Number).default('1025'),
  MAILHOG_WEB_PORT: z.string().transform(Number).default('8025'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.string().transform(Number).default('9000'),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin123'),
  MINIO_USE_SSL: z
    .string()
    .transform((val: string) => val === 'true')
    .default('false'),

  // Feature Flags
  ENABLE_REGISTRATION: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  ENABLE_EMAIL_VERIFICATION: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  ENABLE_TWO_FACTOR_AUTH: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  ENABLE_SOCIAL_LOGIN: z
    .string()
    .transform((val: string) => val === 'true')
    .default('false'),
  ENABLE_FILE_UPLOADS: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  ENABLE_REAL_TIME_FEATURES: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: z
    .string()
    .transform((val: string) => val === 'true')
    .default('false'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),
  ENABLE_REQUEST_LOGGING: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  ENABLE_SQL_LOGGING: z
    .string()
    .transform((val: string) => val === 'true')
    .default('false'),

  // CORS Configuration
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000,http://localhost:19000'),
  CORS_CREDENTIALS: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),

  // WebSocket Configuration
  WS_PORT: z.string().transform(Number).default('3002'),
  WS_PATH: z.string().default('/ws'),

  // Queue Configuration
  QUEUE_REDIS_URL: z.string().url().default('redis://localhost:6379'),
  QUEUE_CONCURRENCY: z.string().transform(Number).default('5'),
  QUEUE_RETRY_ATTEMPTS: z.string().transform(Number).default('3'),

  // Cache Configuration
  CACHE_TTL: z.string().transform(Number).default('3600'),
  CACHE_MAX_SIZE: z.string().transform(Number).default('1000'),

  // Security Headers
  ENABLE_SECURITY_HEADERS: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  ENABLE_CSP: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  ENABLE_HSTS: z
    .string()
    .transform((val: string) => val === 'true')
    .default('true'),
  HSTS_MAX_AGE: z.string().transform(Number).default('31536000'),

  // Database Connection Pool
  DB_POOL_MIN: z.string().transform(Number).default('2'),
  DB_POOL_MAX: z.string().transform(Number).default('10'),
  DB_POOL_ACQUIRE_TIMEOUT: z.string().transform(Number).default('60000'),
  DB_POOL_IDLE_TIMEOUT: z.string().transform(Number).default('30000'),

  // Redis Connection Pool
  REDIS_POOL_MIN: z.string().transform(Number).default('2'),
  REDIS_POOL_MAX: z.string().transform(Number).default('10'),
  REDIS_POOL_ACQUIRE_TIMEOUT: z.string().transform(Number).default('60000'),
  REDIS_POOL_IDLE_TIMEOUT: z.string().transform(Number).default('30000'),
});

// Parse and validate environment variables with fallback for development
const env = (() => {
  // Set default NODE_ENV if not provided
  const nodeEnv = process.env.NODE_ENV || 'development';

  try {
    console.log('process.env', process.env);
    return envSchema.parse(process.env);
  } catch (error) {
    if (nodeEnv === 'development') {
      // In development, provide default values for missing required variables
      const defaultEnv = {
        NODE_ENV: 'development',
        PORT: '3001',
        DATABASE_URL:
          'postgresql://saas_user:saas_password@localhost:5432/saas_boilerplate',
        JWT_SECRET:
          'your-super-secret-jwt-key-for-development-only-change-in-production',
        JWT_REFRESH_SECRET:
          'your-super-secret-jwt-refresh-key-for-development-only-change-in-production',
        SESSION_SECRET:
          'your-super-secret-session-key-for-development-only-change-in-production',
        COOKIE_SECRET:
          'your-super-secret-cookie-key-for-development-only-change-in-production',
        STRIPE_SECRET_KEY: 'sk_test_your_stripe_secret_key_here',
        STRIPE_PUBLISHABLE_KEY: 'pk_test_your_stripe_publishable_key_here',
        STRIPE_WEBHOOK_SECRET: 'whsec_your_webhook_secret_here',
        ...process.env,
      };
      return envSchema.parse(defaultEnv);
    } else {
      throw error;
    }
  }
})();

// Export the env object
export { env };

// Environment type
export type Environment = z.infer<typeof envSchema>;

// Helper functions
export const isDevelopment = (): boolean => env.NODE_ENV === 'development';
export const isProduction = (): boolean => env.NODE_ENV === 'production';
export const isTest = (): boolean => env.NODE_ENV === 'test';

// Configuration objects
export const databaseConfig = {
  url: env.DATABASE_URL,
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  database: env.POSTGRES_DB,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  pool: {
    min: env.DB_POOL_MIN,
    max: env.DB_POOL_MAX,
    acquireTimeout: env.DB_POOL_ACQUIRE_TIMEOUT,
    idleTimeout: env.DB_POOL_IDLE_TIMEOUT,
  },
} as const;

export const redisConfig = {
  url: env.REDIS_URL,
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  pool: {
    min: env.REDIS_POOL_MIN,
    max: env.REDIS_POOL_MAX,
    acquireTimeout: env.REDIS_POOL_ACQUIRE_TIMEOUT,
    idleTimeout: env.REDIS_POOL_IDLE_TIMEOUT,
  },
} as const;

export const jwtConfig = {
  secret: env.JWT_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  expiresIn: env.JWT_EXPIRES_IN,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
} as const;

export const emailConfig = {
  provider: env.EMAIL_PROVIDER,
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    secure: env.SMTP_SECURE,
  },
  sendgrid: {
    apiKey: env.SENDGRID_API_KEY,
  },
  ses: {
    accessKeyId: env.AWS_SES_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SES_SECRET_ACCESS_KEY,
    region: env.AWS_SES_REGION,
  },
  postmark: {
    apiKey: env.POSTMARK_API_KEY,
  },
} as const;

export const storageConfig = {
  provider: env.STORAGE_PROVIDER,
  s3: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    bucket: env.AWS_S3_BUCKET,
  },
  gcs: {
    projectId: env.GOOGLE_CLOUD_PROJECT_ID,
    bucket: env.GOOGLE_CLOUD_STORAGE_BUCKET,
    keyFile: env.GOOGLE_CLOUD_KEY_FILE,
  },
} as const;

export const stripeConfig = {
  secretKey: env.STRIPE_SECRET_KEY,
  publishableKey: env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  priceId: env.STRIPE_PRICE_ID,
} as const;

export const corsConfig = {
  origin: env.CORS_ORIGIN.split(','),
  credentials: env.CORS_CREDENTIALS,
} as const;

export const rateLimitConfig = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  skipSuccessfulRequests: env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS,
} as const;

export const featureFlags = {
  registration: env.ENABLE_REGISTRATION,
  emailVerification: env.ENABLE_EMAIL_VERIFICATION,
  twoFactorAuth: env.ENABLE_TWO_FACTOR_AUTH,
  socialLogin: env.ENABLE_SOCIAL_LOGIN,
  fileUploads: env.ENABLE_FILE_UPLOADS,
  realTimeFeatures: env.ENABLE_REAL_TIME_FEATURES,
} as const;
