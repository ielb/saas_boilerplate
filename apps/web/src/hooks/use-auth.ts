import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import type { LoginResponse } from '@/types/auth';
import { toast } from 'sonner';

/**
 * Authentication hook
 * Provides authentication functions and state
 */
export function useAuth() {
  const router = useRouter();
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,
    setAuth,
    clearAuth,
    setLoading,
    setError,
  } = useAuthStore();

  /**
   * Login function
   */
  const login = useCallback(
    async (email: string, password: string, rememberMe?: boolean) => {
      setLoading(true);
      setError(null);

      try {
        const loginData: { email: string; password: string; rememberMe?: boolean } = {
          email,
          password,
        };
        if (rememberMe !== undefined) {
          loginData.rememberMe = rememberMe;
        }

        const response = await authService.login(loginData);

        if (response.requiresMfa) {
          // MFA is required, don't set auth yet
          return { requiresMfa: true, userId: response.user.id };
        }

        setAuth(response);
        toast.success('Login successful');
        router.push('/dashboard');
        return { requiresMfa: false };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Login failed';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setAuth, setLoading, setError, router]
  );

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      // Call logout endpoint to invalidate refresh token on server
      if (refreshToken) {
        try {
          await authService.logout(refreshToken);
        } catch (err) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed, continuing with local logout:', err);
        }
      }
      clearAuth();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      toast.error(errorMessage);
      // Still clear auth state even if there's an error
      clearAuth();
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [clearAuth, router, setLoading, refreshToken]);

  /**
   * Register function
   */
  const register = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      tenantName: string,
      acceptTerms: boolean,
      marketingConsent?: boolean
    ) => {
      setLoading(true);
      setError(null);

      try {
        const registerData: {
          email: string;
          password: string;
          firstName: string;
          lastName: string;
          tenantName: string;
          acceptTerms: boolean;
          marketingConsent?: boolean;
        } = {
          email,
          password,
          firstName,
          lastName,
          tenantName,
          acceptTerms,
        };
        if (marketingConsent !== undefined) {
          registerData.marketingConsent = marketingConsent;
        }

        await authService.register(registerData);
        toast.success('Registration successful. Please check your email to verify your account.');
        router.push('/verify-email');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Registration failed';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, router]
  );

  /**
   * Refresh token function
   */
  const refresh = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authService.refreshToken({ refreshToken });
      const { setTokens } = useAuthStore.getState();
      setTokens(response.accessToken, response.refreshToken || refreshToken);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Token refresh failed';
      setError(errorMessage);
      clearAuth();
      router.push('/login');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshToken, setLoading, setError, clearAuth, router]);

  /**
   * Check if user is authenticated
   */
  const checkAuth = useCallback(() => {
    return isAuthenticated && !!accessToken;
  }, [isAuthenticated, accessToken]);

  return {
    // State
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    logout,
    register,
    refresh,
    checkAuth,
  };
}

