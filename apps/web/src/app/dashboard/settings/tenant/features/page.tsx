'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantService } from '@/services/tenant.service';
import type { TenantFeatureFlag } from '@/types/tenant';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Feature flags management page with toggle switches
 */
export default function FeatureFlagsPage() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>({});

  const { data: featureFlags, isLoading } = useQuery({
    queryKey: ['feature-flags', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const response = await tenantService.getFeatureFlags(currentTenant.id);
      return response as unknown as TenantFeatureFlag[];
    },
    enabled: !!currentTenant,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      feature,
      isEnabled,
    }: {
      feature: string;
      isEnabled: boolean;
    }) => {
      if (!currentTenant) throw new Error('No tenant selected');
      return tenantService.updateFeatureFlag(currentTenant.id, {
        feature,
        isEnabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['feature-flags', currentTenant?.id],
      });
      toast.success('Feature flag updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update feature flag');
    },
  });

  useEffect(() => {
    if (featureFlags) {
      const flagsMap: Record<string, boolean> = {};
      featureFlags.forEach((flag) => {
        flagsMap[flag.feature] = flag.isEnabled;
      });
      setLocalFlags(flagsMap);
    }
  }, [featureFlags]);

  const handleToggle = (feature: string, enabled: boolean) => {
    setLocalFlags((prev) => ({ ...prev, [feature]: enabled }));
    updateMutation.mutate({ feature, isEnabled: enabled });
  };

  // Common feature flags - in a real app, this would come from the backend
  const availableFeatures = [
    { id: 'advanced_analytics', label: 'Advanced Analytics', description: 'Enable detailed analytics and reporting' },
    { id: 'api_access', label: 'API Access', description: 'Allow API access for integrations' },
    { id: 'custom_branding', label: 'Custom Branding', description: 'Enable custom logos and colors' },
    { id: 'sso', label: 'Single Sign-On', description: 'Enable SSO authentication' },
    { id: 'webhooks', label: 'Webhooks', description: 'Enable webhook notifications' },
    { id: 'audit_logs', label: 'Audit Logs', description: 'Enable detailed audit logging' },
  ];

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <Loading />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold tracking-tight'>Feature Flags</h1>
        <p className='text-muted-foreground mt-2'>
          Enable or disable features for your organization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Features</CardTitle>
          <CardDescription>
            Toggle features on or off for your tenant. Changes take effect
            immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableFeatures.length === 0 ? (
            <EmptyState
              title='No features available'
              description='No feature flags are configured for your tenant.'
            />
          ) : (
            <div className='space-y-6'>
              {availableFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className='flex items-center justify-between rounded-lg border p-4'
                >
                  <div className='flex-1'>
                    <Label
                      htmlFor={feature.id}
                      className='text-base font-semibold cursor-pointer'
                    >
                      {feature.label}
                    </Label>
                    <p className='text-sm text-muted-foreground mt-1'>
                      {feature.description}
                    </p>
                  </div>
                  <Switch
                    id={feature.id}
                    checked={localFlags[feature.id] || false}
                    onCheckedChange={(checked) =>
                      handleToggle(feature.id, checked)
                    }
                    disabled={updateMutation.isPending}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


