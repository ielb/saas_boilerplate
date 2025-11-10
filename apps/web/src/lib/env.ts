import { z } from 'zod';

/**
 * Client-side environment variables schema
 * These are variables that are safe to expose to the browser
 * They must be prefixed with NEXT_PUBLIC_ in .env files
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3035/api'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .default('false')
    .transform(val => val === 'true'),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
});

/**
 * Server-side environment variables schema
 * These are only available on the server
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  API_URL: z.string().url().default('http://localhost:3035/api'),
  DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

/**
 * Parse and validate client-side environment variables
 */
function getClientEnv() {
  const clientEnv = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
  };

  try {
    return clientEnvSchema.parse(clientEnv);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'Invalid client environment variables, using defaults:',
        error
      );
      return clientEnvSchema.parse({});
    }
    throw new Error(`Invalid client environment variables: ${error}`);
  }
}

/**
 * Parse and validate server-side environment variables
 */
function getServerEnv() {
  const serverEnv = {
    NODE_ENV: process.env.NODE_ENV,
    API_URL: process.env.API_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  };

  try {
    return serverEnvSchema.parse(serverEnv);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'Invalid server environment variables, using defaults:',
        error
      );
      return serverEnvSchema.parse({});
    }
    throw new Error(`Invalid server environment variables: ${error}`);
  }
}

/**
 * Client-side environment variables
 * Safe to use in browser/client components
 */
export const clientEnv = getClientEnv();

/**
 * Server-side environment variables
 * Only available in server components, API routes, and server actions
 */
export const serverEnv = getServerEnv();

/**
 * Type exports
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Helper functions
 */
export const isDevelopment = (): boolean =>
  serverEnv.NODE_ENV === 'development';
export const isProduction = (): boolean => serverEnv.NODE_ENV === 'production';
export const isTest = (): boolean => serverEnv.NODE_ENV === 'test';
