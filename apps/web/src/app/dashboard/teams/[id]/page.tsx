'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { teamsService, type Team, type TeamMember } from '@/services/teams.service';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Users, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * Team details page with members list and permissions
 */
export default function TeamDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const teamId = resolvedParams.id;

  const { data: team, isLoading, error } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const response = await teamsService.getTeamById(teamId);
      return response as unknown as Team & { members: TeamMember[] };
    },
  });

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <Loading />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <EmptyState
          title='Team not found'
          description='The team you are looking for does not exist or has been deleted.'
          action={{
            label: 'Back to Teams',
            onClick: () => router.push('/dashboard/teams'),
          }}
        />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <Button variant='ghost' onClick={() => router.back()} className='mb-4'>
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back
        </Button>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>{team.name}</h1>
            {team.description && (
              <p className='text-muted-foreground mt-2'>{team.description}</p>
            )}
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' asChild>
              <Link href={`/dashboard/teams/${teamId}/edit`}>
                <Edit className='mr-2 h-4 w-4' />
                Edit Team
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard/teams/${teamId}/members`}>
                <UserPlus className='mr-2 h-4 w-4' />
                Add Member
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Team Information</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <div className='text-sm font-medium text-muted-foreground'>Name</div>
              <div className='text-base'>{team.name}</div>
            </div>
            {team.description && (
              <div>
                <div className='text-sm font-medium text-muted-foreground'>
                  Description
                </div>
                <div className='text-base'>{team.description}</div>
              </div>
            )}
            <div>
              <div className='text-sm font-medium text-muted-foreground'>
                Created
              </div>
              <div className='text-base'>
                {new Date(team.createdAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Users className='h-5 w-5' />
              Members ({team.members?.length || 0})
            </CardTitle>
            <CardDescription>Team members and their roles</CardDescription>
          </CardHeader>
          <CardContent>
            {team.members && team.members.length > 0 ? (
              <div className='space-y-3'>
                {team.members.map((member) => {
                  const user = member.user;
                  const initials = user
                    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
                    : 'U';
                  return (
                    <div
                      key={member.id}
                      className='flex items-center justify-between rounded-lg border p-3'
                    >
                      <div className='flex items-center gap-3'>
                        <Avatar className='h-10 w-10'>
                          <AvatarImage src={user?.avatar} alt={user?.email} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className='font-medium'>
                            {user
                              ? `${user.firstName} ${user.lastName}`
                              : 'Unknown User'}
                          </div>
                          <div className='text-sm text-muted-foreground'>
                            {user?.email || 'No email'}
                          </div>
                        </div>
                      </div>
                      <Badge variant='secondary'>{member.role || 'Member'}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title='No members'
                description='Add members to this team to get started.'
                action={{
                  label: 'Add Member',
                  onClick: () => router.push(`/dashboard/teams/${teamId}/members`),
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


