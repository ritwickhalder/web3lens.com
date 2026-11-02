# Claude instructions for this repository

Web3Lens (web3lens.com): Next.js 16 App Router + React 19 + TypeScript strict + Tailwind v4, on Vercel.
Read [FEATURES.md](FEATURES.md) for what exists and [ROADMAP.md](ROADMAP.md) for what's planned.
Package and architecture choices follow `D:\SuperSessionManager` (see its `AI_CONTEXT.md`) unless there's a reason not to.

## Conventions

- Routes in `app/<slug>/page.tsx`; shared UI in `components/<area>/`; logic in `lib/`; site constants in `config/site.ts`.
- Data the browser extensions will also need (`data/*.json`) stays JSON, not TS.
- Design tokens in `app/globals.css` (`bg-ink`/`ink-2`/`ink-3`, `border-line`, `text-accent` cyan, `text-redline` for notes/warnings) and helpers `.wrap` (1560px container, slim margins), `.dot-grid` (hero only), `.marks` (corner registration marks, use sparingly), `.label`, `.heading`, `.prose-bp`. Solid colours only, no gradients or glows. Don't hard-code new brand colours. Every colour token exists in both themes: the dark values in `@theme` and the light values in the `:root[data-theme="light"]` and `system` blocks (kept identical; `scripts/test/theme.test.ts` checks AA contrast and that the extension CSS matches). Use `color-mix(... var(--color-*) ...)` rather than literal rgb() for tints.
- Fonts: Manrope everywhere (`font-sans`/`font-display`), bold or heavier for headings, nav and labels; `font-mono` (IBM Plex Mono) only for hashes and addresses. The extensions use Manrope only (`--mono` maps to it in `extension-src/static/styles.css`).
- Icons: coin logos via `ChainGlyph` (`components/search/ChainGlyph.tsx`, `@web3icons/react`, import each token file individually); UI icons from `@phosphor-icons/react/dist/ssr`, `weight="duotone"` for illustrations and `"bold"` for small UI glyphs.
- Responsive grids need an explicit base `grid-cols-1` (or `minmax(0,1fr)`), otherwise long hashes widen the column past the screen on phones.
- Inner pages use `PageShell` (`components/content/PageShell.tsx`): `split` (sticky title block left, content right) or `stacked`.
- Every page sets metadata with `pageMetadata()` from `lib/metadata.ts`.
- Tests: `scripts/test/*.test.ts` with `node:test`, run by `npm test`. Run `npm test`, `npm run lint`, `npm run typecheck` and (when extension-src or shared lib code changed) `npm run ext:build` before finishing.
- Keep `public/google*.html` (Search Console verification) and the legacy URL redirects in `next.config.ts`.

## Chain data

- `data/chains.json` is **generated** from `legacy/select.js` by `npm run chains:convert`. Don't hand-edit it
  while `legacy/` exists; the parity test (`scripts/test/chains-parity.test.ts`) compares it to the legacy code
  through `resolveLegacyExplorer`.
- Hand-edited overlays instead: `data/chains-extra.json` (chains added since, e.g. L2s) and `data/explorers.json`
  (per-type explorer routes `address`/`tx`/`block`/`names`/`search`, several explorers per chain, first = default).
  `resolveExplorer` uses the routes and falls back to the legacy explorer. Tests validate every template.
- `data/explorer-health.json` (`npm run explorers:check`) and `data/sanctions.json` (`npm run sanctions:update`)
  are generated snapshots; refresh them, don't hand-edit.
- When ROADMAP Phase 1 starts editing chains by hand, delete the converter, the parity test and `legacy/` together.

## Native data and safety rules

- Providers live in `lib/providers/*` (free public APIs; optional server-only keys via env, see `.env.example`).
  `lib/server/lookup.ts` / `security.ts` combine them per section behind `lib/server/cache.ts`; routes in
  `app/api/v1/*` add rate limiting, CORS and CDN caching (`lib/server/api.ts`).
- Every section carries its source and fetch time and is shown as stale or unavailable when it is. Never fill gaps
  with guesses, and never word a "no reports" result as safe.
- Shared, browser-safe logic (detection, codecs, ABI, tools, batch, saved/prefs shapes) stays free of Node and
  React so the extensions bundle the same files.

## Browser extensions

- Source in `extension-src/`; `npm run ext:build` writes `extension-chrome/`, `extension-firefox/`, `extension-edge/`.
  Only each directory's `manifest.json` (and `*.md`) is hand-written; never edit the generated JS/HTML there.
- `npm test` fails if the builds are stale, the manifests drift apart, or permissions/CSP loosen. Keep: no host
  permissions, no content scripts, no remote code, `connect-src https://web3lens.com`, text nodes only (no innerHTML).
- The extensions share the website's look: icons/coin logos come from the site's React components rendered at build
  time (`extension-src/icons-entry.tsx`); UI kit in `extension-src/src/ui.ts`; tokens in `extension-src/static/styles.css`
  must match `app/globals.css` (tested). Store kit: `store/`; refresh screenshots with `node scripts/make-store-assets.mjs`.
- `npm run ext:lint:firefox` (web-ext), `node scripts/smoke-extension.mjs` and `node scripts/smoke-site.mjs <url>`
  need Playwright/Chromium locally; `npm run ext:pack` builds store zips into `dist-extensions/` (gitignored).

## Vercel

- Project `web3lens.com` (`prj_cl8g6PcciesZGyDYcgT1B1VYD1Cl`) in team "Ritwick Halder's projects"
  (slug `ritwick-halders-projects`, id `team_9Ufuw89VeVBTBguTpE5rk0S3`). Git-connected to
  `github.com/ritwickhalder/web3lens.com`, so pushes deploy.
- This folder is linked with `vercel link` (`.vercel/project.json`, gitignored). `vercel env pull` refreshes
  `.env.local` (holds `VERCEL_OIDC_TOKEN`; never commit or print it).
- Vercel MCP (from the Vercel Claude Code plugin) is account-wide: pass the team and project ids above to its tools
  (`get_project`, `list_deployments`, `get_runtime_errors`, `get_runtime_logs`, ...) rather than looking them up.
  Ask before any MCP write (deploys, env vars, domains, DNS).

## Git

- Don't commit or push unless asked.
