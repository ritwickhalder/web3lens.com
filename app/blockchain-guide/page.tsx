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
    <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-[12vh] text-center sm:px-[8%] lg:px-[12%]">
      <h1 className="mb-8 text-[1.75rem] font-medium text-white">
        Beginner's Guide to Cryptocurrencies & Blockchain (FAQ's)
      </h1>
      <GuideAccordion entries={GUIDE} />
    </main>
  );
}
