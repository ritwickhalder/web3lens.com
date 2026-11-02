/**
 * GoPlus Security public API (free tier, no key): reported-malicious address flags and token risk
 * flags. Only reports what GoPlus says; an empty result is "no reports", never "safe".
 */
import { fetchJson, ProviderError } from '@/lib/providers/http';

const ADDRESS_FLAGS: Record<string, string> = {
  cybercrime: 'Cybercrime',
  money_laundering: 'Money laundering',
  financial_crime: 'Financial crime',
  darkweb_transactions: 'Darkweb transactions',
  phishing_activities: 'Phishing',
  fake_kyc: 'Fake KYC',
  blacklist_doubt: 'Suspected blacklisted',
  stealing_attack: 'Stealing attack',
  blackmail_activities: 'Blackmail',
  sanctioned: 'Sanctioned',
  malicious_mining_activities: 'Malicious mining',
  mixer: 'Mixer',
  fake_token: 'Fake token',
  honeypot_related_address: 'Honeypot-related',
  fake_standard_interface: 'Fake standard interface',
  gas_abuse: 'Gas abuse',
  reinit: 'Re-initialisable contract',
};

export async function goplusAddress(chainId: number, address: string): Promise<{ flags: string[]; dataSource: string | null }> {
  const res = await fetchJson<{ code: number; message: string; result: Record<string, string> | null }>(
    'GoPlus',
    `https://api.gopluslabs.io/api/v1/address_security/${address}?chain_id=${chainId}`,
    { timeoutMs: 8000 },
  );
  if (res.code !== 1 || !res.result) throw new ProviderError('GoPlus', res.message || 'no result');
  const flags = Object.entries(ADDRESS_FLAGS)
    .filter(([k]) => res.result![k] === '1')
    .map(([, label]) => label);
  if (Number(res.result.number_of_malicious_contracts_created ?? 0) > 0) flags.push(`Created ${res.result.number_of_malicious_contracts_created} malicious contract(s)`);
  return { flags, dataSource: res.result.data_source || null };
}

const TOKEN_FLAGS: [key: string, label: string][] = [
  ['is_honeypot', 'Honeypot (buyers may not be able to sell)'],
  ['cannot_sell_all', 'Holders cannot sell all tokens'],
  ['cannot_buy', 'Cannot be bought'],
  ['owner_change_balance', 'Owner can change balances'],
  ['hidden_owner', 'Hidden owner'],
  ['selfdestruct', 'Can self-destruct'],
  ['external_call', 'Makes external calls in transfers'],
  ['is_blacklisted', 'Has a blacklist'],
  ['is_whitelisted', 'Has a whitelist'],
  ['is_mintable', 'Mintable'],
  ['transfer_pausable', 'Transfers can be paused'],
  ['trading_cooldown', 'Trading cooldown'],
  ['slippage_modifiable', 'Tax can be changed'],
  ['personal_slippage_modifiable', 'Tax can be set per address'],
  ['anti_whale_modifiable', 'Anti-whale limits can be changed'],
  ['can_take_back_ownership', 'Ownership can be reclaimed'],
  ['is_airdrop_scam', 'Airdrop scam'],
  ['fake_token', 'Fake token'],
];

export async function goplusToken(
  chainId: number,
  address: string,
): Promise<{ flags: string[]; buyTax: string | null; sellTax: string | null; openSource: boolean | null } | null> {
  const res = await fetchJson<{ code: number; message: string; result: Record<string, Record<string, unknown>> | null }>(
    'GoPlus',
    `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${address}`,
    { timeoutMs: 8000 },
  );
  if (res.code !== 1) throw new ProviderError('GoPlus', res.message || 'no result');
  const t = res.result?.[address.toLowerCase()];
  if (!t || Object.keys(t).length === 0) return null;
  const tax = (v: unknown) => (typeof v === 'string' && v !== '' ? `${Math.round(Number(v) * 10000) / 100}%` : null);
  return {
    flags: TOKEN_FLAGS.filter(([k]) => t[k] === '1').map(([, l]) => l),
    buyTax: tax(t.buy_tax),
    sellTax: tax(t.sell_tax),
    openSource: t.is_open_source === '1' ? true : t.is_open_source === '0' ? false : null,
  };
}
