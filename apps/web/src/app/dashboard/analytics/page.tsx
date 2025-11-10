'use client';

import { useQuery } from '@tanstack/react-query';
import { tenantService } from '@/services/tenant.service';
import { useTenant } from '@/hooks/use-tenant';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * Tenant usage analytics dashboard with charts
 */
export default function TenantAnalyticsPage() {
  const { currentTenant } = useTenant();

  const { data: statistics, isLoading } = useQuery({
    queryKey: ['tenant-statistics', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return null;
      const response = await tenantService.getTenantStatistics(currentTenant.id);
      return response as unknown as Record<string, any>;
    },
    enabled: !!currentTenant,
  });

  const { data: usage } = useQuery({
    queryKey: ['tenant-usage', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const response = await tenantService.getTenantUsage(currentTenant.id);
      return response as unknown as Array<{
        metric: string;
        value: number;
        period: string;
      }>;
    },
    enabled: !!currentTenant,
  });

  // Mock chart data - in real app, this would come from the API
  const usageData = [
    { month: 'Jan', users: 100, storage: 50 },
    { month: 'Feb', users: 150, storage: 75 },
    { month: 'Mar', users: 200, storage: 100 },
    { month: 'Apr', users: 250, storage: 125 },
    { month: 'May', users: 300, storage: 150 },
    { month: 'Jun', users: 350, storage: 175 },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 5000 },
    { month: 'Feb', revenue: 7500 },
    { month: 'Mar', revenue: 10000 },
    { month: 'Apr', revenue: 12500 },
    { month: 'May', revenue: 15000 },
    { month: 'Jun', revenue: 17500 },
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
        <h1 className='text-3xl font-bold tracking-tight'>Usage Analytics</h1>
        <p className='text-muted-foreground mt-2'>
          Track your organization's usage and growth metrics.
        </p>
      </div>

      <div className='grid gap-6 mb-6'>
        <Card>
          <CardHeader>
            <CardTitle>Usage Over Time</CardTitle>
            <CardDescription>Users and storage usage trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={usageData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='month' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey='users' fill='#8884d8' name='Active Users' />
                <Bar dataKey='storage' fill='#82ca9d' name='Storage (GB)' />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
            <CardDescription>Monthly revenue growth</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='month' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type='monotone'
                  dataKey='revenue'
                  stroke='#8884d8'
                  name='Revenue ($)'
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {statistics && (
        <div className='grid gap-4 md:grid-cols-3'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold'>
                {statistics.totalUsers || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Active Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold'>
                {statistics.activeSessions || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Storage Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold'>
                {statistics.storageUsed || 0} GB
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


