'use client';

import { ArrowSquareOut, CheckCircle, Crown, GoogleLogo, Info } from '@phosphor-icons/react/dist/ssr';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { btnCls, ErrorText, ghostBtnCls, inputCls, Panel } from '@/components/tools/ui';
import { accountCall, accountStore, refreshAccount, signInWithGoogle, signOut } from '@/lib/client/account';
import { billingLive, openCheckout, type PlanChoice } from '@/lib/client/paddle';
import { PlanComparison } from '@/components/account/PlanComparison';
import { ProNote } from '@/components/account/ProNote';
import { canUse, LIMITS, type MeResponse } from '@/lib/entitlements';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '');

function Meter({ label, used, limit, resetsAt }: { label: string; used: number; limit: number; resetsAt: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-bold">{label}</span>
        <span className="font-semibold text-muted">
          {limit > 0 ? `${used.toLocaleString('en-US')} of ${limit.toLocaleString('en-US')}` : 'Pro only'}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-3" role="progressbar" aria-label={label} aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit}>
        <div className={`h-full rounded-full ${pct >= 90 ? 'bg-redline' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
      </div>
      {limit > 0 && <p className="mt-1 text-xs font-medium text-faint">Resets {new Date(resetsAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</p>}
    </div>
  );
}

function planLine(me: MeResponse): string {
  if (me.plan === 'lifetime') return 'Pro for life. Thank you for supporting Web3Lens.';
  if (me.tier === 'free') return 'Free plan. Lookups, explorers, tools and safety checks are all included.';
  if (me.source === 'trial') return `Pro trial until ${fmtDate(me.until)}.`;
  if (me.source === 'admin') return me.until ? `Pro (granted) until ${fmtDate(me.until)}.` : 'Pro (granted).';
  return me.renews ? `Pro. Renews on ${fmtDate(me.until)}.` : `Pro until ${fmtDate(me.until)}. It won't renew.`;
}

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
  return (
    <Panel title={me.tier === 'pro' ? 'Your options' : 'Upgrade to Pro'}>
      {me.trial.status === 'available' && me.tier === 'free' && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/5 p-4">
          <p className="text-sm font-semibold">Try Pro free for 7 days. No card needed, and nothing renews by itself.</p>
          <button type="button" className={btnCls} disabled={!!busy} onClick={() =>
              run('trial', async () => {
                await accountCall('/api/billing/trial', 'POST');
                await refreshAccount();
              })
            }>
            {busy === 'trial' ? 'Starting…' : 'Start free trial'}
          </button>
        </div>
      )}
      {!live ? (
        <p className="flex items-start gap-2 text-sm font-medium text-muted">
          <Info aria-hidden weight="bold" className="mt-0.5 size-4 shrink-0 text-accent" /> Paid plans open soon. Your account is ready for them.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {options
            .filter(([plan]) => !subscribed || plan === 'lifetime')
            .map(([plan, title, body]) => (
              <li key={plan} className="flex flex-col rounded-xl border border-line p-4">
                <span className="font-extrabold">{title}</span>
                <span className="mt-1 flex-1 text-sm font-medium text-muted">{body}</span>
                <button type="button" className={`${btnCls} mt-4 justify-center`} disabled={!!busy} onClick={() => run(plan, () => openCheckout(plan))}>
                  {busy === plan ? 'Opening…' : `Choose ${title.toLowerCase()}`}
                </button>
              </li>
            ))}
        </ul>
      )}
      {live && <p className="mt-3 text-xs font-medium text-faint">Prices, tax and currency are shown in the secure Paddle checkout before you pay. Paddle is the merchant of record.</p>}
    </Panel>
  );
}

type KeyInfo = { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null };

