'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { delegationService } from '@/services/delegation.service';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

const delegationSchema = z.object({
  delegateId: z.string().min(1, 'User ID is required'),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  startDate: z.date(),
  endDate: z.date(),
});

type DelegationFormValues = z.infer<typeof delegationSchema>;

interface CreateDelegationFormProps {
  onSuccess: () => void;
}

/**
 * Create delegation form component
 */
export function CreateDelegationForm({ onSuccess }: CreateDelegationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DelegationFormValues>({
    // @ts-expect-error - zodResolver type compatibility issue
    resolver: zodResolver(delegationSchema),
    defaultValues: {
      delegateId: '',
      permissions: [],
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  const onSubmit = async (values: DelegationFormValues) => {
    setIsSubmitting(true);
    try {
      await delegationService.createDelegation({
        delegateId: values.delegateId,
        permissions: values.permissions,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
      });
      toast.success('Delegation created successfully');
      onSuccess();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create delegation';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='delegateId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delegate User ID *</FormLabel>
              <FormControl>
                <Input placeholder='user-id' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid gap-6 md:grid-cols-2'>
          <FormField
            control={form.control}
            name='startDate'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date *</FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value}
                    onDateChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='endDate'
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date *</FormLabel>
                <FormControl>
                  <DatePicker
                    date={field.value}
                    onDateChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='flex justify-end gap-4'>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting && <Loading size='sm' className='mr-2' />}
            <Save className='mr-2 h-4 w-4' />
            Create Delegation
          </Button>
        </div>
      </form>
    </Form>
  );
}


