'use client';

import {
  ArrowClockwise,
  ArrowRight,
  ArrowSquareOut,
  Binoculars,
  BookmarkSimple,
  CalendarBlank,
  ChartLineUp,
  CheckCircle,
  ClockCounterClockwise,
  CloudCheck,
  Code,
  Crown,
  Desktop,
  Detective,
  Devices,
  EnvelopeSimple,
  Gauge,
  GoogleLogo,
  IdentificationBadge,
  Info,
  Key,
  PuzzlePiece,
  Rows,
  ShieldCheck,
  SignOut,
  Sparkle,
  Star,
  Trash,
  Wallet,
  Warning,
} from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { LensArt, ProArt, ShieldArt } from '@/components/account/AccountArt';
import { PlanComparison } from '@/components/account/PlanComparison';
import { ErrorText } from '@/components/tools/ui';
import { CopyButton } from '@/components/ui/CopyButton';
import { accountCall, accountStore, refreshAccount, signInWithGoogle, signOut } from '@/lib/client/account';
import { billingLive, openCheckout, type PlanChoice } from '@/lib/client/paddle';
import { syncStore } from '@/lib/client/sync';
import { watchStore } from '@/lib/client/watches';
import { canUse, LIMITS, type MeResponse } from '@/lib/entitlements';
import { prefsStore } from '@/lib/prefs';
import { recentStore } from '@/lib/recent';
import { savedStore } from '@/lib/saved';

/* ---------- look ---------- */

const btn =
  'inline-flex h-10 items-center justify-center gap-2 rounded bg-accent px-4 text-sm font-extrabold text-ink transition-colors hover:bg-accent-hover disabled:opacity-50';
const ghost =
  'inline-flex h-10 items-center justify-center gap-2 rounded bg-ink-3 px-3.5 text-sm font-bold text-fg/90 transition-colors hover:bg-line hover:text-accent disabled:opacity-50';
const dangerGhost =
  'inline-flex h-10 items-center justify-center gap-2 rounded bg-ink-3 px-3.5 text-sm font-bold text-fg/90 transition-colors hover:bg-danger/15 hover:text-danger';
const input =
  'h-10 w-full min-w-0 rounded border border-line bg-ink px-3 text-sm font-semibold text-fg outline-none transition-colors placeholder:text-faint focus:border-accent';

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
const fmtShort = (iso: string) => new Date(iso).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
const n = (v: number) => v.toLocaleString('en-US');

