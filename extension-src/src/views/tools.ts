/** The website's developer tools, as plain DOM for the extension. Same libraries, same results. */
import { TOOLS, type ToolSlug } from '@/config/tools';
import { apiGet } from '@/lib/api-client';
import { getChain } from '@/lib/chains';
import { detectAll, extractQuery } from '@/lib/detect';
import { encodeCall, formatDecoded, parseJsonAbi, parseSignature, type AbiFunction, type EncodableValue } from '@/lib/evm/abi';
import { decodeCalldata, type DecodedCall } from '@/lib/evm/signatures';
import { decodeRawTransaction } from '@/lib/evm/tx-decode';
import type { GasResult } from '@/lib/lookup-types';
import { EVM_NETWORKS } from '@/lib/networks';
import { checkSanctions } from '@/lib/security/sanctions';
import { decimalToHex, hashes, hexToDecimal, hexToSignedInt256, hexToText, textToHex } from '@/lib/tools/convert';
import { bitcoinFee, calculateFee, GAS_PRESETS } from '@/lib/tools/gas';
import { parseTime } from '@/lib/tools/time';
import { convertUnits, formatUnits } from '@/lib/tools/units';
import { clear, copyBtn, h } from '../dom';
import { icon, type IconName } from '../ui';
import type { ExtSettings } from '../store';
import { badge, card, errorText, failMessage, note } from './common';

type Out = [label: string, value: string | null][];

function outputs(rows: Out) {
  return h(
    'div',
    { class: 'outputs' },
    rows.filter(([, v]) => v !== null).map(([l, v]) => h('div', { class: 'output' }, h('span', { class: 'olabel' }, l), h('span', { class: 'mono ovalue', title: v! }, v!), copyBtn(v!, 'Copy'))),
  );
}

function field(label: string, control: HTMLElement, hint?: string) {
  return h('label', { class: 'field' }, h('span', null, label), control, hint ? h('small', null, hint) : null);
}

const input = (value = '', placeholder = '') => h('input', { class: 'input mono', value, placeholder, spellcheck: 'false', autocomplete: 'off' });
const area = (value = '', placeholder = '') => h('textarea', { class: 'input mono area', placeholder, spellcheck: 'false' }, value);

/** Re-runs `compute` whenever any control changes. */
function live(controls: HTMLElement[], out: HTMLElement, compute: () => Node | Node[]) {
  const run = () => {
    try {
      const r = compute();
      clear(out, ...(Array.isArray(r) ? r : [r]));
    } catch (e) {
      clear(out, errorText((e as Error).message));
    }
  };
  for (const c of controls) {
    c.addEventListener('input', run);
    c.addEventListener('change', run);
  }
  run();
}

function unitConverter() {
  const amount = input('1');
  const family = h('select', { class: 'select' }, h('option', { value: 'evm' }, 'wei / gwei / ether'), h('option', { value: 'btc' }, 'sat / BTC'), h('option', { value: 'sol' }, 'lamport / SOL'), h('option', { value: 'custom' }, 'any token'));
  const unit = h('select', { class: 'select' });
  const decimals = input('6');
  const out = h('div');
  const units = () =>
    family.value === 'evm' ? [['wei', 0], ['gwei', 9], ['ether', 18]] : family.value === 'btc' ? [['sat', 0], ['BTC', 8]] : family.value === 'sol' ? [['lamport', 0], ['SOL', 9]] : [['raw units', 0], ['tokens', Math.min(77, Number(decimals.value) || 0)]];
  const fillUnits = () => clear(unit, ...units().map(([n, d]) => h('option', { value: String(d) }, String(n))));
  fillUnits();
  unit.value = String(units()[units().length - 1][1]);
  family.addEventListener('change', () => (fillUnits(), (unit.value = String(units()[units().length - 1][1]))));
  live([amount, family, unit, decimals], out, () => outputs(units().map(([n, d]) => [String(n), convertUnits(amount.value || '0', Number(unit.value), Number(d))])));
  return [field('Amount', amount), field('Unit family', family), field('From unit', unit), field('Token decimals (any token)', decimals), out];
}

