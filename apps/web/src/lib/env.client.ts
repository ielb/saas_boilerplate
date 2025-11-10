/**
 * Client-only environment utilities
 * This file can be safely imported in client components
 */

import { clientEnv } from './env';

/**
 * Get the API URL for client-side requests
 */
export function getApiUrl(): string {
  return clientEnv.NEXT_PUBLIC_API_URL;
}

/**
 * Get the full API endpoint URL
 */
export function getApiEndpoint(path: string): string {
  const baseUrl = getApiUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Get the app URL
 */
export function getAppUrl(): string {
  return clientEnv.NEXT_PUBLIC_APP_URL;
}

/**
 * Get Stripe publishable key
 */
export function getStripePublishableKey(): string | undefined {
  return clientEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return clientEnv.NEXT_PUBLIC_ENABLE_ANALYTICS ?? false;
}

