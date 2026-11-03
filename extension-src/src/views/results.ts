/**
 * Native results in the extension: the same /api/v1 data the website's result pages show
 * (balances, tokens, activity, transactions, cross-chain, risk checks, approvals).
 */
import { apiGet, setApiBase } from '@/lib/api-client';
import { encodeQr, qrSvgPath } from '@/lib/codec/qr';
import { formatAmount, formatCount, formatUsd, shortHash } from '@/lib/format';
import type { AddressResult, ApprovalsResult, LocateResult, MultichainResult, SecurityReport, Section, TxResult } from '@/lib/lookup-types';
import { checkSanctions } from '@/lib/security/sanctions';
import { formatUnits } from '@/lib/tools/units';
import { getChain } from '@/lib/chains';
import { EVM_NETWORKS } from '@/lib/networks';
import { clear, copyBtn, ext_link, h } from '../dom';
import { ago, t, type MessageKey } from '../i18n';
import { glyph, icon } from '../ui';
import type { ExtSettings } from '../store';
import { badge, card, errorText, explorerList, facts, failMessage, loading, mono, note, sectionBody, sourcedCard, when } from './common';

export type Nav = (hash: string) => void;

const TX_STATUS: Record<string, MessageKey> = { success: 'result.success', failed: 'result.failed', pending: 'common.pending' };

/** QR code as an SVG element (same encoder as the website). */
function qrSvg(value: string): Node {
  try {
    const { path, viewBox } = qrSvgPath(encodeQr(value));
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', t('result.qr'));
    svg.setAttribute('shape-rendering', 'crispEdges');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', path);
    svg.append(p);
    return svg;
  } catch (e) {
    return errorText((e as Error).message);
  }
}

function usd(amount: string, price: Section<number>) {
  return price.status === 'ok' ? ` ≈ ${formatUsd(Number(amount) * price.data)}` : '';
}

function addrLink(nav: Nav, chain: string, a: string | null) {
  if (!a) return mono('—');
  return h('a', { href: `#result/address/${chain}/${a}`, class: 'mono link', title: a, on: { click: (e: Event) => (e.preventDefault(), nav(`#result/address/${chain}/${a}`)) } }, shortHash(a, 6, 4));
}

function txLink(nav: Nav, chain: string, hash: string) {
  return h('a', { href: `#result/tx/${chain}/${hash}`, class: 'mono link', title: hash, on: { click: (e: Event) => (e.preventDefault(), nav(`#result/tx/${chain}/${hash}`)) } }, shortHash(hash, 8, 6));
}

