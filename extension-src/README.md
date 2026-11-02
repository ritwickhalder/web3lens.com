# Extension source (shared by Chrome, Firefox and Edge)

`npm run ext:build` bundles this folder (plus `lib/`, `data/`, `config/tools.ts`) with esbuild into
`extension-chrome/`, `extension-firefox/` and `extension-edge/`. Each of those keeps its own
hand-written `manifest.json`; everything else there is generated.

| File | What |
|---|---|
| `src/popup.ts` | Toolbar popup: search with auto-detect, compact results, recent searches, “find addresses on this page” |
| `src/app.ts` | Full-page app (`app.html#search`, `#result/…`, `#batch`, `#tools/<slug>`, `#saved`, `#settings`); also the options page |
| `src/background.ts` | Right-click “Look up on Web3Lens” / “Open in block explorer”, and the `w3` omnibox keyword |
| `src/scan.ts` | Function injected (activeTab + scripting) only when the user asks to scan the current page |
| `src/views/*` | Search, results, risk checks, tools, batch, saved, settings (plain DOM, text nodes only) |
| `src/store.ts` | `storage.local`: preferences, saved items, recents, extension settings (same shapes as the website) |
| `src/browser.ts` | Chrome/Firefox adapter |
| `static/` | HTML shells and CSS |
| `icons/` | PNG icons, rendered by `scripts/make-extension-icons.mjs` |

Rules: no remote code (all scripts are local; CSP `script-src 'self'`), no host permissions, no
content scripts, network only to `https://web3lens.com` (CSP `connect-src`) and only when online
lookups are on, never `innerHTML` with data.
