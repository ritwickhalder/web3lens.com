/**
 * Native results in the extension: the same /api/v1 data the website's result pages show
 * (balances, tokens, activity, transactions, cross-chain, risk checks, approvals).
 */
import { apiGet, setApiBase } from '@/lib/api-client';
import { encodeQr, qrSvgPath } from '@/lib/codec/qr';
import { formatAmount, formatCount, formatUsd, shortHash, timeAgo } from '@/lib/format';
import type { AddressResult, ApprovalsResult, LocateResult, MultichainResult, SecurityReport, Section, TxResult } from '@/lib/lookup-types';
import { checkSanctions } from '@/lib/security/sanctions';
import { formatUnits } from '@/lib/tools/units';
import { getChain } from '@/lib/chains';
import { clear, copyBtn, ext_link, h } from '../dom';
import { glyph, icon } from '../ui';
import type { ExtSettings } from '../store';
import { badge, card, errorText, explorerList, facts, loading, mono, note, sectionBody, sourcedCard, when } from './common';

export type Nav = (hash: string) => void;

/** QR code as an SVG element (same encoder as the website). */
function qrSvg(value: string): Node {
  try {
    const { path, viewBox } = qrSvgPath(encodeQr(value));
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'QR code');
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
      sourcedCard('Balance', r.account, (a) => [
        h('p', { class: 'big' }, formatAmount(a.balance, r.chain.symbol, 6)),
        h('p', { class: 'muted' }, r.priceUsd.status === 'ok' ? `≈ ${formatUsd(Number(a.balance) * r.priceUsd.data)} (CoinGecko)` : 'USD value unavailable'),
        facts([
          ['Type', a.delegatedTo ? `EIP-7702 delegated to ${shortHash(a.delegatedTo)}` : a.isContract ? `Contract (${a.codeSize} bytes)` : 'Wallet (no code)'],
          ['Sent txs', formatCount(a.nonce)],
          ['ENS', r.ensName.status === 'ok' && r.ensName.data ? r.ensName.data : null],
          ['Resolved from', r.resolvedFrom ?? null],
        ]),
      ]),
    );
    out.push(
      sourcedCard('Tokens', r.tokens, (t) => {
        const shown = t.items.filter((i) => !i.flagged).slice(0, compact ? 5 : 50);
        const flagged = t.items.filter((i) => i.flagged).length;
        return [
          shown.length
            ? h(
                'ul',
                { class: 'list' },
                shown.map((tk) =>
                  h('li', null, h('span', null, h('b', null, tk.symbol ?? shortHash(tk.contract)), ' ', h('span', { class: 'muted' }, tk.name ?? '')), h('span', { class: 'num' }, tk.balance ? formatAmount(tk.balance, null, 4) : tk.balanceRaw, tk.priceUsd && tk.balance ? h('span', { class: 'muted' }, ` ${formatUsd(Number(tk.balance) * tk.priceUsd)}`) : null)),
                ),
              )
            : h('p', { class: 'muted' }, 'No ERC-20 tokens.'),
          flagged ? note(`${flagged} token(s) hidden: flagged as spam by the indexer, or with no name or symbol. Don't interact with tokens you didn't expect.`, 'warn') : null,
          t.coverage?.kind === 'known-list'
            ? note(`Only ${t.coverage.checked} well-known tokens were checked (no free token index covers ${r.chain.name}); other holdings aren't shown.`, 'warn')
            : null,
        ].filter(Boolean) as Node[];
      }),
    );
    if (!compact) {
      out.push(
        sourcedCard('Activity', r.activity, (a) => [
          facts([
            ['Transactions', formatCount(a.txCount)],
            ['Token transfers', formatCount(a.transfers)],
          ]),
          h(
            'ul',
            { class: 'list' },
            a.recent.map((t) =>
              h('li', null, h('span', null, txLink(nav, c, t.hash), ' ', h('span', { class: 'muted' }, t.method ?? '')), h('span', { class: 'num' }, formatAmount(formatUnits(BigInt(t.valueWei), 18), r.chain.symbol, 4), h('span', { class: 'muted' }, ` ${t.timestamp ? timeAgo(t.timestamp) : 'just now'}`))),
            ),
          ),
        ]),
        sourcedCard('Labels and contract', r.info, (i) => [
          i.isScam || (i.reputation && i.reputation !== 'ok') ? note(`Blockscout flags this address (${i.isScam ? 'scam' : i.reputation}).`, 'danger') : null,
          facts([
            ['Name', i.name ?? '—'],
            ['Tags', i.tags.length ? i.tags.join(', ') : '—'],
            ['Verified source', i.isContract ? (i.isVerified ? 'Yes' : 'No') : null],
            ['Proxy', i.isContract ? (i.proxyType ?? 'no') : null],
            ['Token', i.token ? `${i.token.name ?? '?'} (${i.token.symbol ?? '?'}) ${i.token.type}` : null],
          ]),
        ].filter(Boolean) as Node[]),
      );
    }
  } else if (r.family === 'utxo') {
    out.push(
      sourcedCard('Balance', r.account, (a) => [
        h('p', { class: 'big' }, formatAmount(a.balance, r.chain.symbol, 8)),
        h('p', { class: 'muted' }, r.priceUsd.status === 'ok' ? `≈ ${formatUsd(Number(a.balance) * r.priceUsd.data)} (CoinGecko)` : 'USD value unavailable'),
        a.mempoolTxCount ? note(`${a.mempoolTxCount} unconfirmed transaction(s) pending, not included above.`, 'warn') : h('span'),
        facts([
          ['Received', formatAmount(formatUnits(BigInt(a.receivedSat), 8), r.chain.symbol, 8)],
          ['Sent', formatAmount(formatUnits(BigInt(a.sentSat), 8), r.chain.symbol, 8)],
          ['Transactions', formatCount(a.txCount)],
        ]),
      ]),
    );
    if (!compact) {
      out.push(
        sourcedCard('Recent transactions', r.recent, (list) =>
          h(
            'ul',
            { class: 'list' },
            list.map((t) =>
              h('li', null, txLink(nav, c, t.txid), h('span', { class: `num ${t.netSat !== null && t.netSat < 0 ? 'neg' : 'pos'}` }, t.netSat === null ? '—' : formatAmount(formatUnits(BigInt(t.netSat), 8), r.chain.symbol, 8), h('span', { class: 'muted' }, ` ${t.time ? timeAgo(t.time) : 'pending'}`))),
            ),
          ),
        ),
      );
    }
  } else {
    out.push(
      sourcedCard('Balance', r.account, (a) => [
        h('p', { class: 'big' }, formatAmount(a.balance, 'SOL', 6)),
        h('p', { class: 'muted' }, r.priceUsd.status === 'ok' ? `≈ ${formatUsd(Number(a.balance) * r.priceUsd.data)} (CoinGecko)` : 'USD value unavailable'),
        facts([
          ['Account', a.exists ? (a.executable ? 'Program' : 'Account') : 'Not found on-chain'],
          ['Owner', a.owner ? shortHash(a.owner) : '—'],
        ]),
      ]),
    );
    if (!compact) {
      out.push(
        sourcedCard('SPL tokens', r.tokens, (t) => [
          t.items.length ? h('ul', { class: 'list' }, t.items.slice(0, 50).map((x) => h('li', null, mono(shortHash(x.mint, 6, 6)), h('span', { class: 'num' }, formatAmount(x.amount, null, 4))))) : h('p', { class: 'muted' }, 'No SPL token balances.'),
          t.partial ? note('Token-2022 balances could not be read from the public RPC.', 'warn') : h('span'),
        ]),
        sourcedCard('Recent signatures', r.recent, (list) => h('ul', { class: 'list' }, list.map((s) => h('li', null, txLink(nav, 'solana', s.signature), h('span', { class: 'muted' }, `${s.failed ? 'failed · ' : ''}${timeAgo(s.time)}`))))),
      );
    }
  }
  return out;
}

