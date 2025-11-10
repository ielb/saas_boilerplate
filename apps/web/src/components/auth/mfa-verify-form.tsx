'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

/**
 * MFA Verification form component
 */
export function MfaVerifyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const userId = searchParams.get('userId');
  const [token, setToken] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!userId) {
      toast.error('Invalid verification request');
      return;
    }

    if (useBackupCode && !backupCode) {
      toast.error('Please enter a backup code');
      return;
    }

    if (!useBackupCode && token.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await authService.verifyMfaLogin(
        userId,
        useBackupCode ? backupCode : token
      );
      setAuth(response);
      toast.success('Login successful');
      router.push('/dashboard');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Verification failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <h2 className='text-2xl font-bold'>Two-Factor Authentication</h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          Enter the code from your authenticator app
        </p>
      </div>

      {!useBackupCode ? (
        <div className='space-y-4'>
          <div>
            <label htmlFor='mfa-token' className='mb-2 block text-sm font-medium'>
              Verification code
            </label>
            <input
              id='mfa-token'
              type='text'
              inputMode='numeric'
              pattern='[0-9]*'
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              placeholder='000000'
              className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-lg font-mono tracking-widest ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            />
          </div>

          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => setUseBackupCode(true)}
            className='w-full'
          >
            Use backup code instead
          </Button>
        </div>
      ) : (
        <div className='space-y-4'>
          <div>
            <label htmlFor='backup-code' className='mb-2 block text-sm font-medium'>
              Backup code
            </label>
            <input
              id='backup-code'
              type='text'
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              placeholder='Enter backup code'
              className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-center font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            />
          </div>

          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => {
              setUseBackupCode(false);
              setBackupCode('');
            }}
            className='w-full'
          >
            Use authenticator app instead
          </Button>
        </div>
      )}

      <Button
        type='button'
        onClick={handleVerify}
        className='w-full'
        disabled={isVerifying || (!useBackupCode && token.length !== 6) || (useBackupCode && !backupCode)}
      >
        {isVerifying ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Verifying...
          </>
        ) : (
          'Verify'
        )}
      </Button>

      <div className='text-center text-sm'>
        <Link href='/login' className='text-primary hover:underline'>
          Back to login
        </Link>
      </div>
    </div>
  );
}

