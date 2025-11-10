'use client';

import { Shield, Lock, Key, Users, Eye, Zap } from 'lucide-react';
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
    icon: <Shield className='h-6 w-6' />,
    title: 'Multi-Factor Authentication',
    description: 'TOTP-based 2FA with backup codes for enhanced security',
    highlights: [
      'TOTP authenticator app support',
      'QR code generation',
      'Backup codes for account recovery',
      'MFA verification during login',
    ],
  },
  {
    icon: <Key className='h-6 w-6' />,
    title: 'Advanced Token Management',
    description: 'Secure JWT tokens with automatic refresh mechanism',
    highlights: [
      '15-minute access tokens',
      '7-day refresh tokens',
      'Automatic token rotation',
      'Secure token storage',
    ],
  },
  {
    icon: <Lock className='h-6 w-6' />,
    title: 'Password Security',
    description: 'Enterprise-grade password hashing and validation',
    highlights: [
      'Argon2 password hashing',
      'Complexity requirements',
      'Secure password reset flow',
      'Account recovery system',
    ],
  },
  {
    icon: <Users className='h-6 w-6' />,
    title: 'Role-Based Access Control',
    description: 'Comprehensive permission system with 132 granular permissions',
    highlights: [
      '6 hierarchical roles',
      '132 granular permissions',
      'Resource-level access control',
      'Permission inheritance',
    ],
  },
  {
    icon: <Eye className='h-6 w-6' />,
    title: 'Session Management',
    description: 'Device tracking and session control for security',
    highlights: [
      'Active device tracking',
      'Force logout capability',
      'Session expiration management',
      'Trusted device marking',
    ],
  },
  {
    icon: <Zap className='h-6 w-6' />,
    title: 'API Rate Limiting',
    description: 'Configurable rate limits to prevent abuse',
    highlights: [
      'Per-user rate limits',
      'Per-tenant rate limits',
      'Per-endpoint configuration',
      'Automatic throttling',
    ],
  },
];

/**
 * Authentication & Security Features Showcase Component
 * Highlights the comprehensive security features of the SaaS boilerplate
 */
export function AuthFeatures() {
  return (
    <section className='py-24 bg-gradient-to-b from-background to-muted/20'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-16'>
          <h2 className='text-4xl font-bold tracking-tight mb-4'>
            Enterprise-Grade Security
          </h2>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            Built with security-first principles. Protect your users and data with
            industry-leading authentication and authorization features.
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

        <div className='rounded-lg border bg-card p-8 shadow-sm'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 text-center'>
            <div>
              <div className='text-4xl font-bold text-primary mb-2'>132</div>
              <div className='text-muted-foreground'>Granular Permissions</div>
            </div>
            <div>
              <div className='text-4xl font-bold text-primary mb-2'>6</div>
              <div className='text-muted-foreground'>Role Levels</div>
            </div>
            <div>
              <div className='text-4xl font-bold text-primary mb-2'>100%</div>
              <div className='text-muted-foreground'>Tenant Isolation</div>
            </div>
          </div>
        </div>

        <div className='mt-12 text-center'>
          <p className='text-muted-foreground mb-6'>
            Ready to secure your SaaS application?
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Button asChild size='lg'>
              <Link href='/register'>Get Started Free</Link>
            </Button>
            <Button asChild variant='outline' size='lg'>
              <Link href='/demo'>View Demo</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

