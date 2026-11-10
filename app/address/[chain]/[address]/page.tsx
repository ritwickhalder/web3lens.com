import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AddressView } from '@/components/results/AddressView';
import { ExplorerLinks } from '@/components/results/ExplorerLinks';
import { MultichainBalances } from '@/components/results/MultichainBalances';
import { QrCode } from '@/components/results/QrCode';
import { ResultActions } from '@/components/results/ResultActions';
import { Badge, ResultHeader } from '@/components/results/ResultHeader';
import { Card, Note } from '@/components/results/ResultSection';
import { ResultError } from '@/components/results/ResultSkeleton';
import { SecurityPanel } from '@/components/results/SecurityPanel';
import { getChain } from '@/lib/chains';
import { explorerLinks } from '@/lib/explorer';
import { shortHash } from '@/lib/format';
import { pageMetadata } from '@/lib/metadata';
import { searchUrl } from '@/lib/search-url';
import { LookupError, lookupAddress, resolveName } from '@/lib/server/lookup';
import { liveLookupAllowed, liveLookupMessage } from '@/lib/server/page-guard';
import { checkAddressQuery } from '@/lib/validate-query';

type Props = { params: Promise<{ chain: string; address: string }> };

export async function generateMetadata({ params }: Props) {
  const { chain: chainId, address } = await params;
  const chain = getChain(chainId);
  const a = decodeURIComponent(address);
  return pageMetadata({
    title: `${chain?.name ?? chainId} address ${shortHash(a)}`,
    description: `Balance, tokens, activity and risk checks for ${a} on ${chain?.name ?? chainId}.`,
    path: `/address/${chainId}/${a}`,
    noindex: true,
    nofollow: true,
  });
}

/** The provider-backed sections, streamed in after the rest of the page. */
async function AddressData({ chainId, address, resolvedFrom }: { chainId: string; address: string; resolvedFrom?: string }) {
  let result;
  try {
    result = await lookupAddress(chainId, address);
  } catch (e) {
    if (e instanceof LookupError) return <Note tone="warn">{e.message}</Note>;
    throw e;
  }
  if (result.family === 'evm' && resolvedFrom) result = { ...result, resolvedFrom };
  return <AddressView result={result} />;
}

function SectionsLoading() {
  return (
    <div className="space-y-4" aria-busy>
      <p className="sr-only">Loading balances and activity…</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl border border-line bg-ink-2" />
      ))}
    </div>
  );
}

export default async function AddressPage({ params }: Props) {
  const { chain: chainId, address } = await params;
  const raw = decodeURIComponent(address);
  const check = checkAddressQuery(chainId, raw);
  const chain = getChain(chainId);
  if (!check.ok || !chain) return <ResultError title="Can't look this up" message={check.ok ? 'Unknown chain.' : check.error} query={raw} />;
  if (check.query !== raw) redirect(`/address/${chainId}/${encodeURIComponent(check.query)}`);

  const d = check.detection;
  // Crawlers, scripts and clients over their lookup budget get the page without provider calls.
  const live = await liveLookupAllowed();
  // ENS names are resolved up front (one cached on-chain call) so the header shows the real address.
  let addr = check.query;
  let resolvedFrom: string | undefined;
  if (d.format === 'ens') {
    if (!live.ok) return <ResultError title="Can't resolve this name right now" message={liveLookupMessage(live)} query={raw} />;
    const r = await resolveName(check.query);
    if (r.status !== 'ok') return <ResultError title="Can't resolve this name" message={`${check.query}: ${r.reason}.`} query={raw} />;
    if (!r.data) return <ResultError title="No address for this name" message={`${check.query} has no Ethereum address set (checked on-chain and through its off-chain gateway, if it has one).`} query={raw} />;
    addr = r.data;
    resolvedFrom = check.query;
  }
  const links = explorerLinks(chain, addr);
  const otherChains = d.format !== 'evm-address' && d.format !== 'ens' ? d.chains.filter((c) => c !== chainId) : [];

  return (
    <main className="wrap pt-10 sm:pt-14">
      <ResultHeader
        chainId={chainId}
        chainName={chain.name}
        kindLabel="Address"
        value={addr}
        sub={
          resolvedFrom || otherChains.length ? (
            <>
              {resolvedFrom && <span className="block">{resolvedFrom} resolves to this address (on-chain ENS).</span>}
              {otherChains.length > 0 && (
                <span className="block">
                  This format also fits{' '}
                  {otherChains.map((c, i) => (
                    <span key={c}>
                      {i > 0 && ', '}
                      <Link href={searchUrl(addr, c)} className="font-bold text-accent hover:underline">
                        {getChain(c)?.name ?? c}
                      </Link>
                    </span>
                  ))}
                  .
                </span>
              )}
            </>
          ) : undefined
        }
        badges={
          <>
            <Badge>{d.label}</Badge>
            {d.checksum === 'valid' && <Badge tone="good">Checksum valid</Badge>}
          </>
        }
        actions={<ResultActions query={addr} chainId={chainId} />}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          {live.ok ? (
            <Suspense fallback={<SectionsLoading />}>
              <AddressData chainId={chainId} address={addr} resolvedFrom={resolvedFrom} />
            </Suspense>
          ) : (
            <Note tone={live.reason === 'rate-limited' ? 'warn' : 'info'}>{liveLookupMessage(live)}</Note>
          )}
          {live.ok && /^0x[0-9a-fA-F]{40}$/.test(addr) && <MultichainBalances address={addr} current={chainId} />}
        </div>
        <aside className="min-w-0 space-y-4">
          <Card title="Open in an explorer">
            <ExplorerLinks links={links} />
          </Card>
          {live.ok && <SecurityPanel chainId={chainId} address={addr} />}
          <Card title="QR code">
            <QrCode value={addr} label={`${chain.name} address ${shortHash(addr)}`} />
          </Card>
        </aside>
      </div>
    </main>
  );
}
