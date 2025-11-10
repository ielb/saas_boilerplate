'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invitationsService, type Invitation } from '@/services/invitations.service';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Mail } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

/**
 * Invitations list page with status filters
 */
export default function InvitationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, error } = useQuery({
    queryKey: ['invitations', page, pageSize, search, statusFilter],
    queryFn: async () => {
      // API returns: PaginatedResponse<Invitation> = { data: Invitation[], total, page, limit, totalPages, ... }
      const response = await invitationsService.getInvitations({
        search: search || undefined,
        status: statusFilter
          ? (statusFilter as 'pending' | 'accepted' | 'expired' | 'revoked')
          : undefined,
        page,
        limit: pageSize,
      });
      return response;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant='secondary'>Pending</Badge>;
      case 'accepted':
        return <Badge variant='default'>Accepted</Badge>;
      case 'expired':
        return <Badge variant='destructive'>Expired</Badge>;
      case 'revoked':
        return <Badge variant='outline'>Revoked</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const columns: Column<Invitation>[] = [
    {
      id: 'email',
      header: 'Email',
      accessorKey: 'email',
      cell: (row: Invitation) => (
        <div className='flex items-center gap-2'>
          <Mail className='h-4 w-4 text-muted-foreground' />
          <span>{row.email}</span>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'role',
      header: 'Role',
      accessorKey: 'role',
      cell: (row: Invitation) => <Badge variant='outline'>{row.role}</Badge>,
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (row: Invitation) => getStatusBadge(row.status),
      sortable: true,
    },
    {
      id: 'expiresAt',
      header: 'Expires',
      accessorKey: 'expiresAt',
      cell: (row: Invitation) =>
        row.expiresAt ? format(new Date(row.expiresAt), 'MMM dd, yyyy') : 'Never',
      sortable: true,
    },
  ];

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
              title='Error loading invitations'
              description='Failed to load invitations. Please try again.'
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
          <h1 className='text-3xl font-bold tracking-tight'>Invitations</h1>
          <p className='text-muted-foreground mt-2'>
            Manage user invitations and their status.
          </p>
        </div>
        <Button asChild>
          <Link href='/dashboard/invitations/new'>
            <Plus className='mr-2 h-4 w-4' />
            Send Invitation
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>All Invitations</CardTitle>
              <CardDescription>
                {data?.total || 0} invitation{data?.total !== 1 ? 's' : ''} total
              </CardDescription>
            </div>
            <div className='flex items-center gap-4'>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-[180px]'>
                  <SelectValue placeholder='Filter by status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>All Statuses</SelectItem>
                  <SelectItem value='pending'>Pending</SelectItem>
                  <SelectItem value='accepted'>Accepted</SelectItem>
                  <SelectItem value='expired'>Expired</SelectItem>
                  <SelectItem value='revoked'>Revoked</SelectItem>
                </SelectContent>
              </Select>
              <SearchInput
                placeholder='Search invitations...'
                onSearch={setSearch}
                className='w-64'
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data && data.data && data.data.length > 0 ? (
            <>
              <DataTable
                data={data.data}
                columns={columns}
                searchable={false}
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
              title='No invitations found'
              description='Send your first invitation to get started.'
              action={{
                label: 'Send Invitation',
                onClick: () => router.push('/dashboard/invitations/new'),
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