function ago(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

type Icon = React.ComponentType<{ className?: string; weight?: 'bold' | 'duotone'; 'aria-hidden'?: boolean }>;

/** A borderless card with an icon header. */
function Card({
  icon: I,
  title,
  sub,
  aside,
  children,
  className = '',
  id,
}: {
  icon?: Icon;
  title?: string;
  sub?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`min-w-0 scroll-mt-28 rounded-md bg-ink-2 p-5 sm:p-6 ${className}`}>
      {title && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {I && (
              <span className="grid size-9 shrink-0 place-items-center rounded bg-accent/10 text-accent">
                <I aria-hidden weight="duotone" className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-extrabold tracking-tight sm:text-lg">{title}</h2>
              {sub && <p className="mt-0.5 text-sm font-medium text-muted">{sub}</p>}
            </div>
          </div>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

function PlanBadge({ me }: { me: MeResponse }) {
  const pro = me.tier === 'pro';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider ${pro ? 'bg-accent text-ink' : 'bg-ink-3 text-muted'}`}
    >
      {pro && <Crown aria-hidden weight="bold" className="size-3.5" />}
      {me.plan === 'lifetime' ? 'Pro · Lifetime' : me.source === 'trial' ? 'Pro trial' : pro ? 'Pro' : 'Free'}
    </span>
  );
}

function Avatar({ me, size = 'size-16' }: { me: MeResponse; size?: string }) {
  const [broken, setBroken] = useState(false);
  const initials =
    (me.user.name || me.user.email)
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?';
  return me.user.image && !broken ? (
    // eslint-disable-next-line @next/next/no-img-element -- Google profile picture, tiny and remote
    <img src={me.user.image} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={`${size} shrink-0 rounded-md object-cover`} />
  ) : (
    <span aria-hidden className={`${size} grid shrink-0 place-items-center rounded-md bg-accent text-xl font-extrabold text-ink`}>
      {initials}
    </span>
  );
}

function planLine(me: MeResponse): string {
  if (me.plan === 'lifetime') return 'Pro for life. Thank you for supporting Web3Lens.';
  if (me.tier === 'free') return 'Free plan. Lookups, explorers, tools and safety checks are all included.';
  if (me.source === 'trial') return `Pro trial until ${fmtDate(me.until)}.`;
  if (me.source === 'admin') return me.until ? `Pro (granted) until ${fmtDate(me.until)}.` : 'Pro (granted).';
  return me.renews ? `Pro. Renews on ${fmtDate(me.until)}.` : `Pro until ${fmtDate(me.until)}. It won't renew.`;
}

/* ---------- hero ---------- */

function Hero({ me, onError }: { me: MeResponse; onError: (e: string | null) => void }) {
  const [refreshing, setRefreshing] = useState(false);
  const first = (me.user.name || '').split(' ')[0];
  return (
    <section className="relative overflow-hidden rounded-md bg-ink-2">
      <div className="dot-grid pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 md:block" aria-hidden />
      <div className="relative grid grid-cols-1 items-center gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10 lg:p-10">
        <div className="min-w-0">
          <p className="label">Account</p>
          <div className="mt-4 flex flex-wrap items-center gap-5">
            <Avatar me={me} />
            <div className="min-w-0">
              <h1 className="heading text-3xl sm:text-4xl xl:text-5xl">{first ? `Hello, ${first}` : 'Your Web3Lens'}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm font-semibold text-muted">
                <span className="truncate">{me.user.email}</span>
                <PlanBadge me={me} />
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-muted">{planLine(me)}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {me.manageUrl && (
              <a href={me.manageUrl} target="_blank" rel="noopener noreferrer" className={btn}>
                Manage billing <ArrowSquareOut aria-hidden weight="bold" className="size-4" />
              </a>
            )}
            <button
              type="button"
              className={ghost}
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true);
                await refreshAccount();
                setRefreshing(false);
              }}
            >
              <ArrowClockwise aria-hidden weight="bold" className={`size-4 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing…' : 'Refresh plan'}
            </button>
            <button type="button" className={ghost} onClick={() => signOut().catch((e: Error) => onError(e.message))}>
              <SignOut aria-hidden weight="bold" className="size-4" /> Sign out
            </button>
          </div>
        </div>
        <LensArt className="hidden w-[min(100%,26rem)] justify-self-end lg:block" />
      </div>
    </section>
  );
}

/* ---------- stats ---------- */

function Stat({ icon: I, label, value, sub, href }: { icon: Icon; label: string; value: React.ReactNode; sub: React.ReactNode; href?: string }) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-extrabold uppercase tracking-wider text-faint">{label}</span>
        <I aria-hidden weight="duotone" className="size-5 text-accent" />
      </span>
      <span className="mt-3 block text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</span>
      <span className="mt-1 block truncate text-sm font-medium text-muted">{sub}</span>
    </>
  );
  const cls = 'block min-w-0 rounded-md bg-ink-2 p-4 sm:p-5';
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:bg-ink-3`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function useLocalData() {
  const saved = useSyncExternalStore(savedStore.subscribe, savedStore.getSnapshot, savedStore.getServerSnapshot);
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getServerSnapshot);
  const recent = useSyncExternalStore(recentStore.subscribe, recentStore.getSnapshot, recentStore.getServerSnapshot);
  return { saved, prefs, recent, favourites: saved.filter((s) => s.favourite).length };
}

type SessionInfo = { id: string; kind: 'web' | 'extension'; device?: string | null; createdAt: string; expiresAt: string; current: boolean };
type KeyInfo = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null };

function Stats({ me, sessions, keys }: { me: MeResponse; sessions: SessionInfo[] | null; keys: KeyInfo[] | null }) {
  const { saved } = useLocalData();
  const pro = me.tier === 'pro';
  const cap = pro ? me.limits.savedCloud : me.limits.savedLocal;
  const daysLeft = me.until ? Math.max(0, Math.ceil((new Date(me.until).getTime() - new Date(me.checkedAt).getTime()) / 86400000)) : null;
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Stat
        icon={Crown}
        label="Plan"
        value={me.plan === 'lifetime' ? 'Lifetime' : pro ? 'Pro' : 'Free'}
        sub={me.plan === 'lifetime' ? 'No end date' : pro && daysLeft !== null ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'Core features, always free'}
        href="#plan"
      />
      <Stat icon={BookmarkSimple} label="Saved items" value={n(saved.length)} sub={`of ${n(cap)} · ${pro ? 'synced' : 'in this browser'}`} href="/saved" />
      <Stat
        icon={Devices}
        label="Signed in on"
        value={sessions ? n(sessions.length) : '–'}
        sub={sessions ? `${sessions.filter((s) => s.kind === 'extension').length} extension · ${sessions.filter((s) => s.kind === 'web').length} browser` : 'Loading…'}
        href="#devices"
      />
      <Stat
        icon={Key}
        label="API keys"
        value={canUse('apiKeys', me.plan) ? (keys ? n(keys.length) : '–') : '0'}
        sub={canUse('apiKeys', me.plan) ? `${n(LIMITS.pro.apiPerDay)} requests / day` : 'Available with Pro'}
        href="#api-keys"
      />
    </div>
  );
}

