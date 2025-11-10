'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { teamsService, type Team } from '@/services/teams.service';
import { DataTable, type Column } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { useRouter } from 'next/navigation';

/**
 * Teams list page with filtering and search
 */
export default function TeamsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, error } = useQuery({
    queryKey: ['teams', page, pageSize, search],
    queryFn: async () => {
      // API returns: { teams: Team[], total: number }
      const response = await teamsService.getTeams({
        search: search || undefined,
        page,
        limit: pageSize,
      });
      return response;
    },
  });

  const columns: Column<Team>[] = [
    {
      id: 'name',
      header: 'Team Name',
      accessorKey: 'name',
      cell: (row: Team) => (
        <div>
          <div className='font-medium'>{row.name}</div>
          {row.description && (
            <div className='text-sm text-muted-foreground'>{row.description}</div>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      id: 'createdAt',
      header: 'Created',
      accessorKey: 'createdAt',
      cell: (row: Team) => new Date(row.createdAt).toLocaleDateString(),
      sortable: true,
    },
  ];

  const handleRowClick = (row: Team) => {
    router.push(`/dashboard/teams/${row.id}`);
  };

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <Card>
          <CardContent className='py-8'>
            <EmptyState
              title='Error loading teams'
              description='Failed to load teams. Please try again.'
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Teams</h1>
          <p className='text-muted-foreground mt-2'>
            Manage teams and their members.
          </p>
        </div>
        <Button asChild>
          <Link href='/dashboard/teams/new'>
            <Plus className='mr-2 h-4 w-4' />
            Create Team
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>All Teams</CardTitle>
              <CardDescription>
                {data?.total || 0} team{data?.total !== 1 ? 's' : ''} total
              </CardDescription>
            </div>
            <SearchInput
              placeholder='Search teams...'
              onSearch={setSearch}
              className='w-64'
            />
          </div>
        </CardHeader>
        <CardContent>
          {data && data.teams && data.teams.length > 0 ? (
            <>
              <DataTable
                data={data.teams}
                columns={columns}
                searchable={false}
                onRowClick={handleRowClick}
              />
              {/* Teams endpoint doesn't return pagination info, so we show simple count */}
              {data.total > pageSize && (
                <div className='mt-4 text-sm text-muted-foreground text-center'>
                  Showing {data.teams.length} of {data.total} teams
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title='No teams found'
              description='Create your first team to get started.'
              action={{
                label: 'Create Team',
                onClick: () => router.push('/dashboard/teams/new'),
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

