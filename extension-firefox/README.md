# Web3Lens for Firefox

Manifest V3 extension. Same features as the Chrome, Edge and Firefox builds; only `manifest.json` differs.

- `manifest.json` is hand-written for Firefox and is the only file to edit here.
- Every other file is generated from `extension-src/` and `lib/` by `npm run ext:build`
  (`npm run ext:check` and `npm test` fail if it is out of date).

Load it unpacked: open the browser's extensions page, enable developer mode and load this folder
(Firefox: about:debugging → This Firefox → Load Temporary Add-on → pick manifest.json).

Publish: `npm run ext:pack` writes `dist-extensions/web3lens-firefox-<version>.zip` for Firefox Add-ons / AMO (https://addons.mozilla.org/developers/).
See the release checklist in the root README.
