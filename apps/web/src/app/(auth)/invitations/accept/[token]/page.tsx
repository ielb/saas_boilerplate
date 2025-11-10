'use client';

import { use } from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const acceptInvitationSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;

/**
 * Invitation acceptance flow for new users
 */
export default function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const token = resolvedParams.token;
  const [isAccepted, setIsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: invitation, isLoading } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const response = await invitationsService.getInvitationById(token);
      return response as unknown as {
        email: string;
        role: string;
        status: string;
      };
    },
    enabled: !!token,
  });

  const form = useForm<AcceptInvitationFormValues>({
    // @ts-expect-error - zodResolver type compatibility issue
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: AcceptInvitationFormValues) => {
    setIsSubmitting(true);
    try {
      await invitationsService.acceptInvitation(token, {
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      });
      setIsAccepted(true);
      toast.success('Invitation accepted successfully');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to accept invitation';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8 flex items-center justify-center min-h-screen'>
        <Loading />
      </div>
    );
  }

  if (!invitation || invitation.status !== 'pending') {
    return (
      <div className='container mx-auto px-4 py-8 flex items-center justify-center min-h-screen'>
        <Card className='max-w-md'>
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation is invalid or has already been used.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className='container mx-auto px-4 py-8 flex items-center justify-center min-h-screen'>
        <Card className='max-w-md'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <CheckCircle2 className='h-5 w-5 text-green-600' />
              Invitation Accepted
            </CardTitle>
            <CardDescription>
              Your account has been created successfully. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8 flex items-center justify-center min-h-screen'>
      <Card className='max-w-md w-full'>
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            Complete your account setup to accept the invitation for{' '}
            {invitation.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-6'
            >
              <div className='grid gap-6 md:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='firstName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder='John' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='lastName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder='Doe' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input type='password' placeholder='********' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password *</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder='********'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type='submit' className='w-full' disabled={isSubmitting}>
                {isSubmitting && <Loading size='sm' className='mr-2' />}
                Accept Invitation
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


