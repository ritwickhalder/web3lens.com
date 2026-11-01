# Web3Lens — Features

What the site does today, after the move from the 2018 static site (now in `legacy/`) to Next.js.
Planned work lives in [ROADMAP.md](ROADMAP.md).

## Current features

| Feature | Where it lives now | Legacy source |
|---|---|---|
| **Blockchain search.** Pick one of 769 chains in a searchable dropdown, type an address / tx hash / block / data, press SEARCH or Enter. The chain's block explorer opens in a new tab. | `components/search/ChainSearch.tsx`, `components/search/ChainCombobox.tsx` | `index.html`, Chosen.js |
| **Explorer routing.** Each chain maps to one of three handoffs: open a URL with the query in it (685 chains), submit a GET/POST form to the explorer (83), or search Google for "<chain> Blockchain Explorer <query>" (1). Of these, 93 chains are marked `fallback`: the site says the chain is "not yet supported" and uses a substitute explorer. | `data/chains.json` (generated), `lib/chains.ts`, `lib/explorer.ts` | `select.js` (770-case `switch`) |
| **Empty-query check.** Searching with an empty box shows "Oops.. You forgot to enter something…". | `ChainSearch.tsx` (inline message, was an `alert`) | `select.js` |
| **Particle background** on the home page: drifting white dots linked within 150px, links to the pointer on hover, click adds 4 dots. Static frame under `prefers-reduced-motion`. | `components/ParticlesBackground.tsx` (no dependency) | `pscript1.js` + particles.js |
| **Responsive layout.** One page for all screen sizes. | Tailwind breakpoints | separate `mobile.html` + `mobilemenu.js` |
| **Navbar:** CoinMarketCap, Crypto Directory, Crypto News dropdown (15 outside sources), Blockchain Guide, Information dropdown (Bookmark, Terms, Privacy, Sitemap, About), Contact Us. Collapses into a menu below 1024px. | `components/layout/SiteHeader.tsx`, `config/site.ts` | `menu.js` |
| **Donation bar** fixed at the bottom; expands to show the ETH/Polygon and Cosmos addresses. | `components/layout/DonationFooter.tsx` | `footer.js` |
| **Crypto Directory:** 60 YouTube channels, forums, news sites, Facebook groups, Reddit communities and Twitter profiles, with search, column sorting and paging. | `app/directory/page.tsx`, `components/directory/DirectoryTable.tsx`, `data/directory.json` | `directory.html` + DataTables |
| **Beginner's Guide:** 7-question FAQ (blockchain, Bitcoin, buying/selling, mining, wallets, NFTs, DeFi) with YouTube videos; one answer open at a time. | `app/blockchain-guide/page.tsx`, `components/guide/GuideAccordion.tsx`, `content/guide.ts` | `blockchain-guide.html` |
| **Contact form** (name, email, subject, message) that emails the site owner. Honeypot, minimum fill time, spam/link checks, per-IP and per-email rate limit. | `app/contact/page.tsx`, `components/contact/ContactForm.tsx`, `app/api/contact/route.ts`, `lib/contact.ts` | `contact.html` + `contact.php` |
| **Static pages:** About, Terms of Use, Privacy Policy, Bookmark how-to, HTML sitemap. | `app/{about,terms,privacy-policy,bookmark,site-map}/page.tsx` | `*.html` |
| **SEO:** per-page title/description/canonical/Open Graph/Twitter tags, generated OG image, `sitemap.xml`, `robots.txt`, favicon, Google Search Console verification files. | `app/layout.tsx`, `lib/metadata.ts`, `app/opengraph-image.tsx`, `app/sitemap.ts`, `app/robots.ts`, `public/google*.html` | `<head>` tags in `index.html` |
| **Old URLs keep working:** `/about.html`, `/mobile.html`, `/contact.php`, etc. redirect permanently to the new routes; `web3lens.com` redirects to `www.web3lens.com`. | `next.config.ts` | — |
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
