import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTenantStore } from '@/store/tenant.store';
import { tenantService } from '@/services/tenant.service';
import type {
  Tenant,
  CreateTenantRequest,
  UpdateTenantRequest,
  SwitchTenantRequest,
  UpdateFeatureFlagRequest,
} from '@/types/tenant';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';

/**
 * Tenant management hook
 * Provides tenant operations and state
 */
export function useTenant() {
  const router = useRouter();
  const {
    currentTenant,
    memberships,
    isLoading,
    error,
    setCurrentTenant,
    setMemberships,
    setLoading,
    setError,
  } = useTenantStore();

  const { setTokens } = useAuthStore();

  /**
   * Load current tenant
   */
  const loadCurrentTenant = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tenantService.getCurrentTenant();
      // API returns { success, tenantContext, membership }
      // Extract tenant from tenantContext
      setCurrentTenant(response.tenantContext);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load tenant';
      setError(errorMessage);
      console.error('Failed to load current tenant:', err);
    } finally {
      setLoading(false);
    }
  }, [setCurrentTenant, setLoading, setError]);

  /**
   * Load user memberships
   */
  const loadMemberships = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tenantService.getUserMemberships();
      const data = response as unknown as { memberships: any[] };
      setMemberships(data.memberships);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load memberships';
      setError(errorMessage);
      console.error('Failed to load memberships:', err);
    } finally {
      setLoading(false);
    }
  }, [setMemberships, setLoading, setError]);

  /**
   * Switch to a different tenant
   */
  const switchTenant = useCallback(
    async (data: SwitchTenantRequest) => {
      setLoading(true);
      setError(null);
      try {
        const response = await tenantService.switchTenant(data);
        const result = response as unknown as {
          accessToken: string;
          refreshToken: string;
          tenant: Tenant;
        };
        setTokens(result.accessToken, result.refreshToken);
        setCurrentTenant(result.tenant);
        toast.success('Switched tenant successfully');
        router.refresh();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to switch tenant';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setCurrentTenant, setTokens, setLoading, setError, router]
  );

  /**
   * Create tenant
   */
  const createTenant = useCallback(
    async (data: CreateTenantRequest) => {
      setLoading(true);
      setError(null);
      try {
        const response = await tenantService.createTenant(data);
        const tenant = response as unknown as Tenant;
        toast.success('Tenant created successfully');
        return tenant;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create tenant';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError]
  );

  /**
   * Update tenant
   */
  const updateTenant = useCallback(
    async (id: string, data: UpdateTenantRequest) => {
      setLoading(true);
      setError(null);
      try {
        const response = await tenantService.updateTenant(id, data);
        const tenant = response as unknown as Tenant;
        if (currentTenant?.id === id) {
          setCurrentTenant(tenant);
        }
        toast.success('Tenant updated successfully');
        return tenant;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update tenant';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [currentTenant, setCurrentTenant, setLoading, setError]
  );

  /**
   * Update feature flag
   */
  const updateFeatureFlag = useCallback(
    async (tenantId: string, data: UpdateFeatureFlagRequest) => {
      setLoading(true);
      setError(null);
      try {
        await tenantService.updateFeatureFlag(tenantId, data);
        toast.success('Feature flag updated successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to update feature flag';
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError]
  );

  // Load current tenant and memberships on mount
  useEffect(() => {
    if (!currentTenant) {
      loadCurrentTenant();
    }
    if (memberships.length === 0) {
      loadMemberships();
    }
  }, [currentTenant, memberships.length, loadCurrentTenant, loadMemberships]);

  return {
    // State
    currentTenant,
    memberships,
    isLoading,
    error,
    // Actions
    loadCurrentTenant,
    loadMemberships,
    switchTenant,
    createTenant,
    updateTenant,
    updateFeatureFlag,
  };
}

