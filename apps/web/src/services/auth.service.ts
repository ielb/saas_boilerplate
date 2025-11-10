import { api } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-client';
import type { LoginResponse, User } from '@/types/auth';
import type {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  TwoFactorAuthSetup,
  TwoFactorAuthVerify,
  TwoFactorAuthStatus,
} from '@shared/types/auth.types';

/**
 * Authentication service
 * Handles all authentication-related API calls
 */
export const authService = {
  /**
   * Register a new user
   */
  async register(
    data: RegisterRequest
  ): Promise<ApiResponse<{ message: string }>> {
    return api.post<ApiResponse<{ message: string }>>('/auth/register', data);
  },

  /**
   * Login with email and password
   * API returns: { accessToken, refreshToken, expiresIn, user }
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    // Login endpoint returns data directly, not wrapped
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response;
  },

  /**
   * Refresh access token
   * API returns: { accessToken, refreshToken, expiresIn, user }
   */
  async refreshToken(data: RefreshTokenRequest): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    user?: User;
  }> {
    // Refresh endpoint returns data directly, not wrapped
    return api.post<{
      accessToken: string;
      refreshToken?: string;
      expiresIn: number;
      user?: User;
    }>('/auth/refresh', data);
  },

  /**
   * Logout current session
   */
  async logout(
    refreshToken?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return api.post<ApiResponse<{ message: string }>>('/auth/logout', {
      refreshToken,
    });
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    return api.post<ApiResponse<{ message: string }>>('/auth/verify-email', {
      token,
    });
  },

  /**
   * Resend email verification
   */
  async resendVerificationEmail(
    email: string
  ): Promise<ApiResponse<{ message: string }>> {
    return api.post<ApiResponse<{ message: string }>>(
      '/auth/resend-verification',
      {
        email,
      }
    );
  },

  /**
   * Request password reset
   */
  async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<ApiResponse<{ message: string }>> {
    return api.post<ApiResponse<{ message: string }>>(
      '/auth/forgot-password',
      data
    );
  },

  /**
   * Validate reset token
   */
  async validateResetToken(data: {
    token: string;
  }): Promise<ApiResponse<{ valid: boolean }>> {
    return api.post<ApiResponse<{ valid: boolean }>>(
      '/auth/validate-reset-token',
      data
    );
  },

  /**
   * Reset password with token
   */
  async resetPassword(
    data: ResetPasswordRequest
  ): Promise<ApiResponse<{ message: string }>> {
    return api.post<ApiResponse<{ message: string }>>(
      '/auth/reset-password',
      data
    );
  },

  /**
   * Change password (authenticated user)
   */
  async changePassword(
    data: ChangePasswordRequest
  ): Promise<ApiResponse<{ message: string }>> {
    return api.post<ApiResponse<{ message: string }>>(
      '/auth/change-password',
      data
    );
  },

  /**
   * Get current user profile
   * API returns: User object directly
   */
  async getCurrentUser(): Promise<User> {
    // Profile endpoint returns user directly, not wrapped
    return api.get<User>('/auth/profile');
  },

  /**
   * Setup MFA (Two-Factor Authentication)
   * API returns: { secret, qrCode, backupCodes }
   */
  async setupMfa(userId: string): Promise<TwoFactorAuthSetup> {
    // MFA setup returns data directly
    return api.post<TwoFactorAuthSetup>('/auth/mfa/setup', {
      userId,
    });
  },

  /**
   * Verify MFA token
   * API returns: { accessToken, refreshToken, expiresIn, user } or { isValid, message }
   */
  async verifyMfa(
    data: TwoFactorAuthVerify
  ): Promise<LoginResponse | { isValid: boolean; message: string }> {
    // MFA verify returns data directly
    return api.post<LoginResponse | { isValid: boolean; message: string }>(
      '/auth/mfa/verify',
      data
    );
  },

  /**
   * Disable MFA
   */
  async disableMfa(token: string): Promise<ApiResponse<{ message: string }>> {
    return api.post<ApiResponse<{ message: string }>>('/auth/mfa/disable', {
      token,
    });
  },

  /**
   * Get MFA status
   * API returns: { enabled, verified, backupCodesRemaining }
   */
  async getMfaStatus(): Promise<TwoFactorAuthStatus> {
    // MFA status returns data directly
    return api.get<TwoFactorAuthStatus>('/auth/mfa/status');
  },

  /**
   * Generate new backup codes
   */
  async generateBackupCodes(
    token: string
  ): Promise<ApiResponse<{ backupCodes: string[] }>> {
    return api.post<ApiResponse<{ backupCodes: string[] }>>(
      '/auth/mfa/backup-codes/regenerate',
      { token }
    );
  },

  /**
   * Verify MFA during login
   * API returns: { accessToken, refreshToken, expiresIn, user }
   */
  async verifyMfaLogin(userId: string, token: string): Promise<LoginResponse> {
    // MFA verify during login returns LoginResponse directly
    return api.post<LoginResponse>('/auth/mfa/verify', { userId, token });
  },

  /**
   * Enable MFA after setup
   */
  async enableMfa(token: string): Promise<ApiResponse<{ message: string }>> {
    return api.post<ApiResponse<{ message: string }>>('/auth/mfa/enable', {
      token,
    });
  },
};
