'use client';

import { useState, useEffect } from 'react';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { TwoFactorAuthStatus } from '@shared/types/auth.types';

/**
 * Account recovery form component
 * Manages backup codes for MFA
 */
export function AccountRecoveryForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [mfaStatus, setMfaStatus] = useState<TwoFactorAuthStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await authService.getMfaStatus();
        setMfaStatus(status);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load MFA status';
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadStatus();
  }, []);

  const handleGenerateCodes = async () => {
    if (!mfaStatus?.isEnabled) {
      toast.error('MFA is not enabled');
      return;
    }

    setIsGenerating(true);
    try {
      // Note: This requires a verification token in production
      // For now, using a placeholder
      const response = await authService.generateBackupCodes('');
      const data = (response as unknown as { backupCodes: string[] });
      setNewBackupCodes(data.backupCodes);
      toast.success('New backup codes generated');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to generate backup codes';
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCodes = async () => {
    if (!newBackupCodes) return;

    try {
      await navigator.clipboard.writeText(newBackupCodes.join('\n'));
      setCopiedCodes(true);
      toast.success('Backup codes copied to clipboard');
      setTimeout(() => setCopiedCodes(false), 2000);
    } catch {
      toast.error('Failed to copy backup codes');
    }
  };

  const handleDownloadCodes = () => {
    if (!newBackupCodes) return;

    const content = `Backup Codes for Account Recovery\n\n${newBackupCodes.join('\n')}\n\nGenerated: ${new Date().toLocaleString()}\n\nKeep these codes in a safe place. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (!mfaStatus?.isEnabled) {
    return (
      <div className='space-y-4 text-center'>
        <p className='text-muted-foreground'>
          Two-factor authentication is not enabled. Enable it first to manage backup codes.
        </p>
        <Button asChild>
          <a href='/mfa/setup'>Set up MFA</a>
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold'>Account Recovery</h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          Manage your backup codes for two-factor authentication
        </p>
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
              Important: Save your backup codes
            </h3>
            <p className='mt-1 text-sm text-yellow-700 dark:text-yellow-300'>
              If you generate new backup codes, your old codes will no longer work. Make sure to
              save the new codes in a safe place.
            </p>
          </div>
        </div>
      </div>

      {newBackupCodes && (
        <div className='space-y-4 rounded-lg border bg-card p-4'>
          <div className='flex items-center justify-between'>
            <h3 className='font-medium'>New Backup Codes</h3>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleCopyCodes}
              >
                {copiedCodes ? (
                  <>
                    <Check className='mr-2 h-4 w-4' />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className='mr-2 h-4 w-4' />
                    Copy
                  </>
                )}
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleDownloadCodes}
              >
                <Download className='mr-2 h-4 w-4' />
                Download
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-2 rounded bg-muted p-3'>
            {newBackupCodes.map((code, index) => (
              <code key={index} className='text-sm font-mono'>
                {code}
              </code>
            ))}
          </div>
        </div>
      )}

      <Button
        type='button'
        variant='destructive'
        onClick={handleGenerateCodes}
        disabled={isGenerating}
        className='w-full'
      >
        {isGenerating ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Generating...
          </>
        ) : (
          'Generate New Backup Codes'
        )}
      </Button>
    </div>
  );
}