export function renderAddressResult(r: AddressResult, nav: Nav, compact: boolean): Node[] {
  const c = r.chain.id;
  const out: Node[] = [];
  if (r.family === 'evm') {
    out.push(
      sourcedCard(t('result.balance'), r.account, (a) => [
        h('p', { class: 'big' }, formatAmount(a.balance, r.chain.symbol, 6)),
        h('p', { class: 'muted' }, r.priceUsd.status === 'ok' ? t('result.usdApprox', { usd: formatUsd(Number(a.balance) * r.priceUsd.data) }) : t('result.noUsd')),
        facts([
          [t('result.type'), a.delegatedTo ? t('result.delegated', { address: shortHash(a.delegatedTo) }) : a.isContract ? t('result.contractBytes', { count: a.codeSize }) : t('result.walletNoCode')],
          [t('result.sentTxs'), formatCount(a.nonce)],
          ['ENS', r.ensName.status === 'ok' && r.ensName.data ? r.ensName.data : null],
          [t('result.resolvedFrom'), r.resolvedFrom ?? null],
        ]),
      ]),
    );
    out.push(
      sourcedCard(t('result.tokens'), r.tokens, (v) => {
        const shown = v.items.filter((i) => !i.flagged).slice(0, compact ? 5 : 50);
        const flagged = v.items.filter((i) => i.flagged).length;
        return [
          shown.length
            ? h(
                'ul',
                { class: 'list' },
                shown.map((tk) =>
                  h('li', null, h('span', null, h('b', null, tk.symbol ?? shortHash(tk.contract)), ' ', h('span', { class: 'muted' }, tk.name ?? '')), h('span', { class: 'num' }, tk.balance ? formatAmount(tk.balance, null, 4) : tk.balanceRaw, tk.priceUsd && tk.balance ? h('span', { class: 'muted' }, ` ${formatUsd(Number(tk.balance) * tk.priceUsd)}`) : null)),
                ),
              )
            : h('p', { class: 'muted' }, t('result.noErc20')),
          flagged ? note(t('result.hiddenTokens', { count: flagged }), 'warn') : null,
          v.coverage?.kind === 'known-list'
            ? note(t('result.knownOnly', { count: v.coverage.checked, chain: r.chain.name }), 'warn')
            : null,
        ].filter(Boolean) as Node[];
      }),
    );
    if (!compact) {
      out.push(
        sourcedCard(t('result.activity'), r.activity, (a) => [
          facts([
            [t('result.transactions'), formatCount(a.txCount)],
            [t('result.tokenTransfers'), formatCount(a.transfers)],
          ]),
          h(
            'ul',
            { class: 'list' },
            a.recent.map((v) =>
              h('li', null, h('span', null, txLink(nav, c, v.hash), ' ', h('span', { class: 'muted' }, v.method ?? '')), h('span', { class: 'num' }, formatAmount(formatUnits(BigInt(v.valueWei), 18), r.chain.symbol, 4), h('span', { class: 'muted' }, ` ${ago(v.timestamp ?? Date.now())}`))),
            ),
          ),
        ]),
        sourcedCard(t('result.labelsContract'), r.info, (i) => [
          i.isScam || (i.reputation && i.reputation !== 'ok') ? note(t('result.flagged', { reason: i.isScam ? t('result.scam') : String(i.reputation) }), 'danger') : null,
          facts([
            [t('result.name'), i.name ?? '—'],
            [t('result.tags'), i.tags.length ? i.tags.join(', ') : '—'],
            [t('result.verifiedSource'), i.isContract ? (i.isVerified ? t('common.yes') : t('common.no')) : null],
            [t('result.proxy'), i.isContract ? (i.proxyType ?? t('common.noLower')) : null],
            [t('result.token'), i.token ? `${i.token.name ?? '?'} (${i.token.symbol ?? '?'}) ${i.token.type}` : null],
          ]),
        ].filter(Boolean) as Node[]),
      );
    }
  } else if (r.family === 'utxo') {
    out.push(
      sourcedCard(t('result.balance'), r.account, (a) => [
        h('p', { class: 'big' }, formatAmount(a.balance, r.chain.symbol, 8)),
        h('p', { class: 'muted' }, r.priceUsd.status === 'ok' ? t('result.usdApprox', { usd: formatUsd(Number(a.balance) * r.priceUsd.data) }) : t('result.noUsd')),
        a.mempoolTxCount ? note(t('result.unconfirmed', { count: a.mempoolTxCount }), 'warn') : h('span'),
        facts([
          [t('result.received'), formatAmount(formatUnits(BigInt(a.receivedSat), 8), r.chain.symbol, 8)],
          [t('result.sent'), formatAmount(formatUnits(BigInt(a.sentSat), 8), r.chain.symbol, 8)],
          [t('result.transactions'), formatCount(a.txCount)],
        ]),
      ]),
    );
    if (!compact) {
      out.push(
        sourcedCard(t('result.recentTxs'), r.recent, (list) =>
          h(
            'ul',
            { class: 'list' },
            list.map((v) =>
              h('li', null, txLink(nav, c, v.txid), h('span', { class: `num ${v.netSat !== null && v.netSat < 0 ? 'neg' : 'pos'}` }, v.netSat === null ? '—' : formatAmount(formatUnits(BigInt(v.netSat), 8), r.chain.symbol, 8), h('span', { class: 'muted' }, ` ${v.time ? ago(v.time) : t('common.pending')}`))),
            ),
          ),
        ),
      );
    }
  } else {
    out.push(
      sourcedCard(t('result.balance'), r.account, (a) => [
        h('p', { class: 'big' }, formatAmount(a.balance, 'SOL', 6)),
        h('p', { class: 'muted' }, r.priceUsd.status === 'ok' ? t('result.usdApprox', { usd: formatUsd(Number(a.balance) * r.priceUsd.data) }) : t('result.noUsd')),
        facts([
          [t('result.account'), a.exists ? (a.executable ? t('result.program') : t('result.account')) : t('result.notFound')],
          [t('result.owner'), a.owner ? shortHash(a.owner) : '—'],
        ]),
      ]),
    );
    if (!compact) {
      out.push(
        sourcedCard(t('result.splTokens'), r.tokens, (v) => [
          v.items.length ? h('ul', { class: 'list' }, v.items.slice(0, 50).map((x) => h('li', null, mono(shortHash(x.mint, 6, 6)), h('span', { class: 'num' }, formatAmount(x.amount, null, 4))))) : h('p', { class: 'muted' }, t('result.noSpl')),
          v.partial ? note(t('result.token2022'), 'warn') : h('span'),
        ]),
        sourcedCard(t('result.recentSigs'), r.recent, (list) => h('ul', { class: 'list' }, list.map((s) => h('li', null, txLink(nav, 'solana', s.signature), h('span', { class: 'muted' }, `${s.failed ? `${t('result.failed')} · ` : ''}${ago(s.time)}`))))),
      );
    }
  }
  return out;
}

