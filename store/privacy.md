# Privacy questionnaire answers

What the extension actually does with data, so the store forms can be filled in consistently. The website's
privacy policy (https://web3lens.com/privacy-policy, section "Browser extension") says the same.

## Facts

- **Stored locally only:** settings, saved labels/notes, favourite chains, recent searches (`storage.local`).
  Never synced or sent anywhere.
- **Sent off the device:** when the user runs a lookup with "Online lookups" on (the default), the address,
  transaction hash, ENS name or function selector they asked about is sent to `https://web3lens.com/api/v1`, which
  fetches public blockchain data from public sources and returns it. Nothing else is sent: no browsing history, no
  page content, no identifiers, no analytics.
- **Read from pages:** only the text the user selects for the right-click menu, and the visible text of the current
  tab when the user opens the popup's "Scan page" tab (processed locally; only candidates the user then clicks are
  looked up).
- **Not done:** no account, no wallet connection, no tracking, no ads, no sale or transfer of data, no use for
  credit or lending decisions.

## Chrome Web Store (Privacy practices tab)

- Remote code: **No**.
- Data collected: the closest category for a blockchain address or transaction the user looks up is
  **Financial and payment information** (an address can identify a wallet). Declaring it is the conservative
  choice; it is used only to provide the lookup.
- Certify: not sold to third parties; not used or transferred for purposes unrelated to the single purpose; not
  used to determine creditworthiness or for lending.

## Microsoft Edge Add-ons

- Does the extension access, collect or transmit personal information? **Yes** (same reasoning as above), with the
  privacy policy URL.

## Firefox AMO

- `browser_specific_settings.gecko.data_collection_permissions.required = ["searchTerms"]`: what the user types to
  look up is transmitted to web3lens.com. Firefox shows this at install. If AMO reviewers consider the lookup part of
  the core function that needs no declaration, it can be changed to `["none"]`; keep the manifest and this file in
  step.

## Decision for the owner

The answers above declare more rather than less. If you prefer a no-network extension listing, set
`DEFAULT_SETTINGS.network` to `false` in `extension-src/src/store.ts` (lookups become opt-in in settings) and
declare no data collection in all three stores.
