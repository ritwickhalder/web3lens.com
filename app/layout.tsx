import { GoogleAnalytics } from '@next/third-parties/google';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Unbounded } from 'next/font/google';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SITE } from '@/config/site';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const unbounded = Unbounded({ subsets: ['latin'], variable: '--font-unbounded', display: 'swap' });

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
  themeColor: '#07080c',
  colorScheme: 'dark',
};

/** Fixed backdrop: faint grid fading out from the top, plus two slow-drifting glows. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_30%,transparent_75%)]" />
      <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 animate-drift rounded-full bg-violet/20 blur-[120px]" />
      <div className="absolute -top-24 left-[58%] h-[300px] w-[420px] animate-drift rounded-full bg-lime/10 blur-[110px] [animation-delay:-9s]" />
    </div>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${unbounded.variable}`}>
      <body className="relative isolate flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-lime px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <Backdrop />
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
