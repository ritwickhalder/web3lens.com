/**
 * "Thank you for going Pro": one transactional email per purchase, sent once from the Paddle webhook path.
 *
 * Design rules (owner's brief): no borders anywhere (shapes are separated by tints and spacing), small outer
 * margins, a solid brand hero, one tinted tile per benefit (icon, bold title, one short line) and one button.
 * Table layout and inline styles only, because email clients. The same layout ships in all of the owner's apps;
 * only the BRAND block and BENEFITS change. Pure: no Node, no I/O.
 */

const BRAND = {
  name: "Web3Lens",
  color: "#0a7f99",
  tint: "#e2f2f6",
  ink: "#0f1d2b",
  muted: "#4b5c6b",
  host: "web3lens.com",
  site: "https://web3lens.com",
  support: "hello@web3lens.com",
  cta: "https://web3lens.com/account",
  ctaLabel: "Open my account",
  promise: "",
} as const;

/** Short and concrete: what the plan gives, in the order people care about. Keep to six. */
const BENEFITS: { icon: string; title: string; text: string }[] = [
  { icon: "📦", title: "Batch lookups", text: "Check up to 500 addresses at once, with balances across chains." },
  { icon: "👁️", title: "Watchlist alerts", text: "Watch up to 50 addresses and hear when something moves." },
  { icon: "🗂️", title: "Investigations", text: "Keep up to 100 investigations, with notes and evidence together." },
  { icon: "☁️", title: "Synced saved items", text: "2,000 saved addresses, synced to your account and devices." },
  { icon: "🔑", title: "API keys", text: "1,000 API requests a day for your own tools." },
  { icon: "📤", title: "CSV and JSON export", text: "Take your results anywhere." },
];

const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const PRO_THANK_YOU_SUBJECT = `Thank you for going Pro 🎉 Welcome to ${BRAND.name} Pro`;

/** First name only, printable, short: sign-in names are free text. */
export function firstName(name: string | null | undefined): string | null {
  const first = String(name ?? '').trim().split(/\s+/)[0]?.replace(/\p{C}/gu, '').slice(0, 40);
  return first || null;
}

export type ProPlan = 'monthly' | 'yearly' | 'annual' | 'lifetime' | 'twoyear';
const KNOWN: Record<ProPlan, { label: string; note: string }> = {
  monthly: { label: 'Pro Monthly', note: 'Renews monthly. Cancel any time from your account.' },
  yearly: { label: 'Pro Yearly', note: 'Renews yearly. Cancel any time from your account.' },
  annual: { label: 'Pro Yearly', note: 'Renews yearly. Cancel any time from your account.' },
  twoyear: { label: 'Pro 2-Year Pass', note: 'One payment for two years. No renewals.' },
  lifetime: { label: 'Pro Lifetime', note: 'One payment, yours for good. No renewals.' },
};

/** Accepts our own plan names and the looser strings apps keep (`pro`, `PRO_MONTHLY`, `Lifetime`). */
function planOf(plan: string | null | undefined): ProPlan | null {
  const p = String(plan ?? '').toLowerCase();
  if (p.includes('life')) return 'lifetime';
  if (p.includes('2') || p.includes('two')) return 'twoyear';
  if (p.includes('year') || p.includes('annual')) return 'yearly';
  if (p.includes('month')) return 'monthly';
  return null;
}

export const proPlanLabel = (plan: string | null | undefined) => {
  const k = planOf(plan);
  return k ? KNOWN[k].label : 'Pro';
};

export const proStartLink = () =>
  `${BRAND.cta}${BRAND.cta.includes('?') ? '&' : '?'}utm_source=email&utm_medium=pro_thank_you&utm_campaign=pro_thank_you`;

