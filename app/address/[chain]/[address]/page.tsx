import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AddressView } from '@/components/results/AddressView';
import { ExplorerLinks } from '@/components/results/ExplorerLinks';
import { MultichainBalances } from '@/components/results/MultichainBalances';
import { Badge, ResultHeader } from '@/components/results/ResultHeader';
import { Card } from '@/components/results/ResultSection';
import { ResultError } from '@/components/results/ResultSkeleton';
import { ResultActions } from '@/components/results/ResultActions';
import { SecurityPanel } from '@/components/results/SecurityPanel';
import { getChain } from '@/lib/chains';
import { explorerLinks } from '@/lib/explorer';
import { shortHash } from '@/lib/format';
import { pageMetadata } from '@/lib/metadata';
import { searchUrl } from '@/lib/search-url';
import { LookupError, lookupAddress } from '@/lib/server/lookup';
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
  });
}

export default async function AddressPage({ params }: Props) {
  const { chain: chainId, address } = await params;
  const raw = decodeURIComponent(address);
  const check = checkAddressQuery(chainId, raw);
  const chain = getChain(chainId);
  if (!check.ok || !chain) return <ResultError title="Can't look this up" message={check.ok ? 'Unknown chain.' : check.error} query={raw} />;
  if (check.query !== raw) redirect(`/address/${chainId}/${encodeURIComponent(check.query)}`);

  let result;
  try {
    result = await lookupAddress(chainId, check.query);
  } catch (e) {
    if (e instanceof LookupError) return <ResultError title="Can't look this up" message={e.message} query={raw} />;
    throw e;
  }
  const d = check.detection;
  const links = explorerLinks(chain, result.address);

  return (
    <main className="wrap pt-10 sm:pt-14">
      <ResultHeader
        chainId={chainId}
        chainName={chain.name}
        kindLabel={result.family === 'evm' && result.account.status === 'ok' && result.account.data.isContract && !result.account.data.delegatedTo ? 'Contract' : 'Address'}
        value={result.address}
        sub={
          (result.family === 'evm' && result.resolvedFrom) || (d.format !== 'evm-address' && d.chains.length > 1) ? (
          <>
            {result.family === 'evm' && result.resolvedFrom && <span className="block">{result.resolvedFrom} resolves to this address.</span>}
            {d.format !== 'evm-address' && d.chains.length > 1 && (
              <span className="block">
                This format also fits{' '}
                {d.chains
                  .filter((c) => c !== chainId)
                  .map((c, i) => (
                    <span key={c}>
                      {i > 0 && ', '}
                      <Link href={searchUrl(result.address, c)} className="font-bold text-accent hover:underline">
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
        actions={<ResultActions query={result.address} chainId={chainId} />}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <AddressView result={result} />
          {result.family === 'evm' && <MultichainBalances address={result.address} current={chainId} />}
        </div>
        <aside className="min-w-0 space-y-4">
          <Card title="Open in an explorer">
            <ExplorerLinks links={links} />
          </Card>
          <SecurityPanel chainId={chainId} address={result.address} />
        </aside>
      </div>
    </main>
  );
}
