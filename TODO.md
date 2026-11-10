# Web3Lens Pro — TODO

Single list of what's left for accounts and Pro. Architecture and rules: [docs/ACCOUNTS.md](docs/ACCOUNTS.md).
Tick items as they land; keep this file in the same commit as the work.

## 1. Launch steps (need the owner's accounts)

- [ ] **Neon**: create the project, set `DATABASE_URL` (Vercel Production + Preview), run `npm run db:migrate`.
- [ ] **Google OAuth**: Web client, redirect URI `https://web3lens.com/api/auth/callback/google`; set `GOOGLE_CLIENT_ID`,
      `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL=https://web3lens.com`.
- [ ] **Paddle**: Web3Lens product with monthly, yearly and lifetime prices; client-side token; notification destination
      `https://web3lens.com/api/webhooks/paddle` (`subscription.*`, `transaction.completed`, `adjustment.created`,
      `adjustment.updated`); approve web3lens.com as a checkout domain; set `PADDLE_WEBHOOK_SECRET`,
      `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_ENV`, `NEXT_PUBLIC_PADDLE_PRICE_{MONTHLY,YEARLY,LIFETIME}`.
- [ ] Add the Web3Lens prices to the shared Paddle catalog (`docs/paddle-catalog.md` + `lib/paddle-catalog.ts` in
      WebInternetArchive) so the other sites label them.
- [ ] **Firefox AMO**: decide whether the optional account needs `data_collection_permissions` (authentication info,
      email) declared as optional and requested at sign-in. Manifests are unchanged so far.
- [ ] Store listings and `/extension` copy: mention the optional account and Pro before publishing the extension update.
- [ ] `/terms`: subscription, cancellation and refund terms (Paddle is merchant of record). `/pricing` links to it.
- [ ] At launch, update copy that still says "up to 50" for batch search (it becomes Free 10 / Pro 500): `app/batch/page.tsx`
      metadata, `app/tools/page.tsx`, `components/blog/ArticleCta.tsx`, and the blog posts
      `bulk-blockchain-search-csv-export`, `identify-blockchain-addresses-and-transaction-hashes`,
      `web3lens-developer-tools-guide`, `verify-crypto-wallet-address-checksums`; and FEATURES.md.
- [ ] At launch: optionally add Product/Offer structured data to `/pricing` once real prices exist (left out so no
      prices are invented).

## 2. Live verification (nothing here has run against live services yet)

- [ ] Migrations applied to Neon; requests work over the Neon HTTP driver (tests use PGlite).
- [ ] Real Google sign-in: popup flow, blocked-popup redirect, sign-out, revoking another session.
- [ ] Paddle sandbox: monthly, yearly, lifetime checkouts; scheduled and immediate cancel; failed payment → past_due;
      full refund of a lifetime and of a subscription charge; webhook retry. Compare real payload fields with
      `lib/server/paddle.ts`.
- [ ] Extension pairing on Chrome, Edge and Firefox against production (store ids in CORS).
- [ ] API key against production: headers, 1,000/day, revoke.
- [ ] Cloud sync between the website and an extension on two devices (edit, delete, offline then online).
- [ ] Paddle `PricePreview` shows localised prices on `/pricing`; checkout opens from `/pricing` and `/account`.

## 3. Phase 1 — Foundation ✅ (2026-11-10, code + tests, not live)

- [x] Google sign-in (Better Auth), Neon schema + migration, sessions and expiry.
- [x] Paddle webhooks (verified, idempotent, order-safe, refunds), monthly/yearly/lifetime, 7-day trial.
- [x] Central entitlements (`lib/entitlements.ts`), atomic daily quotas.
- [x] `/account`, header account button, extension sign-in by pairing code.

## 4. Phase 2 — Monetisation ✅ (2026-11-10, code + tests, not live)

- [x] Migration `0001`: saved_items, collections, collection_items, investigations, api_keys.
- [x] Batch: Free 10 / Pro 500 values (UI cap; detection runs in the browser).
- [x] Batch balances via `POST /api/batch/balances`: Free 5 rows, Pro 500; daily cross-chain quota (Free 10, Pro 500,
      anonymous metered per hashed IP).
- [x] Saved addresses: Free 50 / Pro 2,000 local cap on add (existing items never hidden); Pro cloud sync (website and
      extensions).
- [x] Collections (Pro).
- [x] Cloud investigations (Pro, 100).
- [x] JSON export of batch and investigation results (Pro); CSV stays free; saved-items backup stays free.
- [x] API keys (Pro, 5 keys, 1,000 requests/day) on `/api/v1`.
- [x] `/pricing` page; inline upgrade notes; usage on `/account`.
- [x] Extension parity (batch caps, balances endpoint, saved cap, sync, strings in 15 languages).
- [x] Docs: FEATURES, ROADMAP, ACCOUNTS, CLAUDE.md.

## 5. Phase 3 — Expansion (not started)

- [ ] Wallet monitoring: watches on saved addresses (Pro).
- [ ] Activity alerts: Vercel cron + email (and extension badge) when a watched address moves.
- [ ] Portfolio analysis: combined value across chains for saved addresses.
- [ ] Watchlist badges in the extension.
- [ ] Admin UI for plan overrides and suspensions (today: SQL on `user_profiles`).
- [ ] Approval scans on every EVM chain (needs a paid log index).

## 6. Known limitations

- Per-IP limits in `lib/server/rate-limit.ts` / `limiters.ts` are per serverless instance; money-relevant quotas are in
  Postgres and exact.
- Batch value caps and the local saved-items cap are enforced in the browser (the work happens there); server-side
  limits cover balances, cloud data and the API.
- Paddle can't refuse a checkout: `/api/billing/prepare` blocks a second subscription, but a hand-made checkout could
  still create one (recorded, never double-granted).
- Moving from a subscription to lifetime doesn't cancel the subscription automatically.
- An offline extension shows a cached plan for up to 7 days; the server never grants Pro limits from that cache.
- Two devices pushing at the same moment can exceed the 2,000 cloud cap by at most one batch.
- A keyed `/api/v1` request answered by the CDN from a cached keyless response isn't counted against the key.
- `/api/v1/multichain` stays open per IP (it powers every address page), so batch balance limits apply to the batch
  feature, not to someone scripting the single-address API within the shared IP budget.
