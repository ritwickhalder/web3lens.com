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
import { detectLabel, detectNote, relTime, t, type MessageKey } from '../i18n';
import { icon, type IconName } from '../ui';
import type { ExtSettings } from '../store';
import { badge, card, errorText, failMessage, note } from './common';

type Out = [label: string, value: string | null][];

/** lib/tools/gas presets and lib/tools/time kinds, by their English label. */
const PRESETS: Record<string, MessageKey> = {
  'ETH transfer': 'gascalc.preset.ethTransfer',
  'ERC-20 transfer': 'gascalc.preset.erc20Transfer',
  'ERC-20 approve': 'gascalc.preset.erc20Approve',
  'Uniswap swap': 'gascalc.preset.uniswapSwap',
  'NFT mint': 'gascalc.preset.nftMint',
};
const TIME_KINDS: Record<string, MessageKey> = {
  'hex seconds': 'time.kind.hexSeconds',
  nanoseconds: 'time.kind.nanoseconds',
  microseconds: 'time.kind.microseconds',
  milliseconds: 'time.kind.milliseconds',
  seconds: 'time.kind.seconds',
  date: 'time.kind.date',
};

function outputs(rows: Out) {
  return h(
    'div',
    { class: 'outputs' },
    rows.filter(([, v]) => v !== null).map(([l, v]) => h('div', { class: 'output' }, h('span', { class: 'olabel' }, l), h('span', { class: 'mono ovalue', title: v! }, v!), copyBtn(v!, t('common.copy')))),
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
  const family = h('select', { class: 'select' }, h('option', { value: 'evm' }, 'wei / gwei / ether'), h('option', { value: 'btc' }, 'sat / BTC'), h('option', { value: 'sol' }, 'lamport / SOL'), h('option', { value: 'custom' }, t('unit.anyToken')));
  const unit = h('select', { class: 'select' });
  const decimals = input('6');
  const out = h('div');
  const units = () =>
    family.value === 'evm' ? [['wei', 0], ['gwei', 9], ['ether', 18]] : family.value === 'btc' ? [['sat', 0], ['BTC', 8]] : family.value === 'sol' ? [['lamport', 0], ['SOL', 9]] : [[t('unit.rawUnits'), 0], [t('unit.tokens'), Math.min(77, Number(decimals.value) || 0)]];
  const fillUnits = () => clear(unit, ...units().map(([n, d]) => h('option', { value: String(d) }, String(n))));
  fillUnits();
  unit.value = String(units()[units().length - 1][1]);
  family.addEventListener('change', () => (fillUnits(), (unit.value = String(units()[units().length - 1][1]))));
  live([amount, family, unit, decimals], out, () => outputs(units().map(([n, d]) => [String(n), convertUnits(amount.value || '0', Number(unit.value), Number(d))])));
  return [field(t('unit.amount'), amount), field(t('unit.family'), family), field(t('unit.from'), unit), field(t('unit.decimals'), decimals), out];
}

function addressValidator() {
  const q = input('', '0x…, bc1…, T…');
  const out = h('div');
  live([q], out, () => {
    const { query } = extractQuery(q.value);
    if (!query) return h('span');
    const all = detectAll(query);
    if (!all.length) return errorText(t('validator.invalid'));
    return all.map((d) => {
      const s = d.kind === 'address' ? checkSanctions(d.normalized) : null;
      return card(
        detectLabel(d.label),
        d.kind === 'secret' ? note(detectNote(d.note!), 'danger') : h('div', { class: 'row wrap' }, badge(d.checksum === 'valid' ? t('validator.checksumValid') : d.checksum === 'invalid' ? t('validator.checksumInvalid') : d.checksum === 'none' ? t('validator.noChecksum') : t('validator.formatOnly'), d.checksum === 'valid' ? 'good' : d.checksum === 'invalid' ? 'danger' : 'neutral'), s ? badge(s.listed ? t('search.ofacListed') : t('validator.notOnOfac'), s.listed ? 'danger' : 'neutral') : null),
        d.kind !== 'secret' ? outputs([[t('validator.normalised'), d.normalized]]) : null,
        d.chains.length ? h('p', { class: 'muted' }, d.chains.map((c) => getChain(c)?.name ?? c).join(', ')) : null,
      );
    });
  });
  return [field(t('validator.field'), q, t('validator.hint')), out];
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
    return outputs([[t('hex.decimal'), dec], ['Hex', hex], ['int256', signed !== dec ? signed : null]]);
  });
  const text = area('Hello, Web3Lens');
  const textOut = h('div');
  live([text], textOut, () => outputs([['Hex', textToHex(text.value)]]));
  const hexText = area('', '0x48656c6c6f');
  const hexTextOut = h('div');
  live([hexText], hexTextOut, () => (hexText.value.trim() ? outputs([[t('hex.text'), hexToText(hexText.value)]]) : h('span')));
  const hashIn = input('transfer(address,uint256)');
  const hashKind = h('select', { class: 'select' }, h('option', { value: 'text' }, t('hex.textOption')), h('option', { value: 'hex' }, t('hex.hexBytes')));
  const hashOut = h('div');
  live([hashIn, hashKind], hashOut, () => {
    const r = hashes({ kind: hashKind.value as 'text' | 'hex', value: hashIn.value });
    return outputs([['keccak256', r.keccak256], ['SHA-256', r.sha256], [t('hex.selector'), r.selector]]);
  });
  return [card(t('hex.number'), field(t('hex.hexOrDecimal'), num), numOut), card(t('hex.textToHex'), text, textOut), card(t('hex.hexToText'), hexText, hexTextOut), card(t('hex.hashes'), field(t('hex.input'), hashIn), field(t('hex.inputIs'), hashKind), hashOut)];
}

