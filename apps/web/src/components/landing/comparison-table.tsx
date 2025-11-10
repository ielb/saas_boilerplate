'use client';

import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ComparisonFeature {
  feature: string;
  ourBoilerplate: boolean | string;
  diy: boolean | string;
  competitors: boolean | string;
}

const features: ComparisonFeature[] = [
  {
    feature: 'Authentication System',
    ourBoilerplate: true,
    diy: '2-3 weeks',
    competitors: true,
  },
  {
    feature: 'Payment & Billing',
    ourBoilerplate: true,
    diy: '3-4 weeks',
    competitors: true,
  },
  {
    feature: 'Multi-Tenant Architecture',
    ourBoilerplate: true,
    diy: '4-6 weeks',
    competitors: false,
  },
  {
    feature: '132 Granular Permissions',
    ourBoilerplate: true,
    diy: '2-3 weeks',
    competitors: false,
  },
  {
    feature: 'Email System',
    ourBoilerplate: true,
    diy: '1-2 weeks',
    competitors: true,
  },
  {
    feature: 'File Management',
    ourBoilerplate: true,
    diy: '2-3 weeks',
    competitors: false,
  },
  {
    feature: 'Real-Time WebSocket',
    ourBoilerplate: true,
    diy: '2-3 weeks',
    competitors: false,
  },
  {
    feature: 'Production Ready',
    ourBoilerplate: true,
    diy: 'Additional 4-6 weeks',
    competitors: 'Partial',
  },
  {
    feature: 'Comprehensive Tests',
    ourBoilerplate: '85%+ coverage',
    diy: 'You write them',
    competitors: 'Varies',
  },
  {
    feature: 'Documentation',
    ourBoilerplate: true,
    diy: 'You write it',
    competitors: 'Basic',
  },
];

/**
 * Comparison Table Component
 * Compares our boilerplate with DIY and competitors
 */
export function ComparisonTable() {
  return (
    <section className='py-24 bg-muted/30' id='comparison'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-16'>
          <h2 className='text-4xl font-bold tracking-tight mb-4'>
            Why Choose Our Boilerplate?
          </h2>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            Compare us with building from scratch or using other solutions
          </p>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full border-collapse'>
            <thead>
              <tr className='border-b'>
                <th className='text-left p-4 font-semibold'>Feature</th>
                <th className='text-center p-4 font-semibold bg-primary/10'>
                  Our Boilerplate
                </th>
                <th className='text-center p-4 font-semibold'>Build Yourself</th>
                <th className='text-center p-4 font-semibold'>Other Solutions</th>
              </tr>
            </thead>
            <tbody>
              {features.map((item, index) => (
                <tr key={index} className='border-b hover:bg-muted/50'>
                  <td className='p-4 font-medium'>{item.feature}</td>
                  <td className='p-4 text-center bg-primary/5'>
                    {typeof item.ourBoilerplate === 'boolean' ? (
                      item.ourBoilerplate ? (
                        <Check className='h-5 w-5 text-green-600 dark:text-green-400 mx-auto' />
                      ) : (
                        <X className='h-5 w-5 text-red-600 dark:text-red-400 mx-auto' />
                      )
                    ) : (
                      <span className='text-sm'>{item.ourBoilerplate}</span>
                    )}
                  </td>
                  <td className='p-4 text-center'>
                    {typeof item.diy === 'boolean' ? (
                      item.diy ? (
                        <Check className='h-5 w-5 text-green-600 dark:text-green-400 mx-auto' />
                      ) : (
                        <X className='h-5 w-5 text-red-600 dark:text-red-400 mx-auto' />
                      )
                    ) : (
                      <span className='text-sm text-muted-foreground'>{item.diy}</span>
                    )}
                  </td>
                  <td className='p-4 text-center'>
                    {typeof item.competitors === 'boolean' ? (
                      item.competitors ? (
                        <Check className='h-5 w-5 text-green-600 dark:text-green-400 mx-auto' />
                      ) : (
                        <X className='h-5 w-5 text-red-600 dark:text-red-400 mx-auto' />
                      )
                    ) : (
                      <span className='text-sm text-muted-foreground'>{item.competitors}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className='mt-12 text-center'>
          <p className='text-muted-foreground mb-6'>
            Save 3-6 months of development time and focus on your unique features
          </p>
          <Button asChild size='lg'>
            <Link href='/register'>Get Started Today</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

