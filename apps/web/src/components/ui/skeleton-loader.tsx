'use client';

import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

/**
 * Skeleton loader for table rows
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className='space-y-3'>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className='flex gap-4'>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className='h-10 flex-1' />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for cards
 */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className='rounded-lg border bg-card p-6 shadow-sm'>
          <Skeleton className='h-6 w-3/4 mb-4' />
          <Skeleton className='h-4 w-full mb-2' />
          <Skeleton className='h-4 w-5/6' />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for list items
 */
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className='space-y-4'>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className='flex items-center gap-4'>
          <Skeleton className='h-12 w-12 rounded-full' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-3/4' />
            <Skeleton className='h-3 w-1/2' />
          </div>
        </div>
      ))}
    </div>
  );
}


