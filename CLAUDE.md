# Claude instructions for this repository

Web3Lens (www.web3lens.com): Next.js 16 App Router + React 19 + TypeScript strict + Tailwind v4, on Vercel.
Read [FEATURES.md](FEATURES.md) for what exists and [ROADMAP.md](ROADMAP.md) for what's planned.
Package and architecture choices follow `D:\SuperSessionManager` (see its `AI_CONTEXT.md`) unless there's a reason not to.

## Conventions

- Routes in `app/<slug>/page.tsx`; shared UI in `components/<area>/`; logic in `lib/`; site constants in `config/site.ts`.
- Data the browser extensions will also need (`data/*.json`) stays JSON, not TS.
- Design tokens in `app/globals.css` (`bg-ink`/`ink-2`/`ink-3`, `border-line`, `text-accent` cyan, `text-redline` for notes/warnings) and helpers `.wrap` (1560px container, slim margins), `.dot-grid` (hero only), `.marks` (corner registration marks, use sparingly), `.label`, `.heading`, `.prose-bp`. Solid colours only, no gradients or glows. Don't hard-code new brand colours.
- Fonts: Manrope everywhere (`font-sans`/`font-display`), bold or heavier for headings, nav and labels; `font-mono` (IBM Plex Mono) only for hashes and addresses.
- Icons: coin logos via `ChainGlyph` (`components/search/ChainGlyph.tsx`, `@web3icons/react`, import each token file individually); UI icons from `@phosphor-icons/react/dist/ssr`, `weight="duotone"` for illustrations and `"bold"` for small UI glyphs.
- Responsive grids need an explicit base `grid-cols-1` (or `minmax(0,1fr)`), otherwise long hashes widen the column past the screen on phones.
- Inner pages use `PageShell` (`components/content/PageShell.tsx`): `split` (sticky title block left, content right) or `stacked`.
- Every page sets metadata with `pageMetadata()` from `lib/metadata.ts`.
- Tests: `scripts/test/*.test.ts` with `node:test`, run by `npm test`. Run `npm test`, `npm run lint` and `npm run typecheck` before finishing.
- Keep `public/google*.html` (Search Console verification) and the legacy URL redirects in `next.config.ts`.

## Chain data

- `data/chains.json` is **generated** from `legacy/select.js` by `npm run chains:convert`. Don't hand-edit it
  while `legacy/` exists; the parity test (`scripts/test/chains-parity.test.ts`) compares it to the legacy code.
- When ROADMAP Phase 1 starts editing chains by hand, delete the converter, the parity test and `legacy/` together.

## Git

- Don't commit or push unless asked.
