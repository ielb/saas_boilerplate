'use client';

import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  CreditCard,
  Activity,
  TrendingUp,
  ArrowRight,
  Plus,
  Settings,
  FileText,
  Shield,
  Bell,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

/**
 * Dashboard page with overview statistics and quick actions
 */
export default function DashboardPage() {
  const { user } = useAuth();

  // Mock data - in real app, this would come from API
  const stats = [
    {
      title: 'Total Users',
      value: '1,234',
      change: '+12.5%',
      trend: 'up',
      icon: Users,
      description: 'Active users this month',
    },
    {
      title: 'Revenue',
      value: '$45,231',
      change: '+8.2%',
      trend: 'up',
      icon: CreditCard,
      description: 'MRR this month',
    },
    {
      title: 'Active Sessions',
      value: '89',
      change: '+5.1%',
      trend: 'up',
      icon: Activity,
      description: 'Currently active',
    },
    {
      title: 'Growth Rate',
      value: '23.4%',
      change: '+2.3%',
      trend: 'up',
      icon: TrendingUp,
      description: 'Month over month',
    },
  ];

  const quickActions = [
    {
      title: 'Add User',
      description: 'Invite a new team member',
      icon: Plus,
      href: '/dashboard/users',
      color: 'bg-blue-500',
    },
    {
      title: 'View Billing',
      description: 'Manage subscriptions',
      icon: CreditCard,
      href: '/dashboard/billing',
      color: 'bg-green-500',
    },
    {
      title: 'Settings',
      description: 'Configure your account',
      icon: Settings,
      href: '/dashboard/settings',
      color: 'bg-purple-500',
    },
    {
      title: 'View Reports',
      description: 'Analytics & insights',
      icon: FileText,
      href: '/dashboard/analytics',
      color: 'bg-orange-500',
    },
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'user',
      action: 'New user registered',
      user: 'John Doe',
      time: new Date(Date.now() - 1000 * 60 * 5),
    },
    {
      id: 2,
      type: 'payment',
      action: 'Payment received',
      user: 'Jane Smith',
      amount: '$299',
      time: new Date(Date.now() - 1000 * 60 * 15),
    },
    {
      id: 3,
      type: 'security',
      action: 'MFA enabled',
      user: 'Bob Johnson',
      time: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: 4,
      type: 'user',
      action: 'User updated profile',
      user: 'Alice Williams',
      time: new Date(Date.now() - 1000 * 60 * 60),
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return Users;
      case 'payment':
        return CreditCard;
      case 'security':
        return Shield;
      default:
        return Bell;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300';
      case 'payment':
        return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300';
      case 'security':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className='space-y-8'>
      {/* Welcome Section */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>
          Welcome back, {user?.firstName || 'User'}!
        </h1>
        <p className='text-muted-foreground mt-2'>
          Here's what's happening with your account today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  {stat.title}
                </CardTitle>
                <Icon className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{stat.value}</div>
                <div className='flex items-center gap-2 text-xs text-muted-foreground mt-1'>
                  <Badge
                    variant={stat.trend === 'up' ? 'default' : 'destructive'}
                    className='text-xs'
                  >
                    {stat.change}
                  </Badge>
                  <span>{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className='grid gap-4 md:grid-cols-2'>
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 gap-4'>
              {quickActions.map(action => {
                const Icon = action.icon;
                return (
                  <Link key={action.title} href={action.href}>
                    <Button
                      variant='outline'
                      className='w-full h-auto flex-col items-start justify-start p-4 hover:bg-accent'
                    >
                      <div
                        className={`${action.color} p-2 rounded-lg mb-2 w-fit`}
                      >
                        <Icon className='h-5 w-5 text-white' />
                      </div>
                      <div className='text-left'>
                        <div className='font-semibold text-sm'>
                          {action.title}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {action.description}
                        </div>
                      </div>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates and events</CardDescription>
              </div>
              <Button variant='ghost' size='sm' asChild>
                <Link href='/dashboard/activity'>
                  View All
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {recentActivity.map(activity => {
                const Icon = getActivityIcon(activity.type);
                const timeAgo =
                  activity.time.getTime() > Date.now() - 1000 * 60 * 60
                    ? format(activity.time, 'mm') + ' minutes ago'
                    : format(activity.time, 'h:mm a');

                return (
                  <div key={activity.id} className='flex items-start gap-4'>
                    <div
                      className={`${getActivityColor(
                        activity.type
                      )} p-2 rounded-lg flex-shrink-0`}
                    >
                      <Icon className='h-4 w-4' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between gap-2'>
                        <p className='text-sm font-medium'>{activity.action}</p>
                        <span className='text-xs text-muted-foreground whitespace-nowrap'>
                          {timeAgo}
                        </span>
                      </div>
                      <div className='flex items-center gap-2 mt-1'>
                        <p className='text-xs text-muted-foreground'>
                          {activity.user}
                        </p>
                        {activity.amount && (
                          <Badge variant='outline' className='text-xs'>
                            {activity.amount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info Cards */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Status</span>
                <Badge variant='default'>{user?.status || 'Active'}</Badge>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-muted-foreground'>Role</span>
                <Badge variant='secondary'>{user?.role || 'Member'}</Badge>
              </div>
              {user?.lastLoginAt && (
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>
                    Last Login
                  </span>
                  <span className='text-sm'>
                    {format(new Date(user.lastLoginAt), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm'>Two-Factor Auth</span>
                <Badge variant='outline'>Not Enabled</Badge>
              </div>
              <Button variant='outline' size='sm' className='w-full' asChild>
                <Link href='/dashboard/settings/security'>
                  Manage Security
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <p className='text-sm text-muted-foreground'>
                Need help? Our support team is here for you.
              </p>
              <div className='flex gap-2'>
                <Button variant='outline' size='sm' className='flex-1' asChild>
                  <Link href='/support'>Help Center</Link>
                </Button>
                <Button variant='outline' size='sm' className='flex-1' asChild>
                  <Link href='/contact'>Contact Us</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
