'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
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

/**
 * Registration form schema
 */
const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    tenantName: z.string().min(1, 'Organization name is required'),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
    marketingConsent: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * Registration form component
 */
export function RegisterForm() {
  const { register: registerUser, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<RegisterFormValues>({
    // @ts-expect-error - zodResolver type compatibility issue with strict mode
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      tenantName: '',
      acceptTerms: false,
      marketingConsent: false,
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setError(null);
    try {
      await registerUser(
        values.email,
        values.password,
        values.firstName,
        values.lastName,
        values.tenantName,
        values.acceptTerms,
        values.marketingConsent
      );
      setSuccess(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(errorMessage);
    }
  };

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
        <h2 className='text-2xl font-bold'>Check your email</h2>
        <p className='text-muted-foreground'>
          We've sent a verification link to <strong>{form.getValues('email')}</strong>
        </p>
        <p className='text-sm text-muted-foreground'>
          Please click the link in the email to verify your account before signing in.
        </p>
        <Button asChild className='mt-4'>
          <Link href='/login'>Go to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        {error && (
          <div className='rounded-md bg-destructive/15 p-3 text-sm text-destructive'>
            {error}
          </div>
        )}

        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='firstName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder='John'
                    autoComplete='given-name'
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
            name='lastName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Doe'
                    autoComplete='family-name'
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name='tenantName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input
                  placeholder='Your Company'
                  autoComplete='organization'
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
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type='email'
                  placeholder='you@example.com'
                  autoComplete='email'
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
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
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
              <FormLabel>Confirm Password</FormLabel>
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

        <FormField
          control={form.control}
          name='acceptTerms'
          render={({ field }) => (
            <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
              <FormControl>
                <input
                  type='checkbox'
                  className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                  checked={field.value}
                  disabled={isLoading}
                  onChange={field.onChange}
                />
              </FormControl>
              <div className='space-y-1 leading-none'>
                <FormLabel className='cursor-pointer text-sm font-normal'>
                  I agree to the{' '}
                  <Link href='/terms' className='text-primary underline hover:no-underline'>
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href='/privacy' className='text-primary underline hover:no-underline'>
                    Privacy Policy
                  </Link>
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='marketingConsent'
          render={({ field }) => (
            <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
              <FormControl>
                <input
                  type='checkbox'
                  className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                  checked={field.value}
                  disabled={isLoading}
                  onChange={field.onChange}
                />
              </FormControl>
              <div className='space-y-1 leading-none'>
                <FormLabel className='cursor-pointer text-sm font-normal'>
                  I'd like to receive product updates and marketing emails
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <Button type='submit' className='w-full' disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>

        <div className='text-center text-sm text-muted-foreground'>
          Already have an account?{' '}
          <Link href='/login' className='text-primary hover:underline'>
            Sign in
          </Link>
        </div>
      </form>
    </Form>
  );
}

