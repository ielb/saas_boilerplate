import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

/**
 * Supported locales
 */
export const locales = ['en', 'es', 'fr'] as const;
export type Locale = (typeof locales)[number];

/**
 * Default locale
 */
export const defaultLocale: Locale = 'en';

/**
 * Check if a locale is valid
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get locale from request
 */
export function getLocale(request: { headers: Headers }): Locale {
  const locale = request.headers.get('x-locale') || defaultLocale;
  return isValidLocale(locale) ? locale : defaultLocale;
}

/**
 * Next-intl configuration
 */
export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!isValidLocale(locale)) {
    notFound();
  }

  return {
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

