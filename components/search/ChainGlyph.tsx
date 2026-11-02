import NetworkArbitrumOne from '@web3icons/react/icons/networks/NetworkArbitrumOne';
import NetworkBase from '@web3icons/react/icons/networks/NetworkBase';
import NetworkGnosis from '@web3icons/react/icons/networks/NetworkGnosis';
import NetworkLinea from '@web3icons/react/icons/networks/NetworkLinea';
import NetworkOptimism from '@web3icons/react/icons/networks/NetworkOptimism';
import NetworkScroll from '@web3icons/react/icons/networks/NetworkScroll';
import NetworkZksync from '@web3icons/react/icons/networks/NetworkZksync';
import TokenADA from '@web3icons/react/icons/tokens/TokenADA';
import TokenALGO from '@web3icons/react/icons/tokens/TokenALGO';
import TokenAPT from '@web3icons/react/icons/tokens/TokenAPT';
import TokenATOM from '@web3icons/react/icons/tokens/TokenATOM';
import TokenAVAX from '@web3icons/react/icons/tokens/TokenAVAX';
import TokenBAT from '@web3icons/react/icons/tokens/TokenBAT';
import TokenBCH from '@web3icons/react/icons/tokens/TokenBCH';
import TokenBNB from '@web3icons/react/icons/tokens/TokenBNB';
import TokenBTC from '@web3icons/react/icons/tokens/TokenBTC';
import TokenCELO from '@web3icons/react/icons/tokens/TokenCELO';
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
import TokenINJ from '@web3icons/react/icons/tokens/TokenINJ';
import TokenIOTA from '@web3icons/react/icons/tokens/TokenIOTA';
import TokenKNC from '@web3icons/react/icons/tokens/TokenKNC';
import TokenKSM from '@web3icons/react/icons/tokens/TokenKSM';
import TokenLINK from '@web3icons/react/icons/tokens/TokenLINK';
import TokenLSK from '@web3icons/react/icons/tokens/TokenLSK';
import TokenLTC from '@web3icons/react/icons/tokens/TokenLTC';
import TokenMKR from '@web3icons/react/icons/tokens/TokenMKR';
import TokenMNT from '@web3icons/react/icons/tokens/TokenMNT';
import TokenNEAR from '@web3icons/react/icons/tokens/TokenNEAR';
import TokenNEO from '@web3icons/react/icons/tokens/TokenNEO';
import TokenOMG from '@web3icons/react/icons/tokens/TokenOMG';
import TokenONT from '@web3icons/react/icons/tokens/TokenONT';
import TokenOSMO from '@web3icons/react/icons/tokens/TokenOSMO';
import TokenPOL from '@web3icons/react/icons/tokens/TokenPOL';
import TokenQTUM from '@web3icons/react/icons/tokens/TokenQTUM';
import TokenREP from '@web3icons/react/icons/tokens/TokenREP';
import TokenSC from '@web3icons/react/icons/tokens/TokenSC';
import TokenSOL from '@web3icons/react/icons/tokens/TokenSOL';
import TokenSTEEM from '@web3icons/react/icons/tokens/TokenSTEEM';
import TokenSUI from '@web3icons/react/icons/tokens/TokenSUI';
import TokenTIA from '@web3icons/react/icons/tokens/TokenTIA';
import TokenTON from '@web3icons/react/icons/tokens/TokenTON';
import TokenTRX from '@web3icons/react/icons/tokens/TokenTRX';
import TokenUSDC from '@web3icons/react/icons/tokens/TokenUSDC';
import TokenUSDT from '@web3icons/react/icons/tokens/TokenUSDT';
import TokenVET from '@web3icons/react/icons/tokens/TokenVET';
import TokenWAVES from '@web3icons/react/icons/tokens/TokenWAVES';
import TokenXEM from '@web3icons/react/icons/tokens/TokenXEM';
import TokenXLM from '@web3icons/react/icons/tokens/TokenXLM';
import TokenXMR from '@web3icons/react/icons/tokens/TokenXMR';
import TokenXRP from '@web3icons/react/icons/tokens/TokenXRP';
import TokenXTZ from '@web3icons/react/icons/tokens/TokenXTZ';
import TokenXVG from '@web3icons/react/icons/tokens/TokenXVG';
import TokenZEC from '@web3icons/react/icons/tokens/TokenZEC';
import TokenZIL from '@web3icons/react/icons/tokens/TokenZIL';
import TokenZRX from '@web3icons/react/icons/tokens/TokenZRX';
import { chainMeta } from '@/lib/chain-meta';

/** Official coin logos (web3icons) for the chains that have one; imported one by one to keep the bundle small. */
const ICONS: Record<string, React.ComponentType<{ variant?: 'background' | 'mono' | 'branded'; className?: string; 'aria-hidden'?: boolean }>> = {
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
  arbitrum: NetworkArbitrumOne,
  optimism: NetworkOptimism,
  base: NetworkBase,
  avalanche: TokenAVAX,
  linea: NetworkLinea,
  zksync: NetworkZksync,
  scroll: NetworkScroll,
  gnosischain: NetworkGnosis,
  celo: TokenCELO,
  mantle: TokenMNT,
  osmosis: TokenOSMO,
  celestia: TokenTIA,
  injective: TokenINJ,
  kusama: TokenKSM,
  near: TokenNEAR,
  tezos: TokenXTZ,
  toncoin: TokenTON,
  sui: TokenSUI,
  aptos: TokenAPT,
  algorand: TokenALGO,
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
      style={{ color: `color-mix(in oklab, ${color}, var(--color-fg) var(--glyph-mix))`, background: `color-mix(in oklab, ${color} 18%, var(--color-ink-3))` }}
    >
      {symbol.slice(0, size === 'xs' ? 1 : size === 'lg' ? 4 : 3)}
    </span>
  );
}
