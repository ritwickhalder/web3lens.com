import { errorJson, handle, json, options } from '@/lib/server/api';
import { locateTx } from '@/lib/server/lookup';
import { checkEvmTx } from '@/lib/validate-query';

/** GET /api/v1/locate-tx?q=0x… — which supported EVM chains know this transaction hash. */
export function GET(request: Request) {
  return handle(request, async (p) => {
    const check = checkEvmTx(p.get('q') ?? '');
    if (!check.ok) return errorJson(check.error, 400);
    return json(await locateTx(check.query), { maxAge: 30 });
  });
}

export const OPTIONS = options;
