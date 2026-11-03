---
title: How to Perform Bulk Blockchain Searches and Export Results to CSV
seoTitle: Bulk Crypto Address Lookup with CSV Export
description: Check up to 50 crypto addresses, hashes or ENS names at once for format, checksum, OFAC status and EVM balances, then export a spreadsheet-safe CSV.
category: developer-tools
tags: [batch search, csv export, bulk lookup, sanctions screening, spreadsheets]
date: 2026-11-03
icon: table
coins: [ethereum, bitcoin, tron, solana]
order: 4
related: [verify-crypto-wallet-address-checksums, blockchain-address-risk-checks, scan-webpages-for-blockchain-addresses]
---

Sooner or later you'll have a list rather than a single address: an airdrop allowlist, a payroll run, the deposit addresses in a vendor spreadsheet, every wallet mentioned in an incident report. Checking them one by one in an explorer is slow and makes it easy to miss the one bad entry.

[Batch search](/batch) on Web3Lens (and in the browser extension) checks up to 50 values at once and exports the results as CSV. This guide covers the workflow and how to read the output.

## Step 1: Paste your list

Open [web3lens.com/batch](/batch) and paste your values into the box. The parser is forgiving:

- one value per line, **or** separated by commas, semicolons, tabs or spaces, so a column copied from a spreadsheet works as is
- explorer links and payment URIs are reduced to the address or hash inside
- duplicates are removed, comparing the normalised form, so `0xabc…` in lowercase and in checksummed case count once
- up to **50 values** per run; anything beyond that is reported as truncated rather than silently dropped

Then press **Check all**.

```
vitalik.eth
0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq
TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

## Step 2: Read the results

Each row shows:

- **Type**: EVM address, Bitcoin address, Tron address, ENS name, transaction hash and so on, or "unrecognised".
- **Checks**: a checksum badge (OK, or **bad checksum** in red), plus an **OFAC** badge if the address appears in the local sanctions snapshot.
- **Your saved label**, if you've labelled that address before.
- **An explorer link** for the most likely chain.

Private keys in recognised formats (such as Bitcoin WIF keys and Stellar secret keys) are flagged, never looked up, and left out of saves and share links. Never paste a recovery phrase into any website; batch search splits input on spaces, so a phrase would just show up as a row of unrecognised words.

> [!WARNING]
> A **bad checksum** row means the value was mistyped or corrupted somewhere along the way. Don't "fix" it by guessing; go back to the original source. See [how checksums work](/blog/verify-crypto-wallet-address-checksums).

## Step 3 (optional): Fetch EVM balances

For EVM addresses, **Fetch EVM balances** looks up each address on 11 EVM chains (Ethereum, Base, Arbitrum One, OP Mainnet, Polygon, BNB Smart Chain, Avalanche, Linea, zkSync Era, Scroll and Gnosis) and adds two columns: how many of those chains the address is active on (non-zero balance or sent transactions) and an approximate total of native balances in USD. Requests run two at a time to stay friendly to the public data sources, and a chain that doesn't respond is counted as unavailable rather than zero.

This is the step that turns "is this a real address?" into "is this address actually used, and where?": handy for spotting dormant addresses on an allowlist, or which network a vendor actually uses.

## Step 4: Export to CSV

**Export CSV** downloads `web3lens-batch-YYYY-MM-DD.csv` with these columns:

| Column | Contents |
|---|---|
| `input` | The value exactly as you pasted it |
| `normalized` | The cleaned value, e.g. EIP-55 checksummed |
| `type` | Detected format, or `unrecognised` |
| `checksum` | `valid`, `invalid`, `none` or `unverified` |
| `chains` | Candidate chain IDs, space-separated |
| `ofac_listed` | `yes` / `no` for addresses |
| `label` | Your saved label, if any |
| `evm_chains_active` | From the balance step, if run |
| `evm_native_usd_approx` | From the balance step, if run |

The file is built in your browser. It is **formula-injection safe**: cells that start with `=`, `+`, `-` or `@` are prefixed so Excel and Google Sheets show them as text instead of running them as formulas. That matters when the input came from an untrusted source, because a crafted "address" like `=HYPERLINK(…)` is a known way to attack whoever opens a spreadsheet.

### Useful spreadsheet checks

Once the CSV is open:

- filter `checksum = invalid` to find typos before anyone sends funds
- filter `ofac_listed = yes` for sanctions hits that need escalation
- compare `input` with `normalized` to see which values were reformatted
- sort by `evm_chains_active` to find unused addresses

## Step 5: Save or share

- **Save all** stores every valid value in your [saved addresses](/saved), in this browser only, so you can add labels and notes. Saved lists export and import as JSON.
- **Copy share link** creates a link to a shareable investigation containing the list and your labels. The list lives in the link's fragment (after `#`), which browsers never send to the server, so Web3Lens doesn't store or see it. Anyone with the link can read it, so share it as carefully as the list itself.

![Batch search in the Web3Lens extension with six values checked, including an OFAC flag and a bad checksum](/blog/extension-batch.png "Batch search flags an OFAC-listed address and a bad checksum at a glance.")

## Getting lists into batch search faster

- **From a web page:** the extension's [Scan page](/blog/scan-webpages-for-blockchain-addresses) tab finds every address on the page; **Check all** sends them straight to batch search.
- **From a spreadsheet:** copy the whole column and paste; tabs and newlines are handled.
- **From your notes:** paste the text as is; anything that isn't an identifier shows as unrecognised and can be ignored.

If you juggle many research tabs while doing this kind of work, [Super Session Manager](https://sessionmanager.net) can save the whole window as a named session and restore it later, which pairs well with a saved Web3Lens investigation.

## Limits to keep in mind

- **Sanctions coverage** is the OFAC SDN list's published crypto addresses, refreshed periodically. It's one important list, not every list; regulated businesses need a full screening provider.
- **Balances** are native-currency only in batch mode; open an address for token holdings.
- **50 values per run** keeps the public data sources responsive. For larger lists, split them into runs and combine the CSVs.

::cta batch

## Frequently asked questions

### Is batch search free?

Yes, with no account. Format, checksum and sanctions checks run entirely in your browser; only the optional balance step calls the Web3Lens API.

### Does Web3Lens keep my list?

No. The list is processed in your browser. Saved items are kept in your browser's local storage, and share links carry the list in the URL fragment, which isn't sent to the server.

### Can batch search check Bitcoin balances too?

The balance step covers EVM chains. For Bitcoin, Litecoin and Solana, open each address for balance and history.
