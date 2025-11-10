import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900'>
      <div className='w-full max-w-md'>{children}</div>
    </div>
  );
}

