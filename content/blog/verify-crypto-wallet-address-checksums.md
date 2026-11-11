---
title: How to Verify Cryptocurrency Wallet Addresses and Checksum Validity
seoTitle: How to Verify Crypto Addresses and Checksums
description: How EIP-55, Base58Check, bech32 and SS58 checksums catch typos, what they can't catch, and a checklist for verifying an address before you send funds.
category: addresses-and-transactions
tags: [checksum, eip-55, base58check, bech32, address validation, address poisoning]
date: 2026-11-03
icon: seal
coins: [ethereum, bitcoin, polkadot, stellar]
order: 10
related: [identify-blockchain-addresses-and-transaction-hashes, blockchain-address-risk-checks, bulk-blockchain-search-csv-export]
---

Crypto transactions are final. If you send funds to a mistyped address that happens to be valid, nobody can reverse it. Address checksums exist to make that unlikely: a few bits of every address are derived from the rest, so most typos produce an address that fails validation instead of one that silently works.

This guide explains how the main checksum schemes work, which chains have none, and the checks that matter just as much as the checksum: right network, right address, not a look-alike.

## What a checksum does

A checksum is a short value computed from data and stored next to it. When software reads the address back, it recomputes the checksum and compares. If even one character changed, the values almost certainly won't match.

Checksums catch **accidents**: a mistyped character, a dropped character, two characters swapped. They do not catch **deliberate substitution**, where malware or a scammer replaces the whole address with another valid one. Keep that distinction in mind; we'll come back to it.

## The main checksum schemes

### EIP-55 (Ethereum and every EVM chain)

Raw Ethereum addresses are 20 bytes of hex and have no checksum of their own. EIP-55 adds one using letter case: take the keccak256 hash of the lowercase address, and for each letter `a`–`f` in the address, write it in uppercase if the corresponding hex digit of the hash is 8 or higher.

```
address  = lowercase hex of the 20 bytes (no 0x)
hash     = keccak256(address as ASCII text)
for each position i:
  if address[i] is a letter and hash nibble i >= 8: uppercase it
```

The result is a mixed-case address such as `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`. According to the EIP, a typo in a checksummed address slips through only about 0.0247% of the time.

The catch: the checksum is **optional**. An address written entirely in lowercase (or uppercase) is still valid; it simply carries no checksum. Web3Lens reports these three cases separately: "checksum OK" for a correct mixed-case address, "checksum does not match" for a mixed-case address with an error, and "no checksum" for single-case input, which it then normalises to the checksummed form.

### Base58Check (Bitcoin legacy, Litecoin, Dogecoin, Dash, Tron, Zcash, Tezos)

Base58Check prepends a **version byte** that says what kind of address it is, appends a 4-byte checksum (the first four bytes of a double SHA-256 hash), and encodes the result in base58, an alphabet without `0`, `O`, `I` and `l`.

The version byte is also why prefixes are reliable: Bitcoin's version `0x00` produces addresses starting with `1`, `0x05` gives `3`, Litecoin's `0x30` gives `L`, Dogecoin's `0x1e` gives `D` and Tron's `0x41` gives `T`. A 4-byte checksum means a random error passes with odds of about one in four billion.

### Bech32 and bech32m (Bitcoin SegWit and Taproot, Litecoin, Cosmos, Cardano)

Bech32 (BIP-173) was designed specifically for human-handled strings: a human-readable prefix (`bc`, `ltc`, `cosmos`, `addr`…), a separator `1`, and data in a 32-character alphabet chosen to avoid visually similar characters. Its BCH-code checksum is guaranteed to detect any error affecting up to four characters, and makes larger errors very unlikely to slip through.

Bitcoin's Taproot addresses (`bc1p…`) use **bech32m** (BIP-350), a corrected variant. Validators must use the right one for the witness version, which Web3Lens does.

### Other schemes

- **CashAddr** (Bitcoin Cash, `bitcoincash:q…`): a bech32-like checksum over the prefix and data.
- **SS58** (Polkadot, Kusama): a network prefix plus a checksum from BLAKE2b-512. The prefix determines the first character, which is how Polkadot (`1…`) and Kusama addresses are told apart.
- **Stellar StrKey** (`G…`): base32 with a CRC16 checksum. The same encoding marks secret keys with `S`.
- **TON** user-friendly addresses (`EQ…`, `UQ…`): base64url with a CRC16 checksum and flags for bounceable and testnet.
- **XRP Ledger** (`r…`): Base58Check with Ripple's own alphabet.

### Chains with no checksum

**Solana** addresses are base58-encoded Ed25519 public keys with no checksum. Any well-formed 32-byte value is a valid address, so a typo produces a different valid address. Algorand has a checksum that many tools (Web3Lens included) report as "unverified", and ENS names have no checksum at all, because they are resolved, not decoded.

> [!WARNING]
> For chains without a checksum, never type an address by hand. Copy it, then compare it in full against the source.

## A practical verification checklist

Before sending anything meaningful:

1. **Validate the format.** Paste the address into the [address validator](/tools/address-validator) or the [Web3Lens search](/). You'll see the detected format, chain and checksum status. A checksum failure means stop and re-copy.
2. **Confirm the network.** A valid `0x` address is valid on every EVM chain. Make sure the recipient expects funds on the chain you're sending from; exchanges in particular often support a token on only some networks.
3. **Compare the whole address, not the ends.** Check every character, or at least a long stretch in the middle as well as the start and end. Look-alike addresses are generated to match the first and last few characters.
4. **Check the address's history.** Is it a contract when you expected a wallet? Has it ever been used? An exchange deposit address with no history might be fine; a "known" supplier address with no history is a red flag.
5. **Check risk signals.** For EVM addresses, Web3Lens address pages show OFAC sanctions status, reported-address flags and contract checks. Read [blockchain address risk checks](/blog/blockchain-address-risk-checks) for what those can and can't tell you.
6. **Send a small test first** for large or first-time transfers, and confirm it arrived.

## What checksums can't catch: address poisoning and clipboard swaps

Two common attacks produce addresses that pass every checksum:

- **Address poisoning.** Attackers watch for your transfers, then send you a zero-value or tiny transfer from an address whose first and last characters match one you use. Later, you copy the "familiar" address from your history and pay the attacker.
- **Clipboard hijacking.** Malware replaces any address you copy with the attacker's. The pasted address is perfectly valid.

The defence for both is the same: compare the full address against a trusted source (your saved contacts, the recipient's verified page), not your transaction history. Web3Lens's [saved addresses](/saved) let you label addresses you trust, in your own browser, so a lookup shows your label next to the address.

## Checking many addresses at once

If you're reconciling a payout list or auditing a spreadsheet, checking addresses one by one doesn't scale. [Batch search](/batch) validates a whole list at once: type, checksum, OFAC status and your saved label for each, with a CSV export. [How to perform bulk blockchain searches and export results to CSV](/blog/bulk-blockchain-search-csv-export) walks through it.

::cta tools

## Frequently asked questions

### Is a lowercase Ethereum address invalid?

No. It's valid but carries no checksum, so a typo would go undetected. Convert it to the EIP-55 mixed-case form (Web3Lens does this automatically) before reusing it.

### If an address passes the checksum, is it safe to send to?

No. A checksum only proves the address wasn't mistyped. It says nothing about who controls it, whether it's on the right network, or whether it's a scammer's look-alike.

### Do all wallets enforce checksums?

Most modern wallets reject Base58Check and bech32 addresses with a bad checksum, and many warn on EIP-55 mismatches. Behaviour with all-lowercase EVM addresses varies, which is one more reason to validate independently.