export function renderTxResult(r: TxResult, nav: Nav): Node[] {
  const c = r.chain.id;
  if (r.family === 'evm') {
    return [
      sourcedCard(t('result.transaction'), r.tx, (v) =>
        !v
          ? note(t('result.unknownTx', { chain: r.chain.name }), 'warn')
          : facts([
              [t('result.status'), badge(TX_STATUS[v.status] ? t(TX_STATUS[v.status]) : v.status, v.status === 'success' ? 'good' : v.status === 'failed' ? 'danger' : 'warn')],
              [t('result.block'), v.blockNumber === null ? t('common.pending') : t('result.conf', { block: formatCount(v.blockNumber), count: formatCount(v.confirmations) })],
              [t('result.time'), when(v.timestamp)],
              [t('result.from'), addrLink(nav, c, v.from)],
              [t('result.to'), addrLink(nav, c, v.to ?? v.contractCreated)],
              [t('result.value'), `${formatAmount(formatUnits(BigInt(v.valueWei), 18), r.chain.symbol, 18)}${usd(formatUnits(BigInt(v.valueWei), 18), r.priceUsd)}`],
              [t('result.fee'), v.feeWei ? `${formatAmount(formatUnits(BigInt(v.feeWei), 18), r.chain.symbol, 9)}${usd(formatUnits(BigInt(v.feeWei), 18), r.priceUsd)}` : t('common.pending')],
            ]),
      ),
      r.decoded.length
        ? card(
            t('result.input'),
            ...r.decoded.map((d) =>
              h('div', { class: 'decoded' }, h('p', { class: 'mono accent' }, d.signature), badge(d.via === 'verified' ? t('result.verifiedAbi') : t('result.guessed'), d.via === 'verified' ? 'good' : 'warn'), facts(d.params.map((p) => [`${p.name} (${p.type})`, mono(p.value)]))),
            ),
          )
        : h('span'),
      r.detail.status === 'ok' && r.detail.data.tokenTransfers.length
        ? card(t('result.tokenTransfers'), h('ul', { class: 'list' }, r.detail.data.tokenTransfers.map((tt) => h('li', null, h('span', null, `${tt.amount ?? '—'} ${tt.token.symbol ?? ''}`), h('span', { class: 'muted' }, `${shortHash(tt.from, 6, 4)} → ${shortHash(tt.to, 6, 4)}`)))))
        : h('span'),
    ];
  }
  if (r.family === 'utxo') {
    return [
      sourcedCard(t('result.transaction'), r.tx, (v) =>
        !v
          ? note(t('result.unknownTx', { chain: r.chain.name }), 'warn')
          : [
              facts([
                [t('result.status'), badge(v.confirmed ? t('result.confirmed') : t('result.unconfirmedBadge'), v.confirmed ? 'good' : 'warn')],
                [t('result.block'), v.blockHeight === null ? t('result.mempool') : t('result.conf', { block: formatCount(v.blockHeight), count: formatCount(v.confirmations) })],
                [t('result.time'), when(v.time)],
                [t('result.output'), `${formatAmount(formatUnits(BigInt(v.totalOutSat), 8), r.chain.symbol, 8)}${usd(formatUnits(BigInt(v.totalOutSat), 8), r.priceUsd)}`],
                [t('result.fee'), `${formatAmount(formatUnits(BigInt(v.feeSat), 8), r.chain.symbol, 8)} · ${v.feeRate} sat/vB`],
              ]),
              h('h3', null, t('result.outputs', { count: v.outputs.length })),
              h('ul', { class: 'list' }, v.outputs.slice(0, 20).map((o) => h('li', null, o.address ? addrLink(nav, c, o.address) : mono(o.type), h('span', { class: 'num' }, formatAmount(formatUnits(BigInt(o.valueSat), 8), null, 8))))),
            ],
      ),
    ];
  }
  return [
    sourcedCard(t('result.transaction'), r.tx, (v) =>
      !v
        ? note(t('result.unknownSig'), 'warn')
        : facts([
            [t('result.status'), badge(v.failed ? t('result.failed') : t('result.success'), v.failed ? 'danger' : 'good')],
            [t('result.slot'), formatCount(v.slot)],
            [t('result.time'), when(v.time)],
            [t('result.fee'), `${formatAmount(formatUnits(BigInt(v.feeLamports), 9), 'SOL', 9)}`],
            [t('result.signer'), v.signers[0] ? addrLink(nav, 'solana', v.signers[0]) : '—'],
          ]),
    ),
  ];
}

