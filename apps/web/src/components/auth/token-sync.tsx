'use client';

import { useEffect } from 'react';
import { syncTokensToCookies } from '@/lib/token-manager';

/**
 * Token Sync Component
 * Syncs tokens from localStorage to cookies for middleware access
 * This component runs on the client side to ensure cookies are set
 * even for users who logged in before cookie support was added
 */
export function TokenSync() {
  useEffect(() => {
    // Sync tokens to cookies on mount
    syncTokensToCookies();
  }, []);

  return null; // This component doesn't render anything
}

