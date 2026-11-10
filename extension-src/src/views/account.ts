/** Settings → Account: optional sign-in (pairing code), plan and sign-out. See ../account.ts for the flow. */
import { cancelSignIn, claimSignIn, displayPlan, loadAccount, openApproval, refreshAccount, signOut, startSignIn, ACCOUNT_ORIGIN, type AccountRecord } from '../account';
import { openTab } from '../browser';
import { clear, h } from '../dom';
import { t } from '../i18n';
import type { ExtSettings } from '../store';
import { badge, card, note } from './common';

let poll: ReturnType<typeof setInterval> | null = null;
let message: { text: string; tone: 'info' | 'warn' } | null = null;

function stopPolling() {
  if (poll) clearInterval(poll);
  poll = null;
}

/** While a code waits for approval, try to claim it every 3 s (the view re-renders on the storage change). */
function startPolling() {
  if (poll) return;
  poll = setInterval(async () => {
    const r = await claimSignIn();
    if (r === 'pending' || r === 'offline') return;
    stopPolling();
    if (r === 'failed') message = { text: t('account.error'), tone: 'warn' };
  }, 3000);
}

function planBadge(a: AccountRecord) {
  const plan = displayPlan(a);
  if (plan === 'lifetime') return badge(t('account.planLifetime'), 'good');
  if (plan === 'pro') return badge(t('account.planPro'), 'good');
  return badge(t('account.planFree'));
}

function body(a: AccountRecord, settings: ExtSettings): (Node | null)[] {
  if (!settings.network) return [note(t('account.networkOff'), 'info')];
  const msg = message ? note(message.text, message.tone) : null;
  const btn = (label: string, onClick: () => unknown, primary = false) =>
    h('button', { type: 'button', class: primary ? 'btn' : 'btn-ghost', on: { click: () => void onClick() } }, label);

  if (a.token && a.me) {
    stopPolling();
    const stale = Date.now() - a.refreshedAt > 24 * 3600_000;
    return [
      h('p', { class: 'row wrap' }, h('span', null, t('account.signedInAs', { email: a.me.email })), planBadge(a)),
      stale ? h('p', { class: 'muted' }, t('account.offline', { date: new Date(a.refreshedAt).toLocaleDateString() })) : null,
      msg,
      h(
        'div',
        { class: 'row wrap' },
        btn(t('account.manage'), () => openTab(`${ACCOUNT_ORIGIN}/account`)),
        btn(t('account.refresh'), async () => {
          const r = await refreshAccount(true);
          message = r === 'offline' ? { text: t('account.offline', { date: new Date(a.refreshedAt).toLocaleDateString() }), tone: 'warn' } : r === 'expired' ? { text: t('account.expired'), tone: 'warn' } : null;
        }),
        btn(t('account.signOut'), () => signOut()),
      ),
    ];
  }

  if (a.pending && a.pending.expiresAt > Date.now()) {
    startPolling();
    return [
      h('p', null, t('account.pendingBody')),
      h('p', { class: 'pair-code', 'aria-live': 'polite' }, a.pending.code),
      h('p', { class: 'muted' }, t('account.waiting')),
      msg,
      h(
        'div',
        { class: 'row wrap' },
        btn(t('account.reopen'), () => openApproval(a.pending!.code), true),
        btn(t('account.cancel'), () => {
          stopPolling();
          return cancelSignIn();
        }),
      ),
    ];
  }

  stopPolling();
  return [
    h('p', { class: 'muted' }, t('account.signedOutBody')),
    msg,
    h(
      'div',
      { class: 'row wrap' },
      btn(
        t('account.signIn'),
        async () => {
          message = null;
          try {
            await startSignIn();
          } catch {
            message = { text: t('account.error'), tone: 'warn' };
            await cancelSignIn();
          }
        },
        true,
      ),
    ),
  ];
}

export function accountCard(settings: ExtSettings): HTMLElement {
  const slot = h('div', { class: 'stack tight' }, h('p', { class: 'muted' }, t('common.loading')));
  void (async () => {
    if (settings.network) {
      // Opening Settings finishes a pending sign-in and refreshes a plan older than 12 h.
      await claimSignIn().catch(() => null);
      await refreshAccount().catch(() => null);
    }
    clear(slot, ...body(await loadAccount(), settings));
  })();
  return card(t('account.title'), slot);
}
