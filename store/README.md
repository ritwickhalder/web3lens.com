# Web3Lens extension: store submission kit

Everything needed to publish the extension on the Chrome Web Store, Microsoft Edge Add-ons and Firefox
Add-ons (AMO). Uploads need the owner's developer accounts; everything else is prepared here.

| File | What |
|---|---|
| [listing.md](listing.md) | Name, summaries, full description, category, single purpose, per-permission justifications, per-store fields |
| [privacy.md](privacy.md) | Answers for each store's privacy / data-use questionnaire, with the reasoning |
| `screenshots/1-search.png` … `5-batch.png` | 1280×800 screenshots (all three stores accept this size) |
| `promo/small-tile-440x280.png` | Chrome small promo tile (required) and Edge small promotional tile |
| `promo/marquee-1400x560.png` | Chrome marquee / Edge large promotional tile (optional) |
| `promo/logo-300.png` | Edge store logo (300×300) |

Regenerate the images after UI changes: `node scripts/make-store-assets.mjs` (needs Playwright + Chromium
locally; it captures the real extension and live data from web3lens.com).

## Before each submission

1. Bump `version` in all three `extension-*/manifest.json` (tests require them to match).
2. `npm run ext:build`, `npm test`, `npm run ext:lint:firefox` (must report 0 errors: AMO rejects names over 45
   characters), `node scripts/smoke-extension.mjs extension-chrome`, `PW_CHANNEL=msedge node scripts/smoke-extension.mjs
   extension-edge` (in the installed Edge) and `node scripts/smoke-extension-firefox.mjs` (in the installed Firefox).
3. By hand, in each browser: right-click a selected address (both menu items), the `w3` keyword, and the popup's
   Scan page tab on a normal web page. Automation can't click native menus or the toolbar icon (which is what grants
   `activeTab`).
4. `npm run ext:pack` → `dist-extensions/web3lens-{chrome,edge,firefox}-<version>.zip` and
   `web3lens-extension-source-<version>.zip`.
5. Make sure https://web3lens.com is deployed from the same commit (the extensions call its `/api/v1`).

## Chrome Web Store (https://chrome.google.com/webstore/devconsole)

- [ ] Upload `web3lens-chrome-<version>.zip`.
- [ ] Store listing: copy from [listing.md](listing.md); category **Tools**; language English.
- [ ] Graphics: icon comes from the package (128×128); upload the 5 screenshots and `small-tile-440x280.png`
      (required); `marquee-1400x560.png` optional.
- [ ] Privacy tab: single purpose, permission justifications and data-use answers from listing.md / privacy.md;
      remote code: **No**; privacy policy URL https://web3lens.com/privacy-policy.
- [ ] Distribution: public, all regions.

## Microsoft Edge Add-ons (https://partner.microsoft.com/dashboard/microsoftedge)

- [ ] Upload `web3lens-edge-<version>.zip`.
- [ ] Properties: category **Developer tools** (or Productivity); privacy policy URL; website https://web3lens.com;
      support contact https://web3lens.com/contact.
- [ ] Store listing: description from listing.md (at least 250 characters); logo `promo/logo-300.png`;
      screenshots; small tile `small-tile-440x280.png`; large tile `marquee-1400x560.png` (optional).
- [ ] Notes for certification: paste the "Notes for reviewers" section from listing.md.

## Firefox Add-ons (https://addons.mozilla.org/developers/)

- [ ] Upload `web3lens-firefox-<version>.zip`. The manifest pins the add-on id `extension@web3lens.com`.
- [ ] Source code: **yes**, upload `web3lens-extension-source-<version>.zip` (the code is bundled with esbuild; the
      zip contains BUILD.md with `npm ci && npm run ext:build`).
- [ ] Data collection: the manifest declares `searchTerms` as required (see privacy.md); confirm it matches the form.
- [ ] Listing: summary (≤250 characters) and description from listing.md; categories **Search Tools** and
      **Other**; homepage, support site, privacy policy; screenshots.
- [ ] License: choose one in the AMO form (the repository has no license file yet; "All Rights Reserved" if unsure).

## After approval

- Store URLs live in `EXTENSION_STORES` (`config/site.ts`), used by /extension, blog CTAs and structured data, and in
  the README. Published: [Chrome](https://chromewebstore.google.com/detail/blockchain-explorer-web3/bigcbkdjbbmgdicfejljnklmgbpmajlf),
  [Firefox](https://addons.mozilla.org/en-US/firefox/addon/blockchain-explorer-web3-lens/),
  [Edge](https://microsoftedge.microsoft.com/addons/detail/cadpfffbbdjebfjjibmbbnjbcmajajdd).
- Keep the version numbers in step across the three manifests for every update.
