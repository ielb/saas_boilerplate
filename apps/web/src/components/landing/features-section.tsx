'use client';

import { AuthFeatures } from './auth-features';
import { BillingFeatures } from './billing-features';
import { TenantFeatures } from './tenant-features';
import { DevExperience } from './dev-experience';

/**
 * Comprehensive Features Section
 * Combines all feature showcases
 */
export function FeaturesSection() {
  return (
    <section id='features'>
      <AuthFeatures />
      <BillingFeatures />
      <TenantFeatures />
      <DevExperience />
    </section>
  );
}

