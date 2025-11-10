'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersService, type User } from '@/services/users.service';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Mail, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

/**
 * User details page with profile information and activity
 */
export default function UserDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const userId = resolvedParams.id;

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await usersService.getUserById(userId);
      return response as unknown as User;
    },
  });

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <Loading />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <EmptyState
          title='User not found'
          description='The user you are looking for does not exist or has been deleted.'
          action={{
            label: 'Back to Users',
            onClick: () => router.push('/dashboard/users'),
          }}
        />
      </div>
    );
  }

  const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <Button
          variant='ghost'
          onClick={() => router.back()}
          className='mb-4'
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back
        </Button>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              {user.firstName} {user.lastName}
            </h1>
            <p className='text-muted-foreground mt-2'>User profile and details</p>
          </div>
          <Button asChild>
            <Link href={`/dashboard/users/${userId}/edit`}>
              <Edit className='mr-2 h-4 w-4' />
              Edit User
            </Link>
          </Button>
        </div>
      </div>

      <div className='grid gap-6 md:grid-cols-3'>
        <Card className='md:col-span-1'>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col items-center gap-4'>
            <Avatar className='h-24 w-24'>
              <AvatarImage src={user.avatar} alt={user.email} />
              <AvatarFallback className='text-2xl'>{userInitials}</AvatarFallback>
            </Avatar>
            <div className='text-center'>
              <div className='font-semibold text-lg'>
                {user.firstName} {user.lastName}
              </div>
              <div className='text-sm text-muted-foreground'>{user.email}</div>
            </div>
            <div className='flex gap-2'>
              <Badge variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}>
                {user.status}
              </Badge>
              <Badge variant='secondary'>{user.role || 'Member'}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className='md:col-span-2'>
          <CardHeader>
            <CardTitle>Information</CardTitle>
            <CardDescription>User account details and metadata</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='flex items-center gap-4'>
                <Mail className='h-5 w-5 text-muted-foreground' />
                <div>
                  <div className='text-sm font-medium'>Email</div>
                  <div className='text-sm text-muted-foreground'>{user.email}</div>
                </div>
              </div>
              <div className='flex items-center gap-4'>
                <Calendar className='h-5 w-5 text-muted-foreground' />
                <div>
                  <div className='text-sm font-medium'>Member Since</div>
                  <div className='text-sm text-muted-foreground'>
                    {format(new Date(user.createdAt), 'MMMM dd, yyyy')}
                  </div>
                </div>
              </div>
              {user.lastLoginAt && (
                <div className='flex items-center gap-4'>
                  <Calendar className='h-5 w-5 text-muted-foreground' />
                  <div>
                    <div className='text-sm font-medium'>Last Login</div>
                    <div className='text-sm text-muted-foreground'>
                      {format(new Date(user.lastLoginAt), 'MMMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Section - TODO: Add real activity data */}
      <Card className='mt-6'>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>User's recent actions and events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8 text-muted-foreground'>
            No recent activity to display
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


