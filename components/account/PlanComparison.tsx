import { Check, Minus } from '@phosphor-icons/react/dist/ssr';
import { LIMITS } from '@/lib/entitlements';

/** Free vs Pro, from the same numbers the server enforces (lib/entitlements.ts). */
export function PlanComparison() {
  const f = LIMITS.free;
  const p = LIMITS.pro;
  const n = (v: number) => v.toLocaleString('en-US');
  const rows: [string, React.ReactNode, React.ReactNode][] = [
    ['Address, transaction and block lookups', 'Included', 'Included'],
    ['Developer tools, gas tracker, basic security checks', 'Included', 'Included'],
    ['Batch search', `${n(f.batch)} values`, `${n(p.batch)} values`],
    ['Batch EVM balances', `${n(f.batchBalances)} rows`, `${n(p.batchBalances)} rows`],
    ['Cross-chain balance lookups in batches', `${n(f.crossChainPerDay)} / day`, `${n(p.crossChainPerDay)} / day`],
    ['Public API', `${n(f.apiPerMinuteShared)} / min per IP, no key`, `Same, plus ${n(p.apiPerDay)} / day with a key`],
    ['Saved addresses, labels and notes', `${n(f.savedLocal)} in this browser`, `${n(p.savedCloud)}, synced across devices and extensions`],
    ['Collections of saved addresses', null, 'Included'],
    ['Investigations saved to your account', null, n(p.investigations)],
    ['Batch and investigation exports', 'CSV', 'CSV and JSON'],
    ['API keys', null, 'Up to 5'],
    ['Watchlist with activity alerts (email)', null, `${n(p.watches)} addresses`],
    ['Portfolio view of saved addresses', null, 'Included'],
  ];
  const cell = (v: React.ReactNode, pro: boolean) =>
    v === null ? (
      <Minus aria-label="Not included" weight="bold" className="size-4 text-faint" />
    ) : v === 'Included' ? (
      <span className="inline-flex items-center gap-1.5">
        <Check aria-hidden weight="bold" className={`size-4 ${pro ? 'text-accent' : 'text-muted'}`} /> Included
      </span>
    ) : (
      v
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-faint">
            <th className="px-3 py-2 font-extrabold">Feature</th>
            <th className="px-3 py-2 font-extrabold">Free</th>
            <th className="px-3 py-2 font-extrabold text-accent">Pro</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, free, pro]) => (
            <tr key={label} className="odd:bg-ink-3/60">
              <td className="rounded-l-sm px-3 py-2.5 font-semibold">{label}</td>
              <td className="px-3 py-2.5 font-medium text-muted">{cell(free, false)}</td>
              <td className="rounded-r-sm px-3 py-2.5 font-bold">{cell(pro, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
