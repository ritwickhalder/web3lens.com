import Link from 'next/link';
import { PlanComparison } from '@/components/account/PlanComparison';
import { PricingPlans } from '@/components/account/PricingPlans';
import { PageArt } from '@/components/content/PageArt';
import { PageShell } from '@/components/content/PageShell';
import { Panel } from '@/components/tools/ui';
import { PRO_ON_SALE } from '@/config/site';
import { pageMetadata } from '@/lib/metadata';
import { LanguageLinks } from '@/components/i18n/LanguageLinks';
import { PRICING_META } from '@/lib/i18n/pages';
import { localeAlternates } from '@/lib/i18n/seo';
import { getTx } from '@/lib/i18n/server';

const base = pageMetadata({
  title: PRICING_META.title,
  description: PRICING_META.description,
  path: '/pricing',
  // Indexed only once Pro is actually on sale.
  noindex: !PRO_ON_SALE,
});

export const metadata = { ...base, alternates: { ...base.alternates, ...localeAlternates('/pricing', 'en') } };

const LINK = 'text-accent underline underline-offset-2';

/** Question and answer in English (the translation key); an answer may use <account> and <terms> links. */
const FAQ: [string, string][] = [
  [
    'What stays free?',
    'Everything that keeps people safe or helps them look something up: detection, address, transaction and block pages, explorer routing for 700+ chains, OFAC and risk checks, approvals, the gas tracker, every developer tool and the browser extensions. None of it needs an account.',
  ],
  [
    'What do I get with Pro?',
    'Bigger batches with balances for every row, more daily cross-chain lookups, saved addresses synced between devices and the extension, collections, investigations stored in your account, JSON exports and API keys. It pays for the servers and data sources that heavy use needs.',
  ],
  [
    'Do you see my wallets or keys?',
    "No. Web3Lens never asks for or stores private keys, seed phrases or any wallet secret, and doesn't connect to wallets. With Pro, the saved addresses, labels and notes you choose to sync are stored in your account so they can reach your other devices.",
  ],
  [
    'How do payments, cancellation and refunds work?',
    "Payments are handled by Paddle, our merchant of record, which also handles tax and invoices. Cancel any time from Manage billing on your <account>account page</account>; Pro stays on until the end of the period you paid for. Refunds follow Paddle's buyer terms and our <terms>terms of use</terms>.",
  ],
  [
    'What happens to my data if Pro ends?',
    'Nothing is deleted. Saved items stay in your browser and your cloud copy stays readable; you just stop adding beyond the Free limits until you upgrade again.',
  ],
  ['Is there a trial?', 'Yes: 7 days of Pro, once per account, with no card. Start it from your account page after signing in with Google.'],
];

export default function PricingPage() {
  const tx = getTx();
  return (
    <PageShell
      layout="stacked"
      eyebrow={tx('Pricing')}
      title={tx('Free for everyone. Pro for heavy use.')}
      art={<PageArt scene="pricing" />}
      lead={tx('Search, explorers, developer tools and safety checks are free and need no account. Pro is for people who work through large lists every day.')}
    >
      <div className="space-y-4">
        <PricingPlans />
        <Panel title={tx('Compare plans')}>
          <PlanComparison />
        </Panel>
        <Panel title={tx('Questions')}>
          <dl className="grid grid-cols-1 gap-x-10 gap-y-5 lg:grid-cols-2">
            {FAQ.map(([q, a]) => (
              <div key={q} className="border-l-2 border-line pl-4">
                <dt className="font-extrabold">{tx(q)}</dt>
                <dd className="mt-1 text-[15px] font-medium leading-relaxed text-muted">
                  {tx.rich(a, {
                    account: (c) => <Link href="/account" className={LINK}>{c}</Link>,
                    terms: (c) => <Link href="/terms" className={LINK}>{c}</Link>,
                  })}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
      <LanguageLinks path="/pricing" inset />
    </PageShell>
  );
}