function addressValidator() {
  const q = input('', '0x…, bc1…, T…');
  const out = h('div');
  live([q], out, () => {
    const { query } = extractQuery(q.value);
    if (!query) return h('span');
    const all = detectAll(query);
    if (!all.length) return errorText('Not a valid address or hash in any format Web3Lens knows.');
    return all.map((d) => {
      const s = d.kind === 'address' ? checkSanctions(d.normalized) : null;
      return card(
        d.label,
        d.kind === 'secret' ? note(d.note!, 'danger') : h('div', { class: 'row wrap' }, badge(d.checksum === 'valid' ? 'checksum valid' : d.checksum === 'invalid' ? 'checksum does NOT match' : d.checksum === 'none' ? 'no checksum' : 'format only', d.checksum === 'valid' ? 'good' : d.checksum === 'invalid' ? 'danger' : 'neutral'), s ? badge(s.listed ? 'OFAC listed' : 'not on OFAC snapshot', s.listed ? 'danger' : 'neutral') : null),
        d.kind !== 'secret' ? outputs([['Normalised', d.normalized]]) : null,
        d.chains.length ? h('p', { class: 'muted' }, d.chains.map((c) => getChain(c)?.name ?? c).join(', ')) : null,
      );
    });
  });
  return [field('Address, hash or name', q, 'A valid checksum means it was copied correctly, not that it is trustworthy.'), out];
}

function hexConverter() {
  const num = input('0xde0b6b3a7640000');
  const numOut = h('div');
  live([num], numOut, () => {
    const isHex = /^-?0x/i.test(num.value.trim()) || /[a-f]/i.test(num.value);
    const dec = isHex ? hexToDecimal(num.value) : num.value.trim();
    const hex = isHex ? `0x${num.value.trim().replace(/^-?0x/i, '').toLowerCase()}` : decimalToHex(num.value);
    let signed: string | null = null;
    try {
      signed = hexToSignedInt256(hex);
    } catch {
      signed = null;
    }
    return outputs([['Decimal', dec], ['Hex', hex], ['int256', signed !== dec ? signed : null]]);
  });
  const text = area('Hello, Web3Lens');
  const textOut = h('div');
  live([text], textOut, () => outputs([['Hex', textToHex(text.value)]]));
  const hexText = area('', '0x48656c6c6f');
  const hexTextOut = h('div');
  live([hexText], hexTextOut, () => (hexText.value.trim() ? outputs([['Text', hexToText(hexText.value)]]) : h('span')));
  const hashIn = input('transfer(address,uint256)');
  const hashKind = h('select', { class: 'select' }, h('option', { value: 'text' }, 'text'), h('option', { value: 'hex' }, 'hex bytes'));
  const hashOut = h('div');
  live([hashIn, hashKind], hashOut, () => {
    const r = hashes({ kind: hashKind.value as 'text' | 'hex', value: hashIn.value });
    return outputs([['keccak256', r.keccak256], ['SHA-256', r.sha256], ['Selector', r.selector]]);
  });
  return [card('Number', field('Hex or decimal', num), numOut), card('Text → hex', text, textOut), card('Hex → text', hexText, hexTextOut), card('Hashes', field('Input', hashIn), field('Input is', hashKind), hashOut)];
}

function timestampConverter() {
  const t = input('', '1231006505');
  const now = h('button', { type: 'button', class: 'btn-ghost sm' }, 'Now');
  const out = h('div');
  now.addEventListener('click', () => {
    t.value = String(Math.floor(Date.now() / 1000));
    t.dispatchEvent(new Event('input'));
  });
  live([t], out, () => {
    if (!t.value.trim()) return h('span');
    const r = parseTime(t.value);
    return [h('p', { class: 'muted' }, `Read as ${r.interpretedAs}`), outputs([['Unix seconds', String(r.seconds)], ['Milliseconds', String(r.ms)], ['Hex', `0x${r.seconds.toString(16)}`], ['ISO (UTC)', r.iso], ['Local', r.local], ['Relative', r.relative]])];
  });
  return [field('Timestamp or date', t), now, out];
}

