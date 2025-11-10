import { api } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-client';

/**
 * Session response interface
 */
export interface Session {
  id: string;
  deviceName: string;
  deviceType: string;
  browser?: string;
  browserVersion?: string;
  operatingSystem?: string;
  osVersion?: string;
  ipAddress: string;
  location?: string;
  timezone?: string;
  status: 'active' | 'expired' | 'revoked';
  isTrusted: boolean;
  isRememberMe: boolean;
  lastActivityAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedReason?: string;
  isActive: boolean;
}

/**
 * Session list response
 */
export interface SessionListResponse {
  sessions: Session[];
  total: number;
  activeCount: number;
  trustedCount: number;
}

/**
 * Update session request
 */
export interface UpdateSessionRequest {
  deviceName?: string;
  isTrusted?: boolean;
}

/**
 * Revoke session request
 */
export interface RevokeSessionRequest {
  reason?: string;
}

/**
 * Session service
 * Handles session management API calls
 */
export const sessionService = {
  /**
   * Get all sessions for the current user
   */
  async getSessions(): Promise<SessionListResponse> {
    const response = await api.get<ApiResponse<SessionListResponse>>('/sessions');
    return response as unknown as SessionListResponse;
  },

  /**
   * Get active sessions
   */
  async getActiveSessions(): Promise<Session[]> {
    const response = await api.get<ApiResponse<Session[]>>('/sessions/active');
    return response as unknown as Session[];
  },

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<Session> {
    const response = await api.get<ApiResponse<Session>>(`/sessions/${sessionId}`);
    return response as unknown as Session;
  },

  /**
   * Update a session
   */
  async updateSession(
    sessionId: string,
    data: UpdateSessionRequest
  ): Promise<Session> {
    const response = await api.put<ApiResponse<Session>>(`/sessions/${sessionId}`, data);
    return response as unknown as Session;
  },

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, reason?: string): Promise<void> {
    await api.post(`/sessions/${sessionId}/revoke`, { reason });
  },

  /**
   * Revoke all other sessions (except current)
   */
  async revokeOtherSessions(reason?: string): Promise<void> {
    await api.post('/sessions/revoke-others', { reason });
  },

  /**
   * Mark a device as trusted
   */
  async markDeviceAsTrusted(sessionId: string): Promise<Session> {
    const response = await api.post<ApiResponse<Session>>(`/sessions/${sessionId}/trust`);
    return response as unknown as Session;
  },
};

