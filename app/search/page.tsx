import { ShieldWarning, Warning } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ExplorerLinks } from '@/components/results/ExplorerLinks';
import { MultichainBalances } from '@/components/results/MultichainBalances';
import { ResultActions } from '@/components/results/ResultActions';
import { Badge, ResultHeader } from '@/components/results/ResultHeader';
import { Card, Note } from '@/components/results/ResultSection';
import { TxLocator } from '@/components/results/TxLocator';
import { ChainGlyph } from '@/components/search/ChainGlyph';
import { SmartSearch } from '@/components/search/SmartSearch';
import { getChain, getRetiredChain, type Chain } from '@/lib/chains';
import { detectAll, extractQuery, type Detection } from '@/lib/detect';
import { appliesTo, explorerDown, explorerHealthCheckedAt, explorerLinks, resolveLegacyExplorer, toQueryKind, webSearchLink } from '@/lib/explorer';
import { shortHash } from '@/lib/format';
import { pageMetadata } from '@/lib/metadata';
import { hasNativeSupport } from '@/lib/networks';
import { nativeResultUrl } from '@/lib/search-url';
import { checkSanctions } from '@/lib/security/sanctions';

type Props = { searchParams: Promise<{ q?: string | string[]; chain?: string | string[] }> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export async function generateMetadata({ searchParams }: Props) {
  const q = first((await searchParams).q).trim();
  return pageMetadata({
    title: q ? `Search: ${shortHash(q, 14, 8)}` : 'Blockchain Search: Address, Tx and Block Lookup',
    description: 'Search any blockchain address, transaction, block or name: Web3Lens detects the format, checks it and links to the right explorer.',
    path: '/search',
    noindex: Boolean(q),
  });
}

function ChainCard({ chain, query, detection }: { chain: Chain; query: string; detection: Detection }) {
  const kind = toQueryKind(detection);
  const native = hasNativeSupport(chain.id, kind) && detection.network !== 'testnet' && detection.checksum !== 'invalid';
  const links = explorerLinks(chain, query, detection);
  const down = explorerDown(chain);
  const legacy = resolveLegacyExplorer(chain, query);
  return (
    <li className="min-w-0 rounded-2xl border border-line bg-ink-2 p-5">
      <div className="mb-3 flex items-center gap-3">
        <ChainGlyph id={chain.id} name={chain.name} size="md" />
        <h3 className="min-w-0 flex-1 truncate text-base font-extrabold">{chain.name}</h3>
        {native && (
          <Link href={nativeResultUrl(chain.id, kind, detection.normalized)!} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-extrabold text-ink hover:bg-accent-hover">
            View on Web3Lens
          </Link>
        )}
      </div>
      {links.length ? (
        <ExplorerLinks links={links} compact />
      ) : legacy.kind === 'form' ? (
        <form action={legacy.action} method={legacy.method} target="_blank" rel="noopener noreferrer">
          <input type="hidden" name={legacy.param} value={legacy.value} />
          <button type="submit" className="rounded-lg border border-line px-3 py-1.5 text-sm font-bold hover:border-accent hover:text-accent">
            Search on {new URL(legacy.action).hostname}
          </button>
        </form>
      ) : null}
      {down && (
        <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-redline">
          <Warning aria-hidden weight="bold" className="mt-0.5 size-4 shrink-0" />
          <span>
            This chain's only known explorer didn't respond at the last check
            {explorerHealthCheckedAt() ? ` (${explorerHealthCheckedAt()!.slice(0, 10)})` : ''}.{' '}
            <a href={webSearchLink(chain, query)} target="_blank" rel="noopener noreferrer" className="underline">
              Search the web for an explorer
            </a>
          </span>
        </p>
      )}
    </li>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = first(params.q).slice(0, 500);
  const chainParam = first(params.chain);
  const { query, from, host } = extractQuery(raw);
  const detections = detectAll(query);
  const best = detections[0];
  const picked = chainParam ? getChain(chainParam) : undefined;
  const retired = chainParam && !picked ? getRetiredChain(chainParam) : undefined;

  // A chain was named and Web3Lens has its own page for it: go there.
  if (picked && best) {
    const d = detections.find((x) => appliesTo(x, picked)) ?? null;
    const kind = toQueryKind(d);
    if (d && d.checksum !== 'invalid' && d.network !== 'testnet' && hasNativeSupport(picked.id, kind)) redirect(nativeResultUrl(picked.id, kind, d.normalized)!);
  }
  // Non-EVM formats with one natively supported home chain go straight to it.
  if (!picked && best && best.chains.length && best.format !== 'evm-address' && best.format !== 'evm-tx') {
    const home = best.chains[0];
    const kind = toQueryKind(best);
    if (best.checksum !== 'invalid' && best.network !== 'testnet' && hasNativeSupport(home, kind) && best.chains.length === 1) {
      redirect(nativeResultUrl(home, kind, best.normalized)!);
    }
  }

  const header = (
    <div className="mx-auto mb-10 max-w-6xl">
      <SmartSearch hidePopular initialQuery={query} initialChainId={picked?.id} />
      {retired && (
        <p className="mt-4 flex items-start gap-2 text-sm font-semibold text-redline">
          <Warning aria-hidden weight="bold" className="mt-0.5 size-4 shrink-0" />
          <span>
            {retired.name} was removed from the chain list on {retired.retiredAt}: {retired.reason}
          </span>
        </p>
      )}
    </div>
  );

  if (!query.trim()) {
    return (
      <main className="wrap pt-10 sm:pt-14">
        <p className="label text-center">Search</p>
        <h1 className="heading mt-3 text-center text-4xl sm:text-5xl">Look up anything, on any chain</h1>
        <div className="mt-8">{header}</div>
      </main>
    );
  }

  const sanctions = best && best.kind === 'address' ? checkSanctions(best.normalized) : null;
  const candidates = (d: Detection) =>
    (picked && appliesTo(d, picked) ? [picked.id, ...d.chains.filter((c) => c !== picked.id)] : d.chains)
      .map((id) => getChain(id))
      .filter((c): c is Chain => Boolean(c));

  return (
    <main className="wrap pt-10 sm:pt-14">
      {header}
      {!best ? (
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="heading text-3xl">Not a format Web3Lens recognises</h1>
          <p className="text-lg font-semibold text-muted">
            <span className="break-all font-mono text-base text-fg">{query}</span> doesn't look like an address, transaction hash, block number or name on the chains
            Web3Lens knows. Pick a chain in the search bar to send it to that chain's explorer, or try a wider search:
          </p>
          <ul className="flex flex-wrap gap-2">
            <li>
              <a href={`https://blockchair.com/search?q=${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg border border-line px-3 py-1.5 text-sm font-bold hover:border-accent hover:text-accent">
                Blockchair (40+ chains)
              </a>
            </li>
            <li>
              <a href={`https://duckduckgo.com/?q=${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-lg border border-line px-3 py-1.5 text-sm font-bold hover:border-accent hover:text-accent">
                Web search
              </a>
            </li>
          </ul>
        </div>
      ) : best.kind === 'secret' ? (
        <div className="mx-auto max-w-3xl">
          <p className="flex items-start gap-3 rounded-2xl border border-danger/60 bg-danger/10 p-6 text-lg font-bold text-danger">
            <ShieldWarning aria-hidden weight="duotone" className="size-8 shrink-0" />
            {best.note}
          </p>
          <p className="mt-4 text-[15px] font-semibold text-muted">
            If you pasted it by mistake, nothing was sent anywhere by this page except the link itself (it is in your browser history). If anyone asked you for it,
            it is a scam; move your funds to a new wallet.
          </p>
        </div>
      ) : (
        <>
          <ResultHeader
            chainId={candidates(best)[0]?.id ?? 'ethereum'}
            chainName={picked?.name ?? (best.chains.length > 1 ? `${best.chains.length} possible chains` : (getChain(best.chains[0])?.name ?? 'Unknown chain'))}
            kindLabel={best.label}
            value={best.normalized}
            sub={from ? `Taken from the ${from === 'url' ? `${host} link` : 'payment link'} you pasted.` : undefined}
            badges={
              <>
                {best.checksum === 'valid' && <Badge tone="good">Checksum valid</Badge>}
                {best.checksum === 'invalid' && <Badge tone="danger">Checksum does not match</Badge>}
                {best.checksum === 'none' && best.format === 'evm-address' && <Badge>No checksum (all one case)</Badge>}
                {best.network === 'testnet' && <Badge tone="warn">Testnet</Badge>}
              </>
            }
            actions={<ResultActions query={best.normalized} chainId={picked?.id ?? null} />}
          />
          <div className="space-y-4">
            {best.note && <Note tone={best.checksum === 'invalid' ? 'danger' : 'warn'}>{best.note}</Note>}
            {sanctions?.listed && (
              <Note tone="danger">
                This address is on the US Treasury OFAC sanctions list ({sanctions.lists.join(', ')}; snapshot {sanctions.snapshotAt.slice(0, 10)}). Transacting with it may be
                illegal.
              </Note>
            )}
            {best.format === 'evm-address' && best.checksum !== 'invalid' && <MultichainBalances address={best.normalized} />}
            {best.format === 'evm-tx' && <TxLocator hash={best.normalized} />}
            {detections.map((d) => {
              const chains = candidates(d);
              if (!chains.length) {
                return (
                  <Card key={d.format} title={d.label}>
                    <p className="text-sm font-semibold text-muted">{d.note ?? 'Recognised, but not on a chain Web3Lens lists yet.'}</p>
                  </Card>
                );
              }
              return (
                <section key={d.format}>
                  <h2 className="mb-3 mt-8 text-xl font-extrabold tracking-tight">
                    {detections.length > 1 ? `As a ${d.label.replace(/^[A-Z]/, (c) => c.toLowerCase())}` : `Open on ${chains.length > 1 ? 'any of these chains' : chains[0].name}`}
                  </h2>
                  <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {chains.map((c) => (
                      <ChainCard key={c.id} chain={c} query={d.normalized} detection={d} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
