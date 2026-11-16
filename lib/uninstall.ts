/**
 * Uninstall survey: the one question web3lens.com/uninstall asks after the extension is removed (the extensions
 * register that URL in extension-src/src/lifecycle.ts). Ported from Super Session Manager's lib/uninstall-feedback.
 *
 * Pure and browser-safe: the page, the API route and the tests share it. Query params and request bodies are
 * user-editable, so every value is normalised here before it can be stored; anything unknown collapses to a safe
 * default. Nothing personal is ever asked for or stored: no email, account, address or IP (the API keeps only an
 * in-memory rate limit).
 */

export const UNINSTALL_REASONS = [
  { id: 'no_longer_needed', label: "I don't need it anymore" },
  { id: 'found_another', label: 'I found another extension' },
  { id: 'missing_feature', label: 'A feature or chain I need is missing' },
  { id: 'not_working', label: "Something wasn't working" },
  { id: 'too_confusing', label: 'It was difficult or confusing to use' },
  { id: 'wrong_results', label: 'Wrong chain, explorer or results' },
  { id: 'privacy', label: 'Privacy or permissions concerns' },
  { id: 'just_trying', label: 'I was just trying it' },
  { id: 'other', label: 'Other' },
] as const;

export type UninstallReasonId = (typeof UNINSTALL_REASONS)[number]['id'];

/** The single optional follow-up per reason; `competitor` answers go in their own column. */
export const UNINSTALL_FOLLOW_UPS: Record<UninstallReasonId, { field: 'competitor' | 'details'; question: string; placeholder: string }> = {
  found_another: { field: 'competitor', question: 'Which extension or site did you switch to?', placeholder: 'Name' },
  missing_feature: { field: 'details', question: 'What were you looking for?', placeholder: 'The feature or chain you needed' },
  not_working: { field: 'details', question: 'What happened?', placeholder: 'What went wrong' },
  wrong_results: { field: 'details', question: 'What did you search for, and what did you expect?', placeholder: 'No addresses needed, just the chain or format' },
  privacy: { field: 'details', question: 'What concerned you?', placeholder: 'The permission or data concern' },
  no_longer_needed: { field: 'details', question: "Anything you'd like us to know?", placeholder: 'Optional' },
  too_confusing: { field: 'details', question: 'What was confusing?', placeholder: 'Optional' },
  just_trying: { field: 'details', question: "Anything you'd like us to know?", placeholder: 'Optional' },
  other: { field: 'details', question: "Anything you'd like us to know?", placeholder: 'Optional' },
};

export const UNINSTALL_BROWSERS = ['chrome', 'edge', 'firefox', 'opera', 'brave', 'other'] as const;
export type UninstallBrowser = (typeof UNINSTALL_BROWSERS)[number];

export const UNINSTALL_LIMITS = { details: 500, competitor: 80, version: 20 } as const;

export type UninstallMeta = { version: string | null; browser: UninstallBrowser };

export type UninstallFeedback = UninstallMeta & {
  reason: UninstallReasonId;
  details: string | null;
  competitor: string | null;
  /** Browser-made random UUID, only to drop a repeated submit from the same visit. Not an identity. */
  visitKey: string | null;
};

const REASON_IDS = new Set<string>(UNINSTALL_REASONS.map((r) => r.id));

export function reasonLabel(id: string): string {
  return UNINSTALL_REASONS.find((r) => r.id === id)?.label ?? id;
}

export function isUninstallReason(v: unknown): v is UninstallReasonId {
  return typeof v === 'string' && REASON_IDS.has(v);
}

/** Control characters become spaces, whitespace runs collapse, then trim. */
function tidy(v: unknown): string {
  return typeof v === 'string' ? v.replace(/\p{C}/gu, ' ').replace(/\s+/g, ' ').trim() : '';
}

export function normalizeText(v: unknown, max: number): string | null {
  const t = tidy(v);
  return t ? t.slice(0, max) : null;
}

/** Dotted numeric versions only (the manifest format); anything else is dropped. */
export function normalizeVersion(v: unknown): string | null {
  const t = tidy(v).slice(0, UNINSTALL_LIMITS.version);
  return /^\d{1,5}(\.\d{1,5}){0,3}$/.test(t) ? t : null;
}

export function normalizeBrowser(v: unknown): UninstallBrowser {
  const t = tidy(v).toLowerCase();
  return (UNINSTALL_BROWSERS as readonly string[]).includes(t) ? (t as UninstallBrowser) : 'other';
}

export function normalizeVisitKey(v: unknown): string | null {
  const t = tidy(v);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) ? t.toLowerCase() : null;
}

/**
 * A submitted survey, checked. The client sends one free-text `answer`; which column it lands in is decided here
 * from the reason's follow-up, so a caller can't write a competitor for a reason that never asks for one.
 */
export function parseUninstallFeedback(body: unknown): { ok: true; value: UninstallFeedback } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!isUninstallReason(b.reason)) return { ok: false, error: 'Please choose a reason.' };
  const field = UNINSTALL_FOLLOW_UPS[b.reason].field;
  return {
    ok: true,
    value: {
      reason: b.reason,
      details: field === 'details' ? normalizeText(b.answer, UNINSTALL_LIMITS.details) : null,
      competitor: field === 'competitor' ? normalizeText(b.answer, UNINSTALL_LIMITS.competitor) : null,
      version: normalizeVersion(b.version),
      browser: normalizeBrowser(b.browser),
      visitKey: normalizeVisitKey(b.visitKey),
    },
  };
}
