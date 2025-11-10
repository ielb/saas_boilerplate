'use client';

import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { trackPricingView, trackButtonClick } from '@/lib/analytics';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

const plans: PricingPlan[] = [
  {
    name: 'Starter',
    price: '$299',
    period: 'one-time',
    description: 'Perfect for solo developers and small projects',
    features: [
      'Full source code access',
      'Lifetime updates',
      'Email support',
      'Commercial license',
      '1 project',
    ],
    cta: 'Get Started',
  },
  {
    name: 'Professional',
    price: '$499',
    period: 'one-time',
    description: 'Best for teams and agencies',
    features: [
      'Everything in Starter',
      'Priority support',
      'Unlimited projects',
      'Team collaboration',
      'Custom integrations',
    ],
    cta: 'Get Started',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with custom needs',
    features: [
      'Everything in Professional',
      'Dedicated support',
      'Custom development',
      'SLA guarantee',
      'Training & onboarding',
    ],
    cta: 'Contact Sales',
  },
];

/**
 * Pricing Section Component
 * Displays pricing plans with clear value proposition
 */
export function PricingSection() {
  useEffect(() => {
    trackPricingView('all');
  }, []);

  return (
    <section className='py-24 bg-muted/30' id='pricing'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-16'>
          <h2 className='text-4xl font-bold tracking-tight mb-4'>
            Simple, Transparent Pricing
          </h2>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            One-time purchase. No recurring fees. Use it for unlimited projects.
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto'>
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-lg border bg-card p-8 shadow-sm transition-all hover:shadow-lg ${
                plan.popular
                  ? 'border-primary ring-2 ring-primary/20 scale-105'
                  : ''
              }`}
            >
              {plan.popular && (
                <div className='absolute -top-4 left-1/2 -translate-x-1/2'>
                  <span className='bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium'>
                    Most Popular
                  </span>
                </div>
              )}
              <div className='text-center mb-6'>
                <h3 className='text-2xl font-bold mb-2'>{plan.name}</h3>
                <div className='mb-2'>
                  <span className='text-4xl font-bold'>{plan.price}</span>
                  {plan.period && (
                    <span className='text-muted-foreground'> / {plan.period}</span>
                  )}
                </div>
                <p className='text-sm text-muted-foreground'>{plan.description}</p>
              </div>
              <ul className='space-y-3 mb-8'>
                {plan.features.map((feature, idx) => (
                  <li key={idx} className='flex items-start gap-3'>
                    <Check className='h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                    <span className='text-sm'>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className='w-full'
                variant={plan.popular ? 'default' : 'outline'}
                size='lg'
                onClick={() => trackButtonClick(plan.cta, `pricing_${plan.name.toLowerCase()}`)}
              >
                <Link href={plan.name === 'Enterprise' ? '/contact' : '/register'}>
                  {plan.cta}
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <div className='mt-12 text-center'>
          <p className='text-muted-foreground mb-4'>
            All plans include lifetime access and updates
          </p>
          <p className='text-sm text-muted-foreground'>
            Need help choosing? <Link href='/contact' className='text-primary hover:underline'>Contact us</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

