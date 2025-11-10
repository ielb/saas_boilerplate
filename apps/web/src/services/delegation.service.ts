import { api } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-client';

export interface Delegation {
  id: string;
  delegatorId: string;
  delegateId: string;
  permissions: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDelegationRequest {
  delegateId: string;
  permissions: string[];
  startDate: string;
  endDate: string;
}

export interface UpdateDelegationRequest {
  permissions?: string[];
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

/**
 * Delegation service
 * Handles access delegation API calls
 */
export const delegationService = {
  /**
   * Get all delegations
   */
  async getDelegations(): Promise<ApiResponse<Delegation[]>> {
    return api.get<ApiResponse<Delegation[]>>('/delegations');
  },

  /**
   * Get delegation by ID
   */
  async getDelegationById(id: string): Promise<ApiResponse<Delegation>> {
    return api.get<ApiResponse<Delegation>>(`/delegations/${id}`);
  },

  /**
   * Create delegation
   */
  async createDelegation(
    data: CreateDelegationRequest
  ): Promise<ApiResponse<Delegation>> {
    return api.post<ApiResponse<Delegation>>('/delegations', data);
  },

  /**
   * Update delegation
   */
  async updateDelegation(
    id: string,
    data: UpdateDelegationRequest
  ): Promise<ApiResponse<Delegation>> {
    return api.put<ApiResponse<Delegation>>(`/delegations/${id}`, data);
  },

  /**
   * Delete delegation
   */
  async deleteDelegation(
    id: string
  ): Promise<ApiResponse<{ message: string }>> {
    return api.delete<ApiResponse<{ message: string }>>(`/delegations/${id}`);
  },
};

