import { errorJson, handle, json, options } from '@/lib/server/api';
import { multichainAddress } from '@/lib/server/lookup';
import { checkEvmAddress } from '@/lib/validate-query';

/** GET /api/v1/multichain?q=0x… — the address's native balance on every supported EVM chain. */
export function GET(request: Request) {
  return handle(request, async (p) => {
    const check = checkEvmAddress(p.get('q') ?? '');
    if (!check.ok) return errorJson(check.error, 400);
    return json(await multichainAddress(check.query), { maxAge: 30 });
  });
}

export const OPTIONS = options;
