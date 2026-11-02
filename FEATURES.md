# Web3Lens — Features

What the site does today, after the move from the 2018 static site (now in `legacy/`) to Next.js.
Planned work lives in [ROADMAP.md](ROADMAP.md).

## Current features

Design: deep navy with a cyan accent and a warm "redline" for notes and warnings; solid colours, a quiet dot
grid behind the hero only, and corner registration marks on the search bar and support panel. Manrope throughout
(bold/extrabold for headings, nav and labels) with IBM Plex Mono only for hashes. Official coin logos from
`@web3icons/react` (44 chains) and Phosphor duotone illustrations. Wide 1560px layout with slim side margins.
All colours and fonts are tokens in `app/globals.css`.

| Feature | Where it lives now | Legacy source |
|---|---|---|
| **Smart search.** One bar: chain picker + query box + Search. For the 14 chains with native data, Search shows Web3Lens's own result page (0x values with an auto-picked chain get the cross-chain overview); for the rest it opens the right page of the chain's explorer in a new tab. A setting switches back to "always open the explorer". Pasted explorer links and payment URIs (`bitcoin:…`, `ethereum:…`) are reduced to the address/hash inside. Private keys and recovery phrases are recognised and never searched. `/` or `Ctrl/⌘ K` focuses it. | `components/search/SmartSearch.tsx` | `index.html` |
| **Auto-detect with checksums.** 30+ formats: EVM (EIP-55 checksum), Bitcoin/Litecoin/Dogecoin/Dash/Tron/Zcash (base58check version byte + checksum), SegWit/Taproot and Cosmos-SDK/Cardano (bech32/bech32m), Bitcoin Cash (CashAddr), Polkadot/Kusama (SS58 + BLAKE2b), XRP, Stellar (CRC16), TON, Tezos, Solana (32/64-byte base58), ICON, Algorand, NEAR, ENS/.sol/.ton names, tx hashes, Bitcoin block hashes, block numbers. A failing checksum is flagged as a likely typo instead of guessing another chain; ambiguous values list every interpretation (`detectAll`). | `lib/detect.ts`, `lib/codec/*` (native keccak, SHA-256, BLAKE2b, base58, bech32, CashAddr, base32) | — (new) |
| **Chain picker.** Searchable list of 789 chains (769 legacy + 20 added: Arbitrum, OP, Base, Avalanche, Linea, zkSync, Scroll, Gnosis, Celo, Mantle, Osmosis, Celestia, Injective, Kusama, NEAR, Tezos, TON, Sui, Aptos, Algorand) with Favourites (star to pin) and Popular groups, official logos and keyboard navigation. Chains whose only explorer is dead are marked "explorer down". | `components/search/ChainCombobox.tsx`, `data/chains-extra.json`, `lib/prefs.ts` | Chosen.js dropdown |
| **Popular chains and recent searches** shown under the bar; recents stay in this browser only (localStorage) and can be cleared. | `SmartSearch.tsx`, `lib/recent.ts` | — (new) |
| **Explorer routing.** 44 chains have per-type routes (address / tx / block / name / search) on one or more explorers (e.g. mempool.space, Blockstream, Blockchair, Blockchain.com for Bitcoin), with a remembered preference; 400+ ERC-20/BEP-20 token entries inherit Ethereum/BNB routes. All other chains keep their legacy handoff (URL, GET/POST form, or web search), upgraded to https where the health check found it working. Templates are validated in tests (https, one `{q}`, no private hosts) and opened only after a final URL safety check. | `data/explorers.json`, `data/chains.json` (generated), `lib/chains.ts`, `lib/explorer.ts` | `select.js` (770-case `switch`) |
| **Explorer health check.** `npm run explorers:check` probes every explorer host and writes `data/explorer-health.json` (last run: 126 of 236 hosts up). Dead explorers get a warning, a web-search fallback and an "open anyway" option. | `scripts/check-explorers.mjs` | — |
| **Shareable searches and OpenSearch.** `/search?q=…&chain=…` shows every interpretation of a query with explorer links per chain, cross-chain balances for 0x addresses and a "which chain is this tx on" finder; it redirects to the native page when the chain is known. `/opensearch.xml` lets browsers add Web3Lens as a search engine; the home page carries WebSite/SearchAction structured data. | `app/search/page.tsx`, `app/opensearch.xml/route.ts`, `app/layout.tsx` | — |
| **Per-chain explorer pages** `/explorer/[chain]` for the 44 chains with verified per-type routes (statically generated, in the sitemap) plus an `/explorer` index: search bar preset to the chain, every explorer with the page types it supports, and what Web3Lens shows natively. Legacy-only chains get no page (thin content). | `app/explorer/*` | — |
| **Gas tracker** (`/gas`): live base fee, tip and gas price on 11 EVM chains with dollar costs for a transfer, token transfer and swap, plus Bitcoin fee rates; refreshes every 30 s while visible. Also in the extension's tools. | `app/gas`, `components/tools/GasTracker.tsx` | — |
| **Native address pages** `/address/[chain]/[address]` for Ethereum, Base, Arbitrum, OP, Polygon, BNB Chain, Avalanche, Linea, zkSync, Scroll, Gnosis (balance, nonce, EOA/contract/EIP-7702, ENS reverse name, ERC-20 holdings with spam hidden, activity, labels, proxy/creator), Bitcoin and Litecoin (balance, received/sent, pending, recent txs with net effect) and Solana (balance, owner, SPL holdings, signatures). ENS names resolve on-chain. When a format fits several chains (e.g. a `1…` address on Bitcoin Cash), the page links to the others. Each section shows its source and fetch time, "stale" when served from cache after a provider failure, or "unavailable" with the reason. | `app/address/…`, `components/results/*`, `lib/server/lookup.ts`, `lib/providers/*` | — |
| **Native transaction pages** `/tx/[chain]/[hash]`: status, confirmations, from/to, value and fee in native and USD, gas, decoded input (verified ABI from Blockscout, else common signatures, clearly labelled as a guess), token transfers, Bitcoin inputs/outputs and fee rate, Solana balance changes. | `app/tx/…`, `components/results/TxView.tsx` | — |
| **Cross-chain.** The same 0x address on 11 EVM chains in one request; a 0x tx hash located across them. | `components/results/MultichainBalances.tsx`, `TxLocator.tsx`, `/api/v1/multichain`, `/api/v1/locate-tx` | — |
| **Risk checks** (address pages, batch, extension): OFAC SDN snapshot (local, `data/sanctions.json`), Blockscout scam/reputation flags, GoPlus reported-address and token-risk flags, source verification (Blockscout + Sourcify), EIP-1967 proxy/admin slots, `owner()`, admin-style functions in the verified ABI, and token approvals (ERC-20 allowances read live, NFT operator approvals) with spender labels and a wallet-spender warning, plus a revoke.cash link. Results say "no reports in these sources", never "safe". | `components/results/SecurityPanel.tsx`, `lib/server/security.ts`, `lib/security/*` | — |
| **Public API** `/api/v1/{detect,address,tx,multichain,locate-tx,security,approvals,gas,resolve,selector}`: input validated with the detector, per-IP rate limit (60/min/instance), in-memory TTL cache with stale-if-error, CDN `s-maxage` headers, CORS for the extensions. | `app/api/v1/*`, `lib/server/*` | — |
| **Developer tools** (`/tools`): unit converter (wei/gwei/ETH, sats/BTC, lamports/SOL, any decimals; exact BigInt maths), address validator, hex ↔ decimal/int256, UTF-8 ↔ hex, keccak256/SHA-256 with selectors, timestamp converter (s/ms/µs/ns/hex/date), gas and fee calculator with live gas on 11 chains and Bitcoin fee rates, calldata decoder/encoder (JSON ABI, signatures, built-in list, optional community selector lookup), raw transaction decoder (legacy, 2930, 1559, 4844, 7702) with sender recovery (native secp256k1). All local except live gas and selector lookups. | `app/tools/*`, `components/tools/*`, `lib/tools/*`, `lib/evm/*`, `lib/codec/{rlp,secp256k1}.ts` | — |
| **Batch search** (`/batch`): up to 50 values; type, checksum, OFAC, saved label, optional EVM balances; CSV export (formula-injection safe), save all, share link. | `app/batch`, `lib/batch.ts`, `lib/csv.ts` | — |
| **Saved addresses and settings**: labels, notes, favourites, filter, JSON export/import (`/saved`); search behaviour, preferred explorer per chain, favourite chains, data reset (`/settings`). Browser-only (localStorage). | `app/saved`, `app/settings`, `lib/saved.ts`, `lib/prefs.ts`, `lib/local-store.ts` | — |
| **Shareable investigations** (`/investigate#…`): a titled list of items with labels and notes encoded in the URL fragment, so the server never sees it; "save all" imports it. Shared labels are shown as claims, not facts. | `app/investigate`, `lib/investigation.ts` | — |
| **Browser extensions** for Chrome, Firefox and Edge (`extension-chrome/`, `extension-firefox/`, `extension-edge/`, built from `extension-src/`): popup search with detection, compact results and risk flags; full-page app with result pages, cross-chain, approvals, all seven tools, batch, saved and settings; right-click "Look up on Web3Lens" / "Open in its block explorer"; `w3` omnibox keyword with suggestions; "find addresses on this page" (activeTab); Alt+Shift+W. Permissions: storage, contextMenus, activeTab, scripting. Offline mode keeps everything local. | `extension-src/`, `/extension` page | — |
| **Empty-query check.** Searching with an empty box shows an inline message. | `SmartSearch.tsx` | `alert()` in `select.js` |
| **Home page:** centred hero with a one-line headline, a wide search bar and stats; popular-chain tiles that set the chain in the search bar; clickable "try it" examples that demo auto-detect; how-it-works steps; Directory/Learn cards; roadmap cards; support call-out. If the chosen chain doesn't match what was pasted, a "Switch to" chip offers the matching chain. | `app/page.tsx`, `components/home/PopularChains.tsx`, `components/home/TryExamples.tsx` | particles.js background (`pscript1.js`) |
| **Responsive layout.** One page for all screen sizes. | Tailwind breakpoints | separate `mobile.html` + `mobilemenu.js` |
| **Navbar:** Search, Tools, Saved, Extension, Directory, Learn, About, News dropdown (15 outside sources), Markets (CoinMarketCap), Contact. Full-width sticky bar; collapses to a sheet below 1280px. | `components/layout/SiteHeader.tsx`, `config/site.ts` | `menu.js` |
| **Footer** with navigation, information links (Bookmark, Terms, Privacy, Sitemap) and the ETH/Polygon and Cosmos donation addresses with copy buttons. | `components/layout/SiteFooter.tsx`, `components/ui/CopyButton.tsx` | `footer.js` fixed donation bar |
| **Crypto Directory:** 60 YouTube channels, forums, news sites, Facebook groups, Reddit communities and X/Twitter profiles as a 1–4 column grid with brand-logo icons, type filters (with counts) and search. | `app/directory/page.tsx`, `components/directory/DirectoryGrid.tsx`, `data/directory.json` | `directory.html` + DataTables |
| **Learn (Beginner's Guide):** 7 questions (blockchain, Bitcoin, buying/selling, mining, wallets, NFTs, DeFi), each with an illustration, all visible with a sticky table of contents; video beside each answer on wide screens, loaded only when played. | `app/blockchain-guide/page.tsx`, `components/guide/GuideSections.tsx`, `content/guide.ts` | `blockchain-guide.html` |
| **Contact form** (name, email, subject, message) that emails the site owner. Honeypot, minimum fill time, spam/link checks, per-IP and per-email rate limit. | `app/contact/page.tsx`, `components/contact/ContactForm.tsx`, `app/api/contact/route.ts`, `lib/contact.ts` | `contact.html` + `contact.php` |
| **Static pages:** About (with stats), Terms of Use, Privacy Policy, Bookmark how-to, HTML sitemap, 404; sticky title block on the left, numbered sections on the right. | `app/{about,terms,privacy-policy,bookmark,site-map}/page.tsx`, `components/content/PageShell.tsx` | `*.html` |
| **SEO:** per-page title/description/canonical/Open Graph/Twitter tags, generated OG image and app icons, `sitemap.xml`, `robots.txt`, Google Search Console verification files. | `app/layout.tsx`, `lib/metadata.ts`, `app/opengraph-image.tsx`, `app/icon.svg`, `app/sitemap.ts`, `app/robots.ts`, `public/google*.html` | `<head>` tags in `index.html` |
| **Old URLs keep working:** `/about.html`, `/mobile.html`, `/contact.php`, etc. redirect permanently to the new routes; `www.web3lens.com` redirects to `web3lens.com` (Vercel domain setting). | `next.config.ts` | — |
| **Accessibility:** skip link, visible focus rings, labelled controls, `prefers-reduced-motion` respected. | `app/layout.tsx`, `app/globals.css` | — |
| **Analytics:** GA4, loaded only when `NEXT_PUBLIC_GA_ID` is set. | `app/layout.tsx` | dead Universal Analytics tag |
| **Tests and release checks:** 68 unit tests (`npm test`: codecs against reference vectors, detection, routing and URL validation, legacy parity, ABI/RLP, raw-tx decoding against mainnet fixtures of types 0/2/3/4, tools, cache, rate limiter, validation, sanctions, extension parity/permissions/freshness); browser smoke tests for the site (`scripts/smoke-site.mjs`, 94 checks: 27 pages at 390/1024/1440 px, legacy redirects and live search flows) and the extension (`scripts/smoke-extension.mjs`); Firefox `web-ext lint`; CI in `.github/workflows/ci.yml`. | `scripts/` | — |

## Defects fixed during the migration

- `onchange="changeFunc()"` called a function that never existed, so every dropdown change threw an error.
- `pscript1.js` ended with `requestAnimationFrame()` with no callback, which throws.
- jQuery was loaded three times (3.2.1 slim, 1.9.1, 1.11.2), plus bootstrap-select (unused) and DataTables on pages with no table. Several assets loaded over `http://` (mixed content).
- `open(url + t, '_blank')` cases (e.g. Tether, GameCredits) appended the literal text `_blank` to the explorer URL.
- GameCredits had no `break`, so it opened its own explorer **and** the Bitcore explorer.
- The Google fallback produced `…?q=<coin> Blockchain Explorer<query>` (no space).
- `contact.php` used the visitor's name and email as the `From:` header (header injection, fails SPF) and put unescaped input into the HTML email.
- `favicon.ico` and `apple-touch-icon.png` were referenced but missing; OG/Twitter images pointed at files that weren't in the repo.
- The HTML sitemap's "Blockchain Guide" link pointed at `directory.html`.
- "Node Investor" was listed twice in the directory.
- `mobile.html` was missing Cosmos and still used the old BlockSearchEngine name; branding is now "Web3Lens" everywhere.
- Two `<title>` tags on the home page; dead Google+ `publisher` link removed.
- The bookmark page hot-linked a GIF over `http://` from another site; replaced with an inline Ctrl + D key illustration.
- Three truncated chain names were shown in full: Basic Attention Token, Experience Points, High Performance Blockchain.
- The YouTube embeds use `youtube-nocookie.com` and load lazily.

## Legacy routing quirks: fixed

The legacy routing is still kept exactly (the parity test runs `legacy/select.js` against `resolveLegacyExplorer`
for all 769 chains), but searches now go through per-type routes, which fixed:

- Bitcoin → always `/btc/address/`, Solana → always `/tx/`, Cardano → always `/address/`, Tron → always `/transaction/`.
- USDC → Tronscan (now Etherscan's USDC token page, filtered to the address), Internet Computer and ICON → Etherscan
  (now the ICP dashboard and ICON tracker).
- 413 ERC-20 tokens went to a generic Etherscan search; their addresses and hashes now open the address/tx page.
- `http://` explorers are upgraded to https where the health check found https working.

Still open (see ROADMAP Phase 1): 130 legacy-only chains whose sole explorer is dead are flagged rather than removed,
Ontology still points at the NEO tracker, and 102 chains still use chainz.cryptoid.info search.
