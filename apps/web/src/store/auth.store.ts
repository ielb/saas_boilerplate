import { createStore } from './store';
import type { AuthStore, LoginResponse } from '@/types/auth';
import { setTokens as setTokenStorage, clearTokens, getTokens, syncTokensToCookies } from '@/lib/token-manager';

/**
 * Authentication store
 * Manages user authentication state, tokens, and user information
 */
export const useAuthStore = createStore<AuthStore>(
  'auth-store',
  (set, get) => ({
    // State
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    // Actions
    setUser: (user) => {
      set({ user, isAuthenticated: !!user });
    },

    setTokens: (accessToken, refreshToken) => {
      setTokenStorage(accessToken, refreshToken);
      set({ accessToken, refreshToken });
    },

    setAuth: (data: LoginResponse) => {
      const { accessToken, refreshToken, user } = data;
      setTokenStorage(accessToken, refreshToken);
      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        error: null,
      });
    },

    clearAuth: () => {
      clearTokens();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: null,
      });
    },

    setLoading: (isLoading) => {
      set({ isLoading });
    },

    setError: (error) => {
      set({ error });
    },
  }),
  {
    persist: true,
    version: 1,
  }
);

/**
 * Initialize auth store from localStorage on mount
 * This ensures tokens are loaded from storage when the app starts
 */
if (typeof window !== 'undefined') {
  const tokens = getTokens();
  if (tokens.accessToken && tokens.refreshToken) {
    useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);
  }
  // Sync tokens to cookies for middleware access
  syncTokensToCookies();
}

