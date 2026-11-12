import { ArrowRight, BookOpenText, Cube, GraduationCap, ListMagnifyingGlass, MagnifyingGlass, Receipt } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { PageArt } from '@/components/content/PageArt';
import { InfoSection, PageShell } from '@/components/content/PageShell';
import { SITE } from '@/config/site';
import { CHAIN_COUNT_LABEL } from '@/lib/chains';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'About Web3Lens: One Search Box for Every Blockchain',
  description: `${SITE.name} is an all-in-one search engine for addresses, transactions and blocks across ${CHAIN_COUNT_LABEL} blockchains.`,
  path: '/about',
});

const STATS = [
  { value: CHAIN_COUNT_LABEL, label: 'Chains searchable' },
  { value: '2018', label: 'Online since' },
  { value: '0', label: 'Ads or sign-ups' },
];

const CAN_DO = [
  { icon: MagnifyingGlass, title: 'Search addresses', body: `Look up addresses on ${CHAIN_COUNT_LABEL} cryptocurrencies.`, href: '/search' },
  { icon: Receipt, title: 'Search transactions', body: 'Find a transaction on the blockchain for any cryptocurrency.', href: '/search' },
  { icon: Cube, title: 'Search blocks', body: 'Block data and history for any cryptocurrency on the blockchain.', href: '/explorer' },
  { icon: ListMagnifyingGlass, title: 'Browse the directory', body: 'Crypto and blockchain websites, news channels, groups and communities.', href: '/directory' },
  { icon: GraduationCap, title: "Read the beginner's guide", body: "New to this space? Blockchain and cryptocurrencies, explained.", href: '/blockchain-guide' },
  { icon: BookOpenText, title: 'Read the blog', body: 'Tested guides to explorers, address formats and developer tools.', href: '/blog' },
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
      art={<PageArt scene="about" />}
    >
      <dl className="mb-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {STATS.map((s) => (
          <div key={s.label} className="flex flex-col-reverse bg-ink-2 px-5 py-4 sm:px-6">
            <dt className="mt-1 text-sm font-bold text-muted">{s.label}</dt>
            <dd className="text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <InfoSection index={1} heading="A brief history & why you need this website">
          This website was created in April 2018 because searching data, transaction history and more across different
          blockchains meant juggling a different explorer for each one. With over 1000 blockchains in the world, it's
          essential to have a single website to search across any of them. So use it, and feel free to{' '}
          <Link href="/contact">drop in your suggestions</Link> to make this website even better :-)
        </InfoSection>
        <InfoSection index={2} heading="Developer">
          Built and maintained by{' '}
          <a href={SITE.author.url} target="_blank" rel="noopener noreferrer">
            {SITE.author.name}
          </a>
          .
        </InfoSection>
      </div>

      <section aria-labelledby="can-do" className="mt-8">
        <h2 id="can-do" className="label mb-3">
          What you can do here
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {CAN_DO.map((c) => (
            <li key={c.title}>
              <Link href={c.href} className="group flex h-full gap-4 rounded-xl border border-line bg-ink-2 p-4 transition-colors hover:border-accent/60">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                  <c.icon aria-hidden weight="duotone" className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-base font-extrabold text-fg group-hover:text-accent">
                    {c.title}
                    <ArrowRight aria-hidden weight="bold" className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="mt-0.5 block text-sm font-medium text-muted">{c.body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