export function securityCard(chainId: string, address: string): HTMLElement {
  const body = h('div', null, loading(t('risk.checking')));
  const el = h('section', { class: 'card' }, h('h2', null, t('risk.title')), body);
  apiGet<SecurityReport>('security', { chain: chainId, q: address })
    .then((s) => {
      const rows: Node[] = [
        s.flagCount > 0 ? note(t('risk.signals', { count: s.flagCount }), 'danger') : note(t('risk.noReports'), 'info'),
        facts([
          ['OFAC', s.sanctions.listed ? t('risk.listed', { lists: s.sanctions.lists.join(', ') }) : t('risk.notListed', { date: s.sanctions.snapshotAt.slice(0, 10) })],
          ...((/^0x[0-9a-fA-F]{40}$/.test(address)
            ? [
                ['Blockscout', s.reputation.status === 'ok' ? (s.reputation.data.isScam ? t('risk.markedScam') : s.reputation.data.reputation && s.reputation.data.reputation !== 'ok' ? s.reputation.data.reputation : t('risk.notFlagged')) : t('common.unavailableParen', { reason: s.reputation.reason })],
                ['GoPlus', s.goplus.status === 'ok' ? (s.goplus.data.flags.length ? s.goplus.data.flags.join(', ') : t('risk.noReportsShort')) : t('common.unavailableParen', { reason: s.goplus.reason })],
              ]
            : [[t('risk.scamReports'), t('risk.notChecked')]]) as [string, string][]),
          ...(s.contract
            ? ([
                [t('risk.verified'), [s.contract.verification.blockscout, s.contract.verification.sourcify].map((v, i) => `${i ? 'Sourcify' : 'Blockscout'}: ${v.status === 'ok' ? ('verified' in v.data ? (v.data.verified ? t('common.yesLower') : t('common.noLower')) : v.data.match ? v.data.match : t('common.noLower')) : t('common.unavailable')}`).join(' · ')],
                [t('risk.upgradeable'), s.contract.proxy.status === 'ok' ? (s.contract.proxy.data.implementation ? t('risk.yesArrow', { address: shortHash(s.contract.proxy.data.implementation) }) : t('risk.noSlots')) : t('common.unavailable')],
                [t('result.owner'), s.contract.owner.status === 'ok' ? (s.contract.owner.data === null ? t('risk.noOwner') : s.contract.owner.data.renounced ? t('risk.renounced') : `${shortHash(s.contract.owner.data.owner!)} (${s.contract.owner.data.ownerIsContract ? t('risk.contract') : t('risk.wallet')})`) : t('common.unavailable')],
                [t('risk.admin'), s.contract.privileged?.length ? t('risk.adminCount', { count: s.contract.privileged.length }) : s.contract.privileged ? t('risk.noneFound') : null],
                [t('risk.tokenRisk'), s.goplusToken.status === 'ok' && s.goplusToken.data ? s.goplusToken.data.flags.join(', ') || t('risk.noFlags') : null],
              ] as [string, string | null][])
            : []),
        ]),
      ];
      clear(body, ...rows);
    })
    .catch((e: unknown) => {
      // The local OFAC snapshot still works when the API doesn't.
      const s = checkSanctions(address);
      clear(body, errorText(t('risk.onlineUnavailable', { error: failMessage(e) })), facts([[t('risk.ofacLocal'), s.listed ? t('risk.listed', { lists: s.lists.join(', ') }) : t('risk.notListed', { date: s.snapshotAt.slice(0, 10) })]]));
    });
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) {
    const approvals = h('div', null);
    const btn = h('button', { type: 'button', class: 'btn-ghost' }, t('risk.checkApprovals'));
    btn.addEventListener('click', () => {
      clear(approvals, loading(t('risk.scanningApprovals')));
      apiGet<ApprovalsResult>('approvals', { chain: chainId, q: address })
        .then((a) =>
          clear(
            approvals,
            ...sectionBody(a.approvals, (d) => [
              d.erc20.length || d.nft.length
                ? h(
                    'ul',
                    { class: 'list' },
                    d.erc20.map((x) => h('li', null, h('span', null, h('b', null, x.symbol ?? shortHash(x.token)), ` → ${x.spenderLabel ?? shortHash(x.spender)}`, x.spenderIsContract === false ? h('span', { class: 'danger' }, ` ${t('risk.aWallet')}`) : null), h('span', { class: x.unlimited ? 'danger' : 'num' }, x.unlimited ? t('risk.unlimited') : (x.allowance ?? x.allowanceRaw)))),
                    d.nft.map((n) => h('li', null, `NFT ${shortHash(n.collection)} → ${n.operatorLabel ?? shortHash(n.operator)}`, h('span', { class: 'danger' }, t('risk.allItems')))),
                  )
                : h('p', { class: 'muted' }, t('risk.noApprovals')),
              d.capped ? note(t('risk.capped'), 'warn') : h('span'),
            ]),
            ext_link(a.revokeUrl, t('risk.revoke')),
          ),
        )
        .catch((e: unknown) => clear(approvals, errorText(failMessage(e))));
    });
    el.append(btn, approvals);
  }
  return el;
}