export function proThankYouText(name: string | null, plan: string | null): string {
  const k = planOf(plan);
  return [
    `Thank you, ${firstName(name) ?? 'there'}!`,
    '',
    `You're now on ${BRAND.name} ${proPlanLabel(plan)}. Here's what just unlocked:`,
    '',
    ...BENEFITS.map((b) => `• ${b.title}: ${b.text}`),
    '',
    ...(BRAND.promise ? [BRAND.promise, ''] : []),
    `${BRAND.ctaLabel}: ${proStartLink()}`,
    '',
    k ? KNOWN[k].note : '',
    'Your receipt comes separately from Paddle, our payment provider. Questions? Just reply: a person reads every message.',
    '',
    `— ${BRAND.name}`,
    `${BRAND.site} · ${BRAND.support}`,
  ].join('\n');
}

export function proThankYouHtml(name: string | null, plan: string | null): string {
  const c = BRAND;
  const k = planOf(plan);
  // Tiles are separated by a spacer row, not a border, so they stay clean in dark-mode inversions too.
  const tiles = BENEFITS.map(
    (b) => `<tr><td style="padding:0 0 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.tint};border-radius:14px"><tr>
<td width="44" valign="middle" style="padding:12px 0 12px 12px"><div style="width:40px;height:40px;line-height:40px;text-align:center;background:#ffffff;border-radius:12px;font-size:20px">${b.icon}</div></td>
<td valign="middle" style="padding:12px 14px 12px 12px;font-family:${FONT}"><div style="font-size:15px;font-weight:700;color:${c.ink};line-height:1.3">${esc(b.title)}</div><div style="font-size:13.5px;color:${c.muted};line-height:1.45;padding-top:2px">${esc(b.text)}</div></td>
</tr></table></td></tr>`,
  ).join('\n');
  const promise = c.promise
    ? `<tr><td style="padding:2px 14px 6px"><div style="background:${c.ink};border-radius:14px;padding:12px 14px;font-family:${FONT};font-size:13.5px;line-height:1.5;color:#ffffff">🛡️&nbsp; ${esc(c.promise)}</div></td></tr>`
    : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(PRO_THANK_YOU_SUBJECT)}</title></head>
<body style="margin:0;padding:0;background:${c.tint};font-family:${FONT}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">You're on ${esc(c.name)} ${esc(proPlanLabel(plan))}. Here's everything that just unlocked.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.tint}"><tr><td align="center" style="padding:12px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden">
<tr><td bgcolor="${c.color}" style="background:${c.color};padding:22px 22px 26px;font-family:${FONT}">
<div style="font-size:14px;font-weight:700;color:#ffffff;letter-spacing:.02em"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#ffffff;margin-right:8px"></span>${esc(c.name)}</div>
<div style="font-size:30px;line-height:1.15;font-weight:800;color:#ffffff;padding-top:18px">Thank you, ${esc(firstName(name) ?? 'friend')} 🎉</div>
<div style="font-size:16px;line-height:1.5;color:#ffffff;padding-top:8px">You're officially <b>Pro</b>. Everything below is unlocked and ready.</div>
<div style="padding-top:14px"><span style="display:inline-block;background:#ffffff;color:${c.color};font-size:13px;font-weight:800;padding:6px 14px;border-radius:999px">${esc(c.name)} ${esc(proPlanLabel(plan))}</span></div>
</td></tr>
<tr><td style="padding:18px 14px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:0 4px 10px;font-family:${FONT};font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${c.color}">What you just unlocked</td></tr>
${tiles}
</table></td></tr>
${promise}
<tr><td align="center" style="padding:10px 14px 6px"><a href="${esc(proStartLink())}" style="display:block;background:${c.ink};color:#ffffff;text-decoration:none;font-family:${FONT};font-size:16px;font-weight:700;padding:15px 20px;border-radius:14px">${esc(c.ctaLabel)} →</a></td></tr>
<tr><td style="padding:14px 22px 22px;font-family:${FONT};font-size:13px;line-height:1.55;color:${c.muted};text-align:center">${k ? `${esc(KNOWN[k].note)}<br>` : ''}Your receipt comes separately from Paddle. Questions? Just reply: a person reads every message.<br><a href="${esc(c.site)}" style="color:${c.color};text-decoration:none;font-weight:700">${esc(c.host)}</a> · <a href="mailto:${esc(c.support)}" style="color:${c.color};text-decoration:none">${esc(c.support)}</a></td></tr>
</table></td></tr></table></body></html>`;
}
