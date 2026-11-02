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
  const host = SITE.url.replace(/^https?:\/\//, '');
  return (
    <PageShell eyebrow="Information" title="Sitemap">
      <InfoSection heading="Website map (links)">
        <ul className="space-y-1">
          {PAGES.map((page) => (
            <li key={page.href}>
              <span className="font-bold text-fg">{page.label}</span> · <Link href={page.href}>{`${host}${page.href}`}</Link>
            </li>
          ))}
          <li>
            <span className="font-bold text-fg">Sitemap XML file</span> · <a href="/sitemap.xml">{`${host}/sitemap.xml`}</a>
          </li>
        </ul>
      </InfoSection>
    </PageShell>
  );
}
