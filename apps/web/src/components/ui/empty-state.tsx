'use client';

import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Empty state component for lists without data
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
        {icon || <Inbox className='h-8 w-8 text-muted-foreground' />}
      </div>
      <h3 className='mb-2 text-lg font-semibold'>{title}</h3>
      {description && (
        <p className='mb-6 max-w-sm text-sm text-muted-foreground'>{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant='outline'>
          {action.label}
        </Button>
      )}
    </div>
  );
}


