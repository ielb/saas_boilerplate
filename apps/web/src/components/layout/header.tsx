'use client';

import { Bell, Settings, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { TenantSwitcher } from '@/components/tenant/tenant-switcher';

/**
 * Header component with user menu, notifications, and tenant switcher
 */
export function Header() {
  const { user, logout } = useAuth();

  const userInitials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <header className='sticky top-0 z-30 flex h-16 items-center border-b bg-background px-4 lg:px-6'>
      <div className='flex flex-1 items-center justify-end gap-4'>
        {/* Tenant Switcher */}
        <TenantSwitcher />

        {/* Notifications */}
        <Button variant='ghost' size='icon' className='relative'>
          <Bell className='h-5 w-5' />
          <Badge
            variant='destructive'
            className='absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs'
          >
            3
          </Badge>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='flex items-center gap-2'>
              <Avatar className='h-8 w-8'>
                <AvatarImage src={user?.avatar} alt={user?.email} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <span className='hidden md:block text-sm font-medium'>
                {user?.firstName} {user?.lastName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-56'>
            <DropdownMenuLabel>
              <div className='flex flex-col space-y-1'>
                <p className='text-sm font-medium leading-none'>
                  {user?.firstName} {user?.lastName}
                </p>
                <p className='text-xs leading-none text-muted-foreground'>{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className='mr-2 h-4 w-4' />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className='mr-2 h-4 w-4' />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

