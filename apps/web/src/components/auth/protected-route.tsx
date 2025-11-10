'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import type { UserRole } from '@shared/types/auth.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: string | string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Protected route wrapper component
 * Handles authentication and role-based access control
 */
export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallback,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading, checkAuth } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  if (isLoading) {
    return (
      fallback || (
        <div className='flex min-h-screen items-center justify-center'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      )
    );
  }

  if (!isAuthenticated || !checkAuth()) {
    return null;
  }

  if (!user) {
    return null;
  }

  // Check role-based access
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role as any)) {
      return (
        fallback || (
          <div className='flex min-h-screen items-center justify-center'>
            <div className='text-center'>
              <h2 className='text-2xl font-bold'>Access Denied</h2>
              <p className='mt-2 text-muted-foreground'>
                You don't have permission to access this page.
              </p>
            </div>
          </div>
        )
      );
    }
  }

  // Check permission-based access
  // Note: This would require permissions to be loaded from the user object
  // For now, we'll just check roles. Permissions can be added later when the API provides them.

  return <>{children}</>;
}

