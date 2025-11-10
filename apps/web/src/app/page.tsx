import { Navigation } from '@/components/landing/navigation';
import { Footer } from '@/components/landing/footer';
import { HeroSection } from '@/components/landing/hero-section';
import { TechStackSection } from '@/components/landing/tech-stack-section';
import { TrustBadges } from '@/components/landing/trust-badges';
import dynamic from 'next/dynamic';

// Lazy load heavy components for better performance
const FeaturesSection = dynamic(
  () =>
    import('@/components/landing/features-section').then(mod => ({
      default: mod.FeaturesSection,
    })),
  { ssr: true }
);
const BenefitsSection = dynamic(
  () =>
    import('@/components/landing/benefits-section').then(mod => ({
      default: mod.BenefitsSection,
    })),
  { ssr: true }
);
const ComparisonTable = dynamic(
  () =>
    import('@/components/landing/comparison-table').then(mod => ({
      default: mod.ComparisonTable,
    })),
  { ssr: true }
);
const DemoPreview = dynamic(
  () =>
    import('@/components/landing/demo-preview').then(mod => ({
      default: mod.DemoPreview,
    })),
  { ssr: true }
);
const TestimonialsSection = dynamic(
  () =>
    import('@/components/landing/testimonials-section').then(mod => ({
      default: mod.TestimonialsSection,
    })),
  { ssr: true }
);
const ShowcaseSection = dynamic(
  () =>
    import('@/components/landing/showcase-section').then(mod => ({
      default: mod.ShowcaseSection,
    })),
  { ssr: true }
);
const PricingSection = dynamic(
  () =>
    import('@/components/landing/pricing-section').then(mod => ({
      default: mod.PricingSection,
    })),
  { ssr: true }
);
const FAQSection = dynamic(
  () =>
    import('@/components/landing/faq-section').then(mod => ({
      default: mod.FAQSection,
    })),
  { ssr: true }
);
const NewsletterSection = dynamic(
  () =>
    import('@/components/landing/newsletter-section').then(mod => ({
      default: mod.NewsletterSection,
    })),
  { ssr: true }
);

export default function Home() {
  return (
    <div className='flex min-h-screen flex-col'>
      <Navigation />
      <main className='flex-1'>
        <HeroSection />
        <TechStackSection />
        <TrustBadges />
        <FeaturesSection />
        <BenefitsSection />
        <ComparisonTable />
        <DemoPreview />
        <TestimonialsSection />
        <ShowcaseSection />
        <PricingSection />
        <FAQSection />
        <NewsletterSection />
      </main>
      <Footer />
    </div>
  );
}
