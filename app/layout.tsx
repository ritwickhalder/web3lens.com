import { GoogleAnalytics } from '@next/third-parties/google';
import type { Metadata, Viewport } from 'next';
import { Signika } from 'next/font/google';
import { DonationFooter } from '@/components/layout/DonationFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SITE } from '@/config/site';
import './globals.css';

const signika = Signika({ subsets: ['latin'], variable: '--font-signika', display: 'swap' });

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
    card: 'summary',
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
  themeColor: '#0277bd',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="en" className={signika.variable}>
      <body className="min-h-screen antialiased">
        <SiteHeader />
        {children}
        <DonationFooter />
      </body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
