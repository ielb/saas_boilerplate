'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Building2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useTenant } from '@/hooks/use-tenant';
import { cn } from '@/lib/utils';
import { Loading } from '@/components/ui/loading';

/**
 * Tenant switcher component with dropdown and search
 */
export function TenantSwitcher() {
  const { currentTenant, memberships, switchTenant, isLoading } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredMemberships = memberships.filter((membership) =>
    membership.tenant?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSwitch = async (tenantId: string) => {
    try {
      await switchTenant({ tenantId });
      setIsOpen(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  if (isLoading && !currentTenant) {
    return <Loading size='sm' />;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          className='flex items-center gap-2 min-w-[200px] justify-between'
        >
          <div className='flex items-center gap-2 min-w-0'>
            <Building2 className='h-4 w-4 flex-shrink-0' />
            <span className='truncate'>
              {currentTenant?.name || 'Select Tenant'}
            </span>
          </div>
          <ChevronsUpDown className='h-4 w-4 flex-shrink-0 opacity-50' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-[300px]' align='start'>
        <DropdownMenuLabel>Switch Tenant</DropdownMenuLabel>
        <div className='px-2 pb-2'>
          <div className='relative'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search tenants...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-8'
            />
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className='max-h-[300px] overflow-y-auto'>
          {filteredMemberships.length === 0 ? (
            <div className='px-2 py-6 text-center text-sm text-muted-foreground'>
              {searchQuery ? 'No tenants found' : 'No tenants available'}
            </div>
          ) : (
            filteredMemberships.map((membership) => {
              const isActive = currentTenant?.id === membership.tenantId;
              return (
                <DropdownMenuItem
                  key={membership.id}
                  onClick={() => !isActive && handleSwitch(membership.tenantId)}
                  className={cn(
                    'flex items-center justify-between cursor-pointer',
                    isActive && 'bg-accent'
                  )}
                  disabled={isActive || isLoading}
                >
                  <div className='flex items-center gap-2 min-w-0 flex-1'>
                    <Building2 className='h-4 w-4 flex-shrink-0' />
                    <div className='min-w-0 flex-1'>
                      <div className='truncate font-medium'>
                        {membership.tenant?.name || 'Unknown Tenant'}
                      </div>
                      {membership.role && (
                        <div className='text-xs text-muted-foreground truncate'>
                          {membership.role}
                        </div>
                      )}
                    </div>
                  </div>
                  {isActive && <Check className='h-4 w-4 flex-shrink-0' />}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


