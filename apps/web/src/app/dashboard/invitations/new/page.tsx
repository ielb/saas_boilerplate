'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { invitationsService } from '@/services/invitations.service';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

const invitationSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  role: z.string().min(1, 'Role is required'),
  expiresInDays: z.number().min(1).max(30).optional(),
});

type InvitationFormValues = z.infer<typeof invitationSchema>;

const availableRoles = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
];

/**
 * Invitation form with email input and role selection
 */
export default function CreateInvitationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InvitationFormValues>({
    // @ts-expect-error - zodResolver type compatibility issue
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: '',
      role: 'MEMBER',
      expiresInDays: 7,
    },
  });

  const onSubmit = async (values: InvitationFormValues) => {
    setIsSubmitting(true);
    try {
      await invitationsService.createInvitation({
        email: values.email,
        role: values.role,
        expiresInDays: values.expiresInDays,
      });
      toast.success('Invitation sent successfully');
      router.push('/dashboard/invitations');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send invitation';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <Button variant='ghost' asChild className='mb-4'>
          <Link href='/dashboard/invitations'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Invitations
          </Link>
        </Button>
        <h1 className='text-3xl font-bold tracking-tight'>Send Invitation</h1>
        <p className='text-muted-foreground mt-2'>
          Invite a new user to join your organization.
        </p>
      </div>

      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>Invitation Details</CardTitle>
          <CardDescription>
            Enter the email address and select a role for the new user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='user@example.com'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='role'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a role' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='expiresInDays'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires In (Days)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={1}
                        max={30}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 7)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex justify-end gap-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting && <Loading size='sm' className='mr-2' />}
                  <Send className='mr-2 h-4 w-4' />
                  Send Invitation
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


