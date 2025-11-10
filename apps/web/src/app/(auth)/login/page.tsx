import { LoginForm } from '@/components/auth/login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className='w-full max-w-md space-y-8'>
      <div className='text-center'>
        <h1 className='text-3xl font-bold tracking-tight'>Welcome back</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Sign in to your account to continue
        </p>
      </div>

      <div className='rounded-lg border bg-card p-8 shadow-sm'>
        <LoginForm />
      </div>

      <div className='text-center text-xs text-muted-foreground'>
        By signing in, you agree to our{' '}
        <Link href='/terms' className='underline hover:text-foreground'>
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href='/privacy' className='underline hover:text-foreground'>
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}