/* ---------- usage ---------- */

function Meter({ icon: I, label, hint, used, limit }: { icon: Icon; label: string; hint: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="rounded bg-ink-3/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-bold">
          <I aria-hidden weight="duotone" className="size-4 text-accent" /> {label}
        </span>
        <span className="text-sm font-extrabold tabular-nums">
          {limit > 0 ? (
            <>
              {n(used)} <span className="font-semibold text-faint">/ {n(limit)}</span>
            </>
          ) : (
            <span className="text-faint">Pro only</span>
          )}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-ink" role="progressbar" aria-label={label} aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit}>
        <div className={`h-full rounded-sm ${pct >= 90 ? 'bg-redline' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs font-medium text-faint">{hint}</p>
    </div>
  );
}

function Usage({ me }: { me: MeResponse }) {
  const reset = me.usage.crossChain.resetsAt;
  return (
    <Card icon={Gauge} title="Usage today" sub={`Counters reset ${fmtShort(reset)}. Everything else has no daily limit.`}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Meter icon={Rows} label="Cross-chain batch lookups" hint="Balances across chains from Batch search" {...me.usage.crossChain} />
        <Meter icon={Code} label="API key requests" hint="Calls to /api/v1 sent with your x-api-key" {...me.usage.api} />
      </div>
    </Card>
  );
}

/* ---------- upgrade ---------- */

function Upgrade({ me, onError }: { me: MeResponse; onError: (e: string | null) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const live = billingLive();
  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    onError(null);
    try {
      await fn();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };
  if (me.plan === 'lifetime') return null;
  const subscribed = me.source === 'paddle' && me.renews;
  const options: [PlanChoice, string, string][] = [
    ['monthly', 'Monthly', 'Billed every month, cancel any time'],
    ['yearly', 'Yearly', 'Billed once a year'],
    ['lifetime', 'Lifetime', 'Pay once, Pro for good'],
  ];
  const trial = me.trial.status === 'available' && me.tier === 'free';
  return (
    <Card id="plan" icon={Sparkle} title={me.tier === 'pro' ? 'Your options' : 'Upgrade to Pro'} sub={me.tier === 'pro' ? 'Switch or lock in Pro for good.' : 'Bigger batches, cloud sync, watchlist alerts and API keys.'}>
      <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-4">
          {trial && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded bg-accent/10 p-4">
              <div>
                <p className="font-extrabold">Try Pro free for 7 days</p>
                <p className="mt-0.5 text-sm font-medium text-muted">No card needed, and nothing renews by itself.</p>
              </div>
              <button
                type="button"
                className={btn}
                disabled={!!busy}
                onClick={() =>
                  run('trial', async () => {
                    await accountCall('/api/billing/trial', 'POST');
                    await refreshAccount();
                  })
                }
              >
                {busy === 'trial' ? 'Starting…' : 'Start free trial'} <ArrowRight aria-hidden weight="bold" className="size-4" />
              </button>
            </div>
          )}
          {me.tier === 'free' && (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm font-semibold sm:grid-cols-2">
              {[
                `${n(LIMITS.pro.batch)} values per batch search`,
                `${n(LIMITS.pro.savedCloud)} saved items, synced everywhere`,
                `Watch ${n(LIMITS.pro.watches)} addresses with email alerts`,
                `${n(LIMITS.pro.apiPerDay)} API requests a day with a key`,
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle aria-hidden weight="duotone" className="size-4 shrink-0 text-accent" /> {t}
                </li>
              ))}
            </ul>
          )}
          {!live ? (
            <p className="flex items-start gap-2 text-sm font-medium text-muted">
              <Info aria-hidden weight="bold" className="mt-0.5 size-4 shrink-0 text-accent" /> Paid plans open soon. Your account is ready for them.
            </p>
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {options
                  .filter(([plan]) => !subscribed || plan === 'lifetime')
                  .map(([plan, title, body]) => (
                    <li key={plan} className="flex flex-col rounded bg-ink-3/60 p-4">
                      <span className="font-extrabold">{title}</span>
                      <span className="mt-1 flex-1 text-sm font-medium text-muted">{body}</span>
                      <button type="button" className={`${plan === 'yearly' ? btn : ghost} mt-4`} disabled={!!busy} onClick={() => run(plan, () => openCheckout(plan))}>
                        {busy === plan ? 'Opening…' : `Choose ${title.toLowerCase()}`}
                      </button>
                    </li>
                  ))}
              </ul>
              <p className="text-xs font-medium text-faint">Prices, tax and currency are shown in the secure Paddle checkout before you pay. Paddle is the merchant of record.</p>
            </>
          )}
        </div>
        <ProArt className="hidden w-44 md:block" />
      </div>
    </Card>
  );
}

/* ---------- tools ---------- */

function Tools({ me }: { me: MeResponse }) {
  const tools: [string, string, string, Icon, boolean][] = [
    ['/saved', 'Saved and collections', me.tier === 'pro' ? 'Synced across devices and the extension' : 'Labels and notes in this browser', BookmarkSimple, false],
    ['/batch', 'Batch search', `Up to ${n(me.limits.batch)} values at once`, Rows, false],
    ['/watchlist', 'Watchlist', 'Email alerts when watched addresses move', Binoculars, true],
    ['/portfolio', 'Portfolio', 'Saved EVM addresses added up across chains', Wallet, true],
    ['/investigate', 'Investigations', 'Case files of linked addresses and notes', Detective, true],
    ['/extension', 'Browser extension', 'Look up anything from the toolbar', PuzzlePiece, false],
  ];
  const pro = me.tier === 'pro';
  return (
    <Card icon={ChartLineUp} title="Your tools" sub="Everything your account unlocks, one click away.">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {tools.map(([href, title, body, I, needsPro]) => (
          <li key={href}>
            <Link href={href} className="group flex h-full items-start gap-3 rounded bg-ink-3/60 p-4 transition-colors hover:bg-ink-3">
              <I aria-hidden weight="duotone" className="mt-0.5 size-6 shrink-0 text-accent" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-extrabold">
                  {title}
                  {needsPro && !pro && <span className="rounded-sm bg-accent/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent">Pro</span>}
                </span>
                <span className="mt-0.5 block text-sm font-medium text-muted">{body}</span>
              </span>
              <ArrowRight aria-hidden weight="bold" className="mt-1 size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------- API keys ---------- */

function ApiKeys({ me, keys, reload, onError }: { me: MeResponse; keys: KeyInfo[] | null; reload: () => Promise<void>; onError: (e: string | null) => void }) {
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const allowed = canUse('apiKeys', me.plan);
  if (!allowed && !keys?.length) {
    return me.billing ? (
      <Card id="api-keys" icon={Key} title="API keys" sub="Pro">
        <p className="text-sm font-medium text-muted">
          API keys give your scripts {n(LIMITS.pro.apiPerDay)} requests a day to the Web3Lens API, outside the shared per-IP limit.{' '}
          <Link href="/pricing" className="font-bold text-accent underline underline-offset-2">
            See Pro
          </Link>
        </p>
      </Card>
    ) : null;
  }
  return (
    <Card id="api-keys" icon={Key} title="API keys" sub={`${n(LIMITS.pro.apiPerDay)} requests per day across all your keys.`}>
      <p className="mb-4 rounded bg-ink p-3 text-sm font-medium text-muted">
        Send the key as <code className="font-mono text-[13px] text-fg">x-api-key</code> to <code className="font-mono text-[13px] text-fg">https://web3lens.com/api/v1/…</code>. Responses carry{' '}
        <code className="font-mono text-[13px] text-fg">x-ratelimit-remaining</code>.
      </p>
      {fresh && (
        <div className="mb-4 rounded bg-accent/10 p-4">
          <p className="text-sm font-bold">Copy your new key now. It won&apos;t be shown again.</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded bg-ink px-3 py-2 font-mono text-[13px]">{fresh}</code>
            <CopyButton value={fresh} label="Copy API key" />
          </div>
        </div>
      )}
      {keys && keys.length > 0 && (
        <ul className="mb-4 space-y-2">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 rounded bg-ink-3/60 px-4 py-3">
              <span className="min-w-0 text-sm">
                <span className="font-bold">{k.name || 'Unnamed key'}</span> <code className="font-mono text-[13px] text-muted">w3l_{k.prefix}_…</code>
                <span className="block font-medium text-muted">
                  Created {fmtDate(k.createdAt)} · {k.lastUsedAt ? `last used ${fmtDate(k.lastUsedAt)}` : 'never used'}
                </span>
              </span>
              <button
                type="button"
                className={dangerGhost}
                onClick={async () => {
                  if (!window.confirm(`Revoke "${k.name || 'this key'}"? Requests using it stop working at once.`)) return;
                  try {
                    await accountCall(`/api/account/keys?id=${encodeURIComponent(k.id)}`, 'DELETE');
                    await reload();
                  } catch (e) {
                    onError(e instanceof Error ? e.message : 'Could not revoke the key.');
                  }
                }}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
      {allowed && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            onError(null);
            try {
              const r = await accountCall<{ key: string }>('/api/account/keys', 'POST', { name });
              setFresh(r.key);
              setName('');
              await reload();
            } catch (err) {
              onError(err instanceof Error ? err.message : 'Could not create a key.');
            }
          }}
        >
          <label htmlFor="key-name" className="sr-only">
            Key name
          </label>
          <input id="key-name" className={`${input} max-w-xs`} placeholder="Name, e.g. Reconciliation script" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className={btn}>
            Create key
          </button>
        </form>
      )}
    </Card>
  );
}

/* ---------- side column ---------- */

function Row({ icon: I, label, children }: { icon: Icon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <I aria-hidden weight="duotone" className="size-5 shrink-0 text-faint" />
      <span className="w-28 shrink-0 text-sm font-semibold text-faint">{label}</span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right text-sm font-bold">{children}</span>
    </div>
  );
}

function Details({ me }: { me: MeResponse }) {
  const trial = me.trial.status === 'active' ? `Active until ${fmtDate(me.trial.endsAt)}` : me.trial.status === 'used' ? 'Used' : 'Available';
  const source = { paddle: 'Subscription', admin: 'Granted', trial: 'Free trial', none: 'Free' }[me.source];
  return (
    <Card icon={IdentificationBadge} title="Account details">
      <div className="-my-2.5">
        <Row icon={IdentificationBadge} label="Name">
          <span className="truncate">{me.user.name || '—'}</span>
        </Row>
        <Row icon={EnvelopeSimple} label="Email">
          <span className="truncate">{me.user.email}</span>
        </Row>
        <Row icon={GoogleLogo} label="Sign-in">
          Google
        </Row>
        {me.user.createdAt && (
          <Row icon={CalendarBlank} label="Member since">
            {fmtDate(me.user.createdAt)}
          </Row>
        )}
        <Row icon={Crown} label="Plan source">
          {source}
        </Row>
        <Row icon={Sparkle} label="Pro trial">
          {trial}
        </Row>
        <Row icon={ClockCounterClockwise} label="Plan checked">
          {fmtShort(me.checkedAt)}
        </Row>
        <Row icon={Code} label="Account ID">
          <code className="truncate font-mono text-xs text-muted">{me.user.id}</code>
          <CopyButton value={me.user.id} label="Copy account ID" />
        </Row>
      </div>
    </Card>
  );
}

function Sessions({ list, reload, onError }: { list: SessionInfo[] | null; reload: () => Promise<void>; onError: (e: string | null) => void }) {
  return (
    <Card id="devices" icon={Devices} title="Signed-in devices" sub="Browsers and extensions using your account.">
      {!list ? (
        <p className="text-sm font-medium text-muted">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {list.map((s) => {
            const I = s.kind === 'extension' ? PuzzlePiece : Desktop;
            return (
              <li key={s.id} className="flex items-center gap-3 rounded bg-ink-3/60 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded bg-ink text-accent">
                  <I aria-hidden weight="duotone" className="size-5" />
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="flex flex-wrap items-center gap-2 font-bold">
                    {s.kind === 'extension' ? 'Browser extension' : (s.device ?? 'Website')}
                    {s.current && <span className="rounded-sm bg-accent/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent">This browser</span>}
                  </span>
                  <span className="block font-medium text-muted">Signed in {fmtDate(s.createdAt)}</span>
                </span>
                {!s.current && (
                  <button
                    type="button"
                    className={`${dangerGhost} h-8 px-2.5 text-xs`}
                    onClick={async () => {
                      try {
                        await accountCall(`/api/account/sessions?id=${encodeURIComponent(s.id)}`, 'DELETE');
                        await reload();
                      } catch (e) {
                        onError(e instanceof Error ? e.message : 'Could not sign it out.');
                      }
                    }}
                  >
                    Sign out
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function ThisBrowser({ me }: { me: MeResponse }) {
  const { saved, prefs, recent, favourites } = useLocalData();
  const sync = useSyncExternalStore(syncStore.subscribe, syncStore.getSnapshot, syncStore.getServerSnapshot);
  const watches = useSyncExternalStore(watchStore.subscribe, watchStore.getSnapshot, watchStore.getServerSnapshot);
  const pro = me.tier === 'pro';
  const items: [Icon, string, string][] = [
    [BookmarkSimple, 'Saved items', n(saved.length)],
    [Star, 'Favourites', n(favourites)],
    [Star, 'Favourite chains', n(prefs.favouriteChains.length)],
    [ClockCounterClockwise, 'Recent searches', n(recent.length)],
  ];
  if (canUse('watchlist', me.plan)) items.push([Binoculars, 'Watched addresses', watches ? `${n(watches.length)} / ${n(me.limits.watches)}` : '–']);
  return (
    <Card icon={CloudCheck} title="Your data" sub={pro ? 'Saved items sync with your account.' : 'Kept only in this browser.'}>
      <dl className="grid grid-cols-2 gap-2">
        {items.map(([I, label, value]) => (
          <div key={label} className="rounded bg-ink-3/60 p-3">
            <dt className="flex items-center gap-1.5 text-xs font-bold text-faint">
              <I aria-hidden weight="duotone" className="size-4" /> {label}
            </dt>
            <dd className="mt-1 text-xl font-extrabold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted">
        {pro ? (
          <>
            <CloudCheck aria-hidden weight="bold" className={`size-4 ${sync.status === 'error' ? 'text-redline' : 'text-accent'}`} />
            {sync.status === 'syncing'
              ? 'Syncing…'
              : sync.status === 'error'
                ? (sync.message ?? 'Sync failed. It retries shortly.')
                : sync.lastSyncAt
                  ? `Synced ${ago(sync.lastSyncAt)}`
                  : 'Sync starts when you save something.'}
          </>
        ) : (
          <>
            <Info aria-hidden weight="bold" className="size-4 text-accent" /> Export or import them on the{' '}
            <Link href="/saved" className="font-bold text-accent underline underline-offset-2">
              Saved
            </Link>{' '}
            page.
          </>
        )}
      </p>
    </Card>
  );
}

function Privacy() {
  return (
    <section className="flex items-center gap-4 rounded-md bg-accent/[0.07] p-5">
      <ShieldArt className="size-16 shrink-0" />
      <div>
        <p className="flex items-center gap-1.5 font-extrabold">
          <ShieldCheck aria-hidden weight="bold" className="size-4 text-accent" /> Your keys stay yours
        </p>
        <p className="mt-1 text-sm font-medium text-muted">
          We keep your name, email and plan. Never wallet keys, seed phrases or what you search.{' '}
          <Link href="/privacy-policy" className="font-bold text-accent underline underline-offset-2">
            Privacy
          </Link>
        </p>
      </div>
    </section>
  );
}

function DangerZone({ me }: { me: MeResponse }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Card icon={Warning} title="Delete account" sub="Permanent. This can't be undone.">
      <p className="text-sm font-medium text-muted">
        Removes your account, sign-ins and usage from Web3Lens. Saved items in this browser stay where they are. Cancel any subscription under Manage billing first.
      </p>
      {!open ? (
        <button type="button" className={`${dangerGhost} mt-4`} onClick={() => setOpen(true)}>
          <Trash aria-hidden weight="bold" className="size-4" /> Delete my account…
        </button>
      ) : (
        <form
          className="mt-4 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              await accountCall('/api/account', 'DELETE', { confirmEmail: email });
              await refreshAccount();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not delete the account.');
            }
          }}
        >
          <label className="sr-only" htmlFor="confirm-email">
            Type {me.user.email} to confirm
          </label>
          <input id="confirm-email" className={input} placeholder={`Type ${me.user.email}`} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded bg-danger px-4 text-sm font-extrabold text-ink disabled:opacity-50"
              disabled={email.trim().toLowerCase() !== me.user.email.toLowerCase()}
            >
              Delete permanently
            </button>
            <button type="button" className={ghost} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
        </form>
      )}
    </Card>
  );
}

/* ---------- signed out / unavailable ---------- */

function Welcome({ children, title, lead }: { children?: React.ReactNode; title: string; lead: string }) {
  return (
    <section className="relative overflow-hidden rounded-md bg-ink-2">
      <div className="dot-grid pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 md:block" aria-hidden />
      <div className="relative grid grid-cols-1 items-center gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:p-12">
        <div className="min-w-0 max-w-2xl">
          <p className="label">Account</p>
          <h1 className="heading mt-4 text-4xl sm:text-5xl xl:text-[3.5rem]">{title}</h1>
          <p className="mt-5 text-lg font-medium leading-relaxed text-muted">{lead}</p>
          {children}
        </div>
        <LensArt className="w-full max-w-md justify-self-center lg:w-[28rem]" />
      </div>
    </section>
  );
}

function Perks() {
  const perks: [Icon, string, string][] = [
    [Sparkle, '7-day Pro trial', 'No card needed, and nothing renews by itself.'],
    [CloudCheck, 'Sync everywhere', 'Saved items follow you across browsers and the extension.'],
    [Binoculars, 'Watchlist alerts', 'An email when a watched address moves.'],
    [Key, 'API keys', `${n(LIMITS.pro.apiPerDay)} requests a day for your scripts.`],
  ];
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {perks.map(([I, title, body]) => (
        <li key={title} className="rounded-md bg-ink-2 p-5">
          <span className="grid size-10 place-items-center rounded bg-accent/10 text-accent">
            <I aria-hidden weight="duotone" className="size-6" />
          </span>
          <p className="mt-4 font-extrabold">{title}</p>
          <p className="mt-1 text-sm font-medium text-muted">{body}</p>
        </li>
      ))}
    </ul>
  );
}

/* ---------- page ---------- */

export function AccountPanel() {
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [keys, setKeys] = useState<KeyInfo[] | null>(null);
  const signedIn = account.status === 'signedIn';

  const loadSessions = () =>
    accountCall<{ sessions: SessionInfo[] }>('/api/account/sessions', 'GET')
      .then((r) => setSessions([...r.sessions].sort((a, b) => Number(b.current) - Number(a.current))))
      .catch(() => setSessions([]));
  const loadKeys = () =>
    accountCall<{ keys: KeyInfo[] }>('/api/account/keys', 'GET')
      .then((r) => setKeys(r.keys))
      .catch(() => setKeys([]));

  useEffect(() => {
    if (!signedIn) return;
    void loadSessions();
    void loadKeys();
  }, [signedIn]);

  // After checkout, the webhook may land a few seconds later: poll every 3 s for up to 90 s.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('purchased')) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of the return URL
    setWaiting(true);
    let tries = 0;
    const t = window.setInterval(async () => {
      tries++;
      await refreshAccount();
      const s = accountStore.getSnapshot();
      if ((s.status === 'signedIn' && s.me.tier === 'pro') || tries >= 30) {
        window.clearInterval(t);
        setWaiting(false);
        window.history.replaceState(null, '', '/account');
      }
    }, 3000);
    return () => window.clearInterval(t);
  }, []);

  if (account.status === 'loading') {
    return (
      <div className="space-y-4" aria-busy>
        <h1 className="sr-only">Your Web3Lens account</h1>
        <div className="h-64 animate-pulse rounded-md bg-ink-2" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-md bg-ink-2" />
          ))}
        </div>
      </div>
    );
  }

  if (account.status === 'unavailable') {
    return (
      <div className="space-y-4">
        <Welcome title="Accounts are coming soon" lead="Sign-in isn't switched on yet. Everything on Web3Lens works without an account." />
        <Card icon={Crown} title="Free and Pro">
          <PlanComparison />
        </Card>
      </div>
    );
  }

  if (account.status === 'signedOut') {
    return (
      <div className="space-y-4">
        <Welcome
          title="Your Web3Lens account"
          lead="Optional. Search, explorers, developer tools and safety checks stay free and work without signing in. Sign in to see your plan, start the Pro trial or connect the extension."
        >
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" className={`${btn} h-12 px-5 text-[15px]`} onClick={() => signInWithGoogle('/account').catch((e: Error) => setError(e.message))}>
              <GoogleLogo aria-hidden weight="bold" className="size-5" /> Continue with Google
            </button>
            <Link href="/pricing" className={`${ghost} h-12 px-5 text-[15px]`}>
              See Pro
            </Link>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-faint">
            <ShieldCheck aria-hidden weight="bold" className="size-4 text-accent" /> We receive your name, email and profile picture from Google. Never wallet keys or seed phrases.
          </p>
          {error && (
            <div className="mt-3">
              <ErrorText>{error}</ErrorText>
            </div>
          )}
        </Welcome>
        <Perks />
        <Card icon={Crown} title="Free and Pro" sub="The same limits the server enforces.">
          <PlanComparison />
        </Card>
      </div>
    );
  }

  const { me } = account;
  return (
    <div className="space-y-4">
      {waiting && (
        <p role="status" className="flex items-center gap-2 rounded-md bg-accent/10 p-4 text-sm font-semibold">
          <ArrowClockwise aria-hidden weight="bold" className="size-4 animate-spin text-accent" /> Thanks! Confirming your payment with Paddle. This usually takes a few seconds.
        </p>
      )}
      {error && (
        <div className="rounded-md bg-danger/10 p-4">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      <Hero me={me} onError={setError} />
      <Stats me={me} sessions={sessions} keys={keys} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="min-w-0 space-y-4 xl:col-span-8">
          <Usage me={me} />
          <Upgrade me={me} onError={setError} />
          <Tools me={me} />
          <ApiKeys me={me} keys={keys} reload={loadKeys} onError={setError} />
          <Card
            icon={Crown}
            title="Free and Pro"
            sub={me.tier === 'pro' ? 'You have every Pro limit.' : 'The same limits the server enforces.'}
            aside={me.tier === 'pro' ? <CheckCircle aria-hidden weight="duotone" className="size-6 text-accent" /> : undefined}
          >
            <PlanComparison />
          </Card>
        </div>
        <aside className="min-w-0 space-y-4 xl:col-span-4">
          <Details me={me} />
          <Sessions list={sessions} reload={loadSessions} onError={setError} />
          <ThisBrowser me={me} />
          <Privacy />
          <DangerZone me={me} />
        </aside>
      </div>
    </div>
  );
}
