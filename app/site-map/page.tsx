import Link from 'next/link';
import { InfoSection, PageShell } from '@/components/content/PageShell';
import { PAGES, SITE } from '@/config/site';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Sitemap',
  description: `Every page on ${SITE.domain}.`,
  path: '/site-map',
});

export default function SiteMapPage() {
  const host = SITE.url.replace('https://www.', '');
  return (
    <PageShell title="SITEMAP">
      <InfoSection heading="Website map (links)">
        <ul className="leading-loose">
          {PAGES.map((page) => (
            <li key={page.href}>
              &rarr; &nbsp;{page.label} :- <Link href={page.href}>{`${host}${page.href}`}</Link>
            </li>
          ))}
          <li>
            &rarr; &nbsp;Sitemap XML File :- <a href="/sitemap.xml">{`${host}/sitemap.xml`}</a>
          </li>
        </ul>
      </InfoSection>
    </PageShell>
  );
}
