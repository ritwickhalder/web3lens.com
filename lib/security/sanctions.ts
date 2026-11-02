/** Local check against the bundled OFAC SDN address snapshot (data/sanctions.json). No network. */
import sanctionsJson from '@/data/sanctions.json';

type SanctionsFile = { source: string; sourceUrl: string; fetchedAt: string; lists: Record<string, string[]> };
const DATA = sanctionsJson as SanctionsFile;

let index: Map<string, string[]> | null = null;

function norm(s: string): string {
  const q = s.trim();
  return /^0x[0-9a-f]{40}$/i.test(q) || /^[a-z]+1[02-9ac-hj-np-z]+$/i.test(q) ? q.toLowerCase() : q;
}

function build(): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const [list, addresses] of Object.entries(DATA.lists)) {
    for (const a of addresses) {
      const k = norm(a);
      m.set(k, [...(m.get(k) ?? []), list]);
    }
  }
  return m;
}

export type SanctionsCheck = { listed: boolean; lists: string[]; snapshotAt: string; source: string; sourceUrl: string };

export function checkSanctions(address: string): SanctionsCheck {
  index ??= build();
  const lists = index.get(norm(address)) ?? [];
  return { listed: lists.length > 0, lists, snapshotAt: DATA.fetchedAt, source: DATA.source, sourceUrl: DATA.sourceUrl };
}

export function sanctionsSnapshotAt(): string {
  return DATA.fetchedAt;
}
