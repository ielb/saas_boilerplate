'use client';

import { Code, Zap, BookOpen, Bug, Rocket } from 'lucide-react';
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
    icon: <Code className='h-6 w-6' />,
    title: 'Fully Typed Codebase',
    description: 'End-to-end TypeScript with strict type safety',
    highlights: [
      'TypeScript strict mode',
      'Shared type definitions',
      'Auto-generated types',
      'Zero runtime errors',
    ],
  },
  {
    icon: <Zap className='h-6 w-6' />,
    title: 'Rapid Development',
    description: 'Get started in under 30 minutes',
    highlights: [
      'Docker Compose setup',
      'Hot reloading',
      'Pre-configured tooling',
      'One-command deployment',
    ],
  },
  {
    icon: <BookOpen className='h-6 w-6' />,
    title: 'Comprehensive Documentation',
    description: 'API docs, guides, and examples included',
    highlights: [
      'OpenAPI/Swagger specs',
      'Postman collections',
      'Code examples',
      'Architecture guides',
    ],
  },
  {
    icon: <Bug className='h-6 w-6' />,
    title: 'Testing Framework',
    description: 'Built-in testing with high coverage',
    highlights: [
      'Unit test suites',
      'Integration tests',
      'E2E test support',
      '85%+ code coverage',
    ],
  },
  {
    icon: <Rocket className='h-6 w-6' />,
    title: 'Production Ready',
    description: 'Deploy to production in under 2 hours',
    highlights: [
      'CI/CD pipelines',
      'Health checks',
      'Monitoring setup',
      'Error tracking',
    ],
  },
];

/**
 * Developer Experience & Tooling Showcase Component
 * Highlights the developer-friendly features and tooling
 */
export function DevExperience() {
  return (
    <section className='py-24 bg-background'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-16'>
          <h2 className='text-4xl font-bold tracking-tight mb-4'>
            Built for Developers, by Developers
          </h2>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            Focus on building features, not infrastructure. Get production-ready code with
            best practices, comprehensive testing, and extensive documentation.
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
            <h3 className='text-2xl font-semibold mb-4'>Quick Start</h3>
            <div className='space-y-3 font-mono text-sm bg-muted p-4 rounded-lg'>
              <div className='text-muted-foreground'># Clone and setup</div>
              <div className='text-foreground'>git clone repo-url</div>
              <div className='text-foreground'>cd saas-boilerplate</div>
              <div className='text-foreground'>yarn install</div>
              <div className='text-muted-foreground mt-4'># Start development</div>
              <div className='text-foreground'>docker-compose up -d</div>
              <div className='text-foreground'>yarn dev</div>
            </div>
            <p className='text-sm text-muted-foreground mt-4'>
              Your SaaS is running in under 5 minutes
            </p>
          </div>

          <div className='rounded-lg border bg-card p-8 shadow-sm'>
            <h3 className='text-2xl font-semibold mb-4'>What You Get</h3>
            <ul className='space-y-3'>
              <li className='flex items-center gap-2'>
                <svg className='h-5 w-5 text-primary' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                </svg>
                <span>Complete authentication system</span>
              </li>
              <li className='flex items-center gap-2'>
                <svg className='h-5 w-5 text-primary' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                </svg>
                <span>Payment & billing infrastructure</span>
              </li>
              <li className='flex items-center gap-2'>
                <svg className='h-5 w-5 text-primary' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                </svg>
                <span>Multi-tenant architecture</span>
              </li>
              <li className='flex items-center gap-2'>
                <svg className='h-5 w-5 text-primary' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                </svg>
                <span>Email & notification system</span>
              </li>
              <li className='flex items-center gap-2'>
                <svg className='h-5 w-5 text-primary' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                </svg>
                <span>File management & storage</span>
              </li>
              <li className='flex items-center gap-2'>
                <svg className='h-5 w-5 text-primary' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                </svg>
                <span>Real-time WebSocket support</span>
              </li>
              <li className='flex items-center gap-2'>
                <svg className='h-5 w-5 text-primary' fill='currentColor' viewBox='0 0 20 20'>
                  <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                </svg>
                <span>Admin dashboard & analytics</span>
              </li>
            </ul>
          </div>
        </div>

        <div className='rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-8 shadow-sm'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-8 text-center'>
            <div>
              <div className='text-3xl font-bold text-primary mb-2'>&lt;30 min</div>
              <div className='text-muted-foreground'>Setup Time</div>
            </div>
            <div>
              <div className='text-3xl font-bold text-primary mb-2'>&lt;2 hours</div>
              <div className='text-muted-foreground'>To Production</div>
            </div>
            <div>
              <div className='text-3xl font-bold text-primary mb-2'>85%+</div>
              <div className='text-muted-foreground'>Test Coverage</div>
            </div>
          </div>
        </div>

        <div className='mt-12 text-center'>
          <p className='text-muted-foreground mb-6'>
            Start building your SaaS today with production-ready code
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Button asChild size='lg'>
              <Link href='/register'>Get Started Free</Link>
            </Button>
            <Button asChild variant='outline' size='lg'>
              <Link href='/github'>View on GitHub</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

