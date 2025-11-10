/**
 * Tenant types
 */

export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
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
  isActive: boolean;
  isVerified: boolean;
  isInTrial: boolean;
  plan: string;
  trialEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMembership {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  isActive: boolean;
  joinedAt: string;
  tenant?: Tenant;
}

export interface TenantFeatureFlag {
  id: string;
  tenantId: string;
  feature: string;
  isEnabled: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TenantUsage {
  id: string;
  tenantId: string;
  metric: string;
  value: number;
  period: string;
  recordedAt: string;
}

export interface TenantState {
  currentTenant: Tenant | null;
  memberships: TenantMembership[];
  isLoading: boolean;
  error: string | null;
}

export interface TenantActions {
  setCurrentTenant: (tenant: Tenant | null) => void;
  setMemberships: (memberships: TenantMembership[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export type TenantStore = TenantState & TenantActions;


