'use client';

import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { trackButtonClick } from '@/lib/analytics';

/**
 * Hero Section Component
 * Main hero section with value proposition and primary CTA
 */
export function HeroSection() {
  return (
    <section className='relative py-24 md:py-32 overflow-hidden'>
      <div className='container mx-auto px-4'>
        <div className='max-w-4xl mx-auto text-center'>
          <h1 className='text-5xl md:text-6xl font-bold tracking-tight mb-6'>
            Build Your SaaS in{' '}
            <span className='text-primary'>Weeks, Not Months</span>
          </h1>
          <p className='text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto'>
            Production-ready SaaS boilerplate with authentication, billing, multi-tenant
            architecture, and everything you need to launch faster.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center mb-12'>
            <div onClick={() => trackButtonClick('get_started', 'hero')}>
              <Button asChild size='lg' className='text-lg px-8'>
                <Link href='/register'>
                  Get Started Free
                  <ArrowRight className='ml-2 h-5 w-5' />
                </Link>
              </Button>
            </div>
            <div onClick={() => trackButtonClick('watch_demo', 'hero')}>
              <Button asChild variant='outline' size='lg' className='text-lg px-8'>
                <Link href='#demo'>
                  <Play className='mr-2 h-5 w-5' />
                  Watch Demo
                </Link>
              </Button>
            </div>
          </div>
          <div className='flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground'>
            <div className='flex items-center gap-2'>
              <svg
                className='h-5 w-5 text-green-600 dark:text-green-400'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                  clipRule='evenodd'
                />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className='flex items-center gap-2'>
              <svg
                className='h-5 w-5 text-green-600 dark:text-green-400'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                  clipRule='evenodd'
                />
              </svg>
              <span>Setup in &lt;30 minutes</span>
            </div>
            <div className='flex items-center gap-2'>
              <svg
                className='h-5 w-5 text-green-600 dark:text-green-400'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                  clipRule='evenodd'
                />
              </svg>
              <span>Production ready</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

