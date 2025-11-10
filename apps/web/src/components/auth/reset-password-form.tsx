'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

/**
 * Reset password form schema
 */
const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

/**
 * Reset password form component
 */
export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    // @ts-expect-error - zodResolver type compatibility issue with strict mode
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidToken(false);
        setIsValidating(false);
        toast.error('Invalid or missing reset token');
        return;
      }

      try {
        // Validate token with backend
        await authService.validateResetToken({ token });
        setIsValidToken(true);
      } catch (err) {
        setIsValidToken(false);
        toast.error('Invalid or expired reset token');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      toast.error('Invalid reset token');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({
        token,
        newPassword: values.password,
      });
      setSuccess(true);
      toast.success('Password reset successful');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className='flex items-center justify-center py-8'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className='space-y-4 text-center'>
        <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15'>
          <svg
            className='h-6 w-6 text-destructive'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </div>
        <h2 className='text-2xl font-bold'>Invalid or Expired Link</h2>
        <p className='text-muted-foreground'>
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Button asChild className='mt-4'>
          <Link href='/forgot-password'>Request new reset link</Link>
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className='space-y-4 text-center'>
        <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900'>
          <svg
            className='h-6 w-6 text-green-600 dark:text-green-400'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M5 13l4 4L19 7'
            />
          </svg>
        </div>
        <h2 className='text-2xl font-bold'>Password Reset Successful</h2>
        <p className='text-muted-foreground'>
          Your password has been reset successfully. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder='At least 8 characters'
                  autoComplete='new-password'
                  disabled={isLoading}
                  {...field}
                />
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
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder='Confirm your password'
                  autoComplete='new-password'
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type='submit' className='w-full' disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Resetting password...
            </>
          ) : (
            'Reset password'
          )}
        </Button>

        <div className='text-center text-sm'>
          <Link href='/login' className='text-primary hover:underline'>
            Back to login
          </Link>
        </div>
      </form>
    </Form>
  );
}

