import { api } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-client';

export interface Team {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  memberIds?: string[];
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
}

export interface TeamQueryParams {
  search?: string;
  tenantId?: string;
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
 * Teams service
 * Handles all team-related API calls
 */
export const teamsService = {
  /**
   * Get all teams
   * API returns: { teams: Team[], total: number } directly (not wrapped)
   */
  async getTeams(
    params?: TeamQueryParams
  ): Promise<{ teams: Team[]; total: number }> {
    // API returns { teams, total } directly, not wrapped
    return api.get<{ teams: Team[]; total: number }>('/teams', {
      params,
    });
  },

  /**
   * Get team by ID
   */
  async getTeamById(id: string): Promise<ApiResponse<Team & { members: TeamMember[] }>> {
    return api.get<ApiResponse<Team & { members: TeamMember[] }>>(`/teams/${id}`);
  },

  /**
   * Create team
   */
  async createTeam(data: CreateTeamRequest): Promise<ApiResponse<Team>> {
    return api.post<ApiResponse<Team>>('/teams', data);
  },

  /**
   * Update team
   */
  async updateTeam(
    id: string,
    data: UpdateTeamRequest
  ): Promise<ApiResponse<Team>> {
    return api.put<ApiResponse<Team>>(`/teams/${id}`, data);
  },

  /**
   * Delete team
   */
  async deleteTeam(id: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete<ApiResponse<{ message: string }>>(`/teams/${id}`);
  },

  /**
   * Add member to team
   */
  async addTeamMember(
    teamId: string,
    userId: string,
    role?: string
  ): Promise<ApiResponse<TeamMember>> {
    return api.post<ApiResponse<TeamMember>>(`/teams/${teamId}/members`, {
      userId,
      role,
    });
  },

  /**
   * Remove member from team
   */
  async removeTeamMember(
    teamId: string,
    userId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return api.delete<ApiResponse<{ message: string }>>(
      `/teams/${teamId}/members/${userId}`
    );
  },

  /**
   * Switch to a different team
   */
  async switchTeam(teamId: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string; team: Team }>> {
    return api.post<ApiResponse<{ accessToken: string; refreshToken: string; team: Team }>>(
      '/teams/switch',
      { teamId }
    );
  },
};

