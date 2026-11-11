import { accountError, accountJson, accountOptions, isExtensionOrigin, isSameOrigin, readJson } from '@/lib/server/account-http';
import { requireFeature, requireUser } from '@/lib/server/gate';
import { cleanName } from '@/lib/server/pro-stores';
import { watchableChain } from '@/lib/server/watch';
import { addWatch, listWatches } from '@/lib/server/watch-store';
import { checkAddressQuery } from '@/lib/validate-query';

/** GET /api/watches: your watched addresses (readable after a downgrade; checks pause until Pro is back). */
export async function GET(request: Request) {
  const c = await requireUser(request);
  if (c instanceof Response) return c;
  return accountJson(request, { watches: await listWatches(c.user.id), cap: c.limits.watches });
}

/** POST /api/watches { chainId, address, label?, notifyEmail? } (Pro, up to 50). */
export async function POST(request: Request) {
  if (!isSameOrigin(request) && !isExtensionOrigin(request.headers.get('origin'))) return accountError(request, 'Forbidden', 403);
  const c = await requireFeature(request, 'watchlist');
  if (c instanceof Response) return c;
  const body = await readJson<{ chainId?: unknown; address?: unknown; label?: unknown; notifyEmail?: unknown }>(request);
  const chainId = typeof body?.chainId === 'string' ? body.chainId : '';
  if (!watchableChain(chainId)) return accountError(request, 'Watching works on the EVM chains with native pages, Bitcoin and Litecoin.', 400);
  const check = checkAddressQuery(chainId, typeof body?.address === 'string' ? body.address : '');
  if (!check.ok) return accountError(request, check.error, 400);
  const r = await addWatch(c.user.id, { chainId, address: check.query, label: cleanName(body?.label, 80), notifyEmail: body?.notifyEmail !== false }, c.limits.watches);
  if (r === 'exists') return accountError(request, 'You already watch this address on this chain.', 409);
  if (!r) return accountError(request, `You can watch up to ${c.limits.watches} addresses.`, 409);
  return accountJson(request, r, 201);
}

export const OPTIONS = accountOptions;
