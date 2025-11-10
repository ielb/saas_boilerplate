'use client';

import type { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Footer } from './footer';

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * Main application layout component with sidebar and header structure
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className='flex min-h-screen flex-col'>
      <Header />
      <div className='flex flex-1'>
        <Sidebar />
        <main className='flex-1 overflow-auto'>{children}</main>
      </div>
      <Footer />
    </div>
  );
}


