import type { NextConfig } from 'next';

/** Old static-site URLs → new routes. Listed one by one so /google*.html verification files still resolve. */
const LEGACY_PAGES: Record<string, string> = {
  '/index.html': '/',
  '/mobile.html': '/',
  '/directory.html': '/directory',
  '/blockchain-guide.html': '/blockchain-guide',
  '/about.html': '/about',
  '/contact.html': '/contact',
  '/contact.php': '/contact',
  '/terms.html': '/terms',
  '/privacy-policy.html': '/privacy-policy',
  '/bookmark.html': '/bookmark',
  '/sitemap.html': '/site-map',
};

const nextConfig: NextConfig = {
  async redirects() {
    // Canonical host is web3lens.com; www → apex is a Vercel domain redirect, so don't add a host redirect here
    // (an apex → www rule here made the two loop).
    return [
      ...Object.entries(LEGACY_PAGES).map(([source, destination]) => ({ source, destination, permanent: true })),
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