export function multichainCard(address: string, nav: Nav): HTMLElement {
  const body = h('div', null, loading(t('multichain.checking', { count: EVM_NETWORKS.length })));
  apiGet<MultichainResult>('multichain', { q: address })
    .then((m) =>
      clear(
        body,
        h(
          'ul',
          { class: 'list' },
          m.rows.map((r) =>
            h(
              'li',
              null,
              h('a', { href: `#result/address/${r.chain.id}/${address}`, class: 'link', on: { click: (e: Event) => (e.preventDefault(), nav(`#result/address/${r.chain.id}/${address}`)) } }, r.chain.name),
              r.status === 'ok' ? h('span', { class: 'num' }, formatAmount(r.balance, r.chain.symbol, 4), r.usd ? h('span', { class: 'muted' }, ` ${formatUsd(r.usd)}`) : null, h('span', { class: 'muted' }, ` · ${r.isContract ? t('multichain.code') : t('multichain.txCount', { count: r.nonce ?? 0 })}`)) : h('span', { class: 'warn' }, t('common.unavailable')),
            ),
          ),
        ),
        h('p', { class: 'source' }, t('multichain.source', { source: m.priceSource?.name ?? t('common.unavailable'), ago: ago(m.fetchedAt) })),
      ),
    )
    .catch((e: unknown) => clear(body, errorText(failMessage(e))));
  return h('section', { class: 'card' }, h('h2', null, t('multichain.title')), body);
}

