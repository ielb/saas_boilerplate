import { createStore } from './store';
import type { TenantStore, Tenant, TenantMembership } from '@/types/tenant';

/**
 * Tenant store
 * Manages current tenant state and memberships
 */
export const useTenantStore = createStore<TenantStore>(
  'tenant-store',
  (set, get) => ({
    // State
    currentTenant: null,
    memberships: [],
    isLoading: false,
    error: null,

    // Actions
    setCurrentTenant: (tenant: Tenant | null) => {
      set({ currentTenant: tenant });
    },

    setMemberships: (memberships: TenantMembership[]) => {
      set({ memberships });
    },

    setLoading: (isLoading: boolean) => {
      set({ isLoading });
    },

    setError: (error: string | null) => {
      set({ error });
    },
  }),
  {
    persist: true,
    version: 1,
  }
);


