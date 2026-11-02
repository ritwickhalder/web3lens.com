# Web3Lens — Roadmap

From "a dropdown that opens someone else's explorer" to the place people start any on-chain lookup.
What exists today is in [FEATURES.md](FEATURES.md). Package and architecture choices follow Super
Session Manager (Next.js App Router on Vercel, Tailwind v4, Supabase, next-intl, MV3 extensions), except that the
extensions live in `extension-chrome/`, `extension-firefox/` and `extension-edge/`, built from `extension-src/`.

## Seven-day upgrade sprint (November 2026)

Turns the search box into a multichain search and investigation tool, plus the browser extensions. It pulls
items forward from Phases 1–5 below (they're marked ✅ as they land); it doesn't replace them. Each day ends with
`npm test`, `npm run lint`, `npm run typecheck`, `npm run build` and, from day 6, `npm run ext:check`.

Ground rules: free public data sources only (paid keys are optional server-side adapters, never sent to the
browser); every result names its source and fetch time, and is marked stale or unavailable when it is; nothing is
ever shown as "safe"; the extensions get no remote code, no host permissions and no account requirement.

| Day | Sprint phase | Depends on | Delivers | Done when |
|---|---|---|---|---|
| 1 | Foundation | — | Native keccak/SHA-256/base58/bech32 codecs; detection v2 with checksum validation (EIP-55, base58check, bech32, SS58, Stellar CRC) and more formats; per-type explorer routes (`data/explorers.json`) and new EVM L2 chains (`data/chains-extra.json`); URL validation; `/search?q=&chain=` shareable results page; `/opensearch.xml`; explorer health-check script. | Legacy parity test still passes for all 769 chains; every route template validates; the FEATURES.md quirks are fixed. |
| 2 | Native search | Day 1 detection + routes | Provider adapters (EVM JSON-RPC with failover, Blockscout, mempool.space/Blockstream, Solana RPC, CoinGecko) behind a TTL + stale-if-error cache and per-IP rate limit; `/api/v1/*`; `/address/[chain]/[address]` and `/tx/[chain]/[hash]`; cross-chain EVM fan-out. | Real balances/txs on 12 EVM chains, Bitcoin, Litecoin and Solana; provider failure shows "unavailable", cached data shows "stale". |
| 3 | Developer tools | Day 1 codecs | Unit converter (wei/gwei/ETH, sats/BTC, any decimals), address validator/checksum, hex/decimal/UTF-8, keccak/SHA-256, timestamp converter, gas/fee calculator with live gas, ABI calldata decoder, raw transaction decoder with sender recovery. | Unit tests against known vectors (keccak, EIP-55, real signed txs). |
| 4 | Security | Days 2–3 | OFAC SDN address snapshot (`data/sanctions.json`, `npm run sanctions:update`), Blockscout scam/reputation flags, optional GoPlus reports, contract verification (Blockscout + Sourcify), proxy/owner/privileged-function checks, ERC-20/721 approval inspection with live allowances. | Flags show their source; "no reports" is never worded as safe. |
| 5 | Usability | Days 1–4 | Batch search (CSV export), saved addresses with labels and notes, favourite chains pinned in the picker, explorer preferences, shareable investigation links (`/investigate#…`, data in the URL fragment). | All local-only (localStorage), exportable/importable as JSON. |
| 6 | Extensions | Days 1–5 | `extension-chrome/`, `extension-firefox/`, `extension-edge/` built from one shared source (`extension-src/`): popup search with detection, native summary and security flags, full-page tools/batch/saved, options, context menu, omnibox (`w3`), "find addresses on this page" (activeTab). | Same features in all three; parity and permission tests pass; Firefox `web-ext lint` clean; store zips build. |
| 7 | Release | All | CI workflow, browser smoke tests (site + extension), performance check of the production build, privacy policy and docs, store listings checklist. | Release report with remaining limitations. |

**Status: all seven days delivered** (details in FEATURES.md). Known limits carried into the phases below:
EVM token holdings and history only where a public Blockscout exists (not BNB Chain, Avalanche, Linea); approvals
come from Blockscout log search (capped at 1000 events); ENS off-chain (CCIP-read) names don't resolve; Solana token
names aren't shown (no trusted free token list); rate limiting and caching are per server instance; the extension
browser test runs in Chromium only (Firefox is linted with web-ext and must be tried by hand); store listings are
not submitted yet.

## Phase 0 — Next.js migration ✅

Same features and look as the 2018 site, on Next.js 16 / React 19 / Tailwind v4, deployed on Vercel.
Explorer routing is data (`data/chains.json`), checked against the legacy code for all 769 chains.
Still to do: confirm parity on the live deploy, then delete `legacy/`.

## Phase 1 — Smarter search + redesign

The biggest user-facing jump: people shouldn't have to know which chain an address belongs to.

- ✅ **Redesign.** Navy + cyan identity with redline annotations, Manrope throughout, line-art lens logo,
  official coin logos (`@web3icons/react`) and Phosphor duotone illustrations, centred one-line hero with a
  wide search bar, popular-chain tiles, wide 1560px layouts. No gradients. Tokens live in `app/globals.css`.
- ✅ **Auto-detect what was pasted** (`lib/detect.ts`): EVM, Bitcoin, Litecoin, BCH, Dogecoin, Tron, XRP,
  Cosmos, Cardano, Stellar, Solana, ENS/.sol names, tx hashes, block numbers. Pre-selects the chain and offers
  alternatives. Next: more Cosmos-SDK prefixes (`osmo1`, `celestia1`…), Unstoppable domains, Polkadot SS58.
- ✅ **Recent searches and popular chains** under the search bar (localStorage, clearable).
- **Light theme** toggle (tokens are ready; dark stays the default).
- ✅ **Correct paths per input type.** Explorer templates become `{ address, tx, block, search }` so Bitcoin
  transactions, Solana addresses, etc. go to the right page (fixes the quirks listed in FEATURES.md).
- ✅ **Several explorers per chain** (e.g. Etherscan / Blockscout / Blockchair), with a remembered preference.
- ✅ **EVM fan-out.** One `0x` address checked across Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain,
  Avalanche, Linea, zkSync, Scroll…, each with a direct link.
- ✅ **Shareable search URLs:** `/search?chain=ethereum&q=0x…`.
- **Per-chain landing pages** `/explorer/[chain]`, statically generated: "Bitcoin block explorer" pages with
  the search box pre-set. Large SEO surface.
- ✅ **OpenSearch descriptor** (`/opensearch.xml`) so browsers offer "Search Web3Lens" from the address bar. Quick win.
- ✅ **Favourite chains** pinned to the top of the picker (localStorage).
- **Chain list cleanup.** ✅ Link-health script (`npm run explorers:check`) and https upgrades. Still to do: a weekly Vercel cron that flags dead explorers; drop or
  mark delisted coins; move `http://` explorers to `https://`; send ERC-20 tokens to their token page instead of
  a generic Etherscan search. After this, `chains.json` is edited by hand and the legacy converter is retired.

## Phase 2 — Native data (a lightweight explorer of our own)

Show the answer on Web3Lens first, with a link out for depth. Next.js API routes with caching and
rate limits in front of public APIs: Etherscan v2 multichain, mempool.space / Blockstream, Solana RPC,
Blockchair, CoinGecko.

- ✅ Address summary: native balance, USD value, tx count, recent activity, tokens (EVM, Bitcoin, Litecoin, Solana).
- ✅ Transaction view: status, from/to, value, fee, decoded method name.
- Name resolution: ✅ ENS forward and reverse (on-chain resolvers). Next: CCIP-read ENS, SNS, Unstoppable Domains.
- ✅ Gas prices (11 EVM chains) and Bitcoin fee estimates (gas calculator, `/api/v1/gas`). Next: a dedicated gas page.
- Price ticker for the selected chain (USD values are shown on result pages already).
- QR code for any address; copy and share buttons.

## Phase 3 — Tools and content hub

- ✅ **Developer tools:** wei/gwei/ETH and sats/BTC converter, address checksum/validator, ABI and calldata
  decoder, keccak/SHA hashes, Unix timestamp ↔ date, hex/decimal.
- ✅ **Safety:** OFAC snapshot, Blockscout and GoPlus reports, contract verification/proxy/owner checks, token
  approvals with revoke.cash links. Next: Chainabuse (needs an API key), Solana and Tron risk data.
- **Directory 2.0:** categories and tags, submit-a-link with moderation, automatic dead-link checks, refreshed
  2026 sources.
- **News:** aggregated RSS headlines from the sources already in the navbar.
- **Learn:** expanded guide, an MDX blog and a glossary (long-tail SEO).
- **i18n** with next-intl, the same setup as Super Session Manager.

## Phase 4 — Accounts and watchlists (Supabase)

- Sign in (Google OAuth, as in Super Session Manager).
- Saved addresses with labels and notes: ✅ local-only on the site and in the extensions (export/import JSON,
  shareable investigation links). Next: account sync.
- Email alerts when a watched address sends or receives (Vercel cron).
- Read-only multi-chain portfolio view for saved addresses.
- PWA install.

## Phase 5 — Browser extensions (Chrome, Edge, Firefox)

✅ Built (sprint day 6). One shared TypeScript source (`extension-src/` + `lib/`) is bundled into three
independent MV3 directories; only the manifests differ (`extension-firefox/COMPATIBILITY.md`). `npm test` keeps
them in parity and up to date; `npm run ext:pack` makes the store zips. Remaining: submit to the Chrome Web Store,
Edge Add-ons and AMO (listings, screenshots, privacy answers), then link the store pages from `/extension`.

- ✅ **Omnibox keyword:** type `w3` + space + address in the address bar.
- ✅ **Right-click → "Look up on Web3Lens"** for selected text.
- ✅ **Popup:** paste box with auto-detect and chain picker; recent searches.
- **On-page detection (opt-in):** ✅ “Find addresses on this page” via activeTab (no host permissions). Next: underline addresses and hashes on any page, hover card with chain, balance
  and explorer links. Needs host permissions, so it stays off until the user turns it on (store review).
- Later: watchlist badges once Phase 4 accounts exist.

## Phase 6 — Growth

- Public read API: ✅ `/api/v1/*` unkeyed with per-IP limits. Next: keys and documented quotas.
- Clearly labelled sponsored listings in the directory.
- More donation chains and a WalletConnect "tip" button.
- ✅ Structured data (WebSite + SearchAction) for a sitelinks search box.
- Point the old blocksearchengine.com domain at www.web3lens.com with permanent redirects.
