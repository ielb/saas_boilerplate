/**
 * Analytics utility
 * Handles conversion tracking and analytics integration
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(
  eventName: string,
  eventParams?: Record<string, unknown>
): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
}

export function trackConversion(conversionType: string, value?: number): void {
  trackEvent('conversion', {
    conversion_type: conversionType,
    value,
  });
}

export function trackPageView(path: string): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: path,
    });
  }
}

export function trackButtonClick(buttonName: string, location: string): void {
  trackEvent('button_click', {
    button_name: buttonName,
    location,
  });
}

export function trackNewsletterSignup(): void {
  trackConversion('newsletter_signup');
}

export function trackPricingView(planName: string): void {
  trackEvent('view_pricing', {
    plan_name: planName,
  });
}

