# Store copy for the Pro launch (draft — publish with the extension update that ships accounts)

The live listing in `listing.md` must stay accurate until accounts and Pro are live (TODO.md §1). At launch, replace
the matching parts of `listing.md` and `privacy.md` with the text below and re-submit all three stores.

## listing.md — replace these lines

Batch line:

```
• Batch search: check a whole list at once, with CSV export (larger batches with balances on Pro)
```

Saved line:

```
• Saved labels and notes, favourite chains, preferred explorers: stored in your browser; with Pro, synced to your
  Web3Lens account across devices and the website
```

New bullets after the saved line:

```
• Optional Web3Lens account (sign in with Google on web3lens.com; the extension shows a code you approve there)
• Pro: watchlist with activity alerts, collections, saved investigations, JSON export and API keys
```

Privacy paragraph:

```
No wallet connection, no analytics, no ads, no remote code. An account is optional: everything above works without
one. If you sign in, the extension stores a sign-in token and your email and plan, and sends the token only to
web3lens.com. The extension has no access to your browsing history or page content beyond the text you select or a
page you explicitly scan. Lookups you run are sent to web3lens.com to fetch public blockchain data; switch "Online
lookups" off in settings to keep everything in your browser (detection, explorer links, tools and the sanctions
check still work).
```

## privacy.md — facts to change at launch

- **Stored locally:** add "a sign-in token, email and plan, only after the user signs in".
- **Sent off the device:** add "with an account: the session token to web3lens.com; with Pro and sync on: saved
  labels and notes, collections and watched addresses".
- **Not done:** replace "no account" with "no required account".
- Chrome privacy tab: also declare **Authentication information** and **Personally identifiable information (email)**,
  used only for the optional account.
- Edge: same answer as Chrome.
- Firefox: already declared as optional data collection in the manifest (asked at sign-in).

## Screenshots

Refresh with `node scripts/make-store-assets.mjs` once accounts are live, adding one screenshot of Settings → Account.
