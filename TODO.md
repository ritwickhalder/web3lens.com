# Web3Lens Pro — your to-do list

The code for accounts and Pro is finished and merged. It stays **switched off** until you do part 1 below: until
then the website and extensions work exactly as before. You can stop after any step; nothing breaks half-way.

Each step says where to click and what to copy. "Vercel" means the web3lens.com project on vercel.com
(team "Ritwick Halder's projects"). After adding environment variables in Vercel, they apply to the **next deploy**:
use Deployments → ⋯ → Redeploy, or just push a commit.

How to make a random secret (used a few times below) — run in a terminal and copy the output:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 1. Switch it on

### Step 1 — Database (Neon), about 5 minutes
1. [ ] Vercel → your project → **Storage** → **Create Database** → **Neon** → follow the prompts and connect it to the
       web3lens.com project (Production and Preview). This adds `DATABASE_URL` for you.
       *(If you prefer neon.tech directly: create a project there, copy the **pooled** connection string, and add it in
       Vercel → Settings → Environment Variables as `DATABASE_URL`.)*
2. [ ] On your computer, in the project folder:

   ```bash
   git pull
   ```

   ```bash
   npm install
   ```

   ```bash
   vercel env pull .env.local --environment=production
   ```

   (If `vercel` isn't found: `npm i -g vercel`, then `vercel link` and pick the web3lens.com project.)

   ```bash
   npm run db:migrate
   ```

   You should see "Done: the database is up to date." Run `npm run db:migrate` again whenever a future update adds a
   file to the `drizzle/` folder.

### Step 2 — Google sign-in, about 10 minutes
1. [ ] Open https://console.cloud.google.com → pick or create a project → **APIs & Services** → **OAuth consent
       screen**: app name "Web3Lens", support email, authorised domain `web3lens.com`, scopes: email, profile, openid.
       Publish it (so anyone can sign in, not only test users).
2. [ ] **Credentials** → **Create credentials** → **OAuth client ID** → type **Web application**.
       Authorised redirect URI: `https://web3lens.com/api/auth/callback/google`. Create, then copy the client ID and
       secret.
3. [ ] Vercel → Settings → Environment Variables (Production), add:

   | Name | Value |
   |---|---|
   | `GOOGLE_CLIENT_ID` | the client ID |
   | `GOOGLE_CLIENT_SECRET` | the client secret |
   | `BETTER_AUTH_SECRET` | a random secret (command above) |
   | `BETTER_AUTH_URL` | `https://web3lens.com` |

4. [ ] Redeploy. Open https://web3lens.com/account — you should see "Continue with Google". Sign in once to check.
   *(Sign-in is now live, but Pro isn't for sale yet and nobody's limits have changed.)*

### Step 3 — Payments (Paddle), about 20 minutes. This is what launches Pro.
Do it first in the **sandbox** (https://sandbox-vendors.paddle.com) to test, then repeat in the live dashboard
(https://vendors.paddle.com) with the live values.

1. [ ] **Catalog → Products → New product** "Web3Lens Pro". Add three prices: **Monthly** (recurring, 1 month),
       **Yearly** (recurring, 1 year) and **Lifetime** (one-time). Choose the amounts. Copy each price ID (`pri_…`).
2. [ ] **Developer tools → Authentication → Client-side tokens → New**. Copy the token (`test_…` in sandbox, `live_…`
       in live).
3. [ ] **Developer tools → Notifications → New destination**: URL `https://web3lens.com/api/webhooks/paddle`, type
       webhook, events: all `subscription.*`, `transaction.completed`, `adjustment.created`, `adjustment.updated`.
       Save, then copy its **secret key**.
4. [ ] **Checkout → Website approval**: add `web3lens.com` (live only; sandbox doesn't need it).
5. [ ] Vercel → Environment Variables (Production), add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | the client-side token |
   | `NEXT_PUBLIC_PADDLE_ENV` | `sandbox` (later: `production`) |
   | `NEXT_PUBLIC_PADDLE_PRICE_MONTHLY` | monthly price ID |
   | `NEXT_PUBLIC_PADDLE_PRICE_YEARLY` | yearly price ID |
   | `NEXT_PUBLIC_PADDLE_PRICE_LIFETIME` | lifetime price ID |
   | `PADDLE_WEBHOOK_SECRET` | the notification secret key |

6. [ ] Redeploy. Open https://web3lens.com/pricing — prices should show, and "Pricing" appears in the menu. Buy with a
       Paddle test card (sandbox), then check https://web3lens.com/account says Pro.
7. [ ] When the sandbox works: repeat 1–5 in the **live** dashboard, replace the six values in Vercel with the live
       ones (`NEXT_PUBLIC_PADDLE_ENV` = `production`), redeploy.
8. [ ] Optional: add the three live price IDs to the shared catalog in the WebInternetArchive repo
       (`docs/paddle-catalog.md`, `lib/paddle-catalog.ts`) so your other sites label these payments correctly.

### Step 4 — Watchlist alerts and admin page, about 5 minutes
1. [ ] Vercel → Environment Variables (Production), add:

   | Name | Value |
   |---|---|
   | `CRON_SECRET` | a random secret (command above) |
   | `ADMIN_EMAILS` | your Google email (several: comma-separated) |

2. [ ] Alert emails use the same mail settings as your contact form (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`,
       `SMTP_FROM`). If the contact form already sends mail, nothing to do. Tip: use a sender address on web3lens.com
       so alerts don't land in spam.
3. [ ] Redeploy. Open https://web3lens.com/admin — you should see "Users and plans" (everyone else gets "not found").
4. [ ] Alerts are checked once a day (06:00 UTC), the most Vercel's free plan allows. If you're on Vercel Pro and
       want hourly checks: in `vercel.json` change `"0 6 * * *"` to `"0 * * * *"` and push.

### Step 5 — Publish the extension update (when steps 1–3 are done)
1. [ ] Build the store zips:

   ```bash
   npm run ext:pack
   ```

   They're in `dist-extensions/`.
2. [ ] Upload them to the Chrome Web Store, Firefox Add-ons and Edge Add-ons (version 1.1.0).
3. [ ] In each store listing, paste the text from `store/pro-launch.md` (description lines and privacy answers).
4. [ ] Firefox: the add-on now asks for consent to the account data when someone signs in; just confirm AMO accepts it.

### Step 6 — Read and decide (no rush)
1. [ ] Read the new parts of https://web3lens.com/terms ("Accounts and Pro", "API keys and fair use") and the
       privacy policy section "Optional account and payments". Change anything you want; they aren't legal advice.
2. [ ] Limits I picked where your table had none: watchlist 50 addresses, 20 collections, 5 API keys, a 7-day trial
       once per email. To change them, ask me (they live in `lib/entitlements.ts`).
3. [ ] Approval scans on every EVM chain need a paid data provider — only if you want that feature and its cost.

## 2. Check it works (after part 1)

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
      copy draft (`store/pro-launch.md`), extension version 1.1.0 (`CHANGELOG.md`), `scripts/smoke-pro.mjs`.

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
