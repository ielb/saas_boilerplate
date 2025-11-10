'use client';

import { BrandingEditor } from '@/components/tenant/branding-editor';

/**
 * Tenant branding customization page
 */
export default function TenantBrandingPage() {
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold tracking-tight'>Branding</h1>
        <p className='text-muted-foreground mt-2'>
          Customize your organization's visual identity with logos and colors.
        </p>
      </div>

      <BrandingEditor />
    </div>
  );
}


