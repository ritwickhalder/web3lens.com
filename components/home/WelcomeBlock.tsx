'use client';

import { CheckCircle, CursorClick, Keyboard, PushPin, X } from '@phosphor-icons/react/dist/ssr';
import { useState, useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};
const readWelcome = () => new URLSearchParams(window.location.search).get('welcome') === 'true';

const TIPS = [
  { icon: PushPin, title: 'Pin it to your toolbar', body: 'Click the puzzle-piece icon next to the address bar, then the pin beside Web3Lens.' },
  { icon: CursorClick, title: 'Right-click any address', body: 'Select an address or hash on any page and choose “Look up on Web3Lens”.' },
  { icon: Keyboard, title: 'Or type w3 in the address bar', body: 'Type w3, a space, then paste an address, hash or ENS name.' },
];

/**
 * Shown above the hero when the extension opens web3lens.com/?welcome=true after a fresh install
 * (extension-src/src/lifecycle.ts). Read on the client so the homepage stays static; the server render and first
 * paint show nothing. Closing it drops the query parameter so a reload or a shared link shows the normal homepage.
 */
export function WelcomeBlock() {
  const welcome = useSyncExternalStore(noopSubscribe, readWelcome, () => false);
  const [dismissed, setDismissed] = useState(false);
  if (!welcome || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      /* The block still closes; the parameter just stays in the address bar. */
    }
  }

  return (
    <section aria-labelledby="welcome-heading" className="wrap pt-6">
      <div className="marks relative rounded-xl border border-line-strong bg-ink-2 p-5 sm:p-7">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close the welcome message"
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-md text-faint transition-colors hover:bg-ink-3 hover:text-fg"
        >
          <X aria-hidden weight="bold" className="size-5" />
        </button>
        <p className="label inline-flex items-center gap-2">
          <CheckCircle aria-hidden weight="bold" className="size-4 text-accent" />
          Extension installed
        </p>
        <h2 id="welcome-heading" className="heading mt-2.5 pr-10 text-3xl sm:text-4xl">
          Welcome to <span className="text-accent">Web3Lens.</span>
        </h2>
        <p className="mt-2 max-w-3xl text-base font-medium text-muted sm:text-lg">
          You&rsquo;re all set. Three ways to look up any address, transaction or name without leaving the page you&rsquo;re on:
        </p>
        <ol className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          {TIPS.map((tip, i) => (
            <li key={tip.title} className="flex gap-3 rounded-lg border border-line bg-ink p-4">
              <tip.icon aria-hidden weight="duotone" className="size-8 shrink-0 text-accent" />
              <div>
                <p className="font-extrabold text-fg">
                  <span className="text-accent">{i + 1}.</span> {tip.title}
                </p>
                <p className="mt-1 text-sm font-medium text-muted">{tip.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={dismiss}
          className="mt-6 rounded-md bg-accent px-6 py-3 text-base font-extrabold text-ink transition-colors hover:bg-accent-hover"
        >
          Got it, start searching
        </button>
      </div>
    </section>
  );
}
