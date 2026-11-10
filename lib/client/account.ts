'use client';
/**
 * The website's view of the signed-in account: one shared /api/me fetch for the header, /account and the connect
 * page. Display only: every limit is enforced by the server, whatever this says.
 */
import type { MeResponse } from '@/lib/entitlements';

export type AccountState =
  | { status: 'loading' }
  /** Accounts aren't configured on this deployment: hide sign-in entirely. */
  | { status: 'unavailable' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; me: MeResponse };

let state: AccountState = { status: 'loading' };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const emit = (next: AccountState) => {
  state = next;
  for (const l of listeners) l();
};

export function refreshAccount(): Promise<void> {
  inflight ??= fetch('/api/me', { cache: 'no-store', credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : null))
    .then((b: (MeResponse & { accounts?: boolean }) | { signedIn: false; accounts?: boolean } | null) => {
      if (!b || b.accounts === false) emit({ status: 'unavailable' });
      else if (b.signedIn) emit({ status: 'signedIn', me: b as MeResponse });
      else emit({ status: 'signedOut' });
    })
    .catch(() => emit(state.status === 'loading' ? { status: 'unavailable' } : state))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export const accountStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    if (listeners.size === 1 && state.status === 'loading') void refreshAccount();
    return () => listeners.delete(l);
  },
  getSnapshot: () => state,
  getServerSnapshot: (): AccountState => ({ status: 'loading' }),
};

/** Better Auth's client loads only when someone signs in or out, not with every page. */
const loadAuthClient = () => import('better-auth/react').then((m) => m.createAuthClient());

/** Message the popup's landing page (/auth/popup-close) posts to the page that opened it. */
export const POPUP_MESSAGE = 'w3l-auth';

/**
 * Google sign-in in a popup so the page stays put; a blocked popup falls back to a full-page redirect that returns
 * to `returnTo`. Resolves true once signed in.
 */
export async function signInWithGoogle(returnTo: string): Promise<boolean> {
  const w = 500;
  const h = 640;
  const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2.5);
  // Opened synchronously inside the click: popup blockers only allow that.
  const popup = window.open('', 'w3l-google-sign-in', `width=${w},height=${h},left=${Math.round(left)},top=${Math.round(top)}`);
  const client = await loadAuthClient().catch(() => null);
  if (!client) {
    popup?.close();
    throw new Error('Sign-in is not available right now.');
  }
  if (!popup) {
    await client.signIn.social({ provider: 'google', callbackURL: returnTo, errorCallbackURL: returnTo });
    return false;
  }
  try {
    popup.document.title = 'Sign in with Google';
    popup.document.body.textContent = 'Connecting to Google…';
  } catch {
    /* a reused popup may be on another origin */
  }
  const { data, error } = await client.signIn.social({ provider: 'google', callbackURL: '/auth/popup-close', errorCallbackURL: '/auth/popup-close', disableRedirect: true });
  if (error || !data?.url) {
    popup.close();
    throw new Error(error?.message ?? 'Sign-in is not available right now.');
  }
  popup.location.href = data.url;
  popup.focus();
  return new Promise((resolve, reject) => {
    const done = (ok: boolean, err?: string) => {
      window.removeEventListener('message', onMessage);
      window.clearInterval(timer);
      void refreshAccount().then(() => (err ? reject(new Error(err)) : resolve(ok || state.status === 'signedIn')));
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== POPUP_MESSAGE) return;
      done(!!e.data.ok, e.data.ok ? undefined : String(e.data.error || 'Sign-in did not complete. Please try again.'));
    };
    window.addEventListener('message', onMessage);
    // Closed without a message (gave up, or the opener link was lost): check the session once.
    const timer = window.setInterval(() => popup.closed && done(false), 500);
  });
}

export async function signOut(): Promise<void> {
  const client = await loadAuthClient();
  await client.signOut();
  await refreshAccount();
}

/** Same-origin JSON call to an account route; throws the server's message on failure. */
export async function accountCall<T>(path: string, method: 'POST' | 'DELETE' | 'GET', body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await r.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!r.ok) throw new Error(json?.error ?? `Request failed (HTTP ${r.status}).`);
  return json as T;
}
