# Accounts, Pro and billing

Status (2026-11-10): **Phase 1 (Foundation) and Phase 2 (Monetisation) are built and tested, not live.** They need real
Google, Neon and Paddle credentials and the manual checks in [TODO.md](../TODO.md). Until then the deployed site
behaves as before: `/api/me` reports `accounts: false`, the header shows no sign-in button, the account routes answer
503, and everyone keeps the pre-Pro limits (below).

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

### Pro features (Phase 2)

| Feature | Route(s) | Enforced where |
|---|---|---|
| Batch values (Free 10 / Pro 500) | — | Browser only: detection runs locally (`parseBatch(text, limits.batch)`). |
| Batch balances (Free 5 rows / Pro 500) and cross-chain lookups (10 / 500 a day) | `POST /api/batch/balances` | Server: rows per request (413) and the daily quota, all or nothing (429), before any provider call. Anonymous callers count per salted IP hash against Free. |
| Saved addresses (Free 50 local / Pro 2,000) | — | Browser, when adding (`applyUpsert`, `mergeImport`); existing items are never hidden or trimmed (storage keeps up to 5,000). |
| Cloud sync (Pro) | `GET/POST /api/sync/saved` | Server: POST needs Pro (402); GET works on any plan so a downgrade never locks data. Cloud cap 2,000 new items (edits and deletions always apply). |
| Collections (Pro, 20) | `/api/collections`, `/api/collections/:id` | Server; owner-scoped; deleting a collection never deletes saved items. |
| Investigations (Pro, 100) | `/api/investigations`, `/api/investigations/:id` | Server; bodies sanitised (`sanitizeInvestigation`), ≤ 64 KB (DB check). |
| JSON export (Pro) | — | Browser (batch and investigation results). The saved-items JSON backup stays free (it's the user's data). |
| API keys (Pro, 5 keys, 1,000 requests/day per user) | `/api/account/keys`, `x-api-key` on `/api/v1/*` | Server (`lib/server/api-keys.ts`). |

**Pre-launch limits.** While Paddle isn't configured (`billingConfigured()` false; `MeResponse.billing`), Free gets
`PRE_LAUNCH_LIMITS` — the limits Web3Lens had before Pro (batch 50, balances 50, saved 500) — and batch balances are not
metered daily. Switching the code on can't take anything away from users who have no way to upgrade.

**Sync rules** (`lib/saved-sync.ts`, shared by the website and the extensions): per item the newest change wins
(`updatedAt` for edits, `deletedAt` for deletions the user made; ties keep the item); deletions are local tombstones
(`w3l:saved-deleted`, extension `savedDeleted`) pushed to the server; a failed pull stops the run before anything is
written; merges and imports only add. The server's pull cursor is its own `synced_at`, so device clock skew can't hide
changes. A concurrent push from two devices can exceed the 2,000 cloud cap by at most one batch (counts are per
statement).

### API keys

```
curl -H "x-api-key: w3l_XXXXXXXX_…" "https://web3lens.com/api/v1/detect?q=vitalik.eth"
```

- Created on `/account` (shown once; stored as SHA-256), up to 5 active, revocable at once.
- Each keyed request takes one from the owner's daily `api` quota (1,000 per user per UTC day across all keys) instead
  of the shared per-IP budget. Responses carry `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`
  (epoch seconds) and `cache-control: private, no-store`.
- Errors: 401 invalid or revoked key; 402 the owner no longer has Pro (the plan is re-read at most 60 s later);
  429 daily limit (with `retry-after`); 503 key store unreachable.
- Without a key nothing changes: CDN-cached answers and 60/min, 1,200/h per IP. A keyed request that the CDN answers
  from a cached keyless response isn't counted.

### Quotas

`usage_counters (subject, metric, window_start)`; `consumeQuota` is a single
`INSERT … ON CONFLICT DO UPDATE SET count = count + n WHERE count + n <= limit RETURNING count`: no row returned means
over quota and nothing was taken. Tested with 100 concurrent requests against a limit of 25. Windows are UTC days.
Anonymous use stays on the per-IP in-memory budget in `lib/server/rate-limit.ts` (60/min, 1,200/h).

Only batch balances consume `crossChain`. Single-address multichain balances appear on every EVM address page (a basic
lookup, which stays free and unmetered); `/api/v1/multichain` stays open within the shared per-IP budget.

## Data model

Phase 1 (`drizzle/0000_foundation.sql`): `user`, `session`, `account`, `verification` (Better Auth), `user_profiles`
(admin override, suspension), `subscriptions`, `webhook_events`, `trial_claims`, `usage_counters`,
`extension_pairings`. Personal rows cascade on user deletion; `subscriptions` and `trial_claims` keep the row with
`user_id = null` (billing record; the trial stays used for that email).

Phase 2 (`drizzle/0001_pro_features.sql`): `saved_items` (PK `(user_id, item_key)`, `updated_at`, `deleted_at`
tombstone, `synced_at` cursor, length checks), `collections` (unique `(user_id, lower(name))`), `collection_items`,
`investigations` (jsonb body, size check), `api_keys` (`key_hash` unique, `revoked_at`). All cascade with the user.
Caps are enforced inside the inserting statement.

Phase 3: `watches`, `alerts` (Vercel cron), portfolio snapshots.

## Free and Pro

| Feature | Free | Pro | Before launch (everyone) |
|---|---:|---:|---:|
| Batch search | 10 | 500 | 50 |
| Batch EVM balances | 5 rows | 500 rows | 50 rows |
| Cross-chain balance lookups (batches) | 10/day | 500/day | per-IP budget only |
| API requests | 60/min per IP | + 1,000/day with keys | 60/min per IP |
| Saved addresses | 50 local | 2,000, synced | 500 local |
| Collections | — | 20 | — |
| Cloud investigations | — | 100 | — |
| Exports (batch, investigations) | CSV | CSV + JSON | CSV |

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

Kept in [TODO.md](../TODO.md) (launch steps, live verification, phases, limitations).

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
- Batch value caps, the local saved-items cap and JSON export are enforced in the browser, where that work happens; a
  user can edit their own browser. Everything that costs Web3Lens money (balances, cloud data, API) is enforced on the
  server.
