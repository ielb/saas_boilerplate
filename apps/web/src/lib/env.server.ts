/**
 * Server-only environment utilities
 * This file should only be imported in server components, API routes, or server actions
 */

import { serverEnv } from './env';

/**
 * Get the API URL for server-side requests
 */
export function getApiUrl(): string {
  return serverEnv.API_URL;
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
 * Check if we're in development mode
 */
export function isDev(): boolean {
  return serverEnv.NODE_ENV === 'development';
}

/**
 * Check if we're in production mode
 */
export function isProd(): boolean {
  return serverEnv.NODE_ENV === 'production';
}

