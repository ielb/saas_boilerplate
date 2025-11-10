'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What is included in the boilerplate?',
    answer:
      'The boilerplate includes a complete authentication system, payment & billing infrastructure, multi-tenant architecture, email system, file management, real-time WebSocket support, admin dashboard, and comprehensive documentation. Everything you need to build a production-ready SaaS.',
  },
  {
    question: 'Can I use this for commercial projects?',
    answer:
      'Yes! All plans include a commercial license that allows you to use the boilerplate for unlimited commercial projects. You can build and sell SaaS applications built on this foundation.',
  },
  {
    question: 'Do I get lifetime updates?',
    answer:
      'Yes, all plans include lifetime updates. You\'ll receive all future improvements, bug fixes, and new features at no additional cost.',
  },
  {
    question: 'What technologies are used?',
    answer:
      'The boilerplate uses NestJS for the backend, Next.js for the frontend, PostgreSQL for the database, Redis for caching, Stripe for payments, and TypeScript throughout. All modern, production-ready technologies.',
  },
  {
    question: 'How long does setup take?',
    answer:
      'Setup takes less than 30 minutes. We provide Docker Compose configuration for local development, and deployment guides for production. You can have your SaaS running in under an hour.',
  },
  {
    question: 'Is there support available?',
    answer:
      'Yes! Starter plan includes email support, Professional includes priority support, and Enterprise includes dedicated support with SLA guarantees. We also have an active community and comprehensive documentation.',
  },
  {
    question: 'Can I customize the code?',
    answer:
      'Absolutely! You get full source code access. Customize, extend, or modify anything to fit your needs. The code is well-structured and documented to make customization easy.',
  },
  {
    question: 'What about security and compliance?',
    answer:
      'The boilerplate includes enterprise-grade security features: MFA, RBAC with 132 permissions, data encryption, audit logging, and GDPR-ready architecture. Security is built-in from the ground up.',
  },
];

/**
 * FAQ Section Component
 * Accordion-style FAQ section addressing common concerns
 */
export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className='py-24 bg-background' id='faq'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-16'>
          <h2 className='text-4xl font-bold tracking-tight mb-4'>
            Frequently Asked Questions
          </h2>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            Everything you need to know about our SaaS boilerplate
          </p>
        </div>

        <div className='max-w-3xl mx-auto space-y-4'>
          {faqs.map((faq, index) => (
            <div
              key={index}
              className='rounded-lg border bg-card shadow-sm overflow-hidden'
            >
              <button
                onClick={() => toggle(index)}
                className='w-full px-6 py-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors'
              >
                <span className='font-semibold'>{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ${
                    openIndex === index ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className='px-6 pb-4'>
                  <p className='text-muted-foreground'>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className='mt-12 text-center'>
          <p className='text-muted-foreground mb-4'>
            Still have questions?
          </p>
          <Button asChild variant='outline'>
            <Link href='/contact'>Contact Support</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

