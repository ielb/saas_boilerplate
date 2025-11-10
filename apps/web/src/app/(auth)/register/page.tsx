import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <div className='w-full max-w-md space-y-8'>
      <div className='text-center'>
        <h1 className='text-3xl font-bold tracking-tight'>Create an account</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Enter your information to get started
        </p>
      </div>

      <div className='rounded-lg border bg-card p-8 shadow-sm'>
        <RegisterForm />
      </div>
    </div>
  );
}

