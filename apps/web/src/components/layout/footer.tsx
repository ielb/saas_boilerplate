'use client';

import Link from 'next/link';

/**
 * Footer component with links and copyright information
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='border-t bg-background'>
      <div className='container mx-auto px-4 py-6'>
        <div className='grid grid-cols-1 gap-8 md:grid-cols-4'>
          <div>
            <h3 className='mb-4 text-sm font-semibold'>Product</h3>
            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li>
                <Link href='/features' className='hover:text-foreground'>
                  Features
                </Link>
              </li>
              <li>
                <Link href='/pricing' className='hover:text-foreground'>
                  Pricing
                </Link>
              </li>
              <li>
                <Link href='/docs' className='hover:text-foreground'>
                  Documentation
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className='mb-4 text-sm font-semibold'>Company</h3>
            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li>
                <Link href='/about' className='hover:text-foreground'>
                  About
                </Link>
              </li>
              <li>
                <Link href='/blog' className='hover:text-foreground'>
                  Blog
                </Link>
              </li>
              <li>
                <Link href='/careers' className='hover:text-foreground'>
                  Careers
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className='mb-4 text-sm font-semibold'>Legal</h3>
            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li>
                <Link href='/privacy' className='hover:text-foreground'>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href='/terms' className='hover:text-foreground'>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href='/security' className='hover:text-foreground'>
                  Security
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className='mb-4 text-sm font-semibold'>Support</h3>
            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li>
                <Link href='/support' className='hover:text-foreground'>
                  Help Center
                </Link>
              </li>
              <li>
                <Link href='/contact' className='hover:text-foreground'>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href='/status' className='hover:text-foreground'>
                  Status
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className='mt-8 border-t pt-6 text-center text-sm text-muted-foreground'>
          <p>
            © {currentYear} SaaS Boilerplate. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}


