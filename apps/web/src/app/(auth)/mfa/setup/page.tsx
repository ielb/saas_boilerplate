import { MfaSetupForm } from '@/components/auth/mfa-setup-form';

export default function MfaSetupPage() {
  return (
    <div className='w-full max-w-2xl space-y-8'>
      <div className='rounded-lg border bg-card p-8 shadow-sm'>
        <MfaSetupForm />
      </div>
    </div>
  );
}

