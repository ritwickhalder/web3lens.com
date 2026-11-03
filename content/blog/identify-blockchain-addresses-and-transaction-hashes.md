---
title: How to Identify Blockchain Addresses and Transaction Hashes
seoTitle: How to Identify Crypto Addresses and Transaction Hashes
description: A field guide to recognising Bitcoin, Ethereum, Solana, Tron, XRP, Cosmos and other addresses, transaction hashes and names by prefix, length and checksum.
category: addresses-and-transactions
tags: [address formats, transaction hash, base58, bech32, detection]
date: 2026-11-03
icon: fingerprint
coins: [bitcoin, ethereum, solana, tron]
order: 12
related: [verify-crypto-wallet-address-checksums, how-to-find-the-right-block-explorer, ens-domains-wallet-addresses-web3-identity]
---

Someone sends you a long string of letters and numbers. Is it an address or a transaction? Which chain? Is it even complete? You can answer most of those questions just by looking at it, once you know what to look for. This guide is the cheat sheet Web3Lens's own detector is built on: 30+ formats, recognised by prefix, length, alphabet and checksum.

![The Web3Lens extension popup recognising an Ethereum address as an EVM address with a valid checksum and offering Ethereum, Base, Arbitrum One and OP Mainnet](/blog/extension-lookup.png "Paste a value and it is recognised and checked: here an EVM address with a valid EIP-55 checksum, with the chains it could belong to.")

## The four clues

Every on-chain identifier gives itself away through four properties:

1. **Prefix.** `0x`, `bc1`, `cosmos1`, `addr1`, `T`, `r`, `G`… Many formats announce themselves in the first characters.
2. **Length.** An EVM address is always 42 characters with the `0x`. A Solana address is 32 to 44 characters. A Stellar address is exactly 56.
3. **Alphabet.** Hex uses `0-9a-f`. Base58 drops the look-alike characters `0`, `O`, `I` and `l`. Bech32 is lowercase and drops `1`, `b`, `i` and `o` after the separator.
4. **Checksum.** Most address formats embed a few bytes computed from the rest, so a typo can be detected. [How to verify crypto wallet addresses and checksum validity](/blog/verify-crypto-wallet-address-checksums) explains how each one works.

## Addresses at a glance

| Looks like | Format | Chains | Checksum |
|---|---|---|---|
| `0x` + 40 hex | EVM address | Ethereum, Base, Arbitrum, OP, Polygon, BNB, Avalanche, … | EIP-55 mixed case (optional) |
| `1…` or `3…`, 26–34 chars | Base58Check (P2PKH / P2SH) | Bitcoin; also valid as Bitcoin Cash legacy | 4-byte double SHA-256 |
| `bc1q…` | SegWit (bech32) | Bitcoin | bech32 |
| `bc1p…` | Taproot (bech32m) | Bitcoin | bech32m |
| `L…`, `M…`, `ltc1…` | Base58Check / bech32 | Litecoin | yes |
| `D…` | Base58Check | Dogecoin | yes |
| `T…`, 34 chars | Base58Check (version 0x41) | Tron | yes |
| `r…` | Base58 (Ripple alphabet) | XRP Ledger | yes |
| 32–44 base58 chars | Ed25519 public key | Solana | none |
| `cosmos1…`, `osmo1…`, `celestia1…`, `inj1…` | bech32 | Cosmos SDK chains | bech32 |
| `addr1…`, `stake1…` | bech32 | Cardano | bech32 |
| `1…` (47–48 chars) or capital letter start | SS58 | Polkadot, Kusama | BLAKE2b |
| `G…`, 56 chars | StrKey (base32) | Stellar | CRC16 |
| `EQ…` / `UQ…`, 48 chars | base64url | TON | CRC16 |
| `tz1…`, `tz2…`, `tz3…`, `KT1…` | Base58Check | Tezos | yes |
| `bitcoincash:q…` | CashAddr | Bitcoin Cash | BCH code |

A few things in that table are worth remembering:

