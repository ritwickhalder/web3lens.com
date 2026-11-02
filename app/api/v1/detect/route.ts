import { getChain } from '@/lib/chains';
import { detectAll, extractQuery } from '@/lib/detect';
import { explorerLinks } from '@/lib/explorer';
import { errorJson, handle, json, options } from '@/lib/server/api';

/** GET /api/v1/detect?q=… — what a query is, which chains it fits, and direct explorer links. No upstream calls. */
export function GET(request: Request) {
  return handle(request, async (p) => {
    const raw = p.get('q') ?? '';
    if (!raw.trim() || raw.length > 500) return errorJson('Enter a query.', 400);
    const { query } = extractQuery(raw);
    const detections = detectAll(query).map((d) => ({
      ...d,
      explorers:
        d.kind === 'secret'
          ? []
          : d.chains.slice(0, 8).map((id) => {
              const chain = getChain(id)!;
              return { chain: { id, name: chain.name }, links: explorerLinks(chain, query, d) };
            }),
    }));
    return json({ query, detections }, { maxAge: 3600 });
  });
}

export const OPTIONS = options;
