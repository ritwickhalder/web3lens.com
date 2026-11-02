/**
 * Common function signatures for decoding calldata without a verified ABI. Selectors are computed
 * from the text with keccak256 (never hard-coded), so a typo can only cause a miss, not a wrong label.
 * Several functions can share a selector; all matches are offered.
 */
import { decodeParams, parseSignature, type AbiFunction, type DecodedValue } from '@/lib/evm/abi';

export const KNOWN_SIGNATURES = [
  // ERC-20
  'transfer(address to,uint256 amount)',
  'transferFrom(address from,address to,uint256 amount)',
  'approve(address spender,uint256 amount)',
  'increaseAllowance(address spender,uint256 addedValue)',
  'decreaseAllowance(address spender,uint256 subtractedValue)',
  'permit(address owner,address spender,uint256 value,uint256 deadline,uint8 v,bytes32 r,bytes32 s)',
  'balanceOf(address account)',
  'allowance(address owner,address spender)',
  'totalSupply()',
  'mint(address to,uint256 amount)',
  'burn(uint256 amount)',
  // WETH
  'deposit()',
  'withdraw(uint256 wad)',
  // ERC-721 / ERC-1155
  'safeTransferFrom(address from,address to,uint256 tokenId)',
  'safeTransferFrom(address from,address to,uint256 tokenId,bytes data)',
  'setApprovalForAll(address operator,bool approved)',
  'safeTransferFrom(address from,address to,uint256 id,uint256 amount,bytes data)',
  'safeBatchTransferFrom(address from,address to,uint256[] ids,uint256[] amounts,bytes data)',
  // Ownership / admin
  'transferOwnership(address newOwner)',
  'renounceOwnership()',
  'upgradeTo(address newImplementation)',
  'upgradeToAndCall(address newImplementation,bytes data)',
  'pause()',
  'unpause()',
  // Uniswap V2 router
  'swapExactTokensForTokens(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline)',
  'swapTokensForExactTokens(uint256 amountOut,uint256 amountInMax,address[] path,address to,uint256 deadline)',
  'swapExactETHForTokens(uint256 amountOutMin,address[] path,address to,uint256 deadline)',
  'swapExactTokensForETH(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline)',
  'swapExactETHForTokensSupportingFeeOnTransferTokens(uint256 amountOutMin,address[] path,address to,uint256 deadline)',
  'swapExactTokensForETHSupportingFeeOnTransferTokens(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline)',
  'swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline)',
  'addLiquidity(address tokenA,address tokenB,uint256 amountADesired,uint256 amountBDesired,uint256 amountAMin,uint256 amountBMin,address to,uint256 deadline)',
  'addLiquidityETH(address token,uint256 amountTokenDesired,uint256 amountTokenMin,uint256 amountETHMin,address to,uint256 deadline)',
  'removeLiquidity(address tokenA,address tokenB,uint256 liquidity,uint256 amountAMin,uint256 amountBMin,address to,uint256 deadline)',
  // Uniswap V3 / Universal Router / Permit2
  'exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params)',
  'exactInput((bytes path,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum) params)',
  'multicall(bytes[] data)',
  'multicall(uint256 deadline,bytes[] data)',
  'execute(bytes commands,bytes[] inputs,uint256 deadline)',
  'execute(bytes commands,bytes[] inputs)',
  'approve(address token,address spender,uint160 amount,uint48 expiration)',
  'lockdown((address token,address spender)[] approvals)',
  // Multicall3
  'aggregate((address target,bytes callData)[] calls)',
  'aggregate3((address target,bool allowFailure,bytes callData)[] calls)',
  'tryAggregate(bool requireSuccess,(address target,bytes callData)[] calls)',
  // Safe
  'execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures)',
  // ENS
  'setName(string name)',
  'setAddr(bytes32 node,address a)',
  'commit(bytes32 commitment)',
  // Bridges / misc
  'depositETH(uint32 l2Gas,bytes data)',
  'bridgeETHTo(address to,uint32 minGasLimit,bytes extraData)',
  'claim(address account,uint256 amount,bytes32[] merkleProof)',
  'claim(uint256 index,address account,uint256 amount,bytes32[] merkleProof)',
  'stake(uint256 amount)',
  'unstake(uint256 amount)',
  'getReward()',
  'exit()',
];

let table: Map<string, AbiFunction[]> | null = null;

export function knownFunctions(): Map<string, AbiFunction[]> {
  if (!table) {
    table = new Map();
    for (const sig of KNOWN_SIGNATURES) {
      const fn = parseSignature(sig);
      table.set(fn.selector, [...(table.get(fn.selector) ?? []), fn]);
    }
  }
  return table;
}

export type DecodedCall = { fn: AbiFunction; args: DecodedValue[] };

/** Decodes calldata against `functions` (defaults to the known list). Returns every function whose params decode cleanly. */
export function decodeCalldata(data: string, functions?: AbiFunction[]): DecodedCall[] {
  const hex = data.trim().toLowerCase();
  if (!/^0x[0-9a-f]*$/.test(hex) || hex.length < 10 || hex.length % 2) return [];
  const selector = hex.slice(0, 10);
  const candidates = functions ? functions.filter((f) => f.selector === selector) : (knownFunctions().get(selector) ?? []);
  const out: DecodedCall[] = [];
  for (const fn of candidates) {
    try {
      out.push({ fn, args: decodeParams(fn.inputs, `0x${hex.slice(10)}`) });
    } catch {
      // Selector collision or malformed data: not this function.
    }
  }
  return out;
}