function timestampConverter() {
  const ts = input('', '1231006505');
  const now = h('button', { type: 'button', class: 'btn-ghost sm' }, t('time.now'));
  const out = h('div');
  now.addEventListener('click', () => {
    ts.value = String(Math.floor(Date.now() / 1000));
    ts.dispatchEvent(new Event('input'));
  });
  live([ts], out, () => {
    if (!ts.value.trim()) return h('span');
    const r = parseTime(ts.value);
    return [h('p', { class: 'muted' }, t('time.readAs', { kind: TIME_KINDS[r.interpretedAs] ? t(TIME_KINDS[r.interpretedAs]) : r.interpretedAs })), outputs([[t('time.unixSeconds'), String(r.seconds)], [t('time.milliseconds'), String(r.ms)], ['Hex', `0x${r.seconds.toString(16)}`], ['ISO (UTC)', r.iso], [t('time.local'), r.local], [t('time.relative'), relTime(r.ms)]])];
  });
  return [field(t('time.field'), ts), now, out];
}

function gasCalculator(settings: ExtSettings) {
  const chain = h('select', { class: 'select' }, EVM_NETWORKS.map((n) => h('option', { value: n.id }, n.name)));
  const gas = input('21000');
  const presets = h('div', { class: 'chips' }, GAS_PRESETS.map((p) => h('button', { type: 'button', class: 'chip', on: { click: () => ((gas.value = p.gas), gas.dispatchEvent(new Event('input'))) } }, PRESETS[p.label] ? t(PRESETS[p.label]) : p.label)));
  const base = input('', 'gwei');
  const tip = input('', t('gascalc.optional'));
  const max = input('', t('gascalc.optional'));
  const status = h('p', { class: 'muted' });
  const out = h('div');
  let live_: GasResult | null = null;
  const loadBtn = h('button', { type: 'button', class: 'btn-ghost sm' }, t('gascalc.useLive'));
  loadBtn.addEventListener('click', async () => {
    if (!settings.network) return clear(status, t('common.offInSettings'));
    clear(status, t('common.loading'));
    try {
      live_ = live_ ?? (await apiGet<GasResult>('gas', {}));
      const row = live_.evm.find((r) => r.chain.id === chain.value);
      if (!row || row.status !== 'ok') return clear(status, t('common.unavailableCap', { reason: row?.reason ?? t('common.unknown') }));
      base.value = row.baseFeeGwei ?? row.gasPriceGwei ?? '';
      tip.value = row.baseFeeGwei ? (row.priorityFeeGwei ?? '0') : '';
      clear(status, `${t('gascalc.liveFrom', { chain: row.chain.name })}${row.stale ? ` ${t('common.staleParen')}` : ''}`);
      base.dispatchEvent(new Event('input'));
    } catch (e) {
      clear(status, t('common.unavailableCap', { reason: (e as Error).message }));
    }
  });
  live([chain, gas, base, tip, max], out, () => {
    if (!base.value) return h('span');
    const net = EVM_NETWORKS.find((n) => n.id === chain.value)!;
    const price = live_ && net.coingecko ? (live_.prices[net.coingecko] ?? null) : null;
    const r = calculateFee({ gasLimit: gas.value, baseFeeGwei: base.value, priorityFeeGwei: tip.value || undefined, maxFeeGwei: max.value || undefined, priceUsd: price });
    return outputs([[t('gascalc.gasPrice'), `${r.effectiveGasPriceGwei} gwei`], [t('gascalc.feeSymbol', { symbol: net.symbol }), r.fee], [t('gascalc.feeWei'), r.feeWei], [t('gascalc.feeUsd'), r.feeUsd !== null ? `$${r.feeUsd.toFixed(2)}` : null], [t('gascalc.maxToHold'), r.maxFee]]);
  });
  const vb = input('141');
  const rate = input('', 'sat/vB');
  const btcOut = h('div');
  live([vb, rate], btcOut, () => {
    if (!rate.value) return h('span');
    const r = bitcoinFee(Number(vb.value), Number(rate.value));
    return outputs([[t('gascalc.feeSats'), String(r.sats)], [t('gascalc.feeBtc'), r.btc]]);
  });
  return [
    card(t('gascalc.evmFee'), field(t('gas.chain'), chain), field(t('gascalc.gasLimit'), gas), presets, field(t('gascalc.baseFee'), base), field(t('gascalc.priorityFee'), tip), field(t('gascalc.maxFee'), max), h('div', { class: 'row' }, loadBtn, status), out, note(t('gascalc.l1Note'), 'info')),
    card(t('gascalc.btcFee'), field(t('gascalc.size'), vb), field(t('gascalc.feeRate'), rate), btcOut),
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
  const abi = area('', t('abi.abiPlaceholder'));
  const out = h('div');
  const parseAbi = (t: string): AbiFunction[] => (!t.trim() ? [] : t.trim().startsWith('[') || t.trim().startsWith('{') ? parseJsonAbi(t).functions : t.split('\n').map((l) => l.trim()).filter(Boolean).map(parseSignature));
  live([data, abi], out, () => {
    const d = data.value.trim();
    if (!d) return h('span');
    if (!/^0x[0-9a-fA-F]{8,}$/.test(d)) return errorText(t('abi.badCalldata'));
    const fns = parseAbi(abi.value);
    const calls = decodeCalldata(d, fns.length ? fns : undefined);
    if (calls.length) return renderCalls(calls, fns.length ? null : t('abi.commonMatch'));
    const btn = h('button', { type: 'button', class: 'btn-ghost sm' }, t('abi.lookupSelector'));
    const res = h('div');
    btn.addEventListener('click', async () => {
      if (!settings.network) return clear(res, note(t('common.offInSettings'), 'info'));
      clear(res, h('p', { class: 'muted' }, t('abi.asking')));
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
        clear(res, ...(found.length ? renderCalls(found, t('abi.community', { source: r.source })) : [h('p', { class: 'muted' }, t('abi.noneDecodes'))]));
      } catch (e) {
        clear(res, errorText((e as Error).message));
      }
    });
    return [h('p', { class: 'muted' }, t('abi.unknownSelector', { selector: d.slice(0, 10) })), btn, res];
  });
  const sig = input('transfer(address to, uint256 amount)');
  const args = input('["0x000000000000000000000000000000000000dEaD", "1000000000000000000"]');
  const encOut = h('div');
  live([sig, args], encOut, () => outputs([[t('abi.calldata'), encodeCall(sig.value, JSON.parse(args.value) as EncodableValue[])]]));
  return [card(t('abi.decode'), field(t('abi.calldata'), data), field('ABI', abi), out), card(t('abi.encode'), field(t('abi.signature'), sig), field(t('abi.args'), args), encOut)];
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
          [t('txdec.hash'), d.hash],
          [t('txdec.fromRecovered'), d.from],
          [t('result.to'), d.to ?? t('txdec.creation')],
          [t('txdec.chainId'), d.chainId === null ? t('txdec.replayable') : String(d.chainId)],
          [t('result.value'), `${d.value} (${d.valueWei} wei)`],
          [t('txdec.nonce'), d.nonce],
          [t('gascalc.gasLimit'), d.gasLimit],
          [t('gascalc.gasPrice'), gwei(d.gasPriceWei)],
          [t('gascalc.maxFee'), gwei(d.maxFeePerGasWei)],
          [t('gascalc.priorityFee'), gwei(d.maxPriorityFeePerGasWei)],
          [t('txdec.data'), d.data],
        ]),
      ),
      ...renderCalls(d.call, t('txdec.bestGuess')),
      ...(d.authorizations ?? []).map((a) => card(t('txdec.authorization'), outputs([[t('result.signer'), a.signer], [t('txdec.delegatesTo'), a.address], [t('txdec.chainNonce'), `${a.chainId === '0' ? t('txdec.anyChain') : a.chainId} / ${a.nonce}`]]))),
    ];
  });
  return [field(t('txdec.field'), raw, t('txdec.hint')), out];
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
    { class: 'chips', 'aria-label': t('common.tools') },
    [...TOOLS.map((x) => [x.slug, t(`tool.${x.slug}.title`)] as const), ['gas-tracker', t('common.gasTracker')] as const].map(([s, title]) =>
      h('button', { type: 'button', class: `chip${s === current ? ' primary' : ''}`, 'aria-current': s === current ? 'page' : undefined, on: { click: () => nav(`#tools/${s}`) } }, icon(TOOL_ICONS[s] ?? 'wrench'), title),
    ),
  );
}

