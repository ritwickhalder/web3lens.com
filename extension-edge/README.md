# Web3Lens for Microsoft Edge

Manifest V3 extension. Same features as the Chrome, Edge and Firefox builds; only `manifest.json` differs.

- `manifest.json` is hand-written for Microsoft Edge and is the only file to edit here.
- Every other file is generated from `extension-src/` and `lib/` by `npm run ext:build`
  (`npm run ext:check` and `npm test` fail if it is out of date).

Load it unpacked: open the browser's extensions page, enable developer mode and load this folder
.

Publish: `npm run ext:pack` writes `dist-extensions/web3lens-edge-<version>.zip` for Microsoft Edge Add-ons (https://partner.microsoft.com/dashboard/microsoftedge).
See the release checklist in the root README.
