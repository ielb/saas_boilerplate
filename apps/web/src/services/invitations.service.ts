import { api } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-client';

export interface Invitation {
  id: string;
  email: string;
  role: string;
  tenantId?: string;
  teamId?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvitationRequest {
  email: string;
  role: string;
  tenantId?: string;
  teamId?: string;
  expiresInDays?: number;
}

export interface UpdateInvitationRequest {
  role?: string;
  status?: 'pending' | 'accepted' | 'expired' | 'revoked';
}

export interface InvitationQueryParams {
  search?: string;
  status?: 'pending' | 'accepted' | 'expired' | 'revoked';
  tenantId?: string;
  teamId?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Invitations service
 * Handles all invitation-related API calls
 */
export const invitationsService = {
  /**
   * Get all invitations
   * API returns: PaginatedResponse<Invitation> directly (not wrapped)
   */
  async getInvitations(
    params?: InvitationQueryParams
  ): Promise<PaginatedResponse<Invitation>> {
    // API returns paginated response directly, not wrapped in ApiResponse
    return api.get<PaginatedResponse<Invitation>>('/invitations', {
      params,
    });
  },

  /**
   * Get invitation by ID
   */
  async getInvitationById(id: string): Promise<ApiResponse<Invitation>> {
    return api.get<ApiResponse<Invitation>>(`/invitations/${id}`);
  },

  /**
   * Create invitation
   */
  async createInvitation(
    data: CreateInvitationRequest
  ): Promise<ApiResponse<Invitation>> {
    return api.post<ApiResponse<Invitation>>('/invitations', data);
  },

  /**
   * Update invitation
   */
  async updateInvitation(
    id: string,
    data: UpdateInvitationRequest
  ): Promise<ApiResponse<Invitation>> {
    return api.put<ApiResponse<Invitation>>(`/invitations/${id}`, data);
  },

  /**
   * Delete invitation
   */
  async deleteInvitation(
    id: string
  ): Promise<ApiResponse<{ message: string }>> {
    return api.delete<ApiResponse<{ message: string }>>(`/invitations/${id}`);
  },

  /**
   * Resend invitation
   */
  async resendInvitation(
    id: string
  ): Promise<ApiResponse<{ message: string }>> {
    return api.post<ApiResponse<{ message: string }>>(
      `/invitations/${id}/resend`
    );
  },

  /**
   * Accept invitation
   */
  async acceptInvitation(
    token: string,
    data?: { password?: string; firstName?: string; lastName?: string }
  ): Promise<ApiResponse<{ message: string; user?: any }>> {
    return api.post<ApiResponse<{ message: string; user?: any }>>(
      `/invitations/accept/${token}`,
      data
    );
  },
};