export function locateCard(hash: string, nav: Nav): HTMLElement {
  const body = h('div', null, loading(t('locate.asking', { count: EVM_NETWORKS.length })));
  apiGet<LocateResult>('locate-tx', { q: hash })
    .then((l) => {
      const found = l.rows.filter((r) => r.status === 'found');
      clear(
        body,
        found.length
          ? h('div', { class: 'chips' }, found.map((r) => h('button', { type: 'button', class: 'chip primary', on: { click: () => nav(`#result/tx/${r.chain.id}/${hash}`) } }, t('locate.foundOn', { chain: r.chain.name }))))
          : h('p', { class: 'muted' }, t('locate.notFound', { count: EVM_NETWORKS.length })),
      );
    })
    .catch((e: unknown) => clear(body, errorText(failMessage(e))));
  return h('section', { class: 'card' }, h('h2', null, t('locate.title')), body);
}

/** Full (or compact) result for one chain, fetched from the Web3Lens API. */
export function resultView(kind: 'address' | 'tx', chainId: string, query: string, settings: ExtSettings, nav: Nav, compact = false): HTMLElement {
  setApiBase(settings.apiBase);
  const root = h('div', { class: 'stack' });
  const qrBox = h('div', { class: 'qr', hidden: true });
  const qrBtn = h('button', { type: 'button', class: 'btn-ghost sm' }, icon('qr'), 'QR');
  qrBtn.addEventListener('click', () => {
    if (!qrBox.firstChild) qrBox.append(qrSvg(query));
    qrBox.hidden = !qrBox.hidden;
  });
  const header = h(
    'div',
    { class: 'result-head' },
    h('p', { class: 'result-chain' }, glyph(chainId, getChain(chainId)?.name ?? chainId, 'md'), h('span', { class: 'label' }, `${getChain(chainId)?.name ?? chainId} · ${kind === 'tx' ? t('result.transaction') : t('result.address')}`)),
    h('h1', { class: 'mono value' }, query),
    h('div', { class: 'row wrap' }, copyBtn(query, t('common.copy')), kind === 'address' ? qrBtn : null, explorerList(chainId, query)),
    qrBox,
  );
  root.append(header);
  if (!settings.network) {
    root.append(note(t('result.offline'), 'info'));
    const s = checkSanctions(query);
    if (s.listed) root.append(note(t('result.onOfac', { lists: s.lists.join(', ') }), 'danger'));
    return root;
  }
  const body = h('div', { class: 'stack' }, loading(t('common.loading')));
  root.append(body);
  if (kind === 'address') {
    apiGet<AddressResult>('address', { chain: chainId, q: query })
      .then((r) => {
        clear(body, ...renderAddressResult(r, nav, compact));
        body.append(securityCard(chainId, r.address));
        if (!compact && r.family === 'evm') body.append(multichainCard(r.address, nav));
      })
      .catch((e: unknown) => clear(body, errorText(failMessage(e))));
  } else {
    apiGet<TxResult>('tx', { chain: chainId, q: query })
      .then((r) => {
        clear(body, ...renderTxResult(r, nav));
        if (r.family === 'evm' && r.tx.status === 'ok' && !r.tx.data) body.append(locateCard(query, nav));
      })
      .catch((e: unknown) => clear(body, errorText(failMessage(e))));
  }
  return root;
}
