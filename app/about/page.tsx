import Link from 'next/link';
import { InfoSection, PageShell } from '@/components/content/PageShell';
import { SITE } from '@/config/site';
import { CHAIN_COUNT_LABEL } from '@/lib/chains';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'About',
  description: `${SITE.name} is an all-in-one search engine for addresses, transactions and blocks across ${CHAIN_COUNT_LABEL} blockchains.`,
  path: '/about',
});

const STATS = [
  { value: CHAIN_COUNT_LABEL, label: 'Chains searchable' },
  { value: '2018', label: 'Online since' },
  { value: '0', label: 'Ads or sign-ups' },
];

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title={
        <>
          One search box for <span className="text-accent">every blockchain.</span>
        </>
      }
      lead={`${SITE.name} is your all-in-one search engine for data, addresses and transactions across the world's blockchains, plus a directory of crypto websites, blogs and channels.`}
    >
      <dl className="mb-12 grid grid-cols-3 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-ink-2 p-5 sm:p-6">
            <dd className="text-3xl font-extrabold tracking-tight text-fg sm:text-5xl">{s.value}</dd>
            <dt className="mt-1 text-sm font-bold text-muted">{s.label}</dt>
          </div>
        ))}
      </dl>

      <InfoSection index={1} heading="A brief history & why you need this website">
        This website was created in April 2018 because searching data, transaction history and more across different
        blockchains meant juggling a different explorer for each one. With over 1000 blockchains in the world, it's
        essential to have a single website to search across any of them. So use it, and feel free to{' '}
        <Link href="/contact">drop in your suggestions</Link> to make this website even better :-)
      </InfoSection>
      <InfoSection index={2} heading="What can you do with this website">
        <ul className="list-disc space-y-1.5 pl-5 marker:text-accent">
          <li>Search the blockchain for addresses on {CHAIN_COUNT_LABEL} cryptocurrencies.</li>
          <li>Search transactions on the blockchain for any cryptocurrency.</li>
          <li>Search block data & history for any cryptocurrency on the blockchain.</li>
          <li>
            Browse the <Link href="/directory">directory</Link> of cryptocurrency and blockchain websites, news channels,
            groups and communities.
          </li>
          <li>
            Read the beginner's <Link href="/blockchain-guide">guide</Link> to blockchain and cryptocurrencies if you're
            new to this space.
          </li>
        </ul>
      </InfoSection>
      <InfoSection index={3} heading="Developer">
        Built and maintained by{' '}
        <a href={SITE.author.url} target="_blank" rel="noopener noreferrer">
          {SITE.author.name}
        </a>
        .
      </InfoSection>
    </PageShell>
  );
}
