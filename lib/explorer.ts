import healthJson from '@/data/explorer-health.json';
import { explorerRoutes, formatChainIds, type Chain, type ExplorerRoute, type QueryKind } from '@/lib/chains';
import { detectAll, type Detection } from '@/lib/detect';

export type ExplorerAction =
  | { kind: 'url'; href: string }
  | { kind: 'form'; action: string; method: 'get' | 'post'; param: string; value: string };

/** Pure: what the legacy site did when searching `query` on `chain`. Kept for the parity test and as the fallback. */
export function resolveLegacyExplorer(chain: Chain, query: string): ExplorerAction {
  const q = query.trim();
  const { explorer } = chain;
  switch (explorer.kind) {
    case 'url':
      return { kind: 'url', href: explorer.url.replace('{q}', encodeURIComponent(q)) };
    case 'form':
      return { kind: 'form', action: explorer.action, method: explorer.method, param: explorer.param, value: q };
    case 'google':
      return {
        kind: 'url',
        href: `https://www.google.com/search?q=${encodeURIComponent(`${explorer.terms} ${q}`)}`,
      };
  }
}

export function fallbackNotice(chain: Chain): string {
  return `${chain.name} is one of the very few blockchains not yet supported. Redirecting you to a ${chain.name} explorer instead...`;
}

// ---------------------------------------------------------------------------------------------
// URL validation

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|\[)/i;

/** Problems with an explorer URL template, empty when it's fine. `allowHttp` is for legacy explorers only. */
export function templateProblems(template: string, { allowHttp = false, requireQ = true } = {}): string[] {
  const problems: string[] = [];
  const parts = template.split('{q}').length - 1;
  if (requireQ && parts !== 1) problems.push(`must contain {q} exactly once (found ${parts})`);
  if (!requireQ && parts > 1) problems.push('contains {q} more than once');
  let url: URL;
  try {
    url = new URL(template.replace('{q}', 'test'));
  } catch {
    return [...problems, 'is not a valid URL'];
  }
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) problems.push(`uses ${url.protocol} instead of https:`);
  if (PRIVATE_HOST.test(url.hostname)) problems.push('points at a private or local host');
  if (url.username || url.password) problems.push('contains credentials');
  return problems;
}

/** Final safety net before anything is opened: only http(s) to a public host. */
export function isSafeExternalUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !PRIVATE_HOST.test(url.hostname) && !url.username;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// Health data (scripts/check-explorers.mjs writes data/explorer-health.json)

export type HostHealth = { ok: boolean; https: boolean; status: number | null; error?: string };
type HealthFile = { checkedAt: string | null; hosts: Record<string, HostHealth> };
const HEALTH = healthJson as HealthFile;

export function explorerHealthCheckedAt(): string | null {
  return HEALTH.checkedAt;
}

export function hostHealth(href: string): HostHealth | undefined {
  try {
    return HEALTH.hosts[new URL(href).hostname];
  } catch {
    return undefined;
  }
}

/** Upgrades an http:// explorer to https:// when the last health check found https working there. */
function upgradeHttp(href: string): string {
  if (!href.startsWith('http://')) return href;
  return hostHealth(href)?.https ? `https://${href.slice('http://'.length)}` : href;
}

/** True when the chain has no per-type routes and its only (legacy) explorer didn't respond at the last check. */
export function explorerDown(chain: Chain): boolean {
  if (explorerRoutes(chain).length) return false;
  const e = chain.explorer;
  const href = e.kind === 'url' ? e.url.replace('{q}', '') : e.kind === 'form' ? e.action : null;
  return href ? hostHealth(href)?.ok === false : false;
}

// ---------------------------------------------------------------------------------------------
// Per-type routing

export function toQueryKind(detection: Detection | null | undefined): QueryKind {
  switch (detection?.kind) {
    case 'address':
      return 'address';
    case 'transaction':
      return 'tx';
    case 'block':
      return 'block';
    case 'name':
      return 'name';
    default:
      return 'search';
  }
}

/** The detection of `query` that applies to `chain`, if any. */
export function detectionFor(chain: Chain, query: string): Detection | null {
  const ids = formatChainIds(chain);
  return detectAll(query).find((d) => d.chains.some((c) => ids.includes(c))) ?? null;
}

function appliesTo(d: Detection, chain: Chain): boolean {
  const ids = formatChainIds(chain);
  return d.chains.some((c) => ids.includes(c));
}

