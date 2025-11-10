'use client';

import { Star, Quote } from 'lucide-react';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar?: string;
  content: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: 'Sarah Chen',
    role: 'CTO',
    company: 'TechStart Inc.',
    content:
      'This boilerplate saved us months of development time. The multi-tenant architecture is rock-solid, and the authentication system is enterprise-grade. Highly recommended!',
    rating: 5,
  },
  {
    name: 'Michael Rodriguez',
    role: 'Founder',
    company: 'SaaS Solutions',
    content:
      'We went from idea to MVP in 2 weeks. The billing integration with Stripe was seamless, and the documentation is excellent. Best investment we made.',
    rating: 5,
  },
  {
    name: 'Emily Johnson',
    role: 'Lead Developer',
    company: 'DevAgency',
    content:
      'The code quality is exceptional. TypeScript throughout, comprehensive tests, and clear architecture. Our team was productive from day one.',
    rating: 5,
  },
  {
    name: 'David Kim',
    role: 'Product Manager',
    company: 'StartupXYZ',
    content:
      'The feature set is incredible. Authentication, billing, multi-tenancy, file management - everything we needed was already there. Game changer!',
    rating: 5,
  },
];

/**
 * Testimonials Section Component
 * Social proof with customer testimonials
 */
export function TestimonialsSection() {
  return (
    <section className='py-24 bg-muted/30'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-16'>
          <h2 className='text-4xl font-bold tracking-tight mb-4'>
            Trusted by Developers Worldwide
          </h2>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            Join hundreds of developers building their SaaS with our boilerplate
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mb-12'>
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className='relative rounded-lg border bg-card p-8 shadow-sm'
            >
              <Quote className='h-8 w-8 text-primary/20 mb-4' />
              <div className='flex items-center gap-1 mb-4'>
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className='h-5 w-5 fill-yellow-400 text-yellow-400'
                  />
                ))}
              </div>
              <p className='text-muted-foreground mb-6 italic'>{testimonial.content}</p>
              <div className='flex items-center gap-4'>
                <div className='h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold'>
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className='font-semibold'>{testimonial.name}</div>
                  <div className='text-sm text-muted-foreground'>
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className='text-center'>
          <div className='inline-flex items-center gap-2 rounded-lg border bg-card px-6 py-3 shadow-sm'>
            <div className='flex items-center gap-1'>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className='h-5 w-5 fill-yellow-400 text-yellow-400'
                />
              ))}
            </div>
            <span className='font-semibold'>4.9/5</span>
            <span className='text-muted-foreground'>from 200+ developers</span>
          </div>
        </div>
      </div>
    </section>
  );
}