function gasCalculator(settings: ExtSettings) {
  const chain = h('select', { class: 'select' }, EVM_NETWORKS.map((n) => h('option', { value: n.id }, n.name)));
  const gas = input('21000');
  const presets = h('div', { class: 'chips' }, GAS_PRESETS.map((p) => h('button', { type: 'button', class: 'chip', on: { click: () => ((gas.value = p.gas), gas.dispatchEvent(new Event('input'))) } }, p.label)));
  const base = input('', 'gwei');
  const tip = input('', 'gwei (optional)');
  const max = input('', 'gwei (optional)');
  const status = h('p', { class: 'muted' });
  const out = h('div');
  let live_: GasResult | null = null;
  const loadBtn = h('button', { type: 'button', class: 'btn-ghost sm' }, 'Use live gas price');
  loadBtn.addEventListener('click', async () => {
    if (!settings.network) return clear(status, 'Online lookups are off in settings.');
    clear(status, 'Loading…');
    try {
      live_ = live_ ?? (await apiGet<GasResult>('gas', {}));
      const row = live_.evm.find((r) => r.chain.id === chain.value);
      if (!row || row.status !== 'ok') return clear(status, `Unavailable: ${row?.reason ?? 'unknown'}`);
      base.value = row.baseFeeGwei ?? row.gasPriceGwei ?? '';
      tip.value = row.baseFeeGwei ? (row.priorityFeeGwei ?? '0') : '';
      clear(status, `Live from ${row.chain.name}${row.stale ? ' (stale)' : ''}`);
      base.dispatchEvent(new Event('input'));
    } catch (e) {
      clear(status, `Unavailable: ${(e as Error).message}`);
    }
  });
  live([chain, gas, base, tip, max], out, () => {
    if (!base.value) return h('span');
    const net = EVM_NETWORKS.find((n) => n.id === chain.value)!;
    const price = live_ && net.coingecko ? (live_.prices[net.coingecko] ?? null) : null;
    const r = calculateFee({ gasLimit: gas.value, baseFeeGwei: base.value, priorityFeeGwei: tip.value || undefined, maxFeeGwei: max.value || undefined, priceUsd: price });
    return outputs([['Gas price', `${r.effectiveGasPriceGwei} gwei`], [`Fee (${net.symbol})`, r.fee], ['Fee (wei)', r.feeWei], ['Fee (USD)', r.feeUsd !== null ? `$${r.feeUsd.toFixed(2)}` : null], ['Max to hold', r.maxFee]]);
  });
  const vb = input('141');
  const rate = input('', 'sat/vB');
  const btcOut = h('div');
  live([vb, rate], btcOut, () => {
    if (!rate.value) return h('span');
    const r = bitcoinFee(Number(vb.value), Number(rate.value));
    return outputs([['Fee (sats)', String(r.sats)], ['Fee (BTC)', r.btc]]);
  });
  return [
    card('EVM fee', field('Chain', chain), field('Gas limit', gas), presets, field('Base fee / gas price', base), field('Priority fee', tip), field('Max fee', max), h('div', { class: 'row' }, loadBtn, status), out, note('Rollups also charge an L1 data fee not included here.', 'info')),
    card('Bitcoin fee', field('Size (vbytes)', vb), field('Fee rate', rate), btcOut),
  ];
}

function renderCalls(calls: DecodedCall[], guess: string | null) {
  return calls.map((c) =>
    card(
      null,
      h('p', { class: 'mono accent' }, c.fn.signature),
      guess ? h('p', { class: 'warn small' }, guess) : null,
      outputs(c.args.map((a, i) => [`${a.name ?? c.fn.inputs[i]?.name ?? `arg${i}`} (${a.type})`, formatDecoded(a)])),
    ),
  );
}