export function renderTxResult(r: TxResult, nav: Nav): Node[] {
  const c = r.chain.id;
  if (r.family === 'evm') {
    return [
      sourcedCard('Transaction', r.tx, (t) =>
        !t
          ? note(`${r.chain.name} doesn't know this transaction.`, 'warn')
          : facts([
              ['Status', badge(t.status, t.status === 'success' ? 'good' : t.status === 'failed' ? 'danger' : 'warn')],
              ['Block', t.blockNumber === null ? 'pending' : `${formatCount(t.blockNumber)} · ${formatCount(t.confirmations)} conf.`],
              ['Time', when(t.timestamp)],
              ['From', addrLink(nav, c, t.from)],
              ['To', addrLink(nav, c, t.to ?? t.contractCreated)],
              ['Value', `${formatAmount(formatUnits(BigInt(t.valueWei), 18), r.chain.symbol, 18)}${usd(formatUnits(BigInt(t.valueWei), 18), r.priceUsd)}`],
              ['Fee', t.feeWei ? `${formatAmount(formatUnits(BigInt(t.feeWei), 18), r.chain.symbol, 9)}${usd(formatUnits(BigInt(t.feeWei), 18), r.priceUsd)}` : 'pending'],
            ]),
      ),
      r.decoded.length
        ? card(
            'Input',
            ...r.decoded.map((d) =>
              h('div', { class: 'decoded' }, h('p', { class: 'mono accent' }, d.signature), badge(d.via === 'verified' ? 'verified ABI' : 'guessed', d.via === 'verified' ? 'good' : 'warn'), facts(d.params.map((p) => [`${p.name} (${p.type})`, mono(p.value)]))),
            ),
          )
        : h('span'),
      r.detail.status === 'ok' && r.detail.data.tokenTransfers.length
        ? card('Token transfers', h('ul', { class: 'list' }, r.detail.data.tokenTransfers.map((tt) => h('li', null, h('span', null, `${tt.amount ?? '—'} ${tt.token.symbol ?? ''}`), h('span', { class: 'muted' }, `${shortHash(tt.from, 6, 4)} → ${shortHash(tt.to, 6, 4)}`)))))
        : h('span'),
    ];
  }
  if (r.family === 'utxo') {
    return [
      sourcedCard('Transaction', r.tx, (t) =>
        !t
          ? note(`${r.chain.name} doesn't know this transaction.`, 'warn')
          : [
              facts([
                ['Status', badge(t.confirmed ? 'confirmed' : 'unconfirmed', t.confirmed ? 'good' : 'warn')],
                ['Block', t.blockHeight === null ? 'mempool' : `${formatCount(t.blockHeight)} · ${formatCount(t.confirmations)} conf.`],
                ['Time', when(t.time)],
                ['Output', `${formatAmount(formatUnits(BigInt(t.totalOutSat), 8), r.chain.symbol, 8)}${usd(formatUnits(BigInt(t.totalOutSat), 8), r.priceUsd)}`],
                ['Fee', `${formatAmount(formatUnits(BigInt(t.feeSat), 8), r.chain.symbol, 8)} · ${t.feeRate} sat/vB`],
              ]),
              h('h3', null, `Outputs (${t.outputs.length})`),
              h('ul', { class: 'list' }, t.outputs.slice(0, 20).map((o) => h('li', null, o.address ? addrLink(nav, c, o.address) : mono(o.type), h('span', { class: 'num' }, formatAmount(formatUnits(BigInt(o.valueSat), 8), null, 8))))),
            ],
      ),
    ];
  }
  return [
    sourcedCard('Transaction', r.tx, (t) =>
      !t
        ? note("Solana doesn't know this signature.", 'warn')
        : facts([
            ['Status', badge(t.failed ? 'failed' : 'success', t.failed ? 'danger' : 'good')],
            ['Slot', formatCount(t.slot)],
            ['Time', when(t.time)],
            ['Fee', `${formatAmount(formatUnits(BigInt(t.feeLamports), 9), 'SOL', 9)}`],
            ['Signer', t.signers[0] ? addrLink(nav, 'solana', t.signers[0]) : '—'],
          ]),
    ),
  ];
}

