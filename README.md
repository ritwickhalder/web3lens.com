# Web3Lens — Blockchain Search Engine

Website: https://web3lens.com/ · Developer: Ritwick Halder (https://www.ritwick.com)

Search any of 789 blockchains for an address, transaction hash, block or name. Web3Lens detects and checksum-checks
what you paste, shows balances, tokens, transactions and risk checks for 14 major chains, and opens the right block
explorer page for the rest. Also: developer tools, batch search, saved labels, shareable investigations, a crypto
directory, a beginner's guide, and browser extensions for Chrome, Firefox and Edge. Built with Next.js 16 (App
Router), React 19, TypeScript and Tailwind v4; hosted on Vercel.

- What it does: [FEATURES.md](FEATURES.md)
- What's next: [ROADMAP.md](ROADMAP.md)

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 68 unit tests: codecs, detection, routing, legacy parity, ABI/tx decoding, tools, server, extensions
npm run lint
npm run typecheck
npm run build
```

Extensions:

```bash
npm run ext:build          # extension-src/ → extension-chrome/, extension-firefox/, extension-edge/
npm run ext:check          # fails if those are out of date (also part of npm test)
npm run ext:lint:firefox   # Mozilla web-ext lint (downloads web-ext via npx)
npm run ext:pack           # store zips + reviewer source zip in dist-extensions/
```

Data snapshots (commit the result):

```bash
npm run explorers:check    # probes explorer hosts → data/explorer-health.json
npm run sanctions:update   # OFAC SDN addresses → data/sanctions.json
```

Browser smoke tests (need Playwright + Chromium installed locally; not project dependencies):

```bash
node scripts/smoke-site.mjs http://localhost:3000   # against `npm run build && npm start`
node scripts/smoke-extension.mjs extension-chrome   # loads the unpacked extension in Chromium
```

## Layout

| Path | What |
|---|---|
| `app/` | Routes: home, `search`, `explorer/[chain]`, `gas`, `address/[chain]/[address]`, `tx/[chain]/[hash]`, `tools/[tool]`, `batch`, `saved`, `settings`, `investigate`, `extension`, content pages; `api/v1/*` and `api/contact`; `opensearch.xml`, sitemap/robots/OG image |
| `components/` | UI: `layout/`, `brand/`, `search/` (smart search, chain picker), `results/` (result pages, risk panel), `tools/`, `usability/` (batch, saved, settings, investigations), `home/`, `directory/`, `guide/`, `contact/`, `content/`, `ui/` |
| `lib/` | Browser-safe shared logic (also bundled into the extensions): `detect.ts`, `explorer.ts`, `chains.ts`, `codec/*`, `evm/*` (ABI, signatures, tx decoder), `tools/*`, `security/*`, `batch.ts`, `saved.ts`, `prefs.ts`, `investigation.ts`. Server-only: `providers/*` (RPC, Blockscout, Esplora, Solana, CoinGecko, GoPlus, Sourcify, selector DBs), `server/*` (lookups, security, cache, rate limit, API helpers) |
| `config/` | `site.ts` (brand, nav, donation addresses), `tools.ts` |
| `data/` | `chains.json` (generated from legacy), `chains-extra.json`, `explorers.json` (per-type routes), `explorer-health.json`, `sanctions.json`, `directory.json` |
| `extension-src/` | Shared extension source; `extension-chrome/`, `extension-firefox/`, `extension-edge/` are the built, loadable extensions (hand-written `manifest.json` each) |
| `scripts/` | Tests (`scripts/test/*.test.ts`), build/pack/health/sanctions/icon scripts, smoke tests, legacy converter |
| `legacy/` | The pre-Next.js static site, kept for the parity test |

## Deploy (Vercel)

Environment variables (see `.env.example`):

- `NEXT_PUBLIC_GA_ID` — GA4 measurement id (optional)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `CONTACT_NOTIFY_TO` —
  contact form email. Without `SMTP_USER`/`SMTP_PASSWORD` the form still validates but sends nothing.
- Optional, server-only: `RPC_URL_<CHAIN>` (e.g. `RPC_URL_ETHEREUM`) to put a private RPC in front of the public
  ones, `COINGECKO_DEMO_KEY` for a higher price-API limit. Native lookups work without any keys.

Add both `web3lens.com` and `www.web3lens.com` to the project; set `www.web3lens.com` to redirect (308) to `web3lens.com` in Vercel Domains. The app itself has no host redirect.

Native lookups use free public APIs with no SLA. Results are cached per instance and at Vercel's CDN; when a
provider fails the page says "unavailable" (or "stale" when an older cached answer is shown).

## Releasing the extensions

1. Bump `version` in all three `manifest.json` files (tests require them to match), run `npm run ext:build`, `npm test`,
   `npm run ext:lint:firefox` and `node scripts/smoke-extension.mjs`.
2. Deploy the website first: the extensions call `https://web3lens.com/api/v1/*` for native lookups (everything else works offline).
3. `npm run ext:pack`, then upload `dist-extensions/web3lens-<browser>-<version>.zip` to the Chrome Web Store,
   Microsoft Edge Add-ons and Firefox AMO. For AMO also upload `web3lens-extension-source-<version>.zip`.
4. Store listing: single purpose "look up blockchain addresses and transactions"; permissions as listed on `/extension`;
   privacy policy https://web3lens.com/privacy-policy; data use: lookups the user runs are sent to web3lens.com, nothing is sold or used for ads.
5. Link the store pages from `app/extension/page.tsx`.
