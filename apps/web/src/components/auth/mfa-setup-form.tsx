'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { TwoFactorAuthSetup } from '@shared/types/auth.types';

/**
 * MFA Setup form component
 */
export function MfaSetupForm() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabling, setIsEnabling] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorAuthSetup | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    const loadSetup = async () => {
      if (!user?.id) {
        router.push('/login');
        return;
      }

      try {
        const data = await authService.setupMfa(user.id);
        setSetupData(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to setup MFA';
        toast.error(errorMessage);
        router.push('/settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSetup();
  }, [user, router]);

  const handleCopyCodes = async () => {
    if (!setupData?.backupCodes) return;

    try {
      await navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setCopiedCodes(true);
      toast.success('Backup codes copied to clipboard');
      setTimeout(() => setCopiedCodes(false), 2000);
    } catch {
      toast.error('Failed to copy backup codes');
    }
  };

  const handleEnable = async () => {
    if (!verificationToken || verificationToken.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsEnabling(true);
    try {
      await authService.enableMfa(verificationToken);
      toast.success('MFA enabled successfully');
      router.push('/settings');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to enable MFA';
      toast.error(errorMessage);
    } finally {
      setIsEnabling(false);
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (!setupData) {
    return null;
  }

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <h2 className='text-2xl font-bold'>Set up Two-Factor Authentication</h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          Scan the QR code with your authenticator app
        </p>
      </div>

      <div className='flex justify-center'>
        <div className='rounded-lg border bg-white p-4'>
          {/* QR Code will be displayed here - using img tag for now */}
          <img
            src={setupData.qrCode}
            alt='MFA QR Code'
            className='h-64 w-64'
          />
        </div>
      </div>

      <div className='space-y-2 rounded-lg border bg-muted/50 p-4'>
        <p className='text-sm font-medium'>Manual Entry Code:</p>
        <code className='block break-all text-sm'>{setupData.secret}</code>
      </div>

      <div className='space-y-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20'>
        <div className='flex items-start gap-2'>
          <svg
            className='h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
              clipRule='evenodd'
            />
          </svg>
          <div className='flex-1'>
            <h3 className='text-sm font-medium text-yellow-800 dark:text-yellow-200'>
              Save your backup codes
            </h3>
            <p className='mt-1 text-sm text-yellow-700 dark:text-yellow-300'>
              These codes can be used to access your account if you lose access to your
              authenticator app. Store them in a safe place.
            </p>
          </div>
        </div>

        <div className='mt-4 space-y-2'>
          <div className='grid grid-cols-2 gap-2 rounded bg-white p-3 dark:bg-gray-800'>
            {setupData.backupCodes.map((code, index) => (
              <code key={index} className='text-sm font-mono'>
                {code}
              </code>
            ))}
          </div>

          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleCopyCodes}
            className='w-full'
          >
            {copiedCodes ? (
              <>
                <Check className='mr-2 h-4 w-4' />
                Copied!
              </>
            ) : (
              <>
                <Copy className='mr-2 h-4 w-4' />
                Copy backup codes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className='space-y-4'>
        <div>
          <label htmlFor='verification-token' className='mb-2 block text-sm font-medium'>
            Enter verification code
          </label>
          <input
            id='verification-token'
            type='text'
            inputMode='numeric'
            pattern='[0-9]*'
            maxLength={6}
            value={verificationToken}
            onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, ''))}
            placeholder='000000'
            className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-center text-lg font-mono tracking-widest ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          />
          <p className='mt-1 text-xs text-muted-foreground'>
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <Button
          type='button'
          onClick={handleEnable}
          className='w-full'
          disabled={isEnabling || verificationToken.length !== 6}
        >
          {isEnabling ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Enabling MFA...
            </>
          ) : (
            'Enable Two-Factor Authentication'
          )}
        </Button>
      </div>
    </div>
  );
}

