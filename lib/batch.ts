/** Batch search: split pasted text into queries and detect each one. Pure; shared with the extensions. */
import { detectAll, extractQuery, type Detection } from '@/lib/detect';
import { checkSanctions, type SanctionsCheck } from '@/lib/security/sanctions';

export const BATCH_MAX = 50;

export type BatchRow = {
  input: string;
  query: string;
  detection: Detection | null;
  alternatives: Detection[];
  sanctions: SanctionsCheck | null;
};

/** Splits on newlines, commas, semicolons, tabs and spaces; drops duplicates; keeps at most `max`. */
export function parseBatch(text: string, max = BATCH_MAX): { rows: BatchRow[]; truncated: number } {
  const tokens = text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const rows: BatchRow[] = [];
  let truncated = 0;
  for (const input of tokens) {
    const { query } = extractQuery(input);
    const all = detectAll(query);
    const best = all[0] ?? null;
    const key = best?.normalized.toLowerCase() ?? query;
    if (seen.has(key)) continue;
    seen.add(key);
    if (rows.length >= max) {
      truncated++;
      continue;
    }
    rows.push({
      input,
      query,
      detection: best,
      alternatives: all.slice(1),
      sanctions: best?.kind === 'address' ? checkSanctions(best.normalized) : null,
    });
  }
  return { rows, truncated };
}
