'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/hooks/use-tenant';
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
import { CheckCircle2, Circle, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const onboardingSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  domain: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  description: z.string().optional(),
  contactEmail: z.string().email('Must be a valid email').optional().or(z.literal('')),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const steps = [
  { id: 1, title: 'Organization Info', description: 'Basic information' },
  { id: 2, title: 'Branding', description: 'Logo and colors' },
  { id: 3, title: 'Features', description: 'Enable features' },
  { id: 4, title: 'Complete', description: 'Review and finish' },
];

/**
 * Tenant onboarding flow with step-by-step wizard
 */
export default function TenantOnboardingPage() {
  const router = useRouter();
  const { createTenant, isLoading } = useTenant();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OnboardingFormValues>({
    // @ts-expect-error - zodResolver type compatibility issue
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      domain: '',
      description: '',
      contactEmail: '',
    },
  });

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      const isValid = await form.trigger();
      if (isValid) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      await handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createTenant(form.getValues());
      toast.success('Tenant created successfully');
      router.push('/dashboard');
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className='space-y-6'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name *</FormLabel>
                  <FormControl>
                    <Input placeholder='Acme Inc.' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='domain'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input placeholder='https://example.com' {...field} />
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
                      placeholder='Brief description...'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='contactEmail'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder='contact@example.com'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      case 2:
        return (
          <div className='text-center py-8 text-muted-foreground'>
            Branding configuration will be available after tenant creation.
          </div>
        );
      case 3:
        return (
          <div className='text-center py-8 text-muted-foreground'>
            Feature flags can be configured after tenant creation.
          </div>
        );
      case 4:
        return (
          <div className='space-y-4'>
            <div className='rounded-lg border p-4'>
              <div className='font-semibold mb-2'>Organization Name</div>
              <div className='text-muted-foreground'>{form.watch('name')}</div>
            </div>
            {form.watch('domain') && (
              <div className='rounded-lg border p-4'>
                <div className='font-semibold mb-2'>Domain</div>
                <div className='text-muted-foreground'>
                  {form.watch('domain')}
                </div>
              </div>
            )}
            {form.watch('description') && (
              <div className='rounded-lg border p-4'>
                <div className='font-semibold mb-2'>Description</div>
                <div className='text-muted-foreground'>
                  {form.watch('description')}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className='container mx-auto px-4 py-8 max-w-4xl'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold tracking-tight'>Setup Your Organization</h1>
        <p className='text-muted-foreground mt-2'>
          Let's get your organization set up in a few simple steps.
        </p>
      </div>

      {/* Step Indicator */}
      <div className='mb-8'>
        <div className='flex items-center justify-between'>
          {steps.map((step, index) => (
            <div key={step.id} className='flex items-center flex-1'>
              <div className='flex flex-col items-center'>
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2',
                    currentStep > step.id
                      ? 'bg-primary border-primary text-primary-foreground'
                      : currentStep === step.id
                        ? 'border-primary text-primary'
                        : 'border-muted text-muted-foreground'
                  )}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className='h-5 w-5' />
                  ) : (
                    <Circle className='h-5 w-5' />
                  )}
                </div>
                <div className='mt-2 text-center'>
                  <div
                    className={cn(
                      'text-sm font-medium',
                      currentStep >= step.id
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {step.description}
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4',
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
          <CardDescription>
            {steps[currentStep - 1].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleNext)}>
              {renderStepContent()}
              <div className='flex justify-between mt-8'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className='mr-2 h-4 w-4' />
                  Previous
                </Button>
                <Button type='submit' disabled={isSubmitting || isLoading}>
                  {isSubmitting && <Loading size='sm' className='mr-2' />}
                  {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
                  {currentStep < steps.length - 1 && (
                    <ArrowRight className='ml-2 h-4 w-4' />
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


