import { AccountRecoveryForm } from '@/components/auth/account-recovery-form';

export default function AccountRecoveryPage() {
  return (
    <div className='w-full max-w-2xl space-y-8'>
      <div className='rounded-lg border bg-card p-8 shadow-sm'>
        <AccountRecoveryForm />
      </div>
    </div>
  );
}

