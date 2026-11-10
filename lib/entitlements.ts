/**
 * Free and Pro limits in one place. Pure and browser-safe: the website, the server routes and the extensions all
 * read the same numbers. The server is the only place that decides which plan a user has (lib/server/membership.ts)
 * and the only place a quota is enforced (lib/server/quota.ts); the UI uses these values to explain limits.
 *
 * Safety stays free for everyone (ROADMAP Phase 7): detection, address/transaction lookups, explorer routing, gas,
 * the developer tools and the basic security checks are never gated.
 */

export type Tier = 'free' | 'pro';
/** What an account holds. "lifetime" is Pro that never ends. */
export type Plan = 'free' | 'pro' | 'lifetime';

export const tierOf = (plan: Plan): Tier => (plan === 'free' ? 'free' : 'pro');

export type ExportFormat = 'csv' | 'json';

export type Limits = {
  /** Values per batch search. */
  batch: number;
  /** EVM rows per batch that get multi-chain balances. */
  batchBalances: number;
  /** Metered cross-chain lookups per UTC day (batch balances, bulk locate; single address pages stay unmetered). */
  crossChainPerDay: number;
  /** Requests per API key per UTC day (Pro); anonymous API use stays on the shared per-IP budget. */
  apiPerDay: number;
  /** Shared per-IP API budget per minute (no key). */
  apiPerMinuteShared: number;
  /** Saved addresses kept in this browser. */
  savedLocal: number;
  /** Saved addresses synced to the account (0 = no cloud sync). */
  savedCloud: number;
  /** Investigations stored in the account (0 = not available). */
  investigations: number;
  exports: readonly ExportFormat[];
};

export const LIMITS: Record<Tier, Limits> = {
  free: {
    batch: 10,
    batchBalances: 5,
    crossChainPerDay: 10,
    apiPerDay: 0,
    apiPerMinuteShared: 60,
    savedLocal: 50,
    savedCloud: 0,
    investigations: 0,
    exports: ['csv'],
  },
  pro: {
    batch: 500,
    batchBalances: 500,
    crossChainPerDay: 500,
    apiPerDay: 1000,
    apiPerMinuteShared: 60,
    savedLocal: 2000,
    savedCloud: 2000,
    investigations: 100,
    exports: ['csv', 'json'],
  },
};

export const limitsFor = (plan: Plan): Limits => LIMITS[tierOf(plan)];

/** Features that are on or off per tier (numbers live in LIMITS). */
export type Feature = 'cloudSync' | 'investigations' | 'jsonExport' | 'apiKeys';

export function canUse(feature: Feature, plan: Plan): boolean {
  const l = limitsFor(plan);
  switch (feature) {
    case 'cloudSync':
      return l.savedCloud > 0;
    case 'investigations':
      return l.investigations > 0;
    case 'jsonExport':
      return l.exports.includes('json');
    case 'apiKeys':
      return l.apiPerDay > 0;
  }
}

/** Metered counters, as stored in usage_counters.metric. */
export type Metric = 'crossChain' | 'api';

export const METRIC_LIMIT: Record<Metric, (l: Limits) => number> = {
  crossChain: (l) => l.crossChainPerDay,
  api: (l) => l.apiPerDay,
};

/** What /api/me returns; the extension caches it (shape checked by sanitizeMe). */
export type MeResponse = {
  signedIn: true;
  user: { id: string; email: string; name: string; image: string | null };
  plan: Plan;
  tier: Tier;
  /** Pro ends (subscription period end, trial end or grant end); null = no end (lifetime) or Free. */
  until: string | null;
  /** Where Pro comes from. */
  source: 'paddle' | 'admin' | 'trial' | 'none';
  /** A subscription will charge again (false = it ends on `until`). */
  renews: boolean;
  /** Paddle's page for updating the card or cancelling (from the subscription's management URLs). */
  manageUrl: string | null;
  limits: Limits;
  usage: Record<Metric, { used: number; limit: number; resetsAt: string }>;
  trial: { status: 'available' | 'active' | 'used'; endsAt: string | null };
  checkedAt: string;
};