export function securityCard(chainId: string, address: string): HTMLElement {
  const body = h('div', null, loading('Checking sanctions, reports and contract…'));
  const el = h('section', { class: 'card' }, h('h2', null, 'Risk checks'), body);
  apiGet<SecurityReport>('security', { chain: chainId, q: address })
    .then((s) => {
      const rows: Node[] = [
        s.flagCount > 0 ? note(`${s.flagCount} risk signal(s) found. Don't send funds or sign anything without checking.`, 'danger') : note('No reports in the sources below. That does not mean it is safe: most scams are never reported.', 'info'),
        facts([
          ['OFAC', s.sanctions.listed ? `LISTED (${s.sanctions.lists.join(', ')})` : `not listed (snapshot ${s.sanctions.snapshotAt.slice(0, 10)})`],
          ...((/^0x[0-9a-fA-F]{40}$/.test(address)
            ? [
                ['Blockscout', s.reputation.status === 'ok' ? (s.reputation.data.isScam ? 'marked as scam' : s.reputation.data.reputation && s.reputation.data.reputation !== 'ok' ? s.reputation.data.reputation : 'not flagged') : `unavailable (${s.reputation.reason})`],
                ['GoPlus', s.goplus.status === 'ok' ? (s.goplus.data.flags.length ? s.goplus.data.flags.join(', ') : 'no reports') : `unavailable (${s.goplus.reason})`],
              ]
            : [['Scam reports', 'not checked: the free sources cover EVM chains only']]) as [string, string][]),
          ...(s.contract
            ? ([
                ['Verified', [s.contract.verification.blockscout, s.contract.verification.sourcify].map((v, i) => `${i ? 'Sourcify' : 'Blockscout'}: ${v.status === 'ok' ? ('verified' in v.data ? (v.data.verified ? 'yes' : 'no') : v.data.match ? v.data.match : 'no') : 'unavailable'}`).join(' · ')],
                ['Upgradeable', s.contract.proxy.status === 'ok' ? (s.contract.proxy.data.implementation ? `yes → ${shortHash(s.contract.proxy.data.implementation)}` : 'no EIP-1967 slots') : 'unavailable'],
                ['Owner', s.contract.owner.status === 'ok' ? (s.contract.owner.data === null ? 'no owner()' : s.contract.owner.data.renounced ? 'renounced' : `${shortHash(s.contract.owner.data.owner!)} (${s.contract.owner.data.ownerIsContract ? 'contract' : 'wallet'})`) : 'unavailable'],
                ['Admin functions', s.contract.privileged?.length ? `${s.contract.privileged.length} (mint/pause/blacklist/upgrade…)` : s.contract.privileged ? 'none found' : null],
                ['Token risk', s.goplusToken.status === 'ok' && s.goplusToken.data ? s.goplusToken.data.flags.join(', ') || 'no flags' : null],
              ] as [string, string | null][])
            : []),
        ]),
      ];
      clear(body, ...rows);
    })
    .catch((e: Error) => {
      // The local OFAC snapshot still works when the API doesn't.
      const s = checkSanctions(address);
      clear(body, errorText(`Online checks unavailable: ${e.message}`), facts([['OFAC (local)', s.listed ? `LISTED (${s.lists.join(', ')})` : `not listed (snapshot ${s.snapshotAt.slice(0, 10)})`]]));
    });
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) {
    const approvals = h('div', null);
    const btn = h('button', { type: 'button', class: 'btn-ghost' }, 'Check token approvals');
    btn.addEventListener('click', () => {
      clear(approvals, loading('Scanning approvals and reading allowances…'));
      apiGet<ApprovalsResult>('approvals', { chain: chainId, q: address })
        .then((a) =>
          clear(
            approvals,
            ...sectionBody(a.approvals, (d) => [
              d.erc20.length || d.nft.length
                ? h(
                    'ul',
                    { class: 'list' },
                    d.erc20.map((x) => h('li', null, h('span', null, h('b', null, x.symbol ?? shortHash(x.token)), ` → ${x.spenderLabel ?? shortHash(x.spender)}`, x.spenderIsContract === false ? h('span', { class: 'danger' }, ' (a wallet!)') : null), h('span', { class: x.unlimited ? 'danger' : 'num' }, x.unlimited ? 'unlimited' : (x.allowance ?? x.allowanceRaw)))),
                    d.nft.map((n) => h('li', null, `NFT ${shortHash(n.collection)} → ${n.operatorLabel ?? shortHash(n.operator)}`, h('span', { class: 'danger' }, 'all items'))),
                  )
                : h('p', { class: 'muted' }, 'No active approvals found in the events scanned.'),
              d.capped ? note('Log search hit its limit: older approvals may be missing.', 'warn') : h('span'),
            ]),
            ext_link(a.revokeUrl, 'Review or revoke on revoke.cash ↗'),
          ),
        )
        .catch((e: Error) => clear(approvals, errorText(e.message)));
    });
    el.append(btn, approvals);
  }
  return el;
}