/** Live gas on every supported chain (the website's /gas page). */
function gasTracker(settings: ExtSettings) {
  const out = h('div', null, settings.network ? h('p', { class: 'muted pulse' }, t('gas.loading')) : note(t('common.offInSettings'), 'info'));
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
              h('thead', null, h('tr', null, h('th', null, t('gas.chain')), h('th', null, t('gas.priceCol')), h('th', null, t('gas.transferCol')))),
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
                    h('td', null, r.status === 'ok' ? `${Number(r.gasPriceGwei) < 0.0001 ? '<0.0001' : Number(Number(r.gasPriceGwei).toPrecision(3)).toString()}${r.stale ? ` ${t('common.staleParen')}` : ''}` : t('common.unavailableReason', { reason: r.reason ?? t('common.unknown') })),
                    h('td', null, eff !== null && price !== undefined ? `$${(eff * 1e-9 * 21000 * price).toFixed(4)}` : '—'),
                  );
                }),
              ),
            ),
          ),
          g.bitcoin.status === 'ok'
            ? card(t('gas.btcCard'), outputs([[t('gas.nextBlock'), String(g.bitcoin.data.fastest)], [t('gas.halfHour'), String(g.bitcoin.data.halfHour)], [t('gas.hour'), String(g.bitcoin.data.hour)], [t('gas.economy'), String(g.bitcoin.data.economy)]]))
            : note(t('gas.btcUnavailable', { reason: g.bitcoin.reason }), 'warn'),
          h('p', { class: 'source' }, t('gas.source', { time: new Date(g.fetchedAt).toISOString().slice(11, 19) })),
        ),
      )
      .catch((e: unknown) => clear(out, errorText(failMessage(e))));
  }
  return [out];
}

export function toolsView(slug: string | undefined, settings: ExtSettings, nav: (hash: string) => void): HTMLElement {
  if (slug === 'gas-tracker') {
    return h('div', { class: 'stack' }, toolTabs(slug, nav), h('p', { class: 'label' }, t('common.developerTools')), h('h1', { class: 'heading' }, t('common.gasTracker')), h('p', { class: 'lead' }, `${t('common.liveFees', { count: EVM_NETWORKS.length })}.`), ...gasTracker(settings));
  }
  const tool = TOOLS.find((x) => x.slug === slug) ?? TOOLS[0];
  const tabs = toolTabs(tool.slug, nav);
  return h('div', { class: 'stack' }, tabs, h('p', { class: 'label' }, t('common.developerTools')), h('h1', { class: 'heading' }, t(`tool.${tool.slug}.title`)), h('p', { class: 'lead' }, t(`tool.${tool.slug}.description`)), ...toolBody(tool.slug, settings));
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
