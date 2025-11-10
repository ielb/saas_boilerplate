/**
 * Query key factories for type-safe query keys
 * This ensures consistent query key structure across the application
 */

/**
 * Base query key factory
 */
const createQueryKey = <T extends string[]>(...keys: T): T => keys;

/**
 * Authentication query keys
 */
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  sessions: () => [...authKeys.all, 'sessions'] as const,
  session: (id: string) => [...authKeys.sessions(), id] as const,
};

/**
 * Tenant query keys
 */
export const tenantKeys = {
  all: ['tenant'] as const,
  current: () => [...tenantKeys.all, 'current'] as const,
  list: () => [...tenantKeys.all, 'list'] as const,
  detail: (id: string) => [...tenantKeys.all, 'detail', id] as const,
  settings: (id: string) => [...tenantKeys.detail(id), 'settings'] as const,
  branding: (id: string) => [...tenantKeys.detail(id), 'branding'] as const,
  features: (id: string) => [...tenantKeys.detail(id), 'features'] as const,
};

/**
 * User query keys
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...userKeys.lists(), filters] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  profile: (id: string) => [...userKeys.detail(id), 'profile'] as const,
};

/**
 * Team query keys
 */
export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...teamKeys.lists(), filters] as const,
  detail: (id: string) => [...teamKeys.all, 'detail', id] as const,
  members: (id: string) => [...teamKeys.detail(id), 'members'] as const,
};

/**
 * Billing query keys
 */
export const billingKeys = {
  all: ['billing'] as const,
  subscription: () => [...billingKeys.all, 'subscription'] as const,
  subscriptions: () => [...billingKeys.all, 'subscriptions'] as const,
  subscriptionDetail: (id: string) =>
    [...billingKeys.subscriptions(), id] as const,
  paymentMethods: () => [...billingKeys.all, 'payment-methods'] as const,
  paymentMethod: (id: string) =>
    [...billingKeys.paymentMethods(), id] as const,
  invoices: () => [...billingKeys.all, 'invoices'] as const,
  invoice: (id: string) => [...billingKeys.invoices(), id] as const,
  analytics: () => [...billingKeys.all, 'analytics'] as const,
  analyticsData: (filters?: Record<string, unknown>) =>
    [...billingKeys.analytics(), filters] as const,
  taxes: () => [...billingKeys.all, 'taxes'] as const,
};

/**
 * Invitation query keys
 */
export const invitationKeys = {
  all: ['invitations'] as const,
  lists: () => [...invitationKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...invitationKeys.lists(), filters] as const,
  detail: (id: string) => [...invitationKeys.all, 'detail', id] as const,
};

