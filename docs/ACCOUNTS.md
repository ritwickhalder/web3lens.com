# Accounts, Pro and billing

Status (2026-11-10): **Phase 1 (Foundation) is built and tested, not live.** It needs real Google, Neon and Paddle
credentials and the manual checks in the [launch checklist](#launch-checklist). Until then the deployed site behaves
as before: `/api/me` reports `accounts: false`, the header shows no sign-in button, and the account routes answer 503.

## Principles

- **An account is optional.** Search, address/transaction/block lookups, explorer routing, gas, developer tools and the
  basic security checks are free and need no sign-in, on the website and in the extensions.
- **The server decides.** The plan is resolved from the database on every request; quotas are enforced on the
  server; the client's view of the plan is for display only.
- **Privacy first.** We store the Google name, email and picture, sessions, subscription status and daily usage counts.
  We never ask for or store private keys, seed phrases or other wallet secrets (a test fails if a column is named like
  one). Lookups are not linked to accounts.

## Architecture

| Piece | Where | Notes |
|---|---|---|
| Limits (Free / Pro) | `lib/entitlements.ts` | Pure, browser-safe; the only place numbers live. |
| Plan rules | `lib/server/membership.ts` | Subscriptions + admin override + trial → plan. Pure. |
| Sign-in | `lib/server/auth.ts`, `app/api/auth/[...all]` | Better Auth, Google only, database sessions (60 days, sliding), `bearer()` for the extensions, OAuth tokens encrypted at rest, telemetry off. |
| Session → user/plan | `lib/server/session.ts` | `currentUser(headers)`, `planOf(user)`, `meFor(user)`. |
| Database | `lib/db/schema.ts`, `drizzle/` | Neon over HTTP (`@neondatabase/serverless`); every write is one statement (no transactions needed). |
| Data access | `lib/server/stores.ts` | Webhook store, quotas, trial, pairing. Every user query filters by the session's user id. |
| Paddle | `lib/server/paddle.ts`, `app/api/webhooks/paddle` | Signature (rotation, 300 s replay window), idempotent, order-safe, foreign prices ignored. |
| HTTP helpers | `lib/server/account-http.ts` | `no-store`, extension-only CORS, same-origin check for website writes. |
| Website UI | `components/account/*`, `app/account`, `app/extension/connect`, `app/auth/popup-close` | Header button hidden unless accounts are configured. |
| Extension | `extension-src/src/account.ts`, `views/account.ts` | Pairing-code sign-in, cached plan, sign-out. |

### Routes

| Route | Who | What |
|---|---|---|
| `GET /api/me` | website cookie or extension bearer | Plan, limits, usage. `{signedIn:false}` without a session; **401** for a dead bearer token. |
| `DELETE /api/account` | website (same origin) | Delete account; body `{confirmEmail}`. **409** while a subscription can still charge. |
| `GET/DELETE /api/account/sessions` | website | List / revoke your own sessions (DELETE needs same origin). |
| `POST /api/billing/prepare` | website | `{plan}` → price id + `customData.userId`. Server-side guard against a second subscription or re-buying lifetime. |
| `POST /api/billing/trial` | website | 7-day Pro trial, once per email ever (survives account deletion). |
| `POST /api/webhooks/paddle` | Paddle | `subscription.*`, `transaction.completed`, `adjustment.created`, `adjustment.updated`. |
| `POST /api/ext/pair/start` | extension origin | `{verifierHash}` → code. |
| `POST /api/ext/pair/approve` | website (same origin) | Signed-in user approves `{code}`. |
| `POST /api/ext/pair/claim` | extension origin | `{code, verifier}` → 202 pending, or a new session token + `/api/me`. |
| `POST /api/ext/sign-out` | extension bearer | Ends that session. |

### Extension sign-in (no new permissions)

Edit Page signs its extension in through `externally_connectable` and, on Firefox, a content-script bridge. Both are
forbidden here (`scripts/test/extensions.test.ts`), so Web3Lens uses a device-style pairing code:

1. The extension makes a random 256-bit verifier and sends only its SHA-256 to `/api/ext/pair/start`. The server
   stores the hashes of the code and the verifier; the code works for 10 minutes.
2. The extension opens `web3lens.com/extension/connect?code=XXXX-XXXX` (a normal tab) and shows the same code. The
   user signs in with Google, checks the code matches and approves. The page warns not to approve codes they didn't
   start (the usual device-flow phishing risk).
3. The extension claims the code with the verifier (one conditional UPDATE, so a code is claimed once even under
   races) and receives a session of its own: revocable on `/account`, separate from the website's cookie session.

The token lives in `storage.local` under `account` (the extension has no content scripts, so no page can read it) and
is sent only to `https://web3lens.com` — the CSP's only `connect-src` — never to a custom `apiBase`. `/api/me` is
refreshed when Settings opens and the copy is older than 12 h; a 401 signs out locally; offline, the cached plan is
shown for up to 7 days, then as Free. All offline features (detection, explorer links, tools, OFAC snapshot) are
untouched, and turning online lookups off pauses the account too.

### Billing

Paddle Billing on the account shared by the author's sites (prices from env; prices of other products are ignored).
Plans: monthly, yearly, lifetime (one-time), plus a 7-day card-free trial handled by Web3Lens itself.

| Event | Effect |
|---|---|
| `subscription.created/activated/updated/resumed` (active, trialing) | Pro until `current_billing_period.ends_at`. |
| scheduled cancel (`scheduled_change.action = cancel`) | Stored as `canceled`, Pro until the effective date, "won't renew". |
| `past_due` | Pro kept while Paddle retries (dunning); Free once the period ends or it is cancelled. |
| `paused`, immediate `canceled` | Free (from `canceled_at`). |
| `transaction.completed` for the lifetime price | Pro for life (`txn:<id>` row). |
| `adjustment.*` approved full refund / chargeback | Lifetime: revoked. Subscription: the refunded period grants nothing; a later renewal does. |
| `chargeback_reverse` | Restored. Partial refunds keep access. |

Idempotency: the event id goes into `webhook_events` first; if applying fails it is deleted again and the route
answers 500 so Paddle retries (Web Internet Archive's handler returns 200 on failure and loses events; Edit Page fixed
this, we kept the fix). Ordering: the upsert only writes when `paddle_updated_at <= excluded.paddle_updated_at`, in
the same statement. Refund columns are written outside that guard so a late subscription event can't undo a refund.
Purchases are linked through `custom_data.userId`; an id that isn't a real user is stored ownerless, never guessed.

### Quotas

`usage_counters (subject, metric, window_start)`; `consumeQuota` is a single
`INSERT … ON CONFLICT DO UPDATE SET count = count + n WHERE count + n <= limit RETURNING count`: no row returned means
over quota and nothing was taken. Tested with 100 concurrent requests against a limit of 25. Windows are UTC days.
Anonymous use stays on the per-IP in-memory budget in `lib/server/rate-limit.ts` (60/min, 1,200/h).

Note: no existing feature consumes a quota in Phase 1. Single-address multichain balances appear on every EVM address
page (basic lookup, must stay free), so "cross-chain lookups" is metered only for the new bulk paths in Phase 2
(server-side batch balances, bulk tx locate), not for the address page.

## Data model

Phase 1 (`drizzle/0000_foundation.sql`): `user`, `session`, `account`, `verification` (Better Auth), `user_profiles`
(admin override, suspension), `subscriptions`, `webhook_events`, `trial_claims`, `usage_counters`,
`extension_pairings`. Personal rows cascade on user deletion; `subscriptions` and `trial_claims` keep the row with
`user_id = null` (billing record; the trial stays used for that email).

Phase 2 (designed, not migrated):

- `saved_items (user_id, item_key)` unique, query, chain_id, label ≤ 80, note ≤ 1000, favourite, added_at, updated_at,
  deleted_at (tombstone). Sync merges additively: last-writer-wins per item on `updated_at`, deletions as tombstones,
  nothing local is ever dropped by a sync. Cap 2,000 per user enforced in the insert.
- `collections`, `collection_items`, `investigations (user_id, title, body jsonb with a size check, updated_at)`, cap 100.
- `api_keys (id, user_id, name, prefix, key_hash sha256 unique, created_at, last_used_at, revoked_at)`. Keys are shown
  once; requests send `x-api-key`, consume `k:<keyId>` / `api` (1,000/day) and skip the shared IP budget.

Phase 3: `watches`, `alerts` (Vercel cron), portfolio snapshots.

## Free and Pro

| Feature | Free | Pro | Enforced |
|---|---:|---:|---|
| Batch search | 10 | 500 | Phase 2 |
| Batch EVM balances | 5 | 500 | Phase 2 (server batch endpoint) |
| Metered cross-chain lookups | 10/day | 500/day | Phase 2 (quota engine ready) |
| API requests | 60/min shared | 1,000/day per key | Phase 2 |
| Saved addresses | 50 local | 2,000 cloud | Phase 2 — existing local items over 50 are never hidden or deleted; only new ones are blocked |
| Cloud investigations | — | 100 | Phase 2 |
| Exports | CSV | CSV + JSON | Phase 2 |

## Setup

1. **Neon**: create a project, put the pooled connection string in `DATABASE_URL` (Vercel env, Production and
   Preview), then `DATABASE_URL=… npm run db:migrate`.
2. **Google**: OAuth client (Web application), authorised redirect URI
   `https://web3lens.com/api/auth/callback/google` (plus a preview/localhost one if needed). Scopes: openid, email,
   profile. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`),
   `BETTER_AUTH_URL=https://web3lens.com`.
3. **Paddle**: add a Web3Lens product with monthly, yearly and lifetime prices; add them to the shared catalog
   (`docs/paddle-catalog.md` in Web Internet Archive) so other sites label them. Create a client-side token and a
   notification destination `https://web3lens.com/api/webhooks/paddle` for `subscription.*`, `transaction.completed`,
   `adjustment.created`, `adjustment.updated`. Set `PADDLE_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`,
   `NEXT_PUBLIC_PADDLE_ENV`, `NEXT_PUBLIC_PADDLE_PRICE_{MONTHLY,YEARLY,LIFETIME}`. Approve web3lens.com as a
   checkout domain.
4. Dev extensions: add unpacked Chromium ids to `EXTRA_EXTENSION_IDS` (Firefox origins are random per install and
   accepted by pattern).

## Launch checklist

Not done yet (needs credentials; nothing here has run against live services):

- [ ] Migrations applied to Neon; one request over the Neon HTTP driver (tests use PGlite).
- [ ] Real Google sign-in: popup flow, blocked-popup redirect flow, sign-out, "sign out" of another session.
- [ ] Paddle sandbox: monthly, yearly, lifetime checkouts; cancel (scheduled and immediate); failed payment → past_due;
      full refund of a lifetime and of a subscription charge; webhook retries. Compare real payload field names with
      `lib/server/paddle.ts` (written from Paddle's docs, like Edit Page's).
- [ ] Extension pairing on Chrome, Edge and Firefox against production (CORS from the store ids).
- [ ] Firefox AMO: decide whether the optional account needs `data_collection_permissions` (authentication info /
      email) declared as optional and requested at sign-in; the manifest is unchanged in Phase 1.
- [ ] Store listings and `/extension` copy mention the optional account before the extension update is published.
- [ ] Terms page: subscription, refund and cancellation terms.

## Known limitations

- The in-memory per-IP limits (`lib/server/limiters.ts`, `rate-limit.ts`) are per serverless instance. Quotas that
  matter for money (daily Pro/Free counters) are in Postgres and exact.
- Paddle can't refuse a checkout: `/api/billing/prepare` blocks a second subscription, but a hand-crafted checkout could
  still create one. It is recorded and shown under Manage billing; nothing is double-granted.
- Moving from a subscription to lifetime doesn't cancel the subscription automatically (the user cancels it under
  Manage billing; `/account` keeps showing it).
- A refund or cancellation reaches an offline extension's *display* when it next goes online (at most 7 days of stale
  display); the server never grants Pro limits from that cache.
- No admin UI yet: overrides and suspensions are set in SQL (`user_profiles`).
