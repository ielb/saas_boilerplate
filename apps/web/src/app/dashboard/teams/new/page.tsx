'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { teamsService } from '@/services/teams.service';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

const teamFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

/**
 * Team create/edit form with member assignment
 */
export default function CreateTeamPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TeamFormValues>({
    // @ts-expect-error - zodResolver type compatibility issue
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const onSubmit = async (values: TeamFormValues) => {
    setIsSubmitting(true);
    try {
      await teamsService.createTeam(values);
      toast.success('Team created successfully');
      router.push('/dashboard/teams');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create team';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <Button variant='ghost' asChild className='mb-4'>
          <Link href='/dashboard/teams'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Teams
          </Link>
        </Button>
        <h1 className='text-3xl font-bold tracking-tight'>Create New Team</h1>
        <p className='text-muted-foreground mt-2'>
          Create a new team and add members.
        </p>
      </div>

      <Card className='max-w-2xl'>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
          <CardDescription>
            Enter the team's details. You can add members after creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name *</FormLabel>
                    <FormControl>
                      <Input placeholder='Engineering Team' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <textarea
                        className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                        placeholder='Team description...'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex justify-end gap-4'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting && <Loading size='sm' className='mr-2' />}
                  <Save className='mr-2 h-4 w-4' />
                  Create Team
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


