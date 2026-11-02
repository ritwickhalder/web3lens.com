import { GoogleAnalytics } from '@next/third-parties/google';
import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SITE } from '@/config/site';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: `%s | ${SITE.name}` },
  description: SITE.description,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.author.name, url: SITE.author.url }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: `${SITE.domain} - Blockchain Explorer | Blockchain Search Engine`,
    title: `${SITE.domain} - Blockchain Explorer | Blockchain Search Engine`,
    description: SITE.shortDescription,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    site: SITE.twitter,
    creator: SITE.twitter,
    title: `${SITE.domain} - Blockchain Explorer | Blockchain Search Engine`,
    description: SITE.shortDescription,
  },
  other: { 'fb:admins': '100001229952787' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a1520',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    // data-theme may be changed by the init script before hydration, hence suppressHydrationWarning.
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${manrope.variable} ${plexMono.variable}`}>
      <head>
        {/* Applies a stored light/system theme before first paint; static string (lib/theme.ts). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="search" type="application/opensearchdescription+xml" title={SITE.name} href="/opensearch.xml" />
        <script
          type="application/ld+json"
          // Structured data for a sitelinks search box; static, no user input.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: SITE.name,
              url: SITE.url,
              potentialAction: {
                '@type': 'SearchAction',
                target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/search?q={search_term_string}` },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only z-50 bg-accent px-4 py-2 text-sm font-bold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <SiteHeader />
        <div id="main" className="flex-1">
          {children}
        </div>
        <SiteFooter />
      </body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
