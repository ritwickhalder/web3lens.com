/**
 * Well-known approval spenders (routers, Permit2, marketplaces), for labelling approvals. A label
 * only says who the contract is; it is not an endorsement. Addresses are the same on most EVM chains.
 */
export const KNOWN_SPENDERS: Record<string, string> = {
  '0x000000000022d473030f116ddee9f6b43ac78ba3': 'Uniswap Permit2',
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 SwapRouter',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap SwapRouter02',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap Universal Router',
  '0x66a9893cc07d91d95644aedd05d03f95e1dba8af': 'Uniswap Universal Router v4',
  '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch Router v5',
  '0x111111125421ca6dc452d289314280a0f8842a65': '1inch Router v6',
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x Exchange Proxy',
  '0x00000000000000adc04c56bf30ac9d3c0aaf14dc': 'OpenSea Seaport 1.5',
  '0x0000000000000068f116a894984e2db1123eb395': 'OpenSea Seaport 1.6',
  '0x1e0049783f008a0085193e00003d00cd54003c71': 'OpenSea Conduit',
};

export function spenderLabel(address: string): string | null {
  return KNOWN_SPENDERS[address.toLowerCase()] ?? null;
}
