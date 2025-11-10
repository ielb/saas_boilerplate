'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { teamsService, type Team } from '@/services/teams.service';
import { cn } from '@/lib/utils';
import { Loading } from '@/components/ui/loading';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Team switching component for multi-team users
 */
export function TeamSwitcher() {
  const router = useRouter();
  const { setTokens } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await teamsService.getTeams({ limit: 100 });
      return response as unknown as { data: Team[] };
    },
  });

  const filteredTeams = teams?.data.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSwitch = async (teamId: string) => {
    try {
      const response = await teamsService.switchTeam(teamId);
      const result = response as unknown as {
        accessToken: string;
        refreshToken: string;
        team: Team;
      };
      setTokens(result.accessToken, result.refreshToken);
      setCurrentTeamId(teamId);
      setIsOpen(false);
      toast.success('Switched team successfully');
      router.refresh();
    } catch (error) {
      toast.error('Failed to switch team');
    }
  };

  if (isLoading) {
    return <Loading size='sm' />;
  }

  if (!teams || teams.data.length === 0) {
    return null;
  }

  const currentTeam = teams.data.find((t) => t.id === currentTeamId) || teams.data[0];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          className='flex items-center gap-2 min-w-[200px] justify-between'
        >
          <div className='flex items-center gap-2 min-w-0'>
            <Users className='h-4 w-4 flex-shrink-0' />
            <span className='truncate'>{currentTeam?.name || 'Select Team'}</span>
          </div>
          <ChevronsUpDown className='h-4 w-4 flex-shrink-0 opacity-50' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-[300px]' align='start'>
        <DropdownMenuLabel>Switch Team</DropdownMenuLabel>
        <div className='px-2 pb-2'>
          <div className='relative'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search teams...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-8'
            />
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className='max-h-[300px] overflow-y-auto'>
          {filteredTeams && filteredTeams.length === 0 ? (
            <div className='px-2 py-6 text-center text-sm text-muted-foreground'>
              {searchQuery ? 'No teams found' : 'No teams available'}
            </div>
          ) : (
            filteredTeams?.map((team) => {
              const isActive = currentTeamId === team.id || (!currentTeamId && team.id === currentTeam?.id);
              return (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => !isActive && handleSwitch(team.id)}
                  className={cn(
                    'flex items-center justify-between cursor-pointer',
                    isActive && 'bg-accent'
                  )}
                  disabled={isActive}
                >
                  <div className='flex items-center gap-2 min-w-0 flex-1'>
                    <Users className='h-4 w-4 flex-shrink-0' />
                    <div className='min-w-0 flex-1'>
                      <div className='truncate font-medium'>{team.name}</div>
                      {team.description && (
                        <div className='text-xs text-muted-foreground truncate'>
                          {team.description}
                        </div>
                      )}
                    </div>
                  </div>
                  {isActive && <Check className='h-4 w-4 flex-shrink-0' />}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


