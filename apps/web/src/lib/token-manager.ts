/**
 * Token management utilities
 * Handles storage and retrieval of authentication tokens
 */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * Token storage interface
 */
interface TokenStorage {
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * Get access token from storage
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token from storage
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Set access token in storage and cookie
 */
export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  // Also set as cookie for middleware access
  document.cookie = `accessToken=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
}

/**
 * Set refresh token in storage
 */
export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

/**
 * Set both tokens
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  setAccessToken(accessToken);
  setRefreshToken(refreshToken);
}

/**
 * Clear all tokens from storage and cookies
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  // Also clear cookies
  document.cookie = 'accessToken=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'refreshToken=; path=/; max-age=0; SameSite=Lax';
}

/**
 * Get all tokens
 */
export function getTokens(): TokenStorage {
  return {
    accessToken: getAccessToken(),
    refreshToken: getRefreshToken(),
  };
}

/**
 * Check if user is authenticated (has access token)
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

/**
 * Sync tokens from localStorage to cookies
 * Useful for existing sessions where tokens are in localStorage but not in cookies
 */
export function syncTokensToCookies(): void {
  if (typeof window === 'undefined') return;
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  
  if (accessToken) {
    document.cookie = `accessToken=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  }
  
  if (refreshToken) {
    document.cookie = `refreshToken=${refreshToken}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
  }
}

