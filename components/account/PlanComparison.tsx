import { Minus } from '@phosphor-icons/react/dist/ssr';
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
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-faint">
            <th className="py-2 pr-4 font-bold">Feature</th>
            <th className="py-2 pr-4 font-bold">Free</th>
            <th className="py-2 font-bold text-accent">Pro</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, free, pro]) => (
            <tr key={label} className="border-b border-line last:border-0">
              <td className="py-2.5 pr-4 font-semibold">{label}</td>
              <td className="py-2.5 pr-4 font-medium text-muted">{free ?? <Minus aria-label="Not included" weight="bold" className="size-4 text-faint" />}</td>
              <td className="py-2.5 font-bold">{pro}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