- **EVM addresses are shared.** Nothing in `0x…` says which network it is on. The same key controls the same address on every EVM chain, which is both convenient and a common source of "lost" funds sent to the right address on the wrong network.
- **Solana addresses have no checksum.** Any 32-byte value encoded in base58 is a valid-looking Solana address, so a typo produces a different valid address. Copy, don't type.
- **Bitcoin's `1` and `3` formats are also Bitcoin Cash legacy formats.** Bitcoin Cash forked from Bitcoin in 2017 and kept the same encoding, so the string alone can't tell you which chain was meant.

## Transaction hashes

Transaction IDs are hashes, so they look like random data of a fixed length:

- **EVM transaction:** `0x` + 64 hex characters, 66 characters in total. The same shape is used for Sui and Aptos addresses and for Polkadot/Kusama extrinsic hashes, so context matters.
- **Bitcoin (and Litecoin, Dogecoin, Tron…) transaction:** 64 hex characters **without** `0x`.
- **Solana signature:** 87 or 88 base58 characters (a 64-byte signature).
- **Tezos operation hash:** starts with `o`, 51 base58 characters.

The difference between an EVM transaction hash and an EVM address is the most common confusion of all: an address is 40 hex characters after `0x`, a transaction hash is 64. If an explorer says "invalid address" for something you copied from a transaction receipt, count the characters.

## Blocks and names

- **Block numbers** are plain integers: `840000` was Bitcoin's 2024 halving block. On their own they are ambiguous, because every chain has a block 840000; pick the chain first.
- **Bitcoin block hashes** are 64 hex characters that start with a long run of zeros, the visible result of proof of work: `000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f` is the genesis block.
- **Names** end in a namespace: `.eth` for ENS on Ethereum, `.sol` for Solana Name Service, `.ton` for TON DNS, `.near` for NEAR accounts. A name resolves to an address; it is not an address itself. See [ENS domains, wallet addresses and Web3 identity explained](/blog/ens-domains-wallet-addresses-web3-identity).

## Things that should never be pasted

Some strings are not identifiers at all, and recognising them protects you:

- **Recovery phrases**: 12, 15, 18, 21 or 24 ordinary English words.
- **Private keys**: 64 hex characters (the same shape as a transaction hash), or WIF keys starting with `5`, `K` or `L` on Bitcoin.
- **Stellar secret keys**: 56 characters starting with `S`.

> [!WARNING]
> Anyone with a recovery phrase or private key controls the wallet. Web3Lens recognises recovery phrases, WIF private keys and Stellar secret keys and refuses to search them, showing a warning instead. Other sites may not be so careful.

## When the format fits more than one chain

Ambiguity is normal, so a good detector lists every interpretation instead of guessing. Web3Lens's detector returns all matches, best first. A 64-character hex string with `0x` shows up as an EVM transaction hash, a Sui/Aptos address and a Polkadot extrinsic hash. A `1…` address is listed for Bitcoin and Bitcoin Cash. The [search page](/search?q=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa) shows each interpretation with explorer links, and for `0x` addresses it checks balances across 11 EVM chains so you can see where the activity actually is.

It also cleans up what you paste: a full explorer URL like `https://etherscan.io/address/0x…` or a payment URI like `bitcoin:bc1q…?amount=0.01` is reduced to the address or hash inside before detection.

## Try it

Paste these into [Web3Lens](/) and watch the label and checksum status change:

- `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`: EVM address, checksum OK
- `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96046`: same address with the last character changed; the checksum no longer matches
- `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`: Tron address (the USDT contract)
- `vitalik.eth`: ENS name

The [address validator](/tools/address-validator) shows the same detection with more detail, one value at a time, and [batch search](/batch) checks up to 50 at once.

::cta tools

## Frequently asked questions

### How can I tell which network an 0x address is on?

You can't from the address alone; it is valid on every EVM chain. Check where it came from, or use Web3Lens's cross-chain view, which looks up the same address on 11 EVM networks in one request and shows where it has a balance or transactions.

### Is a transaction hash the same on every explorer?

Yes for the same chain: the hash is computed from the transaction itself. Bitcoin explorers display transaction IDs in a byte-reversed order compared with how they appear inside raw block data, but every explorer uses the same display convention.

### Why does my Solana address pass validation even with a typo?

Solana addresses are raw public keys with no checksum, so almost any base58 string of the right length is a well-formed address. Validators can only check the alphabet and length.
