# Web3Lens for Chrome

Manifest V3 extension. Same features as the Chrome, Edge and Firefox builds; only `manifest.json` differs.

- `manifest.json` is hand-written for Chrome and is the only file to edit here.
- Every other file is generated from `extension-src/` and `lib/` by `npm run ext:build`
  (`npm run ext:check` and `npm test` fail if it is out of date).

Load it unpacked: open the browser's extensions page, enable developer mode and load this folder
.

Publish: `npm run ext:pack` writes `dist-extensions/web3lens-chrome-<version>.zip` for Chrome Web Store (https://chrome.google.com/webstore/devconsole).
See the release checklist in the root README.
