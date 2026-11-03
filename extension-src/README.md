# Extension source (shared by Chrome, Firefox and Edge)

`npm run ext:build` bundles this folder (plus `lib/`, `data/`, `config/tools.ts`) with esbuild into
`extension-chrome/`, `extension-firefox/` and `extension-edge/`. Each of those keeps its own
hand-written `manifest.json`; everything else there is generated.

| File | What |
|---|---|
| `src/popup.ts` | Toolbar popup: search with auto-detect, compact results, recent searches, “Scan page” tab (finds addresses on the current tab) |
| `src/app.ts` | Full-page app (`app.html#search`, `#result/…`, `#batch`, `#tools/<slug>`, `#saved`, `#settings`); also the options page |
| `src/background.ts` | Right-click “Look up on Web3Lens” / “Open in block explorer”, and the `w3` omnibox keyword |
| `src/scan.ts` | Function injected (activeTab + scripting) only when the user opens the popup's Scan page tab |
| `src/views/*` | Search, results, risk checks, tools, batch, saved, settings (plain DOM, text nodes only) |
| `src/store.ts` | `storage.local`: preferences, saved items, recents, extension settings (same shapes as the website) |
| `src/browser.ts` | Chrome/Firefox adapter |
| `src/i18n.ts`, `src/locales.ts`, `locales/*.json` | UI translations: `t('key', {params})`, 15 languages (English source and fallback), browser-language detection, the saved `settings.language` (`auto` by default). Add a string to `en.json` and every other catalog; `npm test` fails on missing keys, mismatched `{placeholders}` or a translated chain name/symbol/identifier. The background (context menu, omnibox) stays English and does not bundle the catalogs |
| `src/ui.ts` | Look and feel shared with the website: lens logo, Phosphor icons, official coin logos, searchable chain picker |
| `icons-entry.tsx` | Build-time only: renders the website's React icon components (coin logos, Phosphor) to SVG strings that the build compiles in; no React ships |
| `static/` | HTML shells, CSS (the website's tokens, dark/light) and `fonts/` (Manrope and IBM Plex Mono, SIL OFL, bundled so nothing loads remotely) |
| `icons/` | PNG icons, rendered by `scripts/make-extension-icons.mjs` |

Rules: no remote code (all scripts are local; CSP `script-src 'self'`), no host permissions, no
content scripts, network only to `https://web3lens.com` (CSP `connect-src`) and only when online
lookups are on, never `innerHTML` with data.