export type ResolvedSearch = {
  action: ExplorerAction;
  /** Explorer name when a per-type route was used (e.g. "Etherscan"); undefined for the legacy route. */
  explorer?: string;
  /** Page type that was opened. `search` = the explorer's own search (or the legacy route). */
  kind: QueryKind;
  /** The explorer's host didn't respond at the last health check. */
  unreachable?: { checkedAt: string | null; error?: string };
  /** The legacy route is the only option and the old site flagged the chain as unsupported. */
  fallback?: boolean;
};

function templateFor(route: ExplorerRoute, kind: QueryKind): string | undefined {
  if (kind === 'name') return route.names ?? route.search;
  if (kind === 'search') return route.search;
  return route[kind] ?? route.search;
}

function withHealth(action: ExplorerAction): Pick<ResolvedSearch, 'unreachable'> {
  const href = action.kind === 'url' ? action.href : action.action;
  const h = hostHealth(href);
  return h && !h.ok ? { unreachable: { checkedAt: HEALTH.checkedAt, error: h.error } } : {};
}

/**
 * What searching `query` on `chain` should open: the right page type (address / tx / block) on the
 * preferred explorer when per-type routes exist, otherwise the legacy explorer route.
 */
export function resolveExplorer(
  chain: Chain,
  query: string,
  { explorer, detection }: { explorer?: string; detection?: Detection | null } = {},
): ResolvedSearch {
  const d = detection === undefined ? detectionFor(chain, query) : detection && appliesTo(detection, chain) ? detection : null;
  const q = (d?.normalized ?? query).trim();
  const kind = toQueryKind(d);
  const routes = explorerRoutes(chain);
  const ordered = explorer ? [...routes.filter((r) => r.name === explorer), ...routes.filter((r) => r.name !== explorer)] : routes;
  for (const route of ordered) {
    const template = templateFor(route, kind);
    if (!template) continue;
    const action: ExplorerAction = { kind: 'url', href: template.replace('{q}', encodeURIComponent(q)) };
    return { action, explorer: route.name, kind: template === route.search && kind !== 'search' ? 'search' : kind, ...withHealth(action) };
  }
  const legacy = resolveLegacyExplorer(chain, q);
  const action: ExplorerAction = legacy.kind === 'url' ? { kind: 'url', href: upgradeHttp(legacy.href) } : { ...legacy, action: upgradeHttp(legacy.action) };
  return { action, kind: 'search', fallback: chain.fallback, ...withHealth(action) };
}

export type ExplorerLink = { name: string; href: string; kind: QueryKind; unreachable?: boolean };

/** Direct links for `query` on every explorer known for `chain` (for result pages and the extensions). */
export function explorerLinks(chain: Chain, query: string, detection?: Detection | null): ExplorerLink[] {
  const d = detection === undefined ? detectionFor(chain, query) : detection && appliesTo(detection, chain) ? detection : null;
  const kind = toQueryKind(d);
  const q = (d?.normalized ?? query).trim();
  const links: ExplorerLink[] = [];
  for (const route of explorerRoutes(chain)) {
    const template = templateFor(route, kind);
    if (!template) continue;
    const href = template.replace('{q}', encodeURIComponent(q));
    links.push({ name: route.name, href, kind, unreachable: hostHealth(href)?.ok === false });
  }
  if (links.length === 0) {
    const legacy = resolveLegacyExplorer(chain, q);
    if (legacy.kind === 'url') {
      const href = upgradeHttp(legacy.href);
      links.push({ name: new URL(href).hostname.replace(/^www\./, ''), href, kind: 'search', unreachable: hostHealth(href)?.ok === false });
    }
  }
  return links;
}

/** A web search for the chain's explorer, offered when the known explorer looks dead. */
export function webSearchLink(chain: Chain, query: string): string {
  return `https://duckduckgo.com/?q=${encodeURIComponent(`${chain.name} block explorer ${query.trim()}`)}`;
}

/**
 * Opens the explorer in a new tab. Call it straight from a click/submit handler so the
 * browser treats the new tab as user-initiated and doesn't block it.
 */
export function openExplorer(action: ExplorerAction): void {
  if (action.kind === 'url') {
    if (!isSafeExternalUrl(action.href)) return;
    window.open(action.href, '_blank', 'noopener,noreferrer');
    return;
  }
  if (!isSafeExternalUrl(action.action)) return;
  const form = document.createElement('form');
  form.method = action.method;
  form.action = action.action;
  form.target = '_blank';
  form.rel = 'noopener noreferrer';
  form.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = action.param;
  input.value = action.value;
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  form.remove();
}