function ApiKeys({ me, onError }: { me: MeResponse; onError: (e: string | null) => void }) {
  const [keys, setKeys] = useState<KeyInfo[] | null>(null);
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const allowed = canUse('apiKeys', me.plan);
  const load = () =>
    accountCall<{ keys: KeyInfo[] }>('/api/account/keys', 'GET')
      .then((r) => setKeys(r.keys))
      .catch(() => setKeys([]));
  useEffect(() => {
    void load();
  }, []);
  if (!allowed && !keys?.length) {
    return me.billing ? (
      <Panel title="API keys">
        <ProNote>API keys give your scripts {LIMITS.pro.apiPerDay.toLocaleString('en-US')} requests a day to the Web3Lens API, outside the shared per-IP limit.</ProNote>
      </Panel>
    ) : null;
  }
  return (
    <Panel title="API keys">
      <p className="mb-4 text-sm font-medium text-muted">
        Send the key as <code className="font-mono text-[13px] text-fg">x-api-key</code> to <code className="font-mono text-[13px] text-fg">https://web3lens.com/api/v1/…</code>.{' '}
        {LIMITS.pro.apiPerDay.toLocaleString('en-US')} requests per day across all your keys; responses carry <code className="font-mono text-[13px] text-fg">x-ratelimit-remaining</code>.
      </p>
      {fresh && (
        <div className="mb-4 rounded-xl border border-accent/50 bg-accent/5 p-4">
          <p className="text-sm font-bold">Copy your new key now. It won't be shown again.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 break-all rounded-lg border border-line bg-ink px-3 py-2 font-mono text-[13px]">{fresh}</code>
            <button
              type="button"
              className={ghostBtnCls}
              onClick={async () => {
                await navigator.clipboard.writeText(fresh).catch(() => {});
                setCopied(true);
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
      {keys && keys.length > 0 && (
        <ul className="mb-4 divide-y divide-line">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
              <span className="text-sm">
                <span className="font-bold">{k.name || 'Unnamed key'}</span> <code className="font-mono text-[13px] text-muted">w3l_{k.prefix}_…</code>
                <span className="block font-medium text-muted">
                  Created {fmtDate(k.createdAt)} · {k.lastUsedAt ? `last used ${fmtDate(k.lastUsedAt)}` : 'never used'}
                </span>
              </span>
              <button
                type="button"
                className={`${ghostBtnCls} hover:border-danger hover:text-danger`}
                onClick={async () => {
                  if (!window.confirm(`Revoke "${k.name || 'this key'}"? Requests using it stop working at once.`)) return;
                  try {
                    await accountCall(`/api/account/keys?id=${encodeURIComponent(k.id)}`, 'DELETE');
                    await load();
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
              setCopied(false);
              setName('');
              await load();
            } catch (err) {
              onError(err instanceof Error ? err.message : 'Could not create a key.');
            }
          }}
        >
          <label htmlFor="key-name" className="sr-only">
            Key name
          </label>
          <input id="key-name" className={`${inputCls} max-w-xs font-sans`} placeholder="Name, e.g. Reconciliation script" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className={btnCls}>
            Create key
          </button>
        </form>
      )}
    </Panel>
  );
}

type SessionInfo = { id: string; kind: 'web' | 'extension'; createdAt: string; expiresAt: string; current: boolean };

function Sessions({ onError }: { onError: (e: string | null) => void }) {
  const [list, setList] = useState<SessionInfo[] | null>(null);
  const load = () =>
    accountCall<{ sessions: SessionInfo[] }>('/api/account/sessions', 'GET')
      .then((r) => setList(r.sessions))
      .catch(() => setList([]));
  useEffect(() => {
    void load();
  }, []);
  if (!list) return null;
  return (
    <Panel title="Signed-in browsers and extensions">
      <ul className="divide-y divide-line">
        {list.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <span className="text-sm">
              <span className="font-bold">{s.kind === 'extension' ? 'Browser extension' : 'Website'}</span>
              {s.current && <span className="ml-2 text-xs font-bold text-accent">This browser</span>}
              <span className="block font-medium text-muted">Signed in {fmtDate(s.createdAt)}</span>
            </span>
            {!s.current && (
              <button
                type="button"
                className={ghostBtnCls}
                onClick={async () => {
                  try {
                    await accountCall(`/api/account/sessions?id=${encodeURIComponent(s.id)}`, 'DELETE');
                    await load();
                  } catch (e) {
                    onError(e instanceof Error ? e.message : 'Could not sign it out.');
                  }
                }}
              >
                Sign out
              </button>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function DangerZone({ me }: { me: MeResponse }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Panel title="Delete account">
      <p className="text-sm font-medium text-muted">
        Removes your account, sign-ins and usage from Web3Lens. Saved items in this browser stay where they are. Cancel any subscription under Manage billing first.
      </p>
      {!open ? (
        <button type="button" className={`${ghostBtnCls} mt-4 hover:border-danger hover:text-danger`} onClick={() => setOpen(true)}>
          Delete my account…
        </button>
      ) : (
        <form
          className="mt-4 flex flex-wrap gap-2"
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
          <input id="confirm-email" className={`${inputCls} max-w-sm font-sans`} placeholder={`Type ${me.user.email}`} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          <button type="submit" className="inline-flex h-11 items-center rounded-lg bg-danger px-4 text-sm font-extrabold text-ink disabled:opacity-50" disabled={email.trim().toLowerCase() !== me.user.email.toLowerCase()}>
            Delete permanently
          </button>
          {error && <ErrorText>{error}</ErrorText>}
        </form>
      )}
    </Panel>
  );
}

export function AccountPanel() {
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

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

  if (account.status === 'loading') return <Panel><p className="text-sm font-semibold text-muted">Loading your account…</p></Panel>;
  if (account.status === 'unavailable') {
    return (
      <Panel title="Accounts are coming soon">
        <p className="text-sm font-medium text-muted">Sign-in isn't switched on yet. Everything on Web3Lens works without an account.</p>
        <div className="mt-6"><PlanComparison /></div>
      </Panel>
    );
  }
  if (account.status === 'signedOut') {
    return (
      <div className="space-y-4">
        <Panel title="Sign in">
          <p className="mb-5 text-sm font-medium text-muted">
            An account is optional: search, explorers, developer tools and safety checks all work without one. Sign in to see your plan, start the Pro trial or connect the extension.
          </p>
          <button
            type="button"
            className={btnCls}
            onClick={() => signInWithGoogle('/account').catch((e: Error) => setError(e.message))}
          >
            <GoogleLogo aria-hidden weight="bold" className="size-4" /> Continue with Google
          </button>
          <p className="mt-3 text-xs font-medium text-faint">We receive your name, email and profile picture from Google. Never wallet keys or seed phrases.</p>
          {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
        </Panel>
        <Panel title="Free and Pro"><PlanComparison /></Panel>
      </div>
    );
  }

  const { me } = account;
  return (
    <div className="space-y-4">
      {waiting && (
        <p role="status" className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm font-semibold">
          Thanks! Confirming your payment with Paddle. This usually takes a few seconds.
        </p>
      )}
      <Panel
        title="Your plan"
        aside={
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${me.tier === 'pro' ? 'bg-accent text-ink' : 'border border-line-strong text-muted'}`}>
            {me.tier === 'pro' && <Crown aria-hidden weight="bold" className="size-3.5" />}
            {me.plan === 'lifetime' ? 'Pro · Lifetime' : me.tier === 'pro' ? 'Pro' : 'Free'}
          </span>
        }
      >
        <p className="font-semibold">{planLine(me)}</p>
        <p className="mt-1 text-sm font-medium text-muted">Signed in as {me.user.email}</p>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Meter label="Batch cross-chain lookups today" {...me.usage.crossChain} />
          <Meter label="API key requests today" {...me.usage.api} />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {me.manageUrl && (
            <a href={me.manageUrl} target="_blank" rel="noopener noreferrer" className={ghostBtnCls}>
              Manage billing <ArrowSquareOut aria-hidden weight="bold" className="size-4" />
            </a>
          )}
          <button type="button" className={ghostBtnCls} onClick={() => void refreshAccount()}>
            Refresh plan
          </button>
          <button type="button" className={ghostBtnCls} onClick={() => signOut().catch((e: Error) => setError(e.message))}>
            Sign out
          </button>
        </div>
        {error && <div className="mt-3"><ErrorText>{error}</ErrorText></div>}
      </Panel>
      <Upgrade me={me} onError={setError} />
      <Panel title="Free and Pro">
        {me.tier === 'pro' && (
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle aria-hidden weight="bold" className="size-4 text-accent" /> You have every Pro limit.
          </p>
        )}
        <PlanComparison />
      </Panel>
      <ApiKeys me={me} onError={setError} />
      <Sessions onError={setError} />
      <DangerZone me={me} />
    </div>
  );
}
