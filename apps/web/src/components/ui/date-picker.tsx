'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { DayPicker, type DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import 'react-day-picker/dist/style.css';

interface DatePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Date picker component for single date selection
 */
export function DatePicker({
  date,
  onDateChange,
  placeholder = 'Pick a date',
  className,
  disabled,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <Calendar className='mr-2 h-4 w-4' />
          {date ? format(date, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <DayPicker mode='single' selected={date} onSelect={onDateChange} />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onDateRangeChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Date range picker component for date range selection
 */
export function DateRangePicker({
  startDate,
  endDate,
  onDateRangeChange,
  placeholder = 'Pick a date range',
  className,
  disabled,
}: DateRangePickerProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(
    startDate && endDate ? { from: startDate, to: endDate } : undefined
  );

  const handleSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
    onDateRangeChange(range?.from, range?.to);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          className={cn(
            'w-full justify-start text-left font-normal',
            !startDate && !endDate && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <Calendar className='mr-2 h-4 w-4' />
          {startDate && endDate ? (
            <>
              {format(startDate, 'LLL dd, y')} - {format(endDate, 'LLL dd, y')}
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <DayPicker
          mode='range'
          selected={selectedRange}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

