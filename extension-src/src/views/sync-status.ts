/** Sync status line for Settings and Saved: shown only for Pro accounts; starts an automatic sync when opened. */
import { LIMITS } from '@/lib/entitlements';
import { ACCOUNT_ORIGIN, extLimits, loadAccount } from '../account';
import { clear, h } from '../dom';
import { t } from '../i18n';
import { load } from '../store';
import { loadSyncInfo, syncAvailable, syncSaved } from '../sync';

export function syncStatus(network: boolean, withCapNote = false): HTMLElement {
  const slot = h('div', { class: 'stack tight' });
  if (!network) return slot;
  void (async () => {
    const [account, { saved }] = await Promise.all([loadAccount(), load()]);
    if (await syncAvailable()) {
      void syncSaved();
      const info = await loadSyncInfo();
      const text = info.error ? t('pro.syncFailed') : info.lastSyncAt ? `${t('pro.syncOn')} ${t('pro.syncedAt', { date: new Date(info.lastSyncAt).toLocaleString() })}` : t('pro.syncOn');
      const btn = h('button', { type: 'button', class: 'btn-ghost sm' }, t('pro.syncNow'));
      btn.addEventListener('click', async () => {
        btn.textContent = t('pro.syncing');
        btn.setAttribute('disabled', '');
        await syncSaved(true);
        btn.textContent = t('pro.syncNow');
        btn.removeAttribute('disabled');
      });
      clear(slot, h('div', { class: 'row wrap' }, h('span', { class: info.error ? 'warn small' : 'muted small' }, text), btn));
      return;
    }
    const cap = extLimits(account).savedLocal;
    if (withCapNote && account.me?.billing && saved.length >= cap) {
      clear(
        slot,
        h('p', { class: 'muted small' }, `${t('pro.savedCapNote', { max: cap, pro: LIMITS.pro.savedCloud })} `, h('a', { href: `${ACCOUNT_ORIGIN}/pricing`, target: '_blank', rel: 'noopener noreferrer' }, t('pro.seePro'))),
      );
    }
  })();
  return slot;
}
