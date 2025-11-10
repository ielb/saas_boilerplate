'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { smoothScrollTo, handleAnchorClick } from '@/lib/smooth-scroll';

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Showcase', href: '#showcase' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Docs', href: '/docs' },
];

/**
 * Landing Page Navigation Component
 * Header navigation for the landing page
 */
export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <nav className='container mx-auto px-4'>
        <div className='flex h-16 items-center justify-between'>
          <Link href='/' className='flex items-center gap-2'>
            <span className='text-xl font-bold'>SaaS Boilerplate</span>
          </Link>

          {/* Desktop Navigation */}
          <div className='hidden md:flex items-center gap-6'>
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={item.href.startsWith('#') ? handleAnchorClick : undefined}
              className='text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer'
            >
              {item.label}
            </a>
          ))}
          </div>

          <div className='hidden md:flex items-center gap-4'>
            <Button asChild variant='ghost'>
              <Link href='/login'>Sign In</Link>
            </Button>
            <Button asChild>
              <Link href='/register'>Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className='md:hidden p-2'
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label='Toggle menu'
          >
            {mobileMenuOpen ? (
              <X className='h-6 w-6' />
            ) : (
              <Menu className='h-6 w-6' />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className='md:hidden border-t py-4 space-y-4'>
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  if (item.href.startsWith('#')) {
                    handleAnchorClick(e);
                  }
                  setMobileMenuOpen(false);
                }}
                className='block px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer'
              >
                {item.label}
              </a>
            ))}
            <div className='px-4 space-y-2'>
              <Button asChild variant='ghost' className='w-full'>
                <Link href='/login'>Sign In</Link>
              </Button>
              <Button asChild className='w-full'>
                <Link href='/register'>Get Started</Link>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

