'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  placeholder?: string;
  onSearch: (value: string) => void;
  debounceMs?: number;
  className?: string;
  defaultValue?: string;
}

/**
 * Search input component with debouncing
 */
export function SearchInput({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 300,
  className,
  defaultValue = '',
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs, onSearch]);

  const handleClear = useCallback(() => {
    setValue('');
    onSearch('');
  }, [onSearch]);

  return (
    <div className={cn('relative', className)}>
      <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
      <Input
        type='text'
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className='pl-9 pr-9'
      />
      {value && (
        <Button
          variant='ghost'
          size='icon'
          className='absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2'
          onClick={handleClear}
        >
          <X className='h-4 w-4' />
        </Button>
      )}
    </div>
  );
}


