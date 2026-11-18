'use client';

import { Check, Crown } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { btnCls, ErrorText, ghostBtnCls } from '@/components/tools/ui';
import { accountStore, signInWithGoogle } from '@/lib/client/account';
import { billingLive, loadPaddle, openCheckout, PRICE_IDS, type PlanChoice } from '@/lib/client/paddle';
import { LIMITS } from '@/lib/entitlements';
import { useLocale, useTx } from '@/lib/i18n/client';
import { formatNumber, localizePath } from '@/lib/i18n/config';

/** Plan features in English (the translation key) with `{n}`-style numbers filled in per language. */
type Line = [string, Record<string, number>?];

const FREE: Line[] = [
  ['Search any address, transaction, block or name on 700+ chains'],
  ['Native result pages, risk checks and OFAC screening'],
  ['Developer tools and the gas tracker'],
  ['Batch search of {batch} values, balances for {balances}', { batch: LIMITS.free.batch, balances: LIMITS.free.batchBalances }],
  ['{count} saved addresses in your browser', { count: LIMITS.free.savedLocal }],
  ['CSV export and shareable investigation links'],
];

const PRO: Line[] = [
  ['Everything in Free'],
  ['Batch search of {batch} values with balances for all of them', { batch: LIMITS.pro.batch }],
  ['{count} cross-chain balance lookups a day', { count: LIMITS.pro.crossChainPerDay }],
  ['{count} saved addresses, synced across devices and the extension', { count: LIMITS.pro.savedCloud }],
  ['Collections to organise saved addresses'],
  ['{count} investigations saved to your account', { count: LIMITS.pro.investigations }],
  ['JSON export of batches and investigations'],
  ['API keys: {count} requests a day', { count: LIMITS.pro.apiPerDay }],
  ['Watchlist of {count} addresses with activity alerts', { count: LIMITS.pro.watches }],
  ['Portfolio view across 11 EVM chains'],
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

function List({ items }: { items: Line[] }) {
  const tx = useTx();
  const locale = useLocale();
  return (
    <ul className="space-y-2.5">
      {items.map(([text, nums]) => (
        <li key={text} className="flex items-start gap-2.5 text-[15px] font-semibold">
          <Check aria-hidden weight="bold" className="mt-1 size-4 shrink-0 text-accent" />
          {tx(text, nums && Object.fromEntries(Object.entries(nums).map(([k, v]) => [k, formatNumber(v, locale)])))}
        </li>
      ))}
    </ul>
  );
}

export function PricingPlans() {
  const tx = useTx();
  const locale = useLocale();
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
        // Come back to this page in this language after signing in.
        const ok = await signInWithGoogle(localizePath('/pricing', locale));
        if (!ok) return;
      }
      await openCheckout(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : tx('The checkout could not open.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="flex flex-col rounded-xl border border-line bg-ink-2 p-5 sm:p-6">
          <p className="label">Free</p>
          <p className="mt-3 text-4xl font-extrabold tracking-tight">$0</p>
          <p className="mt-1 text-sm font-semibold text-muted">{tx('No account needed. Safety stays free for everyone.')}</p>
          <div className="mt-6 flex-1">
            <List items={FREE} />
          </div>
          <Link href="/" className={`${ghostBtnCls} mt-8 justify-center`}>
            {tx('Start searching')}
          </Link>
        </section>

        <section className="flex flex-col rounded-xl border-2 border-accent bg-ink-2 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="label flex items-center gap-1.5">
              <Crown aria-hidden weight="bold" className="size-4" /> Pro
            </p>
            <div role="radiogroup" aria-label={tx('Billing period')} className="inline-flex rounded-lg border border-line p-0.5">
              {(['monthly', 'yearly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={period === p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1 text-sm font-bold ${period === p ? 'bg-accent text-ink' : 'text-muted hover:text-fg'}`}
                >
                  {p === 'monthly' ? tx('Monthly') : tx('Yearly')}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-4xl font-extrabold tracking-tight">
            {prices?.[period] || (live ? '…' : tx('Soon'))}
            {prices?.[period] && <span className="text-base font-bold text-muted"> / {period === 'monthly' ? tx('month') : tx('year')}</span>}
          </p>
          <p className="mt-1 text-sm font-semibold text-muted">
            {live ? tx('Prices include tax where it applies. Cancel any time from Manage billing.') : tx('Pro opens soon. Everything in Free works today.')}
          </p>
          <div className="mt-6 flex-1">
            <List items={PRO} />
          </div>
          {isPro ? (
            <Link href="/account" className={`${btnCls} mt-8 justify-center`}>
              {tx('You have Pro · Manage')}
            </Link>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" className={`${btnCls} justify-center`} disabled={!live || !!busy} onClick={() => void buy(period)}>
                {busy === period ? tx('Opening…') : period === 'monthly' ? tx('Get Pro monthly') : tx('Get Pro yearly')}
              </button>
              <button type="button" className={`${ghostBtnCls} justify-center`} disabled={!live || !!busy} onClick={() => void buy('lifetime')}>
                {busy === 'lifetime' ? tx('Opening…') : prices?.lifetime ? tx('Lifetime · {price} once', { price: prices.lifetime }) : tx('Lifetime')}
              </button>
            </div>
          )}
          {!isPro && me?.trial.status === 'available' && live && (
            <p className="mt-3 text-sm font-semibold text-muted">
              {tx.rich('Not sure yet? <trial>Try Pro free for 7 days</trial>, no card needed.', {
                trial: (c) => (
                  <Link href="/account" className="text-accent underline underline-offset-2">
                    {c}
                  </Link>
                ),
              })}
            </p>
          )}
          {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
        </section>
      </div>
    </div>
  );
}
