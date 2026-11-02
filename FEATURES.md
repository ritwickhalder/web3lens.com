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
| **Smart search.** One bar: chain picker + query box + Search. Enter or the button opens the chain's block explorer in a new tab. `/` or `Ctrl/⌘ K` focuses it from anywhere on the page. | `components/search/SmartSearch.tsx` | `index.html` |
| **Auto-detect.** Recognises what's pasted (EVM address / tx hash, ENS and .sol names, Bitcoin, Litecoin, Bitcoin Cash, Dogecoin, Tron, XRP, Cosmos, Cardano, Stellar and Solana addresses, Solana signatures, raw tx hashes, block numbers), shows the type, pre-selects the matching chain until the user picks one, and offers the alternatives as chips. | `lib/detect.ts` (shared with the future extensions) | — (new) |
| **Chain picker.** Searchable list of all 769 chains with a "Popular" group, official coin logos (ticker badge as fallback) and keyboard navigation (↑ ↓ Enter Esc). Chains the old site flagged as unsupported are marked "limited". | `components/search/ChainCombobox.tsx`, `components/search/ChainGlyph.tsx`, `lib/chain-meta.ts` | Chosen.js dropdown |
| **Popular chains and recent searches** shown under the bar; recents stay in this browser only (localStorage) and can be cleared. | `SmartSearch.tsx`, `lib/recent.ts` | — (new) |
| **Explorer routing.** Each chain maps to one of three handoffs: open a URL with the query in it (685 chains), submit a GET/POST form to the explorer (83), or search Google for "<chain> Blockchain Explorer <query>" (1). Of these, 93 chains are marked `fallback`: the site says the chain is "not yet supported" and uses a substitute explorer. | `data/chains.json` (generated), `lib/chains.ts`, `lib/explorer.ts` | `select.js` (770-case `switch`) |
| **Empty-query check.** Searching with an empty box shows an inline message. | `SmartSearch.tsx` | `alert()` in `select.js` |
| **Home page:** centred hero with a one-line headline, a wide search bar and stats; popular-chain tiles that set the chain in the search bar; clickable "try it" examples that demo auto-detect; how-it-works steps; Directory/Learn cards; roadmap cards; support call-out. If the chosen chain doesn't match what was pasted, a "Switch to" chip offers the matching chain. | `app/page.tsx`, `components/home/PopularChains.tsx`, `components/home/TryExamples.tsx` | particles.js background (`pscript1.js`) |
| **Responsive layout.** One page for all screen sizes. | Tailwind breakpoints | separate `mobile.html` + `mobilemenu.js` |
| **Navbar:** Search, Directory, Learn, About, News dropdown (15 outside sources), Markets (CoinMarketCap), Contact. Full-width sticky bar; collapses to a sheet below 1024px. | `components/layout/SiteHeader.tsx`, `config/site.ts` | `menu.js` |
| **Footer** with navigation, information links (Bookmark, Terms, Privacy, Sitemap) and the ETH/Polygon and Cosmos donation addresses with copy buttons. | `components/layout/SiteFooter.tsx`, `components/ui/CopyButton.tsx` | `footer.js` fixed donation bar |
| **Crypto Directory:** 60 YouTube channels, forums, news sites, Facebook groups, Reddit communities and X/Twitter profiles as a 1–4 column grid with brand-logo icons, type filters (with counts) and search. | `app/directory/page.tsx`, `components/directory/DirectoryGrid.tsx`, `data/directory.json` | `directory.html` + DataTables |
| **Learn (Beginner's Guide):** 7 questions (blockchain, Bitcoin, buying/selling, mining, wallets, NFTs, DeFi), each with an illustration, all visible with a sticky table of contents; video beside each answer on wide screens, loaded only when played. | `app/blockchain-guide/page.tsx`, `components/guide/GuideSections.tsx`, `content/guide.ts` | `blockchain-guide.html` |
| **Contact form** (name, email, subject, message) that emails the site owner. Honeypot, minimum fill time, spam/link checks, per-IP and per-email rate limit. | `app/contact/page.tsx`, `components/contact/ContactForm.tsx`, `app/api/contact/route.ts`, `lib/contact.ts` | `contact.html` + `contact.php` |
| **Static pages:** About (with stats), Terms of Use, Privacy Policy, Bookmark how-to, HTML sitemap, 404; sticky title block on the left, numbered sections on the right. | `app/{about,terms,privacy-policy,bookmark,site-map}/page.tsx`, `components/content/PageShell.tsx` | `*.html` |
| **SEO:** per-page title/description/canonical/Open Graph/Twitter tags, generated OG image and app icons, `sitemap.xml`, `robots.txt`, Google Search Console verification files. | `app/layout.tsx`, `lib/metadata.ts`, `app/opengraph-image.tsx`, `app/icon.svg`, `app/sitemap.ts`, `app/robots.ts`, `public/google*.html` | `<head>` tags in `index.html` |
| **Old URLs keep working:** `/about.html`, `/mobile.html`, `/contact.php`, etc. redirect permanently to the new routes; `www.web3lens.com` redirects to `web3lens.com` (Vercel domain setting). | `next.config.ts` | — |
| **Accessibility:** skip link, visible focus rings, labelled controls, `prefers-reduced-motion` respected. | `app/layout.tsx`, `app/globals.css` | — |
| **Analytics:** GA4, loaded only when `NEXT_PUBLIC_GA_ID` is set. | `app/layout.tsx` | dead Universal Analytics tag |

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

## Kept as-is on purpose (fix planned in ROADMAP Phase 1)

The migration routes every chain exactly as the legacy `switch` did, so behaviour can be compared case by case
(`npm test` runs the original `select.js` in a sandbox and checks all 769 chains). That means these quirks are
still there:

- Some explorers always use one path regardless of input: Bitcoin → `/btc/address/`, Solana → `/tx/`, Cardano → `/address/`, Tron → `/transaction/`.
- Odd mappings: USDC → Tronscan, Internet Computer and ICON → Etherscan, Ontology → NEO tracker.
- 413 chains (mostly ERC-20 tokens) go to Etherscan search; 102 go to chainz.cryptoid.info.
- 83 chains still hand off to a plain `http://` explorer, and many of the 2018-era explorers and coins are probably dead.
