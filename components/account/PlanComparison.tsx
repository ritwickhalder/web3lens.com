import { Check, Minus } from '@phosphor-icons/react/dist/ssr';
import { LIMITS } from '@/lib/entitlements';
import { formatNumber } from '@/lib/i18n/config';
import { getLocale, getTx } from '@/lib/i18n/server';

/** Free vs Pro, from the same numbers the server enforces (lib/entitlements.ts). */
export function PlanComparison() {
  const f = LIMITS.free;
  const p = LIMITS.pro;
  const tx = getTx();
  const locale = getLocale();
  const n = (v: number) => formatNumber(v, locale);
  const INCLUDED = 'Included';
  const rows: [string, React.ReactNode, React.ReactNode][] = [
    ['Address, transaction and block lookups', INCLUDED, INCLUDED],
    ['Developer tools, gas tracker, basic security checks', INCLUDED, INCLUDED],
    ['Batch search', tx('{count} values', { count: n(f.batch) }), tx('{count} values', { count: n(p.batch) })],
    ['Batch EVM balances', tx('{count} rows', { count: n(f.batchBalances) }), tx('{count} rows', { count: n(p.batchBalances) })],
    ['Cross-chain balance lookups in batches', tx('{count} / day', { count: n(f.crossChainPerDay) }), tx('{count} / day', { count: n(p.crossChainPerDay) })],
    ['Public API', tx('{count} / min per IP, no key', { count: n(f.apiPerMinuteShared) }), tx('Same, plus {count} / day with a key', { count: n(p.apiPerDay) })],
    ['Saved addresses, labels and notes', tx('{count} in this browser', { count: n(f.savedLocal) }), tx('{count}, synced across devices and extensions', { count: n(p.savedCloud) })],
    ['Collections of saved addresses', null, INCLUDED],
    ['Investigations saved to your account', null, n(p.investigations)],
    ['Batch and investigation exports', 'CSV', tx('CSV and JSON')],
    ['API keys', null, tx('Up to 5')],
    ['Watchlist with activity alerts (email)', null, tx('{count} addresses', { count: n(p.watches) })],
    ['Portfolio view of saved addresses', null, INCLUDED],
  ];
  const cell = (v: React.ReactNode, pro: boolean) =>
    v === null ? (
      <Minus aria-label={tx('Not included')} weight="bold" className="size-4 text-faint" />
    ) : v === INCLUDED ? (
      <span className="inline-flex items-center gap-1.5">
        <Check aria-hidden weight="bold" className={`size-4 ${pro ? 'text-accent' : 'text-muted'}`} /> {tx('Included')}
      </span>
    ) : (
      v
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-faint">
            <th className="px-3 py-2 font-extrabold">{tx('Feature')}</th>
            <th className="px-3 py-2 font-extrabold">Free</th>
            <th className="px-3 py-2 font-extrabold text-accent">Pro</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, free, pro]) => (
            <tr key={label} className="odd:bg-ink-3/60">
              <td className="rounded-l-sm px-3 py-2.5 font-semibold">{tx(label)}</td>
              <td className="px-3 py-2.5 font-medium text-muted">{cell(free, false)}</td>
              <td className="rounded-r-sm px-3 py-2.5 font-bold">{cell(pro, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
