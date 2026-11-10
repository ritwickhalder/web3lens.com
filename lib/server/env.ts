/**
 * Server configuration for accounts and billing, read lazily so `next build`, CI and a deployment without these
 * settings work: accounts then report "not configured" (503) and everything else behaves as before. Secrets are
 * read here only; nothing in this file is imported by client code.
 */
import { SITE } from '@/config/site';

/** Chromium extension ids that may call the account API (store items; dev ids via EXTRA_EXTENSION_IDS). */
const STORE_EXTENSION_IDS = ['bigcbkdjbbmgdicfejljnklmgbpmajlf', 'cadpfffbbdjebfjjibmbbnjbcmajajdd'];

const list = (v: string | undefined) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const serverEnv = {
  get databaseUrl() {
    return process.env.DATABASE_URL ?? '';
  },
  get authSecret() {
    return process.env.BETTER_AUTH_SECRET ?? '';
  },
  get authUrl() {
    return process.env.BETTER_AUTH_URL ?? SITE.url;
  },
  get googleClientId() {
    return process.env.GOOGLE_CLIENT_ID ?? '';
  },
  get googleClientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET ?? '';
  },
  get paddleWebhookSecrets() {
    // Comma-separated while a secret rotates (old and new both verify).
    return list(process.env.PADDLE_WEBHOOK_SECRET);
  },
  get prices() {
    return {
      monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY ?? '',
      yearly: process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY ?? '',
      lifetime: process.env.NEXT_PUBLIC_PADDLE_PRICE_LIFETIME ?? '',
    };
  },
  get extensionIds() {
    return [...STORE_EXTENSION_IDS, ...list(process.env.EXTRA_EXTENSION_IDS)];
  },
};

export const accountsConfigured = () =>
  !!(serverEnv.databaseUrl && serverEnv.authSecret && serverEnv.googleClientId && serverEnv.googleClientSecret);

export const billingConfigured = () => {
  const p = serverEnv.prices;
  return accountsConfigured() && serverEnv.paddleWebhookSecrets.length > 0 && !!(p.monthly && p.yearly && p.lifetime);
};
