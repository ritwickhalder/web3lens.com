/**
 * The popup's "Scan page" tab: injected with activeTab + scripting only when the user opens that tab
 * (or presses Rescan). It must be self-contained (it is serialised into the page) and only returns candidate
 * strings; detection and checksum checks run back in the extension.
 */
export function scanPageForCandidates(): string[] {
  const text = (document.body?.innerText ?? '').slice(0, 2_000_000);
  const patterns = [
    /\b0x[0-9a-fA-F]{64}\b/g,
    /\b0x[0-9a-fA-F]{40}\b/g,
    /\b(?:bc1|ltc1|tb1)[02-9ac-hj-np-z]{11,87}\b/gi,
    /\b(?:cosmos|osmo|celestia|inj)1[02-9ac-hj-np-z]{38,58}\b/g,
    /\b(?:addr1|stake1)[02-9ac-hj-np-z]{50,110}\b/g,
    /\b[13LMDTr][1-9A-HJ-NP-Za-km-z]{25,34}\b/g,
    /\bG[A-Z2-7]{55}\b/g,
    /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g,
    /\b[a-z0-9-]{3,}\.eth\b/gi,
  ];
  const found = new Set<string>();
  for (const re of patterns) {
    for (const m of text.match(re) ?? []) {
      found.add(m);
      if (found.size >= 300) return [...found];
    }
  }
  return [...found];
}
