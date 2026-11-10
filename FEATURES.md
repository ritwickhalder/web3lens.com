# Web3Lens: feature reference

**Last updated:** 2026-11-05, verified against the source (website on `main`, extensions **1.0.1** for Chrome, Firefox and Edge).

This is the **authoritative list of what Web3Lens does today**. Use it for development, marketing, store listings and docs; update it in the same change whenever a feature ships, changes or is removed. Only shipped features are listed. Planned work lives in [ROADMAP.md](ROADMAP.md) and is never described here as available (see [Not in the product](#not-in-the-product-do-not-market)).

**Product:** Web3Lens (web3lens.com) is a multichain blockchain search and investigation tool: paste any address, transaction hash, block or name, and Web3Lens detects the chain, shows its own result page for 14 chains (11 EVM chains, Bitcoin, Litecoin, Solana), or opens the right page of the right explorer for 700+ chains. Browser extensions bring the same search, tools and risk checks into Chrome, Firefox and Edge.

## Plans

**Everything is Free.** There is no account, sign-in, paid plan or usage meter in the code. A Pro tier is only a later roadmap phase (ROADMAP Phase 7) and does not exist yet. Data such as saved addresses, settings and recent searches stays in the user's browser.

## Platforms

| Platform | Notes |
|---|---|
| **Website** (web3lens.com, Next.js 16 on Vercel) | Every feature below unless marked *Ext only*. English only. Dark (default), Light or System theme. |
| **Chrome extension** (`extension-chrome/`) | Built from `extension-src/` by `npm run ext:build`. Published on the Chrome Web Store. |
| **Firefox add-on** (`extension-firefox/`) | Same build and features as Chrome. Published on Firefox Add-ons. |
| **Edge add-on** (`extension-edge/`) | Same build and features as Chrome. Published on Edge Add-ons. |

The three extensions are identical in features (one source, manifests tested to match). Permissions: `storage`, `contextMenus`, `activeTab`, `scripting`; no host permissions, no content scripts, no remote code; network only to `https://web3lens.com`. Store links live in `EXTENSION_STORES` (`config/site.ts`). The site's install buttons (`components/extension/AddToBrowser.tsx`, detection in `lib/browser.ts`) read “Add to Chrome/Firefox/Edge” for the visitor's browser (Brave, Opera, Vivaldi → Chrome Web Store; Safari and mobile Chrome → the extension page) and list the other stores; they appear in the header (2xl and the mobile menu), the home page, the footer, `/extension` and the blog's extension CTA.

Columns below: **Web** = website, **Ext** = all three extensions.

---

## 1. Search and detection

| Feature | What it does | Web | Ext |
|---|---|---|---|
| **Smart search** | One bar with chain picker, query box and Search. Native result page for the 14 native chains (0x values with an auto-picked chain get the cross-chain overview); otherwise opens the right explorer page in a new tab. A setting switches to "always open the explorer". `/` or Ctrl/⌘ K focuses it. | ✓ | ✓ (popup Lookup tab) |
| **Auto-detect with checksums** | 30+ formats: EVM (EIP-55), Bitcoin/Litecoin/Dogecoin/Dash/Tron/Zcash (base58check), SegWit/Taproot and Cosmos-SDK/Cardano (bech32/bech32m), Bitcoin Cash (CashAddr), Polkadot/Kusama (SS58), XRP, Stellar, TON, Tezos, Solana, ICON, Algorand, NEAR, ENS/.sol/.ton names, tx hashes, Bitcoin block hashes, block numbers. A failed checksum is flagged as a likely typo; ambiguous values list every interpretation. | ✓ | ✓ |
| **Input safety** | Pasted explorer links and payment URIs (`bitcoin:…`, `ethereum:…`) are reduced to the address/hash. Private keys and recovery phrases are recognised and never searched. Empty searches show an inline message. | ✓ | ✓ |
| **Chain picker** | Searchable list of 792 chains (649 from the original list after the November 2026 audit + 143 added, e.g. Arbitrum, Base, Hyperliquid, Sonic, Berachain, Monad, Unichain, Sei, Hedera, Kaspa, Stacks, Starknet, Bitcoin SV, the main Cosmos and Polkadot chains) sorted by name, matching names and tickers with Favourites, Popular, official coin logos (44 chains), keyboard navigation and "explorer down" marks. Marketed as "700+ chains". | ✓ | ✓ |
| **"Switch to" chip** | If the chosen chain doesn't match what was pasted, offers the matching chain. | ✓ | ✓ |
| **Recent searches** | Shown under the bar, stored only in this browser, clearable. | ✓ | ✓ |
| **Shareable searches** | `/search?q=…&chain=…` shows every interpretation with explorer links per chain, cross-chain balances for 0x addresses and a "which chain is this tx on" finder; redirects to the native page when the chain is known. | ✓ | — |
| **Browser search engine** | `/opensearch.xml` lets browsers add Web3Lens as a search engine. | ✓ | — |
| **Omnibox, context menu, shortcut** | `w3` keyword in the address bar with suggestions; right-click "Look up on Web3Lens" / "Open in its block explorer"; Alt+Shift+W opens the popup. | — | ✓ |
| **Scan page** | Finds every address on the current tab (activeTab, only when opened); copy all or batch-check. | — | ✓ |

## 2. Explorer routing

| Feature | What it does | Web | Ext |
|---|---|---|---|
| **Per-type explorer routes** | 200 chains have address / tx / block / name / search routes on one or more explorers (e.g. mempool.space, Blockstream, Blockchair, Blockchain.com for Bitcoin), with a remembered preferred explorer per chain; 400+ tokens inherit their host chain's routes (ERC-20/BEP-20, Waves and Stellar assets, Kin on Solana, ZEN on Base). Other chains use their legacy handoff (URL, form or web search), upgraded to https where it works. Every URL passes a final safety check. | ✓ | ✓ |
| **Explorer health** | A health snapshot (`data/explorer-health.json`: each host, plus each chain's own explorer page so a delisted coin or parked domain counts as down) marks dead explorers with a warning, a web-search fallback and "open anyway". | ✓ | ✓ |
| **Per-chain explorer pages** | `/explorer/[chain]` for the 200 chains with per-type routes plus an `/explorer` index: search preset to the chain, every explorer with its page types, and what Web3Lens shows natively. | ✓ | — |

## 3. Native result pages

| Feature | What it does | Web | Ext |
|---|---|---|---|
| **Address pages** | `/address/[chain]/[address]`. EVM (Ethereum, Base, Arbitrum, OP, Polygon, BNB Chain, Avalanche, Linea, zkSync, Scroll, Gnosis): balance, nonce, EOA/contract/EIP-7702, ENS reverse name, ERC-20 holdings (spam hidden and counted), activity, labels, proxy/creator. Bitcoin and Litecoin: balance, received/sent, pending, recent txs with net effect. Solana: balance, owner, SPL holdings, signatures. Links to other chains a format fits. QR code of the address. | ✓ | ✓ (full-page app; compact results in the popup) |
| **Transaction pages** | `/tx/[chain]/[hash]`: status, confirmations, from/to, value and fee in native and USD, gas, decoded input (verified ABI, else common signatures labelled as a guess), token transfers, Bitcoin inputs/outputs and fee rate, Solana balance changes. | ✓ | ✓ |
| **Cross-chain** | The same 0x address on 11 EVM chains in one request; a 0x tx hash located across them. | ✓ | ✓ |
| **Token coverage** | Blockscout where it exists; Routescan for Avalanche (holdings, prices, recent txs); a list of 19 well-known tokens checked live on BNB Chain and Linea, with a plain note that only the list was checked. | ✓ | ✓ |
| **ENS names** | On-chain resolution plus off-chain names (ENSIP-10 wildcards, CCIP-read), verified on-chain, with strict gateway limits. | ✓ | ✓ |
| **Honest data** | Each section shows its source and fetch time, "stale" when served from cache after a provider failure, or "unavailable" with the reason. Sections stream in, so a slow source never blanks the page. | ✓ | ✓ |

## 4. Risk checks

| Feature | What it does | Web | Ext |
|---|---|---|---|
| **Risk panel** | OFAC SDN snapshot (local), Blockscout scam/reputation flags, GoPlus reported-address and token-risk flags, source verification (Blockscout + Sourcify), EIP-1967 proxy/admin slots, `owner()`, admin-style functions in the ABI. Wording is always "no reports in these sources", never "safe". | ✓ (address pages, batch) | ✓ |
| **Token approvals** | ERC-20 allowances read live and NFT operator approvals, with spender labels, a wallet-spender warning and a revoke.cash link. (Not scanned on Avalanche, BNB Chain or Linea; the panel links to revoke.cash there.) | ✓ | ✓ |

## 5. Developer tools (`/tools`)

All run locally in the browser except live gas and the optional selector lookup.

| Tool | What it does | Web | Ext |
|---|---|---|---|
| **Unit converter** | wei/gwei/ETH, sats/BTC, lamports/SOL, any decimals; exact BigInt maths. | ✓ | ✓ |
| **Address validator** | Format and checksum check for every detected type. | ✓ | ✓ |
| **Hex / encoding** | Hex ↔ decimal/int256, UTF-8 ↔ hex. | ✓ | ✓ |
| **Hashing** | keccak256 and SHA-256, with function selectors. | ✓ | ✓ |
| **Timestamp converter** | s/ms/µs/ns/hex/date. | ✓ | ✓ |
| **Gas and fee calculator** | Costs with live gas on 11 chains and Bitcoin fee rates. | ✓ | ✓ |
| **Calldata decoder/encoder** | JSON ABI, signatures, built-in list, optional community selector lookup. | ✓ | ✓ |
| **Raw transaction decoder** | Legacy, EIP-2930, 1559, 4844, 7702, with sender recovery (native secp256k1). | ✓ | ✓ |
| **Gas tracker** (`/gas`) | Live base fee, tip and gas price on 11 EVM chains with dollar costs for a transfer, token transfer and swap, plus Bitcoin fee rates; refreshes every 30 s. | ✓ | ✓ (Gas tab) |

## 6. Batch, saved and investigations

| Feature | What it does | Web | Ext |
|---|---|---|---|
| **Batch search** (`/batch`) | Up to 50 values: type, checksum, OFAC, saved label, optional EVM balances; CSV export (formula-safe), save all, share link. | ✓ | ✓ |
| **Saved addresses** (`/saved`) | Labels, notes, favourites/pins, filter, JSON export/import. Browser-only storage. | ✓ | ✓ (Saved tab) |
| **Settings** (`/settings`) | Search behaviour, preferred explorer per chain, favourite chains, theme, data reset. Extension adds language, online lookups on/off (offline mode keeps everything local) and clear recents. | ✓ | ✓ |
| **Shareable investigations** (`/investigate#…`) | A titled list of items with labels and notes encoded in the URL fragment (the server never sees it); "save all" imports it. Shared labels are shown as claims. | ✓ | ✓ (Saved and Batch copy an investigation link) |

## 7. Public API

`/api/v1/{detect,address,tx,multichain,locate-tx,security,approvals,gas,resolve,selector}`: input validated with the detector, per-IP lookup budget shared with the result pages (60/min and 1,200/hour per instance), crawler User-Agents refused (403), TTL cache with stale-if-error, CDN cache headers, CORS for the extensions. Free, no key. **Web** only.

## 8. Extension experience

| Feature | What it does |
|---|---|
| **Popup (720 × 600, no scrolling)** | Tabs: **Lookup** (search with compact results, Copy, recents and examples), **Scan page**, **Tools** (all seven tools inline), **Gas**, **Saved**. Header: online status, theme switch, **Settings** and **Info** dialogs (shortcuts, coverage, links, the developer's other tools). |
| **Full-page app** | Result pages, cross-chain, approvals, all tools, batch, saved and settings in a sidebar layout with feature cards. |
| **Design** | The website's look: bundled Manrope, lens logo, official coin logos and Phosphor icons rendered from the site's components; light (default), dark and system themes. |
| **15 languages** | English, Spanish, Portuguese, French, German, Japanese, Korean, Simplified Chinese, Russian, Indonesian, Turkish, Italian, Polish, Dutch, Thai; follows the browser language or a saved choice. Chain names, symbols and identifiers stay untranslated. Right-click and omnibox texts stay English. |

## 9. Website content and pages

| Feature | What it does |
|---|---|
| **Home page** | Hero with search and stats, popular-chain tiles, clickable "try it" examples, how-it-works steps, Directory/Learn cards, support call-out. |
| **Blog** (`/blog`) | 21 guides (explorers, address formats, checksums, transactions, ENS, page scanning, context menus, developer tools, batch/CSV, risk checks, the extension, multichain, and six illustrated workflow guides pairing Web3Lens with Super Session Manager, Web Archive Viewer, SummaryTube, Web Developer Tools, Edit Page and CentPage) with featured post, categories, search, reading time, covers and OG images, table of contents, share links, related posts, CTAs and RSS. |
| **Crypto Directory** (`/directory`) | 60 YouTube channels, forums, news sites, Facebook groups, Reddit communities and X profiles with type filters and search. |
| **Learn** (`/blockchain-guide`) | Beginner's guide: 7 questions (blockchain, Bitcoin, buying/selling, mining, wallets, NFTs, DeFi) with illustrations and click-to-load videos. |
| **Extension page** (`/extension`) | Features and install links for Chrome, Firefox and Edge. |
| **Navigation** | Search, Tools, Saved, Extension, Directory, Learn, Blog, About, News dropdown (15 outside sources), Markets, Contact; mobile sheet below 1280 px. Footer with donation addresses (copy buttons). |
| **Contact form** | Emails the owner; honeypot, minimum fill time, spam/link checks, per-IP and per-email rate limits. |
| **Static pages** | About, Terms, Privacy Policy, Bookmark how-to, HTML sitemap, 404. |
| **SEO** | Per-page metadata with full Open Graph/Twitter cards, JSON-LD (Organization, WebSite + SearchAction, WebApplication, SoftwareApplication, BreadcrumbList, BlogPosting, FAQPage), sitemap, robots, RSS. Old 2018 URLs redirect permanently. Live-lookup pages (`/address/`, `/tx/`, `/search?`) and `/api/` are disallowed in robots and marked noindex, nofollow; crawlers and scripts that request them anyway get the page without provider calls (title, metadata and explorer links only). |
| **Themes and accessibility** | Dark/Light/System with no flash, both palettes tested for WCAG AA; skip link, focus rings, labelled controls, reduced motion respected. |
| **Analytics** | GA4, only when `NEXT_PUBLIC_GA_ID` is set. |

## 10. Engineering and release (internal, not user features)

- `npm test`: 100+ unit tests (codecs against reference vectors, QR, detection, routing and URL safety, ABI/RLP, raw-tx decoding, tools, cache, rate limiter, sanctions, theme contrast, ENS CCIP-read, token coverage, RPC failover, i18n catalogs, extension parity/permissions/freshness, blog content).
- Browser smoke tests for the site (`scripts/smoke-site.mjs`) and the extensions (`scripts/smoke-extension.mjs`, `scripts/smoke-extension-firefox.mjs`); Firefox `web-ext lint`; CI in `.github/workflows/ci.yml`.
- Store kit in `store/` (listing copy, permission justifications, privacy answers, screenshots from `node scripts/make-store-assets.mjs`); `npm run ext:pack` builds store zips.
- Generated data: `npm run explorers:check`, `npm run sanctions:update`; `npm run chains:audit` (research report, needs open network).

---

## Best features for a 60-second explainer video

1. **Paste anything, get the chain**: auto-detect with checksums turns an address, hash or ENS name into the right chain in one search (and flags a typo).
2. **Native address page**: balances, tokens, activity, ENS name and QR code streaming in, each section with its source.
3. **Risk panel + token approvals**: OFAC, scam flags, proxy/owner checks and live allowances with a revoke link, worded honestly.
4. **Cross-chain view**: one 0x address across 11 EVM chains at once, and a tx hash located on the right chain.
5. **Browser extension Scan page + right-click lookup**: find every address on a page and check them all in a batch.
6. **Developer tools**: decode calldata or a raw transaction (with sender recovery) entirely in the browser.
7. **700+ chains, one search bar**: the chain picker and smart explorer routing for everything Web3Lens doesn't show natively.

## Not in the product (do not market)

- Accounts, sign-in, sync between devices, or any paid/Pro plan (ROADMAP Phase 7, not built).
- Native result pages for chains beyond the 14 listed (others open their explorer).
- Approval scanning on Avalanche, BNB Chain and Linea.
- A translated website (only the extensions are translated).
- Wallet connection, sending transactions, price charts or portfolio tracking.

---

## Appendix: migration history (2018 static site → Next.js)

Kept for reference; not features.

**Defects fixed during the migration:** `onchange="changeFunc()"` called a missing function; `pscript1.js` called `requestAnimationFrame()` with no callback; jQuery was loaded three times plus unused plugins, and several assets over `http://`; `open(url + t, '_blank')` appended `_blank` to explorer URLs; GameCredits had no `break` and opened two explorers; the Google fallback query had no space; `contact.php` allowed header injection and unescaped HTML; missing favicon/apple-touch icon and OG images; the HTML sitemap's guide link pointed at the directory; "Node Investor" was listed twice; `mobile.html` lacked Cosmos and used the old BlockSearchEngine name; two `<title>` tags and a dead Google+ link; the bookmark page hot-linked an `http://` GIF; three truncated chain names (Basic Attention Token, Experience Points, High Performance Blockchain). YouTube embeds now use `youtube-nocookie.com` and load lazily.

**Legacy routing quirks fixed:** per-type routes fixed the single-path legacy routing: Bitcoin always `/btc/address/`, Solana always `/tx/`, Cardano always `/address/`, Tron always `/transaction/`; USDC, Internet Computer and ICON pointing at the wrong explorers; 413 ERC-20 tokens going to a generic Etherscan search; `http://` explorers upgraded where https works; NEO now routes to NeoTube and Waves to `/addresses/` and `/transactions/`. (The legacy converter and its parity test were retired in the November 2026 audit.)

**Chain audit (November 2026):** 120 chains retired with a reason each (`data/chains-retired.json`; old `?chain=` links explain the removal): 112 whose only explorer was offline and whose project is inactive, Neo Legacy NEP-5 and dead Qtum QRC-20 tokens, POA Network (shut down), Nxt (halted January 2026), HPB and BitConnect. New explorers for live chains whose explorer died or moved: Nano, Ontology, Siacoin, Komodo, Ravencoin, ReddCoin, MonaCoin, Namecoin, Decred, Qtum, IOTA (Rebased), Bitcoin Gold, Signum (Burst), Firo (Zcoin), Polkadot/Kusama Asset Hub; tokens that became chains (Theta, Zilliqa, æternity, WAX, IOST, NULS, Nebulas, QRL, Viction, Nimiq); chains that moved (Lisk and Electroneum to EVM, Horizen to Base). Rebrands renamed (XRP Ledger, BNB Smart Chain, EOS (Vaulta), Obyte, Signum, Firo, Horizen, Viction). 143 chains added (EVM L2s/L1s from viem's chain definitions, Cosmos chains from cosmos/chain-registry with their bech32 prefixes in detection, Polkadot parachains, and Hedera, Filecoin, MultiversX, Kaspa, Stacks, Starknet, Bitcoin SV, eCash, Arweave, Hive, Flow, Mina, Oasis, Bittensor, Pi, Alephium, Nervos, Ergo, Radix, Casper, Symbol, THORChain, Terra and more).

**Still open:** the audit used the 2026-11-02 health snapshot plus registries and web searches; the explorers added or changed in November 2026 have not yet been probed live (`npm run explorers:check`, `npm run chains:audit`). 182 chains still have only a single legacy template (96 of them on chainz.cryptoid.info, whose per-coin pages the next `explorers:check` covers); NEM, Ardor, Ignis, Primecoin, BitcoinZ and DeepBrain Chain are live projects whose known explorer is down. The 410 inherited tokens weren't checked for project activity (needs CoinGecko, `npm run chains:audit`).
