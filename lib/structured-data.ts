/** schema.org JSON-LD builders. Plain objects; rendered by components/seo/JsonLd.tsx. */
import { EXTENSION_STORES, SITE } from '@/config/site';

type Thing = Record<string, unknown>;

const abs = (path: string) => (path.startsWith('http') ? path : `${SITE.url}${path === '/' ? '' : path}`);
export const ORG_ID = `${SITE.url}/#organization`;
export const WEBSITE_ID = `${SITE.url}/#website`;
export const AUTHOR_ID = `${SITE.url}/#author`;

export function organization(): Thing {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    url: SITE.url,
    logo: { '@type': 'ImageObject', url: `${SITE.url}/apple-icon`, width: 180, height: 180 },
    description: SITE.shortDescription,
    foundingDate: '2018',
    founder: { '@id': AUTHOR_ID },
    sameAs: [SITE.facebook, `https://x.com/${SITE.twitter.replace('@', '')}`, 'https://github.com/ritwickhalder/web3lens.com'],
  };
}

export function author(): Thing {
  return { '@type': 'Person', '@id': AUTHOR_ID, name: SITE.author.name, url: SITE.author.url, sameAs: [SITE.author.github, SITE.author.youtube] };
}

export function website(): Thing {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE.name,
    url: SITE.url,
    inLanguage: 'en',
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** The website itself as a free web app (home page). */
export function webApplication(): Thing {
  return {
    '@type': 'WebApplication',
    name: SITE.name,
    url: SITE.url,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@id': ORG_ID },
  };
}

/** The browser extension (/extension). No ratings are claimed. */
export function browserExtension(): Thing {
  return {
    '@type': 'SoftwareApplication',
    name: 'Web3Lens browser extension',
    alternateName: 'Blockchain Explorer & Web3 Block Explorer',
    url: `${SITE.url}/extension`,
    applicationCategory: 'BrowserApplication',
    operatingSystem: 'Chrome, Firefox, Microsoft Edge',
    installUrl: EXTENSION_STORES.flatMap((s) => (s.url ? [s.url] : [])),
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@id': ORG_ID },
    featureList: [
      'Address, transaction hash, block and ENS name detection with checksum validation',
      'Right-click lookups and the w3 address-bar keyword',
      'Scan the current page for addresses and hashes',
      'Risk checks: OFAC sanctions, reported addresses, contract checks, token approvals',
      'Developer tools: unit converter, calldata and raw transaction decoders, gas',
      'Batch search with CSV export',
    ],
    inLanguage: ['en', 'es', 'pt', 'fr', 'de', 'ja', 'ko', 'zh-CN', 'ru', 'id', 'tr', 'it', 'pl', 'nl', 'th'],
  };
}

export function breadcrumbList(items: { name: string; path: string }[]): Thing {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function blogPosting(p: {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string;
  category: string;
  tags: string[];
  words: number;
}): Thing {
  const url = `${SITE.url}/blog/${p.slug}`;
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: p.title.slice(0, 110),
    description: p.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: [`${url}/opengraph-image`],
    datePublished: p.date,
    dateModified: p.updated,
    author: { '@id': AUTHOR_ID, '@type': 'Person', name: SITE.author.name, url: SITE.author.github },
    publisher: { '@id': ORG_ID },
    isPartOf: { '@id': `${SITE.url}/blog#blog` },
    articleSection: p.category,
    keywords: p.tags.join(', '),
    wordCount: p.words,
    inLanguage: 'en',
  };
}

export function faqPage(faq: { question: string; answer: string }[]): Thing {
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  };
}

export function blog(posts: { slug: string; title: string; date: string }[]): Thing {
  return {
    '@type': 'Blog',
    '@id': `${SITE.url}/blog#blog`,
    name: `${SITE.name} Blog`,
    url: `${SITE.url}/blog`,
    publisher: { '@id': ORG_ID },
    blogPost: posts.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE.url}/blog/${p.slug}`, datePublished: p.date })),
  };
}

export function collectionPage(name: string, path: string, description: string): Thing {
  return { '@type': 'CollectionPage', name, url: abs(path), description, isPartOf: { '@id': WEBSITE_ID } };
}
