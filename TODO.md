# Web3Lens Pro — what's left

All code for the three Pro phases is written, tested and pushed (branch `claude/exciting-carson-gr78b9`). Everything is
**dormant** until you complete section 1: without the env vars the site behaves exactly as before (no sign-in, the
pre-Pro limits, `/pricing` hidden from the nav and search engines). Architecture and rules: [docs/ACCOUNTS.md](docs/ACCOUNTS.md).

## 1. Your steps (need your accounts or a decision)

Do these in order; each says where.

### Database (Neon)
- [ ] Create a Neon project. Put its pooled connection string in Vercel as `DATABASE_URL` (Production and Preview).
- [ ] Run the migrations once, from your machine: `DATABASE_URL="…" npm run db:migrate` (applies `drizzle/0000`–`0002`).
      Run it again whenever a new file appears in `drizzle/`, before deploying.

### Google sign-in
- [ ] Google Cloud Console → OAuth client (Web application). Authorised redirect URI:
      `https://web3lens.com/api/auth/callback/google` (add the preview URL too if you want sign-in on previews).
- [ ] Vercel env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`),
      `BETTER_AUTH_URL=https://web3lens.com`.

### Paddle (turning this on is what launches Pro and the Free limits)
- [ ] Create a Web3Lens product with three prices: monthly, yearly, lifetime (one-time). Choose the amounts.
- [ ] Client-side token; approve `web3lens.com` as a checkout domain.
- [ ] Notification destination `https://web3lens.com/api/webhooks/paddle` with `subscription.*`,
      `transaction.completed`, `adjustment.created`, `adjustment.updated`.
- [ ] Vercel env: `PADDLE_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_ENV`
      (`sandbox` first, then `production`), `NEXT_PUBLIC_PADDLE_PRICE_MONTHLY`, `…_YEARLY`, `…_LIFETIME`. Redeploy
      (the `NEXT_PUBLIC_` ones are read at build time).
- [ ] Add the three price ids to the shared catalog in WebInternetArchive (`docs/paddle-catalog.md`,
      `lib/paddle-catalog.ts`) so your other sites' webhooks label them.

### Watchlist, emails and admin
- [ ] Vercel env: `CRON_SECRET` (any long random string; Vercel Cron sends it automatically).
- [ ] The cron in `vercel.json` runs **daily** at 06:00 UTC because Vercel Hobby allows only daily crons. On a Vercel
      Pro plan, change the schedule to hourly (`0 * * * *`) for faster alerts.
- [ ] Alert emails use the existing SMTP settings (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). Use a sender
      address with SPF/DKIM set up for web3lens.com so alerts don't land in spam.
- [ ] Vercel env: `ADMIN_EMAILS=you@…` (comma-separated Google emails) to open `/admin`.

### Legal and store listings
- [ ] Review the new sections in `/terms` ("Accounts and Pro", "API keys and fair use") and the privacy policy's
      "Optional account and payments" section. I wrote them carefully, but they are not legal advice.
- [ ] When you publish the extension update: copy the text in `store/pro-launch.md` into the three store listings and
      privacy forms (Chrome, Edge, Firefox), and refresh screenshots (`node scripts/make-store-assets.mjs`).
- [ ] Firefox AMO: the add-on now declares the account's data (sign-in, email) as **optional** data collection and asks
      at sign-in (`web-ext lint` passes). Confirm AMO accepts it on submission.

### Decisions only you can make
- [ ] **Approval scans on every EVM chain** need a paid log index (e.g. a commercial RPC with `eth_getLogs` over full
      history, or an indexer API). Free sources cover only some chains today. Pick a provider and budget; then it's a
      provider adapter in `lib/providers/` plus an env key.
- [ ] **Pricing structured data** (Product/Offer on `/pricing`) once real prices exist. I left it out so no prices are
      invented. Optional for SEO.
- [ ] Review the defaults I chose beyond your table: watchlist 50 addresses, collections 20, API keys 5 per user, trial
      7 days once per email. All in `lib/entitlements.ts` / `lib/server/pro-stores.ts`.

## 2. Live checks after section 1 (nothing has run against live services yet)

- [ ] Neon: the site reads and writes through the Neon HTTP driver (tests use an in-process Postgres).
- [ ] Google: sign in by popup, sign in with the popup blocked (redirect), sign out, sign out another device on
      `/account`.
- [ ] Paddle sandbox: buy monthly, yearly and lifetime; cancel at period end and immediately; a failed renewal
      (past_due); refund a lifetime and a subscription charge; check `/account` updates each time. Compare real webhook
      payloads with `lib/server/paddle.ts` (written from Paddle's docs).
- [ ] `/pricing` shows localised prices; checkout opens from `/pricing` and `/account`; the 7-day trial starts.
- [ ] Extensions (Chrome, Edge, Firefox): sign in with the code, plan shows in Settings, sign out; sync saved items with
      the website both ways (edit, delete, offline then online); Watch an address; the toolbar badge shows unread alerts.
- [ ] API key: create on `/account`, call `curl -H "x-api-key: …" https://web3lens.com/api/v1/detect?q=vitalik.eth`,
      check the `x-ratelimit-*` headers, revoke it.
- [ ] Watchlist: watch an address you control, move a small amount, wait for the cron (or Check now), get the email,
      use its unsubscribe link.
- [ ] `/admin`: find your test user, grant Pro until a date, suspend and unsuspend.

## 3. Done (code and tests)

- [x] **Phase 1 — Foundation**: Google sign-in (Better Auth), Neon schema and migrations, Paddle monthly/yearly/lifetime
      with verified idempotent webhooks and refunds, 7-day trial, central entitlements, daily quotas, `/account`,
      extension sign-in by pairing code.
- [x] **Phase 2 — Monetisation**: batch limits, server-enforced batch balances and daily cross-chain quota, local saved
      cap (never trims), cloud sync (website and extensions), collections, cloud investigations, JSON export, API keys,
      `/pricing`, inline upgrade notes, pre-launch limits.
- [x] **Phase 3 — Expansion**: watchlist with activity alerts and email digests (daily cron, Check now, one-click
      unsubscribe), Watch button and badges (website and extensions), portfolio view, admin UI with audit log.
- [x] Launch prep: batch copy without hard-coded numbers, Pro terms, Firefox optional data-collection consent, store
      copy draft (`store/pro-launch.md`).

## 4. Known limitations

- Per-IP limits (`lib/server/rate-limit.ts`, `limiters.ts`, Check now) are per serverless instance; the limits that
  cost money (daily quotas, caps) are in Postgres and exact.
- Batch value caps, the local saved-items cap and JSON export are enforced in the browser (where that work happens).
- Paddle can't refuse a checkout: a hand-made second subscription is recorded and shown, never double-granted.
- Moving from a subscription to lifetime doesn't cancel the subscription automatically.
- An offline extension shows a cached plan for up to 7 days; the server never grants Pro limits from it.
- Two devices pushing at the same moment can exceed the 2,000 cloud cap by at most one batch.
- A keyed `/api/v1` request answered by the CDN from a cached keyless response isn't counted.
- `/api/v1/multichain` stays open per IP (it powers every address page).
- Watch alerts compare transaction count and native balance only: token-only transfers aren't detected, and with a
  daily cron an alert can be up to a day late (hourly on Vercel Pro).
- The extension's alert badge updates when you open it (no background polling, which would need a new permission).
- The extension smoke test's live lookup check (`scripts/smoke-extension.mjs`) sometimes times out against production;
  rerun it.
