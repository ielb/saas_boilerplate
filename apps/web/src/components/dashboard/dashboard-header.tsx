'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

/**
 * Dashboard Header Component
 * Displays dashboard header with sign out button
 */
export function DashboardHeader() {
  const { logout, isLoading } = useAuth();

  return (
    <header className='border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'>
      <div className='container mx-auto px-4 py-4'>
        <div className='flex items-center justify-between'>
          <h1 className='text-xl font-semibold'>Dashboard</h1>
          <Button
            variant='outline'
            size='sm'
            onClick={logout}
            disabled={isLoading}
          >
            <LogOut className='mr-2 h-4 w-4' />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}

