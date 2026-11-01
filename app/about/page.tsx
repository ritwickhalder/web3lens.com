import Link from 'next/link';
import { InfoSection, PageShell } from '@/components/content/PageShell';
import { SITE } from '@/config/site';
import { CHAINS } from '@/lib/chains';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'About',
  description: `${SITE.name} is an all-in-one search engine for addresses, transactions and blocks across ${CHAINS.length}+ blockchains.`,
  path: '/about',
});

export default function AboutPage() {
  return (
    <PageShell title="ABOUT">
      <InfoSection heading="What is it ?">
        {SITE.name} is your all-one-search engine to search data, address, transactions across all popular blockchains
        in the world. You also get an extensive directory of all blockchain or cryptocurrency related websites, blogs and
        channels.
      </InfoSection>
      <InfoSection heading="A brief history & why you need this website">
        This website has been created on April 2018 due to the requirement of searching data, transaction history etc.
        across different blockchains. Since there are over 1000 blockchains in the world it's quite essential to have a
        single website to search across any blockchain. So use it and feel free to{' '}
        <Link href="/contact">drop in your suggestions</Link> to make this website even better :-)
      </InfoSection>
      <InfoSection heading="What can you do with this website">
        You can do the following things on this website :-
        <ul className="mt-2 list-disc pl-10">
          <li>Search the blockchain for over 750 Cryptocurrency Addresses.</li>
          <li>Search transactions on the blockchain for any cryptocurrency.</li>
          <li>Search block data & history for any cryptocurrency on the blockchain.</li>
          <li>
            Search and use the directory of cryptocurrency and blockchain related websites, news channels, groups and
            communities.
          </li>
          <li>
            Check out the basic <Link href="/blockchain-guide">guide</Link> on blockchain and cryptocurrencies for
            beginners if you are new to this space.
          </li>
        </ul>
      </InfoSection>
      <InfoSection heading="Developer">
        <a href={SITE.author.url} target="_blank" rel="noopener noreferrer" className="font-bold uppercase">
          {SITE.author.name}
        </a>
      </InfoSection>
    </PageShell>
  );
}
