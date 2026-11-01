# Web3Lens — Roadmap

From "a dropdown that opens someone else's explorer" to the place people start any on-chain lookup.
What exists today is in [FEATURES.md](FEATURES.md). Package and architecture choices follow Super
Session Manager (Next.js App Router on Vercel, Tailwind v4, Supabase, next-intl, MV3 extensions in
`extension/`, `extension-edge/`, `extension-firefox/`).

## Phase 0 — Next.js migration ✅

Same features and look as the 2018 site, on Next.js 16 / React 19 / Tailwind v4, deployed on Vercel.
Explorer routing is data (`data/chains.json`), checked against the legacy code for all 769 chains.
Still to do: confirm parity on the live deploy, then delete `legacy/`.

## Phase 1 — Smarter search + redesign

The biggest user-facing jump: people shouldn't have to know which chain an address belongs to.

- **Redesign.** New visual identity, dark mode, proper typography. All colours are already tokens in `app/globals.css`.
- **Auto-detect what was pasted** (`lib/detect.ts`, shared with the extensions):
  EVM address (`0x` + 40 hex), EVM tx hash (`0x` + 64 hex), Bitcoin (base58 `1…`/`3…`, bech32 `bc1…`),
  Solana (base58, 32–44 chars), Cosmos-SDK bech32 (`cosmos1…`, `osmo1…`, …), Tron (`T…`), XRP (`r…`),
  ENS / SNS / Unstoppable names, plain block numbers. Suggest the matching chains and pre-select the best one.
- **Correct paths per input type.** Explorer templates become `{ address, tx, block, search }` so Bitcoin
  transactions, Solana addresses, etc. go to the right page (fixes the quirks listed in FEATURES.md).
- **Several explorers per chain** (e.g. Etherscan / Blockscout / Blockchair), with a remembered preference.
- **EVM fan-out.** One `0x` address checked across Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain,
  Avalanche, Linea, zkSync, Scroll…, each with a direct link.
- **Shareable search URLs:** `/search?chain=ethereum&q=0x…`.
- **Per-chain landing pages** `/explorer/[chain]`, statically generated: "Bitcoin block explorer" pages with
  the search box pre-set. Large SEO surface.
- **OpenSearch descriptor** (`/opensearch.xml`) so browsers offer "Search Web3Lens" from the address bar. Quick win.
- **Recent searches and favourite chains** (localStorage, clearable).
- **Chain list cleanup.** A link-health script plus a weekly Vercel cron that flags dead explorers; drop or
  mark delisted coins; move `http://` explorers to `https://`; send ERC-20 tokens to their token page instead of
  a generic Etherscan search. After this, `chains.json` is edited by hand and the legacy converter is retired.

## Phase 2 — Native data (a lightweight explorer of our own)

Show the answer on Web3Lens first, with a link out for depth. Next.js API routes with caching and
rate limits in front of public APIs: Etherscan v2 multichain, mempool.space / Blockstream, Solana RPC,
Blockchair, CoinGecko.

- Address summary: native balance, USD value, tx count, first/last activity, top tokens.
- Transaction view: status, from/to, value, fee, decoded method name.
- Name resolution: ENS, SNS, Unstoppable Domains (forward and reverse).
- Gas tracker (EVM chains) and Bitcoin fee estimates.
- Price ticker for the selected chain.
- QR code for any address; copy and share buttons.

## Phase 3 — Tools and content hub

- **Developer tools:** wei/gwei/ETH and sats/BTC converter, address checksum/validator, ABI and calldata
  decoder, keccak/SHA hashes, Unix timestamp ↔ date, hex/decimal.
- **Safety:** flag OFAC-sanctioned addresses and Chainabuse scam reports on the result; link to revoke.cash
  for token approvals.
- **Directory 2.0:** categories and tags, submit-a-link with moderation, automatic dead-link checks, refreshed
  2026 sources.
- **News:** aggregated RSS headlines from the sources already in the navbar.
- **Learn:** expanded guide, an MDX blog and a glossary (long-tail SEO).
- **i18n** with next-intl, the same setup as Super Session Manager.

## Phase 4 — Accounts and watchlists (Supabase)

- Sign in (Google OAuth, as in Super Session Manager).
- Saved addresses with labels and notes; synced to the extensions.
- Email alerts when a watched address sends or receives (Vercel cron).
- Read-only multi-chain portfolio view for saved addresses.
- PWA install.

## Phase 5 — Browser extensions (Chrome, Edge, Firefox)

Same layout and rules as Super Session Manager: `extension/` is canonical (Chrome), `extension-edge/` and
`extension-firefox/` are ports; MV3, plain JS, no remote code, minimal permissions; `CHROME_DEV_LOG.md`
records changes to port; `extension-firefox/COMPATIBILITY.md` lists Firefox differences;
`scripts/pack-extension.js` builds each store zip and checks the manifest flavor (copy
`scripts/lib/browser-flavor.js`). A `sync:chains` script copies `data/chains.json` and `lib/detect` into each
extension so the site and the extensions never disagree.

- **Omnibox keyword:** type `w3` + space + address in the address bar.
- **Right-click → "Look up on Web3Lens"** for selected text.
- **Popup:** paste box with auto-detect and chain picker; recent searches.
- **On-page detection (opt-in):** underline addresses and hashes on any page, hover card with chain, balance
  and explorer links. Needs host permissions, so it stays off until the user turns it on (store review).
- Later: watchlist badges once Phase 4 accounts exist.

## Phase 6 — Growth

- Public read API for detection and routing (rate-limited, keyed).
- Clearly labelled sponsored listings in the directory.
- More donation chains and a WalletConnect "tip" button.
- Structured data (WebSite + SearchAction) for a sitelinks search box.
- Point the old blocksearchengine.com domain at www.web3lens.com with permanent redirects.
