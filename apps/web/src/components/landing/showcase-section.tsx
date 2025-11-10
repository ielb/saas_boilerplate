'use client';

import { ExternalLink, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ShowcaseProject {
  name: string;
  description: string;
  url?: string;
  category: string;
  image?: string;
}

const projects: ShowcaseProject[] = [
  {
    name: 'Project Management SaaS',
    description: 'Built a complete project management platform with team collaboration features',
    category: 'Productivity',
  },
  {
    name: 'CRM Platform',
    description: 'Customer relationship management system with sales pipeline and analytics',
    category: 'Sales',
  },
  {
    name: 'E-Learning Platform',
    description: 'Online course platform with video streaming and progress tracking',
    category: 'Education',
  },
  {
    name: 'Analytics Dashboard',
    description: 'Business intelligence platform with real-time data visualization',
    category: 'Analytics',
  },
  {
    name: 'HR Management System',
    description: 'Human resources platform with employee management and payroll',
    category: 'HR',
  },
  {
    name: 'Healthcare Portal',
    description: 'Patient management system with appointment scheduling and records',
    category: 'Healthcare',
  },
];

/**
 * Customer Showcase Section Component
 * Displays projects built with the boilerplate
 */
export function ShowcaseSection() {
  return (
    <section className='py-24 bg-background'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-16'>
          <h2 className='text-4xl font-bold tracking-tight mb-4'>
            Built by Our Community
          </h2>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            See what developers are building with our SaaS boilerplate
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12'>
          {projects.map((project, index) => (
            <div
              key={index}
              className='group relative rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-lg hover:border-primary/50'
            >
              <div className='mb-4'>
                <span className='inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary'>
                  {project.category}
                </span>
              </div>
              <h3 className='text-xl font-semibold mb-2'>{project.name}</h3>
              <p className='text-muted-foreground mb-4'>{project.description}</p>
              {project.url && (
                <Link
                  href={project.url}
                  className='inline-flex items-center gap-2 text-sm text-primary hover:underline'
                >
                  View Project
                  <ExternalLink className='h-4 w-4' />
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className='text-center'>
          <Button asChild variant='outline' size='lg'>
            <Link href='/showcase'>
              View All Projects
              <ArrowRight className='ml-2 h-4 w-4' />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

