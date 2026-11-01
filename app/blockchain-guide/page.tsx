import { PageShell } from '@/components/content/PageShell';
import { GuideAccordion } from '@/components/guide/GuideAccordion';
import { GUIDE } from '@/content/guide';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: "Beginner's Guide to Cryptocurrencies & Blockchain",
  description: 'What is the blockchain, Bitcoin, mining, wallets, NFTs and DeFi: a short FAQ with videos for newcomers.',
  path: '/blockchain-guide',
});

export default function BlockchainGuidePage() {
  return (
    <PageShell
      eyebrow="Learn"
      title={
        <>
          Crypto & blockchain, <span className="text-lens">explained.</span>
        </>
      }
      lead={`A beginner's guide in ${GUIDE.length} short answers, most with a video. Start at the top or jump to what you need.`}
    >
      <GuideAccordion entries={GUIDE} />
    </PageShell>
  );
}
