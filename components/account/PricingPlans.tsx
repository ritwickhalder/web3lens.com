'use client';

import { Check, Crown } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { btnCls, ErrorText, ghostBtnCls } from '@/components/tools/ui';
import { accountStore, signInWithGoogle } from '@/lib/client/account';
import { billingLive, loadPaddle, openCheckout, PRICE_IDS, type PlanChoice } from '@/lib/client/paddle';
import { LIMITS } from '@/lib/entitlements';

const n = (v: number) => v.toLocaleString('en-US');

const FREE = [
  'Search any address, transaction, block or name on 700+ chains',
  'Native result pages, risk checks and OFAC screening',
  'Developer tools and the gas tracker',
  `Batch search of ${n(LIMITS.free.batch)} values, balances for ${n(LIMITS.free.batchBalances)}`,
  `${n(LIMITS.free.savedLocal)} saved addresses in your browser`,
  'CSV export and shareable investigation links',
];

const PRO = [
  'Everything in Free',
  `Batch search of ${n(LIMITS.pro.batch)} values with balances for all of them`,
  `${n(LIMITS.pro.crossChainPerDay)} cross-chain balance lookups a day`,
  `${n(LIMITS.pro.savedCloud)} saved addresses, synced across devices and the extension`,
  'Collections to organise saved addresses',
  `${n(LIMITS.pro.investigations)} investigations saved to your account`,
  'JSON export of batches and investigations',
  `API keys: ${n(LIMITS.pro.apiPerDay)} requests a day`,
  `Watchlist of ${n(LIMITS.pro.watches)} addresses with activity alerts`,
  'Portfolio view across 11 EVM chains',
];

/** Localised prices from Paddle (tax and currency for the visitor's country); null until loaded or when not live. */
function usePrices(): Record<PlanChoice, string> | null {
  const [prices, setPrices] = useState<Record<PlanChoice, string> | null>(null);
  useEffect(() => {
    if (!billingLive()) return;
    let alive = true;
    void loadPaddle()
      .then((p) =>
        p?.PricePreview({ items: (['monthly', 'yearly', 'lifetime'] as const).map((k) => ({ priceId: PRICE_IDS[k], quantity: 1 })) }).then((r) => {
          const by = Object.fromEntries(r.data.details.lineItems.map((li) => [li.price.id, li.formattedTotals.total]));
          if (alive) setPrices({ monthly: by[PRICE_IDS.monthly] ?? '', yearly: by[PRICE_IDS.yearly] ?? '', lifetime: by[PRICE_IDS.lifetime] ?? '' });
        }),
      )
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return prices;
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((x) => (
        <li key={x} className="flex items-start gap-2.5 text-[15px] font-semibold">
          <Check aria-hidden weight="bold" className="mt-1 size-4 shrink-0 text-accent" />
          {x}
        </li>
      ))}
    </ul>
  );
}

export function PricingPlans() {
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prices = usePrices();
  const live = billingLive();
  const me = account.status === 'signedIn' ? account.me : null;
  const isPro = me?.tier === 'pro';

  async function buy(plan: PlanChoice) {
    setError(null);
    setBusy(plan);
    try {
      if (account.status !== 'signedIn') {
        const ok = await signInWithGoogle('/pricing');
        if (!ok) return;
      }
      await openCheckout(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The checkout could not open.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="flex flex-col rounded-2xl border border-line bg-ink-2 p-6 sm:p-8">
          <p className="label">Free</p>
          <p className="mt-3 text-4xl font-extrabold tracking-tight">$0</p>
          <p className="mt-1 text-sm font-semibold text-muted">No account needed. Safety stays free for everyone.</p>
          <div className="mt-6 flex-1">
            <List items={FREE} />
          </div>
          <Link href="/" className={`${ghostBtnCls} mt-8 justify-center`}>
            Start searching
          </Link>
        </section>

        <section className="flex flex-col rounded-2xl border-2 border-accent bg-ink-2 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label flex items-center gap-1.5">
              <Crown aria-hidden weight="bold" className="size-4" /> Pro
            </p>
            <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-lg border border-line p-0.5">
              {(['monthly', 'yearly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={period === p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1 text-sm font-bold ${period === p ? 'bg-accent text-ink' : 'text-muted hover:text-fg'}`}
                >
                  {p === 'monthly' ? 'Monthly' : 'Yearly'}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-4xl font-extrabold tracking-tight">
            {prices?.[period] || (live ? '…' : 'Soon')}
            {prices?.[period] && <span className="text-base font-bold text-muted"> / {period === 'monthly' ? 'month' : 'year'}</span>}
          </p>
          <p className="mt-1 text-sm font-semibold text-muted">
            {live ? 'Prices include tax where it applies. Cancel any time from Manage billing.' : 'Pro opens soon. Everything in Free works today.'}
          </p>
          <div className="mt-6 flex-1">
            <List items={PRO} />
          </div>
          {isPro ? (
            <Link href="/account" className={`${btnCls} mt-8 justify-center`}>
              You have Pro · Manage
            </Link>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" className={`${btnCls} justify-center`} disabled={!live || !!busy} onClick={() => void buy(period)}>
                {busy === period ? 'Opening…' : `Get Pro ${period === 'monthly' ? 'monthly' : 'yearly'}`}
              </button>
              <button type="button" className={`${ghostBtnCls} justify-center`} disabled={!live || !!busy} onClick={() => void buy('lifetime')}>
                {busy === 'lifetime' ? 'Opening…' : `Lifetime${prices?.lifetime ? ` · ${prices.lifetime} once` : ''}`}
              </button>
            </div>
          )}
          {!isPro && me?.trial.status === 'available' && live && (
            <p className="mt-3 text-sm font-semibold text-muted">
              Not sure yet? <Link href="/account" className="text-accent underline underline-offset-2">Try Pro free for 7 days</Link>, no card needed.
            </p>
          )}
          {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
        </section>
      </div>
    </div>
  );
}
