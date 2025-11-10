'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersService, type User } from '@/services/users.service';
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
 * Users list page with search, filters, and pagination
 */
export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', page, pageSize, search, roleFilter, statusFilter],
    queryFn: async () => {
      // API returns: { users: User[], total: number }
      const response = await usersService.getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: pageSize,
      });
      // Calculate pagination info from response
      const totalPages = Math.ceil((response.total || 0) / pageSize);
      return {
        ...response,
        page,
        limit: pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    },
  });

  const columns: Column<User>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'firstName',
      cell: (row: User) => (
        <div>
          <div className='font-medium'>
            {row.firstName} {row.lastName}
          </div>
          <div className='text-sm text-muted-foreground'>{row.email}</div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'role',
      header: 'Role',
      accessorKey: 'role',
      cell: (row: User) => (
        <Badge variant='secondary'>{row.role || 'Member'}</Badge>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (row: User) => (
        <Badge
          variant={row.status === 'ACTIVE' ? 'default' : 'destructive'}
        >
          {row.status}
        </Badge>
      ),
      sortable: true,
    },
    {
      id: 'lastLogin',
      header: 'Last Login',
      accessorKey: 'lastLoginAt',
      cell: (row: User) =>
        row.lastLoginAt
          ? new Date(row.lastLoginAt).toLocaleDateString()
          : 'Never',
      sortable: true,
    },
  ];

  const handleRowClick = (row: User) => {
    router.push(`/dashboard/users/${row.id}`);
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
              title='Error loading users'
              description='Failed to load users. Please try again.'
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
          <h1 className='text-3xl font-bold tracking-tight'>Users</h1>
          <p className='text-muted-foreground mt-2'>
            Manage your organization's users and their permissions.
          </p>
        </div>
        <Button asChild>
          <Link href='/dashboard/users/new'>
            <Plus className='mr-2 h-4 w-4' />
            Add User
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                {data?.total || 0} user{data?.total !== 1 ? 's' : ''} total
              </CardDescription>
            </div>
            <div className='flex items-center gap-4'>
              <SearchInput
                placeholder='Search users...'
                onSearch={setSearch}
                className='w-64'
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data && data.users && data.users.length > 0 ? (
            <>
              <DataTable
                data={data.users}
                columns={columns}
                searchable={false}
                onRowClick={handleRowClick}
              />
              <div className='mt-4'>
                <Pagination
                  currentPage={page}
                  totalPages={data.totalPages || 1}
                  pageSize={pageSize}
                  totalItems={data.total || 0}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </>
          ) : (
            <EmptyState
              title='No users found'
              description='Get started by adding your first user.'
              action={{
                label: 'Add User',
                onClick: () => router.push('/dashboard/users/new'),
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

