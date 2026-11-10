/**
 * Neon Postgres schema (Drizzle). Migrations are generated from this file into drizzle/ (`npm run db:generate`)
 * and applied with `npm run db:migrate`. scripts/test/db.test.ts applies them to an in-process Postgres (PGlite).
 *
 * Privacy rule: Web3Lens never stores wallet secrets. No column holds a private key, seed or mnemonic (tested), and
 * Google's OAuth tokens are encrypted at rest by Better Auth (lib/server/auth.ts).
 */
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

/* ---- Better Auth core tables (Google sign-in only) ---- */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: ts('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_user_idx').on(t.userId), index('session_expires_idx').on(t.expiresAt)],
);

/** Google identities linked to a user (one row per provider account). */
export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: ts('access_token_expires_at'),
    refreshTokenExpiresAt: ts('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('account_provider_uq').on(t.providerId, t.accountId), index('account_user_idx').on(t.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: ts('expires_at').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

/* ---- Account state ---- */

export const PLAN_OVERRIDES = ['free', 'pro', 'lifetime'] as const;

/** One per user: admin overrides and suspension. */
export const userProfiles = pgTable(
  'user_profiles',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    planOverride: text('plan_override', { enum: PLAN_OVERRIDES }),
    overrideUntil: ts('override_until'),
    suspendedAt: ts('suspended_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [check('user_profiles_override_ck', sql`${t.planOverride} is null or ${t.planOverride} in ('free','pro','lifetime')`)],
);

/* ---- Billing (Paddle) ---- */

export const SUBSCRIPTION_PLANS = ['monthly', 'yearly', 'lifetime'] as const;
export const SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'paused', 'canceled'] as const;

/**
 * One row per Paddle subscription (`sub_…`) or lifetime purchase (`txn:txn_…`). Rows outlive account deletion
 * (user_id set null) because they are billing records; webhooks write them, nothing else does.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    plan: text('plan', { enum: SUBSCRIPTION_PLANS }).notNull(),
    status: text('status', { enum: SUBSCRIPTION_STATUSES }).notNull(),
    priceId: text('price_id'),
    /** End of the current paid period, or the date a scheduled cancellation takes effect. Null for lifetime. */
    endsAt: ts('ends_at'),
    /**
     * Set by an approved full refund or chargeback, never by subscription events (so a late event can't undo it).
     * Lifetime: the row grants nothing. Subscription: the refunded period grants nothing; a later renewal does.
     */
    refundedAt: ts('refunded_at'),
    refundedPeriodEnd: ts('refunded_period_end'),
    paddleCustomerId: text('paddle_customer_id'),
    manageUrl: text('manage_url'),
    cancelUrl: text('cancel_url'),
    /** occurred_at of the last applied event: older events are ignored. */
    paddleUpdatedAt: ts('paddle_updated_at').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('subscriptions_user_status_idx').on(t.userId, t.status),
    check('subscriptions_plan_ck', sql`${t.plan} in ('monthly','yearly','lifetime')`),
    check('subscriptions_status_ck', sql`${t.status} in ('active','trialing','past_due','paused','canceled')`),
  ],
);

/** Every applied webhook event id: Paddle's retries and duplicates are no-ops. */
export const webhookEvents = pgTable('webhook_events', {
  eventId: text('event_id').primaryKey(),
  eventType: text('event_type').notNull(),
  occurredAt: ts('occurred_at').notNull(),
  outcome: text('outcome'),
  receivedAt: ts('received_at').notNull().defaultNow(),
});

/** The 7-day Pro trial, once per email, ever. Keyed by email so deleting the account doesn't reset it. */
export const trialClaims = pgTable('trial_claims', {
  email: text('email').primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  startedAt: ts('started_at').notNull().defaultNow(),
  endsAt: ts('ends_at').notNull(),
});

/* ---- Quotas ---- */

/**
 * Fixed-window counters. `subject` is `u:<userId>` (or `k:<apiKeyId>` in Phase 2); `window_start` is the start of
 * the UTC day. Consumed with one conditional upsert (lib/server/quota.ts), so concurrent requests can't overshoot.
 */
export const usageCounters = pgTable(
  'usage_counters',
  {
    subject: text('subject').notNull(),
    metric: text('metric').notNull(),
    windowStart: ts('window_start').notNull(),
    count: integer('count').notNull().default(0),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.subject, t.metric, t.windowStart] }), index('usage_window_idx').on(t.windowStart), check('usage_count_ck', sql`${t.count} >= 0`)],
);

/* ---- Extension pairing ---- */

/**
 * Pairing an extension with an account without externally_connectable or content scripts: the extension makes a
 * code and a secret verifier, opens /extension/connect?code=…, the signed-in user approves, and the extension
 * claims a session with the verifier. Only hashes are stored; a code works once and for five minutes.
 */
export const extensionPairings = pgTable(
  'extension_pairings',
  {
    codeHash: text('code_hash').primaryKey(),
    verifierHash: text('verifier_hash').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    browser: text('browser'),
    createdAt: ts('created_at').notNull().defaultNow(),
    expiresAt: ts('expires_at').notNull(),
    approvedAt: ts('approved_at'),
    claimedAt: ts('claimed_at'),
  },
  (t) => [index('pairings_expires_idx').on(t.expiresAt)],
);
