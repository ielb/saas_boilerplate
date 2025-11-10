import { MfaVerifyForm } from '@/components/auth/mfa-verify-form';

export default function MfaVerifyPage() {
  return (
    <div className='w-full max-w-md space-y-8'>
      <div className='rounded-lg border bg-card p-8 shadow-sm'>
        <MfaVerifyForm />
      </div>
    </div>
  );
}

