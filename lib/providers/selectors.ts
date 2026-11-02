/**
 * Community signature databases (openchain.xyz, 4byte.directory) for selectors that aren't in the
 * built-in list. Anyone can submit to these, so results are candidates, not facts: the decoder only
 * shows a candidate whose parameters decode the calldata cleanly, and labels it as a guess.
 */
import { fetchJson } from '@/lib/providers/http';

export async function lookupSelector(selector: string): Promise<{ signatures: string[]; source: string }> {
  try {
    const r = await fetchJson<{ ok: boolean; result: { function: Record<string, { name: string; filtered: boolean }[] | null> } }>(
      'openchain.xyz',
      `https://api.openchain.xyz/signature-database/v1/lookup?function=${selector}&filter=true`,
      { timeoutMs: 6000 },
    );
    const list = (r.result.function[selector] ?? []).filter((x) => !x.filtered).map((x) => x.name);
    if (list.length) return { signatures: list.slice(0, 10), source: 'openchain.xyz' };
  } catch {
    // fall through to 4byte
  }
  const r = await fetchJson<{ results: { text_signature: string }[] }>(
    '4byte.directory',
    `https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}&ordering=created_at`,
    { timeoutMs: 6000 },
  );
  return { signatures: r.results.map((x) => x.text_signature).slice(0, 10), source: '4byte.directory' };
}
