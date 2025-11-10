'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionService } from '@/services/session.service';
import { authKeys } from '@/lib/query-keys';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Shield, ShieldOff, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/utils/format';

// Helper function for relative time
function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  return formatDate(d);
}
import type { Session } from '@/services/session.service';

/**
 * Session manager component
 * Displays and manages user sessions
 */
export function SessionManager() {
  const queryClient = useQueryClient();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: authKeys.sessions(),
    queryFn: () => sessionService.getSessions(),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason?: string }) =>
      sessionService.revokeSession(sessionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
      toast.success('Session revoked successfully');
    },
    onError: (err) => {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to revoke session';
      toast.error(errorMessage);
    },
  });

  const revokeOthersMutation = useMutation({
    mutationFn: (reason?: string) => sessionService.revokeOtherSessions(reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
      toast.success('All other sessions revoked');
    },
    onError: (err) => {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to revoke sessions';
      toast.error(errorMessage);
    },
  });

  const trustMutation = useMutation({
    mutationFn: (sessionId: string) => sessionService.markDeviceAsTrusted(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
      toast.success('Device marked as trusted');
    },
    onError: (err) => {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to mark device as trusted';
      toast.error(errorMessage);
    },
  });

  useEffect(() => {
    // Get current session ID from localStorage or API
    // This would typically come from the auth store or API
    if (data?.sessions && data.sessions.length > 0) {
      // Assume first active session is current (in production, get from API)
      const activeSession = data.sessions.find((s) => s.isActive && s.status === 'active');
      if (activeSession) {
        setCurrentSessionId(activeSession.id);
      }
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-lg border border-destructive bg-destructive/15 p-4 text-destructive'>
        Failed to load sessions. Please try again.
      </div>
    );
  }

  if (!data || data.sessions.length === 0) {
    return (
      <div className='text-center py-8 text-muted-foreground'>
        No active sessions found.
      </div>
    );
  }

  const otherSessions = data.sessions.filter((s) => s.id !== currentSessionId);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>Active Sessions</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            Manage your active sessions and devices
          </p>
        </div>
        {otherSessions.length > 0 && (
          <Button
            variant='destructive'
            size='sm'
            onClick={() => revokeOthersMutation.mutate()}
            disabled={revokeOthersMutation.isPending}
          >
            {revokeOthersMutation.isPending ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Revoking...
              </>
            ) : (
              <>
                <LogOut className='mr-2 h-4 w-4' />
                Revoke All Others
              </>
            )}
          </Button>
        )}
      </div>

      <div className='rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                isCurrent={session.id === currentSessionId}
                onRevoke={(id) => revokeMutation.mutate({ sessionId: id })}
                onTrust={(id) => trustMutation.mutate(id)}
                isRevoking={revokeMutation.isPending}
                isTrusting={trustMutation.isPending}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className='grid grid-cols-3 gap-4 rounded-lg border bg-muted/50 p-4'>
        <div>
          <div className='text-2xl font-bold'>{data.total}</div>
          <div className='text-sm text-muted-foreground'>Total Sessions</div>
        </div>
        <div>
          <div className='text-2xl font-bold'>{data.activeCount}</div>
          <div className='text-sm text-muted-foreground'>Active</div>
        </div>
        <div>
          <div className='text-2xl font-bold'>{data.trustedCount}</div>
          <div className='text-sm text-muted-foreground'>Trusted</div>
        </div>
      </div>
    </div>
  );
}

interface SessionRowProps {
  session: Session;
  isCurrent: boolean;
  onRevoke: (id: string) => void;
  onTrust: (id: string) => void;
  isRevoking: boolean;
  isTrusting: boolean;
}

function SessionRow({
  session,
  isCurrent,
  onRevoke,
  onTrust,
  isRevoking,
  isTrusting,
}: SessionRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <span className='font-medium'>{session.deviceName}</span>
            {isCurrent && (
              <span className='rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary'>
                Current
              </span>
            )}
          </div>
          <div className='text-xs text-muted-foreground'>
            {session.browser && session.browserVersion
              ? `${session.browser} ${session.browserVersion}`
              : 'Unknown browser'}
            {session.operatingSystem && ` • ${session.operatingSystem}`}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className='space-y-1'>
          <div>{session.location || 'Unknown'}</div>
          <div className='text-xs text-muted-foreground'>{session.ipAddress}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className='space-y-1'>
          <div>{formatRelativeTime(session.lastActivityAt)}</div>
          <div className='text-xs text-muted-foreground'>
            {formatDate(session.lastActivityAt)}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className='flex items-center gap-2'>
          {session.isTrusted ? (
            <span className='flex items-center gap-1 text-sm text-green-600 dark:text-green-400'>
              <Shield className='h-4 w-4' />
              Trusted
            </span>
          ) : (
            <span className='flex items-center gap-1 text-sm text-muted-foreground'>
              <ShieldOff className='h-4 w-4' />
              Not trusted
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className='text-right'>
        <div className='flex items-center justify-end gap-2'>
          {!session.isTrusted && !isCurrent && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onTrust(session.id)}
              disabled={isTrusting}
            >
              <Shield className='h-4 w-4' />
            </Button>
          )}
          {!isCurrent && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onRevoke(session.id)}
              disabled={isRevoking}
            >
              <LogOut className='h-4 w-4' />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

