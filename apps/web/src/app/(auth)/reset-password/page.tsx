import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <div className='w-full max-w-md space-y-8'>
      <div className='text-center'>
        <h1 className='text-3xl font-bold tracking-tight'>Reset password</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Enter your new password below
        </p>
      </div>

      <div className='rounded-lg border bg-card p-8 shadow-sm'>
        <ResetPasswordForm />
      </div>
    </div>
  );
}

