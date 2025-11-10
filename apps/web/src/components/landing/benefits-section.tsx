'use client';

import { Clock, DollarSign, Rocket, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Benefit {
  icon: React.ReactNode;
  title: string;
  description: string;
  metric: string;
  metricLabel: string;
}

const benefits: Benefit[] = [
  {
    icon: <Clock className='h-6 w-6' />,
    title: 'Save Development Time',
    description: 'Get to market 3-6 months faster with production-ready code',
    metric: '3-6 months',
    metricLabel: 'Time Saved',
  },
  {
    icon: <DollarSign className='h-6 w-6' />,
    title: 'Reduce Development Costs',
    description: 'Save $50K+ in development costs by using our boilerplate',
    metric: '$50K+',
    metricLabel: 'Cost Saved',
  },
  {
    icon: <Rocket className='h-6 w-6' />,
    title: 'Faster Time to Revenue',
    description: 'Start generating revenue weeks instead of months',
    metric: '70-80%',
    metricLabel: 'Faster Launch',
  },
];

/**
 * Benefits Section Component
 * Highlights time savings and ROI
 */
export function BenefitsSection() {
  return (
    <section className='py-24 bg-gradient-to-b from-background to-muted/20'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-16'>
          <h2 className='text-4xl font-bold tracking-tight mb-4'>
            The ROI of Using Our Boilerplate
          </h2>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            Focus on your unique features while we handle the infrastructure
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 mb-12'>
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className='group relative rounded-lg border bg-card p-8 shadow-sm transition-all hover:shadow-lg hover:border-primary/50 text-center'
            >
              <div className='flex justify-center mb-4'>
                <div className='rounded-lg bg-primary/10 p-4 text-primary group-hover:bg-primary/20 transition-colors'>
                  {benefit.icon}
                </div>
              </div>
              <h3 className='text-2xl font-bold mb-2'>{benefit.metric}</h3>
              <p className='text-muted-foreground mb-4'>{benefit.metricLabel}</p>
              <h4 className='text-xl font-semibold mb-2'>{benefit.title}</h4>
              <p className='text-muted-foreground'>{benefit.description}</p>
            </div>
          ))}
        </div>

        <div className='rounded-lg border bg-card p-8 shadow-sm max-w-4xl mx-auto'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <div>
              <h3 className='text-2xl font-semibold mb-4'>What You Get</h3>
              <ul className='space-y-3'>
                <li className='flex items-start gap-3'>
                  <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                  <span>Complete authentication & authorization system</span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                  <span>Payment processing with Stripe integration</span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                  <span>Multi-tenant architecture ready to scale</span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                  <span>Email system with multiple providers</span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                  <span>File management with cloud storage</span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                  <span>Real-time features with WebSocket</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className='text-2xl font-semibold mb-4'>What You Save</h3>
              <ul className='space-y-3'>
                <li className='flex items-start gap-3'>
                  <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                  <span>3-6 months of development time</span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                  <span>$50K+ in development costs</span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                  <span>Weeks of infrastructure setup</span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                  <span>Hours of security audits</span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                  <span>Days of payment integration</span>
                </li>
                <li className='flex items-start gap-3'>
                  <CheckCircle2 className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                  <span>Months of testing & debugging</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className='mt-12 text-center'>
          <Button asChild size='lg'>
            <Link href='/register'>Start Saving Time Today</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