function abiDecoder(settings: ExtSettings) {
  const data = area('', '0xa9059cbb…');
  const abi = area('', 'JSON ABI or one signature per line (optional)');
  const out = h('div');
  const parseAbi = (t: string): AbiFunction[] => (!t.trim() ? [] : t.trim().startsWith('[') || t.trim().startsWith('{') ? parseJsonAbi(t).functions : t.split('\n').map((l) => l.trim()).filter(Boolean).map(parseSignature));
  live([data, abi], out, () => {
    const d = data.value.trim();
    if (!d) return h('span');
    if (!/^0x[0-9a-fA-F]{8,}$/.test(d)) return errorText('Calldata must be 0x followed by at least a 4-byte selector.');
    const fns = parseAbi(abi.value);
    const calls = decodeCalldata(d, fns.length ? fns : undefined);
    if (calls.length) return renderCalls(calls, fns.length ? null : 'Matched a common signature (no ABI given).');
    const btn = h('button', { type: 'button', class: 'btn-ghost sm' }, 'Look up selector online');
    const res = h('div');
    btn.addEventListener('click', async () => {
      if (!settings.network) return clear(res, note('Online lookups are off in settings.', 'info'));
      clear(res, h('p', { class: 'muted' }, 'Asking openchain.xyz / 4byte.directory…'));
      try {
        const r = await apiGet<{ signatures: string[]; source: string }>('selector', { q: d.slice(0, 10).toLowerCase() });
        const cands = r.signatures.flatMap((s) => {
          try {
            return [parseSignature(s)];
          } catch {
            return [];
          }
        });
        const found = decodeCalldata(d, cands);
        clear(res, ...(found.length ? renderCalls(found, `Community-submitted signature (${r.source}): treat as a guess.`) : [h('p', { class: 'muted' }, 'No submitted signature decodes this data.')]));
      } catch (e) {
        clear(res, errorText((e as Error).message));
      }
    });
    return [h('p', { class: 'muted' }, `Selector ${d.slice(0, 10)} isn't known.`), btn, res];
  });
  const sig = input('transfer(address to, uint256 amount)');
  const args = input('["0x000000000000000000000000000000000000dEaD", "1000000000000000000"]');
  const encOut = h('div');
  live([sig, args], encOut, () => outputs([['Calldata', encodeCall(sig.value, JSON.parse(args.value) as EncodableValue[])]]));
  return [card('Decode', field('Calldata', data), field('ABI', abi), out), card('Encode', field('Function signature', sig), field('Arguments (JSON array)', args), encOut)];
}

function txDecoder() {
  const raw = area('', '0x02f8…');
  const out = h('div');
  live([raw], out, () => {
    if (!raw.value.trim()) return h('span');
    const d = decodeRawTransaction(raw.value);
    const gwei = (w?: string) => (w === undefined ? null : `${formatUnits(BigInt(w), 9)} gwei`);
    return [
      ...d.warnings.map((w) => note(w, 'warn')),
      card(
        d.typeName,
        outputs([
          ['Hash', d.hash],
          ['From (recovered)', d.from],
          ['To', d.to ?? '(contract creation)'],
          ['Chain id', d.chainId === null ? 'none (replayable)' : String(d.chainId)],
          ['Value', `${d.value} (${d.valueWei} wei)`],
          ['Nonce', d.nonce],
          ['Gas limit', d.gasLimit],
          ['Gas price', gwei(d.gasPriceWei)],
          ['Max fee', gwei(d.maxFeePerGasWei)],
          ['Priority fee', gwei(d.maxPriorityFeePerGasWei)],
          ['Data', d.data],
        ]),
      ),
      ...renderCalls(d.call, 'Matched a common signature; a best guess without the ABI.'),
      ...(d.authorizations ?? []).map((a) => card('EIP-7702 authorization', outputs([['Signer', a.signer], ['Delegates to', a.address], ['Chain / nonce', `${a.chainId === '0' ? '0 (any chain!)' : a.chainId} / ${a.nonce}`]]))),
    ];
  });
  return [field('Signed raw transaction', raw, 'Decoded locally; nothing is broadcast.'), out];
}

const TOOL_ICONS: Record<string, IconName> = {
  'unit-converter': 'scales',
  'address-validator': 'checkCircle',
  'hex-converter': 'hash',
  'timestamp-converter': 'clock',
  'gas-calculator': 'gas',
  'abi-decoder': 'brackets',
  'transaction-decoder': 'receipt',
  'gas-tracker': 'gas',
};

function toolTabs(current: string, nav: (hash: string) => void) {
  return h(
    'nav',
    { class: 'chips', 'aria-label': 'Tools' },
    [...TOOLS.map((t) => [t.slug, t.title] as const), ['gas-tracker', 'Gas tracker'] as const].map(([s, title]) =>
      h('button', { type: 'button', class: `chip${s === current ? ' primary' : ''}`, 'aria-current': s === current ? 'page' : undefined, on: { click: () => nav(`#tools/${s}`) } }, icon(TOOL_ICONS[s] ?? 'wrench'), title),
    ),
  );
}

