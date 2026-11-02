# Firefox differences

The Firefox build runs the same bundles as Chrome and Edge. Differences are confined to
`manifest.json` and the small adapter in `extension-src/src/browser.ts`:

| Area | Chrome / Edge | Firefox |
|---|---|---|
| Background | `background.service_worker` | `background.scripts` (event page); Firefox MV3 has no service-worker background |
| API namespace | `chrome.*` (promise-based in MV3) | `browser.*`; the adapter picks whichever exists |
| Omnibox descriptions | XML (must be escaped) | Plain text; `omniboxText()` escapes only on Chrome/Edge |
| Extension id | Assigned by the store | `browser_specific_settings.gecko.id` = `extension@web3lens.com` |
| Minimum version | Chrome/Edge 116 | Firefox 140 desktop, 142 Android (needed for `data_collection_permissions`) |
| Data collection | Declared in the store listing | `data_collection_permissions.required: ["searchTerms"]`: addresses/hashes you look up are sent to web3lens.com when online lookups are on. Review this declaration before submitting. |
| Source code | Not required | AMO asks for source because the code is bundled: upload `dist-extensions/web3lens-extension-source-<version>.zip` (made by `npm run ext:pack`) |

Checks: `npm run ext:lint:firefox` (Mozilla's `web-ext lint`) reported 0 errors, 0 warnings, 0 notices
at release. The browser smoke test (`node scripts/smoke-extension.mjs`) runs in Chromium only; test
the Firefox build by loading it in Firefox (about:debugging) before each submission.
