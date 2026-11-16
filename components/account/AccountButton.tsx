'use client';

import { SignIn, SignOut, UserCircle } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { accountStore, signInWithGoogle, signOut } from '@/lib/client/account';

/**
 * Sign in / account link for the header. Renders nothing until /api/me answers, and nothing at all on a deployment
 * without accounts, so signed-out browsing looks exactly as before. Signing in is optional everywhere.
 */
export function AccountButton({ className = '', onNavigate }: { className?: string; onNavigate?: () => void }) {
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const [busy, setBusy] = useState(false);
  const base = 'flex h-10 items-center gap-2 rounded-md border border-line-strong px-4 text-[15px] font-bold text-fg transition-colors hover:border-accent hover:text-accent';

  if (account.status === 'loading' || account.status === 'unavailable') return null;
  if (account.status === 'signedIn') {
    const { me } = account;
    return (
      <Link href="/account" onClick={onNavigate} className={`${base} ${className}`} title={me.user.email}>
        <UserCircle aria-hidden weight="bold" className="size-5" />
        <span className="max-w-32 truncate">Account</span>
        {me.tier === 'pro' && <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink">Pro</span>}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      className={`${base} disabled:opacity-60 ${className}`}
      onClick={async () => {
        setBusy(true);
        try {
          await signInWithGoogle(window.location.pathname + window.location.search);
        } catch {
          /* the account page explains errors; the header just resets */
        } finally {
          setBusy(false);
        }
      }}
    >
      <SignIn aria-hidden weight="bold" className="size-5" />
      {busy ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

/**
 * Account block for the mobile menu: who is signed in, a link to the account page and a sign-out button, or a
 * full-width sign-in button. Renders nothing on a deployment without accounts.
 */
export function MobileAccountPanel({ onNavigate }: { onNavigate?: () => void }) {
  const account = useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot, accountStore.getServerSnapshot);
  const [busy, setBusy] = useState(false);
  const btn =
    'flex h-12 items-center justify-center gap-2 rounded-md border px-4 text-base font-bold transition-colors disabled:opacity-60';

  if (account.status === 'unavailable') return null;
  if (account.status === 'loading') return <div aria-hidden className="h-12 rounded-md border border-line" />;

  if (account.status === 'signedIn') {
    const { me } = account;
    return (
      <div className="rounded-xl border border-line bg-ink p-4">
        <div className="mb-4 flex items-center gap-3">
          <UserCircle aria-hidden weight="duotone" className="size-9 shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="label">Signed in</p>
            <p className="truncate text-sm font-semibold text-fg">{me.user.email}</p>
          </div>
          {me.tier === 'pro' && (
            <span className="ml-auto rounded bg-accent px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink">Pro</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/account" onClick={onNavigate} className={`${btn} border-line-strong text-fg hover:border-accent hover:text-accent`}>
            <UserCircle aria-hidden weight="bold" className="size-5" /> Account
          </Link>
          <button
            type="button"
            disabled={busy}
            className={`${btn} border-line-strong text-fg hover:border-redline hover:text-redline`}
            onClick={async () => {
              setBusy(true);
              try {
                await signOut();
                onNavigate?.();
              } finally {
                setBusy(false);
              }
            }}
          >
            <SignOut aria-hidden weight="bold" className="size-5" /> {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      className={`${btn} w-full border-accent bg-accent text-ink hover:bg-transparent hover:text-accent`}
      onClick={async () => {
        setBusy(true);
        try {
          await signInWithGoogle(window.location.pathname + window.location.search);
        } catch {
          /* the account page explains errors */
        } finally {
          setBusy(false);
        }
      }}
    >
      <SignIn aria-hidden weight="bold" className="size-5" />
      {busy ? 'Signing in…' : 'Sign in with Google'}
    </button>
  );
}
