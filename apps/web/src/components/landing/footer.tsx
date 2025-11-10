'use client';

import Link from 'next/link';
import { Github, Twitter, Linkedin } from 'lucide-react';

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Showcase', href: '#showcase' },
    { label: 'Documentation', href: '/docs' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
    { label: 'Careers', href: '/careers' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'License', href: '/license' },
  ],
};

/**
 * Landing Page Footer Component
 * Footer with links and copyright information
 */
export function Footer() {
  return (
    <footer className='border-t bg-background'>
      <div className='container mx-auto px-4 py-12'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-8 mb-8'>
          <div>
            <h3 className='text-lg font-semibold mb-4'>SaaS Boilerplate</h3>
            <p className='text-sm text-muted-foreground'>
              Production-ready SaaS starter kit. Build faster, launch sooner.
            </p>
            <div className='flex gap-4 mt-4'>
              <Link
                href='https://github.com'
                className='text-muted-foreground hover:text-foreground'
                aria-label='GitHub'
              >
                <Github className='h-5 w-5' />
              </Link>
              <Link
                href='https://twitter.com'
                className='text-muted-foreground hover:text-foreground'
                aria-label='Twitter'
              >
                <Twitter className='h-5 w-5' />
              </Link>
              <Link
                href='https://linkedin.com'
                className='text-muted-foreground hover:text-foreground'
                aria-label='LinkedIn'
              >
                <Linkedin className='h-5 w-5' />
              </Link>
            </div>
          </div>

          <div>
            <h4 className='font-semibold mb-4'>Product</h4>
            <ul className='space-y-2'>
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className='text-sm text-muted-foreground hover:text-foreground'
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className='font-semibold mb-4'>Company</h4>
            <ul className='space-y-2'>
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className='text-sm text-muted-foreground hover:text-foreground'
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className='font-semibold mb-4'>Legal</h4>
            <ul className='space-y-2'>
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className='text-sm text-muted-foreground hover:text-foreground'
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className='border-t pt-8 text-center text-sm text-muted-foreground'>
          <p>
            © {new Date().getFullYear()} SaaS Boilerplate. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

