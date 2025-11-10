import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import { ErrorBoundary } from '@/components/error-boundary';
import { ReactQueryProvider } from '@/lib/react-query';
import { ToastProvider } from '@/components/toast-provider';
import { TokenSync } from '@/components/auth/token-sync';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SaaS Boilerplate - Production-Ready SaaS Starter Kit',
  description:
    'Build production-ready SaaS applications in weeks, not months. Complete authentication, billing, multi-tenant architecture, and more. Get started today!',
  keywords: [
    'SaaS boilerplate',
    'SaaS starter kit',
    'Next.js boilerplate',
    'NestJS boilerplate',
    'TypeScript SaaS',
    'multi-tenant SaaS',
    'SaaS template',
  ],
  authors: [{ name: 'SaaS Boilerplate Team' }],
  openGraph: {
    title: 'SaaS Boilerplate - Production-Ready SaaS Starter Kit',
    description:
      'Build production-ready SaaS applications in weeks, not months. Complete authentication, billing, multi-tenant architecture, and more.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SaaS Boilerplate - Production-Ready SaaS Starter Kit',
    description:
      'Build production-ready SaaS applications in weeks, not months. Complete authentication, billing, multi-tenant architecture, and more.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <head>
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'SaaS Boilerplate',
              applicationCategory: 'DeveloperApplication',
              description:
                'Production-ready SaaS boilerplate with authentication, billing, multi-tenant architecture, and more.',
              offers: {
                '@type': 'Offer',
                price: '299',
                priceCurrency: 'USD',
              },
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              strategy='afterInteractive'
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <Script id='google-analytics' strategy='afterInteractive'>
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
              <ErrorBoundary>
                <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
                  <ReactQueryProvider>
                    <TokenSync />
                    <ToastProvider>{children}</ToastProvider>
                  </ReactQueryProvider>
                </ThemeProvider>
              </ErrorBoundary>
      </body>
    </html>
  );
}
