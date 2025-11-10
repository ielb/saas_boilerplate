'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

/**
 * Email verification form component
 */
export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [isVerifying, setIsVerifying] = useState(!!token);
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendEmail, setResendEmail] = useState(email || '');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setIsVerifying(false);
        return;
      }

      try {
        await authService.verifyEmail(token);
        setIsVerified(true);
        toast.success('Email verified successfully');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } catch (err) {
        setIsVerified(false);
        const errorMessage =
          err instanceof Error ? err.message : 'Email verification failed';
        toast.error(errorMessage);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleResend = async () => {
    if (!resendEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setIsResending(true);
    try {
      await authService.resendVerificationEmail(resendEmail);
      toast.success('Verification email sent. Please check your inbox.');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send verification email';
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  if (isVerifying) {
    return (
      <div className='space-y-4 text-center'>
        <Loader2 className='mx-auto h-12 w-12 animate-spin text-primary' />
        <h2 className='text-2xl font-bold'>Verifying your email</h2>
        <p className='text-muted-foreground'>Please wait while we verify your email address...</p>
      </div>
    );
  }

  if (isVerified) {
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
        <h2 className='text-2xl font-bold'>Email Verified</h2>
        <p className='text-muted-foreground'>
          Your email has been verified successfully. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <h2 className='text-2xl font-bold'>Verify your email</h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          We've sent a verification link to your email address. Please check your inbox and click
          the link to verify your account.
        </p>
      </div>

      <div className='space-y-4'>
        <div>
          <label htmlFor='email' className='mb-2 block text-sm font-medium'>
            Email address
          </label>
          <input
            id='email'
            type='email'
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            placeholder='you@example.com'
            className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          />
        </div>

        <Button
          type='button'
          onClick={handleResend}
          className='w-full'
          disabled={isResending || !resendEmail}
        >
          {isResending ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Sending...
            </>
          ) : (
            'Resend verification email'
          )}
        </Button>
      </div>

      <div className='text-center text-sm'>
        <Link href='/login' className='text-primary hover:underline'>
          Back to login
        </Link>
      </div>
    </div>
  );
}

