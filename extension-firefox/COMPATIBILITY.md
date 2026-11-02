# Firefox differences

The Firefox build runs the same bundles as Chrome and Edge. Differences are confined to
`manifest.json` and the small adapter in `extension-src/src/browser.ts`:

| Area | Chrome / Edge | Firefox |
|---|---|---|
| Background | `background.service_worker` | `background.scripts` (event page); Firefox MV3 has no service-worker background |
| API namespace | `chrome.*` (promise-based in MV3) | `browser.*`; the adapter picks whichever exists |
| Omnibox descriptions | XML (must be escaped) | Plain text; `omniboxText()` escapes only on Chrome/Edge |
| Extension id | Assigned by the store | `browser_specific_settings.gecko.id` = `extension@web3lens.com` |
| Name | Chrome: 59 characters (limit 75) | `Web3Lens – Blockchain Explorer Search`: AMO (and Edge) cap the name at 45 characters |
| Minimum version | Chrome/Edge 116 | Firefox 140 desktop, 142 Android (needed for `data_collection_permissions`) |
| Firefox for Android | n/a | No `contextMenus`, `omnibox` or `commands` there; the background script skips the missing APIs, and the popup is the way in |
| Data collection | Declared in the store listing | `data_collection_permissions.required: ["searchTerms"]`: addresses/hashes you look up are sent to web3lens.com when online lookups are on. Review this declaration before submitting. |
| Source code | Not required | AMO asks for source because the code is bundled: upload `dist-extensions/web3lens-extension-source-<version>.zip` (made by `npm run ext:pack`) |

Checks: `npm run ext:lint:firefox` (Mozilla's `web-ext lint`) must report 0 errors (it rejected the earlier 59-character
name). `node scripts/smoke-extension-firefox.mjs` installs this build in the local Firefox and runs the popup, app,
tools, offline mode and background checks. Right-click menus, the `w3` keyword and Scan page still need a manual try
(about:debugging → Load Temporary Add-on) before each submission.
