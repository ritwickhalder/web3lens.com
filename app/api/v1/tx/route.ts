import { errorJson, handle, json, options } from '@/lib/server/api';
import { lookupTx } from '@/lib/server/lookup';
import { checkTxQuery } from '@/lib/validate-query';

/** GET /api/v1/tx?chain=ethereum&q=0x… — transaction details for one chain. */
export function GET(request: Request) {
  return handle(request, async (p) => {
    const check = checkTxQuery(p.get('chain') ?? '', p.get('q') ?? '');
    if (!check.ok) return errorJson(check.error, 400);
    const result = await lookupTx(p.get('chain')!, check.query);
    const final = result.tx.status === 'ok' && result.tx.data !== null && 'confirmed' in result.tx.data ? result.tx.data.confirmed : result.tx.status === 'ok' && result.tx.data !== null && 'status' in result.tx.data && result.tx.data.status !== 'pending';
    return json(result, { maxAge: final ? 300 : 15 });
  });
}

export const OPTIONS = options;
