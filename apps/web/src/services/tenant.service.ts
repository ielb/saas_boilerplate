import { api } from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-client';
import type {
  Tenant,
  TenantMembership,
  TenantFeatureFlag,
  TenantUsage,
} from '@/types/tenant';

export interface CreateTenantRequest {
  name: string;
  domain?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
}

export interface UpdateTenantRequest {
  name?: string;
  domain?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
  isActive?: boolean;
}

export interface TenantQueryParams {
  search?: string;
  plan?: string;
  isActive?: boolean;
  isVerified?: boolean;
  isInTrial?: boolean;
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

export interface SwitchTenantRequest {
  tenantId: string;
}

export interface SwitchTenantResponse {
  accessToken: string;
  refreshToken: string;
  tenant: Tenant;
}

export interface UpdateFeatureFlagRequest {
  feature: string;
  isEnabled: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateUsageRequest {
  metric: string;
  value: number;
  period?: string;
}

/**
 * Tenant service
 * Handles all tenant-related API calls
 */
export const tenantService = {
  /**
   * Get current tenant
   * API returns: { success: true, tenantContext: {...}, membership: {...} }
   */
  async getCurrentTenant(): Promise<{
    success: boolean;
    tenantContext: Tenant;
    membership: {
      id: string;
      role: string;
      status: string;
      joinedAt: string;
      lastAccessedAt?: string;
      permissions: string[];
    };
  }> {
    // API returns tenant context with membership info directly
    return api.get<{
      success: boolean;
      tenantContext: Tenant;
      membership: {
        id: string;
        role: string;
        status: string;
        joinedAt: string;
        lastAccessedAt?: string;
        permissions: string[];
      };
    }>('/tenants/current');
  },

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string): Promise<ApiResponse<Tenant>> {
    return api.get<ApiResponse<Tenant>>(`/tenants/${id}`);
  },

  /**
   * Get all tenants (admin only)
   */
  async getTenants(
    params?: TenantQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Tenant>>> {
    return api.get<ApiResponse<PaginatedResponse<Tenant>>>('/tenants', {
      params,
    });
  },

  /**
   * Create tenant
   */
  async createTenant(
    data: CreateTenantRequest
  ): Promise<ApiResponse<Tenant>> {
    return api.post<ApiResponse<Tenant>>('/tenants', data);
  },

  /**
   * Update tenant
   */
  async updateTenant(
    id: string,
    data: UpdateTenantRequest
  ): Promise<ApiResponse<Tenant>> {
    return api.put<ApiResponse<Tenant>>(`/tenants/${id}`, data);
  },

  /**
   * Delete tenant
   */
  async deleteTenant(id: string): Promise<ApiResponse<{ message: string }>> {
    return api.delete<ApiResponse<{ message: string }>>(`/tenants/${id}`);
  },

  /**
   * Get user tenant memberships
   */
  async getUserMemberships(): Promise<
    ApiResponse<{ memberships: TenantMembership[] }>
  > {
    return api.get<ApiResponse<{ memberships: TenantMembership[] }>>(
      '/tenants/user/memberships'
    );
  },

  /**
   * Switch to a different tenant
   */
  async switchTenant(
    data: SwitchTenantRequest
  ): Promise<ApiResponse<SwitchTenantResponse>> {
    return api.post<ApiResponse<SwitchTenantResponse>>(
      '/tenants/switch',
      data
    );
  },

  /**
   * Get tenant feature flags
   */
  async getFeatureFlags(
    tenantId: string
  ): Promise<ApiResponse<TenantFeatureFlag[]>> {
    return api.get<ApiResponse<TenantFeatureFlag[]>>(
      `/tenants/${tenantId}/feature-flags`
    );
  },

  /**
   * Update feature flag
   */
  async updateFeatureFlag(
    tenantId: string,
    data: UpdateFeatureFlagRequest
  ): Promise<ApiResponse<TenantFeatureFlag>> {
    return api.put<ApiResponse<TenantFeatureFlag>>(
      `/tenants/${tenantId}/feature-flags`,
      data
    );
  },

  /**
   * Bulk update feature flags
   */
  async bulkUpdateFeatureFlags(
    tenantId: string,
    flags: UpdateFeatureFlagRequest[]
  ): Promise<ApiResponse<TenantFeatureFlag[]>> {
    return api.put<ApiResponse<TenantFeatureFlag[]>>(
      `/tenants/${tenantId}/feature-flags/bulk`,
      { flags }
    );
  },

  /**
   * Get tenant usage
   */
  async getTenantUsage(
    tenantId: string,
    metric?: string,
    period?: string
  ): Promise<ApiResponse<TenantUsage[]>> {
    return api.get<ApiResponse<TenantUsage[]>>(
      `/tenants/${tenantId}/usage`,
      {
        params: { metric, period },
      }
    );
  },

  /**
   * Update tenant usage
   */
  async updateTenantUsage(
    tenantId: string,
    data: UpdateUsageRequest
  ): Promise<ApiResponse<TenantUsage>> {
    return api.post<ApiResponse<TenantUsage>>(
      `/tenants/${tenantId}/usage`,
      data
    );
  },

  /**
   * Get tenant statistics
   */
  async getTenantStatistics(
    tenantId: string
  ): Promise<ApiResponse<Record<string, any>>> {
    return api.get<ApiResponse<Record<string, any>>>(
      `/tenants/${tenantId}/statistics`
    );
  },
};

