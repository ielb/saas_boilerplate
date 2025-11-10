'use client';

import { Shield, Lock, Award, CheckCircle2 } from 'lucide-react';

/**
 * Trust Badges Component
 * Displays security certifications and trust indicators
 */
export function TrustBadges() {
  return (
    <section className='py-12 bg-background border-y'>
      <div className='container mx-auto px-4'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-center'>
          <div className='flex flex-col items-center gap-2 text-center'>
            <Shield className='h-8 w-8 text-primary' />
            <span className='text-sm font-medium'>Enterprise Security</span>
          </div>
          <div className='flex flex-col items-center gap-2 text-center'>
            <Lock className='h-8 w-8 text-primary' />
            <span className='text-sm font-medium'>GDPR Compliant</span>
          </div>
          <div className='flex flex-col items-center gap-2 text-center'>
            <Award className='h-8 w-8 text-primary' />
            <span className='text-sm font-medium'>Production Ready</span>
          </div>
          <div className='flex flex-col items-center gap-2 text-center'>
            <CheckCircle2 className='h-8 w-8 text-primary' />
            <span className='text-sm font-medium'>85%+ Test Coverage</span>
          </div>
        </div>
      </div>
    </section>
  );
}

