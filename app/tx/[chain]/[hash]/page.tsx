import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ExplorerLinks } from '@/components/results/ExplorerLinks';
import { ResultActions } from '@/components/results/ResultActions';
import { Badge, ResultHeader } from '@/components/results/ResultHeader';
import { Card, Note } from '@/components/results/ResultSection';
import { ResultError } from '@/components/results/ResultSkeleton';
import { TxLocator } from '@/components/results/TxLocator';
import { TxView } from '@/components/results/TxView';
import { getChain } from '@/lib/chains';
import { explorerLinks } from '@/lib/explorer';
import { shortHash } from '@/lib/format';
import { pageMetadata } from '@/lib/metadata';
import { LookupError, lookupTx } from '@/lib/server/lookup';
import { liveLookupAllowed, liveLookupMessage } from '@/lib/server/page-guard';
import { checkTxQuery } from '@/lib/validate-query';

type Props = { params: Promise<{ chain: string; hash: string }> };

export async function generateMetadata({ params }: Props) {
  const { chain: chainId, hash } = await params;
  const chain = getChain(chainId);
  return pageMetadata({
    title: `${chain?.name ?? chainId} transaction ${shortHash(hash)}`,
    description: `Status, value, fee and decoded input for transaction ${hash} on ${chain?.name ?? chainId}.`,
    path: `/tx/${chainId}/${hash}`,
    noindex: true,
    nofollow: true,
  });
}

export default async function TxPage({ params }: Props) {
  const { chain: chainId, hash } = await params;
  const raw = decodeURIComponent(hash);
  const check = checkTxQuery(chainId, raw);
  const chain = getChain(chainId);
  if (!check.ok || !chain) return <ResultError title="Can't look this up" message={check.ok ? 'Unknown chain.' : check.error} query={raw} />;
  if (check.query !== raw) redirect(`/tx/${chainId}/${encodeURIComponent(check.query)}`);

  const hashValue = check.query;
  // Crawlers, scripts and clients over their lookup budget get the page without provider calls.
  const live = await liveLookupAllowed();
  return (
    <main className="wrap pt-10 sm:pt-14">
      <ResultHeader
        chainId={chainId}
        chainName={chain.name}
        kindLabel="Transaction"
        value={hashValue}
        badges={<Badge>{check.detection.label}</Badge>}
        actions={<ResultActions query={hashValue} chainId={chainId} />}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          {live.ok ? (
            <Suspense
              fallback={
                <div aria-busy className="h-64 animate-pulse rounded-2xl border border-line bg-ink-2">
                  <p className="sr-only">Loading transaction…</p>
                </div>
              }
            >
              <TxData chainId={chainId} hash={hashValue} />
            </Suspense>
          ) : (
            <Note tone={live.reason === 'rate-limited' ? 'warn' : 'info'}>{liveLookupMessage(live)}</Note>
          )}
        </div>
        <aside className="min-w-0 space-y-4">
          <Card title="Open in an explorer">
            <ExplorerLinks links={explorerLinks(chain, hashValue)} />
          </Card>
        </aside>
      </div>
    </main>
  );
}

/** The provider-backed part, streamed in after the header and explorer links. */
async function TxData({ chainId, hash }: { chainId: string; hash: string }) {
  let result;
  try {
    result = await lookupTx(chainId, hash);
  } catch (e) {
    if (e instanceof LookupError) return <Note tone="warn">{e.message}</Note>;
    throw e;
  }
  const notFound = result.tx.status === 'ok' && result.tx.data === null;
  return (
    <>
      <TxView result={result} />
      {result.family === 'evm' && notFound && <TxLocator hash={result.hash} />}
    </>
  );
}
