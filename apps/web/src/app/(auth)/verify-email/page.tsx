import { VerifyEmailForm } from '@/components/auth/verify-email-form';

export default function VerifyEmailPage() {
  return (
    <div className='w-full max-w-md space-y-8'>
      <div className='rounded-lg border bg-card p-8 shadow-sm'>
        <VerifyEmailForm />
      </div>
    </div>
  );
}

