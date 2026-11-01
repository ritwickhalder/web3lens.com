import TokenADA from '@web3icons/react/icons/tokens/TokenADA';
import TokenATOM from '@web3icons/react/icons/tokens/TokenATOM';
import TokenBAT from '@web3icons/react/icons/tokens/TokenBAT';
import TokenBCH from '@web3icons/react/icons/tokens/TokenBCH';
import TokenBNB from '@web3icons/react/icons/tokens/TokenBNB';
import TokenBTC from '@web3icons/react/icons/tokens/TokenBTC';
import TokenDASH from '@web3icons/react/icons/tokens/TokenDASH';
import TokenDCR from '@web3icons/react/icons/tokens/TokenDCR';
import TokenDGB from '@web3icons/react/icons/tokens/TokenDGB';
import TokenDOGE from '@web3icons/react/icons/tokens/TokenDOGE';
import TokenDOT from '@web3icons/react/icons/tokens/TokenDOT';
import TokenEOS from '@web3icons/react/icons/tokens/TokenEOS';
import TokenETC from '@web3icons/react/icons/tokens/TokenETC';
import TokenETH from '@web3icons/react/icons/tokens/TokenETH';
import TokenICP from '@web3icons/react/icons/tokens/TokenICP';
import TokenICX from '@web3icons/react/icons/tokens/TokenICX';
import TokenIOTA from '@web3icons/react/icons/tokens/TokenIOTA';
import TokenKNC from '@web3icons/react/icons/tokens/TokenKNC';
import TokenLINK from '@web3icons/react/icons/tokens/TokenLINK';
import TokenLSK from '@web3icons/react/icons/tokens/TokenLSK';
import TokenLTC from '@web3icons/react/icons/tokens/TokenLTC';
import TokenMKR from '@web3icons/react/icons/tokens/TokenMKR';
import TokenNEO from '@web3icons/react/icons/tokens/TokenNEO';
import TokenOMG from '@web3icons/react/icons/tokens/TokenOMG';
import TokenONT from '@web3icons/react/icons/tokens/TokenONT';
import TokenPOL from '@web3icons/react/icons/tokens/TokenPOL';
import TokenQTUM from '@web3icons/react/icons/tokens/TokenQTUM';
import TokenREP from '@web3icons/react/icons/tokens/TokenREP';
import TokenSC from '@web3icons/react/icons/tokens/TokenSC';
import TokenSOL from '@web3icons/react/icons/tokens/TokenSOL';
import TokenSTEEM from '@web3icons/react/icons/tokens/TokenSTEEM';
import TokenTRX from '@web3icons/react/icons/tokens/TokenTRX';
import TokenUSDC from '@web3icons/react/icons/tokens/TokenUSDC';
import TokenUSDT from '@web3icons/react/icons/tokens/TokenUSDT';
import TokenVET from '@web3icons/react/icons/tokens/TokenVET';
import TokenWAVES from '@web3icons/react/icons/tokens/TokenWAVES';
import TokenXEM from '@web3icons/react/icons/tokens/TokenXEM';
import TokenXLM from '@web3icons/react/icons/tokens/TokenXLM';
import TokenXMR from '@web3icons/react/icons/tokens/TokenXMR';
import TokenXRP from '@web3icons/react/icons/tokens/TokenXRP';
import TokenXVG from '@web3icons/react/icons/tokens/TokenXVG';
import TokenZEC from '@web3icons/react/icons/tokens/TokenZEC';
import TokenZIL from '@web3icons/react/icons/tokens/TokenZIL';
import TokenZRX from '@web3icons/react/icons/tokens/TokenZRX';
import { chainMeta } from '@/lib/chain-meta';

/** Official coin logos (web3icons) for the chains that have one; imported one by one to keep the bundle small. */
const ICONS: Record<string, typeof TokenBTC> = {
  bitcoin: TokenBTC,
  ethereum: TokenETH,
  solana: TokenSOL,
  binancecoin: TokenBNB,
  polygon: TokenPOL,
  tron: TokenTRX,
  ripple: TokenXRP,
  cardano: TokenADA,
  cosmos: TokenATOM,
  litecoin: TokenLTC,
  dogecoin: TokenDOGE,
  polkadot: TokenDOT,
  stellar: TokenXLM,
  monero: TokenXMR,
  bitcoincash: TokenBCH,
  tether: TokenUSDT,
  usdc: TokenUSDC,
  ethereumclassic: TokenETC,
  internetcomputer: TokenICP,
  eos: TokenEOS,
  neo: TokenNEO,
  iota: TokenIOTA,
  dash: TokenDASH,
  zcash: TokenZEC,
  nem: TokenXEM,
  vechain: TokenVET,
  qtum: TokenQTUM,
  ontology: TokenONT,
  waves: TokenWAVES,
  zilliqa: TokenZIL,
  digibyte: TokenDGB,
  siacoin: TokenSC,
  steem: TokenSTEEM,
  lisk: TokenLSK,
  omisego: TokenOMG,
  bat: TokenBAT,
  '0x': TokenZRX,
  augur: TokenREP,
  maker: TokenMKR,
  verge: TokenXVG,
  chainlink: TokenLINK,
  kybernetwork: TokenKNC,
  icon: TokenICX,
  decred: TokenDCR,
};

const SIZES = { xs: 'size-5 text-[8px]', sm: 'size-6 text-[9px]', md: 'size-8 text-[10px]', lg: 'size-11 text-xs' };

export function hasChainIcon(id: string) {
  return id in ICONS;
}

/** Round coin badge: the official logo when we have one, otherwise the ticker on a tinted disc. */
export function ChainGlyph({ id, name, size = 'md' }: { id: string; name: string; size?: keyof typeof SIZES }) {
  const Icon = ICONS[id];
  if (Icon) {
    return <Icon aria-hidden variant="background" className={`${SIZES[size]} shrink-0 rounded-full`} />;
  }
  const { symbol, color } = chainMeta(id, name);
  return (
    <span
      aria-hidden
      className={`${SIZES[size]} grid shrink-0 place-items-center rounded-full font-extrabold tracking-tight`}
      style={{ color, background: `color-mix(in oklab, ${color} 18%, var(--color-ink-3))` }}
    >
      {symbol.slice(0, size === 'xs' ? 1 : size === 'lg' ? 4 : 3)}
    </span>
  );
}