/** Live gas on every supported chain (the website's /gas page). */
function gasTracker(settings: ExtSettings) {
  const out = h('div', null, settings.network ? h('p', { class: 'muted pulse' }, 'Loading live gas prices…') : note('Online lookups are off in settings.', 'info'));
  if (settings.network) {
    apiGet<GasResult>('gas', {})
      .then((g) =>
        clear(
          out,
          h(
            'div',
            { class: 'scroll-x' },
            h(
              'table',
              { class: 'table' },
              h('thead', null, h('tr', null, h('th', null, 'Chain'), h('th', null, 'Gas price (gwei)'), h('th', null, 'Transfer (USD)'))),
              h(
                'tbody',
                null,
                g.evm.map((r) => {
                  const net = EVM_NETWORKS.find((n) => n.id === r.chain.id);
                  const price = net?.coingecko ? g.prices[net.coingecko] : undefined;
                  const eff = r.status === 'ok' ? (r.baseFeeGwei ? Number(r.baseFeeGwei) + Number(r.priorityFeeGwei ?? 0) : Number(r.gasPriceGwei)) : null;
                  return h(
                    'tr',
                    null,
                    h('td', null, r.chain.name),
                    h('td', null, r.status === 'ok' ? `${Number(r.gasPriceGwei) < 0.0001 ? '<0.0001' : Number(Number(r.gasPriceGwei).toPrecision(3)).toString()}${r.stale ? ' (stale)' : ''}` : `unavailable: ${r.reason}`),
                    h('td', null, eff !== null && price !== undefined ? `$${(eff * 1e-9 * 21000 * price).toFixed(4)}` : '—'),
                  );
                }),
              ),
            ),
          ),
          g.bitcoin.status === 'ok'
            ? card('Bitcoin (sat/vB)', outputs([['Next block', String(g.bitcoin.data.fastest)], ['~30 min', String(g.bitcoin.data.halfHour)], ['~1 hour', String(g.bitcoin.data.hour)], ['Economy', String(g.bitcoin.data.economy)]]))
            : note(`Bitcoin fees unavailable: ${g.bitcoin.reason}`, 'warn'),
          h('p', { class: 'source' }, `Public RPCs, mempool.space, CoinGecko · ${new Date(g.fetchedAt).toISOString().slice(11, 19)} UTC. Rollups add an L1 data fee.`),
        ),
      )
      .catch((e: unknown) => clear(out, errorText(failMessage(e))));
  }
  return [out];
}

export function toolsView(slug: string | undefined, settings: ExtSettings, nav: (hash: string) => void): HTMLElement {
  if (slug === 'gas-tracker') {
    return h('div', { class: 'stack' }, toolTabs(slug, nav), h('p', { class: 'label' }, 'Developer tools'), h('h1', { class: 'heading' }, 'Gas tracker'), h('p', { class: 'lead' }, `Live fees on ${EVM_NETWORKS.length} EVM chains and Bitcoin.`), ...gasTracker(settings));
  }
  const tool = TOOLS.find((t) => t.slug === slug) ?? TOOLS[0];
  const tabs = toolTabs(tool.slug, nav);
  return h('div', { class: 'stack' }, tabs, h('p', { class: 'label' }, 'Developer tools'), h('h1', { class: 'heading' }, tool.title), h('p', { class: 'lead' }, tool.description), ...toolBody(tool.slug, settings));
}

/** One tool's controls and live output, without the page chrome (the popup's Tools tab uses it too). */
export function toolBody(slug: ToolSlug, settings: ExtSettings): Node[] {
  switch (slug) {
    case 'unit-converter':
      return unitConverter();
    case 'address-validator':
      return addressValidator();
    case 'hex-converter':
      return hexConverter();
    case 'timestamp-converter':
      return timestampConverter();
    case 'gas-calculator':
      return gasCalculator(settings);
    case 'abi-decoder':
      return abiDecoder(settings);
    case 'transaction-decoder':
      return txDecoder();
  }
}
