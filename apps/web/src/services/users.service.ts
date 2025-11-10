import { api } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  tenantId: string;
  avatar?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: string;
  tenantId?: string;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
  avatar?: string;
}

export interface UserQueryParams {
  search?: string;
  role?: string;
  status?: string;
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
 * Users service
 * Handles all user-related API calls
 */
export const usersService = {
  /**
   * Get all users
   * API returns: { users: User[], total: number } directly (not wrapped)
   */
  async getUsers(
    params?: UserQueryParams
  ): Promise<{ users: User[]; total: number }> {
    // API returns { users, total } directly, not wrapped in ApiResponse
    return api.get<{ users: User[]; total: number }>('/users', {
      params,
    });
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<ApiResponse<User>> {
    return api.get<ApiResponse<User>>(`/users/${id}`);
  },

  /**
   * Create user
   */
  async createUser(data: CreateUserRequest): Promise<ApiResponse<User>> {
    return api.post<ApiResponse<User>>('/users', data);
  },

  /**
   * Update user
   */
  async updateUser(
    id: string,
    data: UpdateUserRequest
  ): Promise<ApiResponse<User>> {
    return api.put<ApiResponse<User>>(`/users/${id}`, data);
  },

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete<ApiResponse<{ message: string }>>(`/users/${id}`);
  },

  /**
   * Bulk import users
   */
  async bulkImportUsers(
    file: File
  ): Promise<ApiResponse<{ jobId: string; message: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<{ jobId: string; message: string }>>(
      '/users/bulk/import',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },

  /**
   * Get bulk import job status
   */
  async getBulkImportStatus(
    jobId: string
  ): Promise<
    ApiResponse<{
      id: string;
      status: string;
      total: number;
      processed: number;
      succeeded: number;
      failed: number;
      errors: Array<{ row: number; error: string }>;
    }>
  > {
    return api.get<
      ApiResponse<{
        id: string;
        status: string;
        total: number;
        processed: number;
        succeeded: number;
        failed: number;
        errors: Array<{ row: number; error: string }>;
      }>
    >(`/users/bulk/import/${jobId}`);
  },
};

