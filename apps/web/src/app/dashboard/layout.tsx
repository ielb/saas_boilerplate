import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard layout with sidebar and header
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className='flex min-h-screen flex-col'>
      <Header />
      <div className='flex flex-1 overflow-hidden'>
        <Sidebar />
        <main className='flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 lg:ml-64'>
          <div className='container mx-auto px-4 py-8'>{children}</div>
        </main>
      </div>
    </div>
  );
}
