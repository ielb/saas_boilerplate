'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { delegationService, type Delegation } from '@/services/delegation.service';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Calendar, User, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { CreateDelegationForm } from '@/components/delegation/create-delegation-form';
import { toast } from 'sonner';

/**
 * Access delegation UI for temporary permissions
 */
export default function DelegationPage() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: delegations, isLoading } = useQuery({
    queryKey: ['delegations'],
    queryFn: async () => {
      const response = await delegationService.getDelegations();
      return response as unknown as Delegation[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return delegationService.deleteDelegation(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      toast.success('Delegation revoked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to revoke delegation');
    },
  });

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <Loading />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Access Delegation</h1>
          <p className='text-muted-foreground mt-2'>
            Manage temporary permission delegations to other users.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className='mr-2 h-4 w-4' />
              Create Delegation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Access Delegation</DialogTitle>
              <DialogDescription>
                Grant temporary permissions to another user.
              </DialogDescription>
            </DialogHeader>
            <CreateDelegationForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['delegations'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Delegations</CardTitle>
          <CardDescription>
            View and manage all active access delegations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {delegations && delegations.length > 0 ? (
            <div className='space-y-4'>
              {delegations.map((delegation) => (
                <div
                  key={delegation.id}
                  className='flex items-center justify-between rounded-lg border p-4'
                >
                  <div className='flex items-center gap-4 flex-1'>
                    <div className='rounded-lg bg-primary/10 p-3'>
                      <Shield className='h-5 w-5 text-primary' />
                    </div>
                    <div className='flex-1'>
                      <div className='font-semibold'>Delegated To</div>
                      <div className='text-sm text-muted-foreground'>
                        User ID: {delegation.delegateId}
                      </div>
                      <div className='flex gap-2 mt-2'>
                        {delegation.permissions.map((permission) => (
                          <Badge key={permission} variant='outline'>
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='flex items-center gap-2 text-sm text-muted-foreground mb-2'>
                        <Calendar className='h-4 w-4' />
                        <span>
                          {format(new Date(delegation.startDate), 'MMM dd')} -{' '}
                          {format(new Date(delegation.endDate), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <Badge
                        variant={delegation.isActive ? 'default' : 'secondary'}
                      >
                        {delegation.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => deleteMutation.mutate(delegation.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title='No delegations'
              description='Create a delegation to grant temporary permissions to another user.'
              action={{
                label: 'Create Delegation',
                onClick: () => setIsCreateDialogOpen(true),
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

