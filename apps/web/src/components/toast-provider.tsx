'use client';

import { Toaster } from 'sonner';
import type { ReactNode } from 'react';

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Toast notification provider
 * Wraps the application with Sonner toast notifications
 */
export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster
        position='top-right'
        richColors
        closeButton
        expand
        duration={4000}
      />
    </>
  );
}

