'use client';

import { SignIn, UserCircle } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { accountStore, signInWithGoogle } from '@/lib/client/account';

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
