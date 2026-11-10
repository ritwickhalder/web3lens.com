import Link from 'next/link';
import { PlanComparison } from '@/components/account/PlanComparison';
import { PricingPlans } from '@/components/account/PricingPlans';
import { PageShell } from '@/components/content/PageShell';
import { Panel } from '@/components/tools/ui';
import { PRO_ON_SALE } from '@/config/site';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Pricing: Free and Pro',
  description:
    'Web3Lens is free for searching, explorers, developer tools and safety checks. Pro adds large batches with balances, cloud-synced saved addresses, investigations, JSON export and API keys.',
  path: '/pricing',
  // Indexed only once Pro is actually on sale.
  noindex: !PRO_ON_SALE,
});

const FAQ: [string, React.ReactNode][] = [
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
    <>
      Payments are handled by Paddle, our merchant of record, which also handles tax and invoices. Cancel any time from Manage billing on your{' '}
      <Link href="/account" className="text-accent underline underline-offset-2">account page</Link>; Pro stays on until the end of the period you paid for.
      Refunds follow Paddle's buyer terms and our <Link href="/terms" className="text-accent underline underline-offset-2">terms of use</Link>.
    </>,
  ],
  [
    'What happens to my data if Pro ends?',
    'Nothing is deleted. Saved items stay in your browser and your cloud copy stays readable; you just stop adding beyond the Free limits until you upgrade again.',
  ],
  ['Is there a trial?', 'Yes: 7 days of Pro, once per account, with no card. Start it from your account page after signing in with Google.'],
];

export default function PricingPage() {
  return (
    <PageShell
      layout="stacked"
      eyebrow="Pricing"
      title="Free for everyone. Pro for heavy use."
      lead="Search, explorers, developer tools and safety checks are free and need no account. Pro is for people who work through large lists every day."
    >
      <div className="space-y-6">
        <PricingPlans />
        <Panel title="Compare plans">
          <PlanComparison />
        </Panel>
        <Panel title="Questions">
          <dl className="divide-y divide-line">
            {FAQ.map(([q, a]) => (
              <div key={q} className="grid grid-cols-1 gap-2 py-5 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-8">
                <dt className="font-extrabold">{q}</dt>
                <dd className="text-[15px] font-medium leading-relaxed text-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </PageShell>
  );
}
