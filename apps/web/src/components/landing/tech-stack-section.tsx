'use client';

import Image from 'next/image';

const technologies = [
  { name: 'Next.js', logo: '/logos/nextjs.svg' },
  { name: 'NestJS', logo: '/logos/nestjs.svg' },
  { name: 'TypeScript', logo: '/logos/typescript.svg' },
  { name: 'PostgreSQL', logo: '/logos/postgresql.svg' },
  { name: 'Redis', logo: '/logos/redis.svg' },
  { name: 'Stripe', logo: '/logos/stripe.svg' },
  { name: 'Docker', logo: '/logos/docker.svg' },
  { name: 'TailwindCSS', logo: '/logos/tailwind.svg' },
];

/**
 * Technology Stack Showcase Section
 * Displays the technologies used in the boilerplate
 */
export function TechStackSection() {
  return (
    <section className='py-16 bg-muted/30'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-12'>
          <h2 className='text-3xl font-bold tracking-tight mb-4'>
            Built with the Tools You Love
          </h2>
          <p className='text-muted-foreground'>
            Modern, production-ready technologies powering your SaaS
          </p>
        </div>
        <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8 items-center justify-center'>
          {technologies.map((tech) => (
            <div
              key={tech.name}
              className='flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-muted transition-colors'
            >
              <div className='h-12 w-12 bg-muted rounded-lg flex items-center justify-center text-2xl font-bold'>
                {tech.name.charAt(0)}
              </div>
              <span className='text-sm font-medium'>{tech.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

