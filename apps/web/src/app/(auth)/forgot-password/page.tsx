import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <div className='w-full max-w-md space-y-8'>
      <div className='text-center'>
        <h1 className='text-3xl font-bold tracking-tight'>Forgot password</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Enter your email to receive a password reset link
        </p>
      </div>

      <div className='rounded-lg border bg-card p-8 shadow-sm'>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}

