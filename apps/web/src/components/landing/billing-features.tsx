'use client';

import { CreditCard, Receipt, TrendingUp, DollarSign, FileText, Zap, BarChart3, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FeatureCard } from './feature-card';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlights: string[];
}

const features: Feature[] = [
  {
    icon: <CreditCard className='h-6 w-6' />,
    title: 'Stripe Integration',
    description: 'Complete payment processing with Stripe for global payments',
    highlights: [
      'Credit card & ACH payments',
      'International payment methods',
      'Secure webhook handling',
      'Automatic retry logic',
    ],
  },
  {
    icon: <Receipt className='h-6 w-6' />,
    title: 'Invoice Generation',
    description: 'Professional PDF invoices with customizable templates',
    highlights: [
      'PDF invoice generation',
      'Customizable templates',
      'Multi-currency support',
      'Automated invoicing',
    ],
  },
  {
    icon: <TrendingUp className='h-6 w-6' />,
    title: 'Revenue Analytics',
    description: 'Track MRR, churn, and growth with comprehensive analytics',
    highlights: [
      'MRR tracking',
      'Churn analysis',
      'Growth metrics',
      'Revenue forecasting',
    ],
  },
  {
    icon: <Zap className='h-6 w-6' />,
    title: 'Usage-Based Billing',
    description: 'Metered billing for API calls, storage, or custom metrics',
    highlights: [
      'Metered billing support',
      'Real-time usage tracking',
      'Flexible pricing models',
      'Overage handling',
    ],
  },
  {
    icon: <DollarSign className='h-6 w-6' />,
    title: 'Dunning Management',
    description: 'Automated failed payment recovery and retry logic',
    highlights: [
      'Automatic retry attempts',
      'Payment failure notifications',
      'Grace period management',
      'Subscription recovery',
    ],
  },
  {
    icon: <Globe className='h-6 w-6' />,
    title: 'Tax Calculation',
    description: 'Automated tax computation for global compliance',
    highlights: [
      'Multi-jurisdiction support',
      'Tax exemption handling',
      'Automated calculations',
      'Tax reporting',
    ],
  },
];

/**
 * Payment & Billing Features Showcase Component
 * Highlights the comprehensive billing and payment features of the SaaS boilerplate
 */
export function BillingFeatures() {
  return (
    <section className='py-24 bg-background'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-16'>
          <h2 className='text-4xl font-bold tracking-tight mb-4'>
            Complete Payment & Billing Infrastructure
          </h2>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            Everything you need to monetize your SaaS. From subscriptions to usage-based billing,
            we've got you covered with enterprise-grade payment processing.
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12'>
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              highlights={feature.highlights}
            />
          ))}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mb-12'>
          <div className='rounded-lg border bg-card p-8 shadow-sm'>
            <div className='flex items-center gap-4 mb-4'>
              <div className='rounded-lg bg-primary/10 p-3 text-primary'>
                <BarChart3 className='h-6 w-6' />
              </div>
              <h3 className='text-2xl font-semibold'>Billing Analytics</h3>
            </div>
            <p className='text-muted-foreground mb-6'>
              Comprehensive revenue analytics dashboard with real-time metrics and insights.
            </p>
            <ul className='space-y-3'>
              <li className='flex items-center gap-2'>
                <svg
                  className='h-5 w-5 text-primary'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Monthly Recurring Revenue (MRR) tracking</span>
              </li>
              <li className='flex items-center gap-2'>
                <svg
                  className='h-5 w-5 text-primary'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Churn rate analysis and prediction</span>
              </li>
              <li className='flex items-center gap-2'>
                <svg
                  className='h-5 w-5 text-primary'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Customer lifetime value (LTV) calculations</span>
              </li>
              <li className='flex items-center gap-2'>
                <svg
                  className='h-5 w-5 text-primary'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Revenue growth trends and forecasting</span>
              </li>
            </ul>
          </div>

          <div className='rounded-lg border bg-card p-8 shadow-sm'>
            <div className='flex items-center gap-4 mb-4'>
              <div className='rounded-lg bg-primary/10 p-3 text-primary'>
                <FileText className='h-6 w-6' />
              </div>
              <h3 className='text-2xl font-semibold'>Subscription Management</h3>
            </div>
            <p className='text-muted-foreground mb-6'>
              Flexible subscription plans with seamless upgrades, downgrades, and cancellations.
            </p>
            <ul className='space-y-3'>
              <li className='flex items-center gap-2'>
                <svg
                  className='h-5 w-5 text-primary'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Flexible plan configuration</span>
              </li>
              <li className='flex items-center gap-2'>
                <svg
                  className='h-5 w-5 text-primary'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Prorated upgrades and downgrades</span>
              </li>
              <li className='flex items-center gap-2'>
                <svg
                  className='h-5 w-5 text-primary'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Multiple billing cycles (monthly, yearly)</span>
              </li>
              <li className='flex items-center gap-2'>
                <svg
                  className='h-5 w-5 text-primary'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Seat-based and usage-based pricing</span>
              </li>
            </ul>
          </div>
        </div>

        <div className='rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-8 shadow-sm'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-8 text-center'>
            <div>
              <div className='text-3xl font-bold text-primary mb-2'>100%</div>
              <div className='text-muted-foreground'>Stripe Compatible</div>
            </div>
            <div>
              <div className='text-3xl font-bold text-primary mb-2'>Global</div>
              <div className='text-muted-foreground'>Tax Support</div>
            </div>
            <div>
              <div className='text-3xl font-bold text-primary mb-2'>Real-time</div>
              <div className='text-muted-foreground'>Analytics</div>
            </div>
            <div>
              <div className='text-3xl font-bold text-primary mb-2'>Automated</div>
              <div className='text-muted-foreground'>Invoicing</div>
            </div>
          </div>
        </div>

        <div className='mt-12 text-center'>
          <p className='text-muted-foreground mb-6'>
            Start monetizing your SaaS with enterprise-grade billing infrastructure
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Button asChild size='lg'>
              <Link href='/register'>Get Started Free</Link>
            </Button>
            <Button asChild variant='outline' size='lg'>
              <Link href='/pricing'>View Pricing</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

