import { RelatedGuides } from '@/components/blog/RelatedGuides';
import { ArrowSquareOut, CheckCircle } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InfoSection, PageShell } from '@/components/content/PageShell';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { SmartSearch } from '@/components/search/SmartSearch';
import { allExplorerRoutes, getChain } from '@/lib/chains';
import { pageMetadata } from '@/lib/metadata';
import { EVM_NETWORKS, getNetwork } from '@/lib/networks';

type Props = { params: Promise<{ chain: string }> };

/** Chains with verified per-type explorer routes get a landing page; legacy-only chains don't (thin content). */
const IDS = Object.keys(allExplorerRoutes()).filter((id) => getChain(id));

export function generateStaticParams() {
  return IDS.map((chain) => ({ chain }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const chain = getChain((await params).chain);
  if (!chain) return {};
  // Name at most two explorers so the description stays under ~160 characters
  // (it ran to 214 on chains with many explorers and was cut off in results).
  const names = allExplorerRoutes()[chain.id].map((r) => r.name);
  const explorers = names.length > 2 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(' or ');
  return pageMetadata({
    title: `${chain.name} block explorer search`,
    description: `Search ${chain.name} addresses, transactions and blocks in one box. Web3Lens checks the format and opens ${explorers}${getNetwork(chain.id) ? ', or shows balances' : ''}.`,
    path: `/explorer/${chain.id}`,
  });
}

const KINDS = [
  ['address', 'Addresses'],
  ['tx', 'Transactions'],
  ['block', 'Blocks'],
  ['names', 'Names'],
  ['search', 'Free-text search'],
] as const;

export default async function ExplorerLanding({ params }: Props) {
  const chain = getChain((await params).chain);
  if (!chain) notFound();
  const routes = allExplorerRoutes()[chain.id];
  const network = getNetwork(chain.id);
  const evm = network?.family === 'evm';
  const related = (evm ? EVM_NETWORKS.map((n) => n.id) : IDS).filter((id) => id !== chain.id).slice(0, 12);

  return (
    <PageShell
      layout="stacked"
      breadcrumbs={[
        { name: 'Explorers', path: '/explorer' },
        { name: chain.name, path: `/explorer/${chain.id}` },
      ]}
      eyebrow="Block explorer search"
      title={
        <span className="flex flex-wrap items-center gap-4">
          <ChainGlyph id={chain.id} name={chain.name} size="lg" />
          <span>
            {chain.name} <span className="text-accent">explorer search</span>
          </span>
        </span>
      }
      lead={`Paste a ${chain.name} address${routes.some((r) => r.block) ? ', transaction hash or block number' : ' or transaction hash'}${routes.some((r) => r.names) ? ', or a name' : ''}. Web3Lens checks the format${network ? ', shows balances, transactions and risk checks,' : ''} and opens the right page on ${routes.map((r) => r.name).join(', ')}.`}
    >
      <div className="mb-12">
        <SmartSearch hidePopular initialChainId={chain.id} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-line bg-ink-2 p-6">
          <h2 className="text-lg font-extrabold tracking-tight">Explorers for {chain.name}</h2>
          <ul className="mt-4 divide-y divide-line">
            {routes.map((r, i) => (
              <li key={r.name} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <a href={r.home} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-bold hover:text-accent">
                  {r.name}
                  {i === 0 && <span className="rounded-full border border-accent/50 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-accent">default</span>}
                  <ArrowSquareOut aria-hidden weight="bold" className="size-3.5" />
                </a>
                <span className="flex flex-wrap gap-1.5">
                  {KINDS.filter(([k]) => r[k]).map(([k, label]) => (
                    <span key={k} className="rounded-md bg-ink px-2 py-0.5 text-xs font-bold text-muted">
                      {label}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-medium text-faint">
            Pick your default in <Link href="/settings" className="text-accent underline underline-offset-2">settings</Link>.
          </p>
        </section>
        <section className="min-w-0 rounded-2xl border border-line bg-ink-2 p-6">
          <h2 className="text-lg font-extrabold tracking-tight">On Web3Lens</h2>
          <ul className="mt-4 space-y-2.5 text-[15px] font-medium text-muted">
            {(network
              ? [
                  `Balance${evm ? ', tokens' : ''} and recent activity with sources and fetch times`,
                  'Transaction status, value, fee' + (evm ? ' and decoded input' : ''),
                  `Risk checks: OFAC sanctions snapshot${evm ? ', reported scams, contract checks and token approvals' : ''}`,
                  ...(evm ? ['The same address on 10 other EVM chains'] : []),
                ]
              : ['Format detection and checksum validation', 'Direct links to the right explorer page', 'OFAC sanctions snapshot for addresses', 'Batch checks, saved labels and share links']
            ).map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <CheckCircle aria-hidden weight="duotone" className="mt-0.5 size-5 shrink-0 text-accent" />
                {t}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-12">
        <InfoSection heading="More chains">
          <ul className="flex flex-wrap gap-2">
            {related.map((id) => {
              const c = getChain(id)!;
              return (
                <li key={id}>
                  <Link href={`/explorer/${id}`} className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3.5 text-sm font-semibold !text-fg !no-underline hover:border-accent">
                    <ChainGlyph id={id} name={c.name} size="sm" />
                    {c.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </InfoSection>
      </div>
      <RelatedGuides page={'/explorer/[chain]'} />
    </PageShell>
  );
}