export function multichainCard(address: string, nav: Nav): HTMLElement {
  const body = h('div', null, loading('Checking 11 EVM chains…'));
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
              r.status === 'ok' ? h('span', { class: 'num' }, formatAmount(r.balance, r.chain.symbol, 4), r.usd ? h('span', { class: 'muted' }, ` ${formatUsd(r.usd)}`) : null, h('span', { class: 'muted' }, ` · ${r.isContract ? 'code' : `${r.nonce} tx`}`)) : h('span', { class: 'warn' }, `unavailable`),
            ),
          ),
        ),
        h('p', { class: 'source' }, `Public RPCs · prices ${m.priceSource?.name ?? 'unavailable'} · ${timeAgo(m.fetchedAt)}`),
      ),
    )
    .catch((e: Error) => clear(body, errorText(e.message)));
  return h('section', { class: 'card' }, h('h2', null, 'Same address on other EVM chains'), body);
}

export function locateCard(hash: string, nav: Nav): HTMLElement {
  const body = h('div', null, loading('Asking 11 EVM chains…'));
  apiGet<LocateResult>('locate-tx', { q: hash })
    .then((l) => {
      const found = l.rows.filter((r) => r.status === 'found');
      clear(
        body,
        found.length
          ? h('div', { class: 'chips' }, found.map((r) => h('button', { type: 'button', class: 'chip primary', on: { click: () => nav(`#result/tx/${r.chain.id}/${hash}`) } }, `Found on ${r.chain.name} →`)))
          : h('p', { class: 'muted' }, 'Not found on the 11 supported EVM chains; try the explorer links.'),
      );
    })
    .catch((e: Error) => clear(body, errorText(e.message)));
  return h('section', { class: 'card' }, h('h2', null, 'Which chain is it on?'), body);
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
    h('p', { class: 'result-chain' }, glyph(chainId, getChain(chainId)?.name ?? chainId, 'md'), h('span', { class: 'label' }, `${getChain(chainId)?.name ?? chainId} · ${kind === 'tx' ? 'Transaction' : 'Address'}`)),
    h('h1', { class: 'mono value' }, query),
    h('div', { class: 'row wrap' }, copyBtn(query, 'Copy'), kind === 'address' ? qrBtn : null, explorerList(chainId, query)),
    qrBox,
  );
  root.append(header);
  if (!settings.network) {
    root.append(note('Online lookups are turned off in settings. Explorer links and local checks still work.', 'info'));
    const s = checkSanctions(query);
    if (s.listed) root.append(note(`On the OFAC sanctions list (${s.lists.join(', ')}).`, 'danger'));
    return root;
  }
  const body = h('div', { class: 'stack' }, loading('Loading…'));
  root.append(body);
  if (kind === 'address') {
    apiGet<AddressResult>('address', { chain: chainId, q: query })
      .then((r) => {
        clear(body, ...renderAddressResult(r, nav, compact));
        body.append(securityCard(chainId, r.address));
        if (!compact && r.family === 'evm') body.append(multichainCard(r.address, nav));
      })
      .catch((e: Error) => clear(body, errorText(e.message)));
  } else {
    apiGet<TxResult>('tx', { chain: chainId, q: query })
      .then((r) => {
        clear(body, ...renderTxResult(r, nav));
        if (r.family === 'evm' && r.tx.status === 'ok' && !r.tx.data) body.append(locateCard(query, nav));
      })
      .catch((e: Error) => clear(body, errorText(e.message)));
  }
  return root;
}
