'use client';

import { Building2, Users, Shield, Settings, BarChart3, Palette } from 'lucide-react';
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
    icon: <Building2 className='h-6 w-6' />,
    title: 'Complete Data Isolation',
    description: 'Shared database with tenant-scoped queries for perfect separation',
    highlights: [
      'Logical data segregation',
      'Cross-tenant security prevention',
      'Automatic tenant context',
      'Zero data leakage',
    ],
  },
  {
    icon: <Users className='h-6 w-6' />,
    title: 'Seamless Tenant Switching',
    description: 'Users can switch between multiple organizations effortlessly',
    highlights: [
      'Multi-tenant membership',
      'Context switching',
      'Role preservation',
      'Session management',
    ],
  },
  {
    icon: <Palette className='h-6 w-6' />,
    title: 'Branding Customization',
    description: 'Full white-label capabilities with logo, colors, and domain',
    highlights: [
      'Custom logo upload',
      'Color scheme customization',
      'Custom domain support',
      'CSS customization',
    ],
  },
  {
    icon: <Settings className='h-6 w-6' />,
    title: 'Feature Flags',
    description: 'Per-tenant feature enablement with granular control',
    highlights: [
      'Per-tenant features',
      'Feature toggles',
      'A/B testing support',
      'Gradual rollouts',
    ],
  },
  {
    icon: <BarChart3 className='h-6 w-6' />,
    title: 'Usage Analytics',
    description: 'Tenant-specific usage tracking and reporting',
    highlights: [
      'Per-tenant metrics',
      'Usage dashboards',
      'Resource tracking',
      'Billing integration',
    ],
  },
  {
    icon: <Shield className='h-6 w-6' />,
    title: 'Automated Onboarding',
    description: 'Customizable tenant onboarding workflows',
    highlights: [
      'Step-by-step wizard',
      'Customizable steps',
      'Email verification',
      'Welcome flows',
    ],
  },
];

/**
 * Multi-Tenant Architecture Features Showcase Component
 * Highlights the comprehensive multi-tenant capabilities of the SaaS boilerplate
 */
export function TenantFeatures() {
  return (
    <section className='py-24 bg-gradient-to-b from-muted/20 to-background'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-16'>
          <h2 className='text-4xl font-bold tracking-tight mb-4'>
            Enterprise Multi-Tenant Architecture
          </h2>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            Built for scale. Support thousands of organizations with complete data isolation,
            seamless switching, and white-label capabilities.
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

        <div className='rounded-lg border bg-card p-8 shadow-sm mb-12'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 text-center'>
            <div>
              <div className='text-4xl font-bold text-primary mb-2'>100%</div>
              <div className='text-muted-foreground'>Data Isolation</div>
            </div>
            <div>
              <div className='text-4xl font-bold text-primary mb-2'>Unlimited</div>
              <div className='text-muted-foreground'>Tenants Supported</div>
            </div>
            <div>
              <div className='text-4xl font-bold text-primary mb-2'>10K+</div>
              <div className='text-muted-foreground'>Users Per Tenant</div>
            </div>
          </div>
        </div>

        <div className='mt-12 text-center'>
          <p className='text-muted-foreground mb-6'>
            Build scalable multi-tenant SaaS applications with confidence
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Button asChild size='lg'>
              <Link href='/register'>Get Started Free</Link>
            </Button>
            <Button asChild variant='outline' size='lg'>
              <Link href='/docs'>View Documentation</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

