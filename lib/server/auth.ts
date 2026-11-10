/**
 * Better Auth with Google only, database sessions and the bearer plugin (so the extensions can send the session
 * token they claimed through /extension/connect). Built lazily: without configuration the site still builds, the
 * auth routes answer 503 and every feature that doesn't need an account works as before. Mirrors Edit Page's
 * lib/auth.ts; Web3Lens asks Google for the basic profile only and encrypts the OAuth tokens it stores.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { bearer } from 'better-auth/plugins';
import { getDb, schema } from '@/lib/db';
import { accountsConfigured, serverEnv } from '@/lib/server/env';
import { profileOf } from '@/lib/server/stores';

/** Sessions minted for an extension start their user agent with this (see /api/ext/pair/claim). */
export const EXTENSION_SESSION_AGENT = 'Web3Lens extension';

export const SESSION_TTL_S = 60 * 60 * 24 * 60;

function createAuth() {
  return betterAuth({
    appName: 'Web3Lens',
    secret: serverEnv.authSecret,
    baseURL: serverEnv.authUrl,
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    socialProviders: {
      google: {
        clientId: serverEnv.googleClientId,
        clientSecret: serverEnv.googleClientSecret,
        prompt: 'select_account',
        // Better Auth's default Google scopes: openid, email, profile. No Drive/Gmail/contacts, no offline access.
      },
    },
    account: { encryptOAuthTokens: true },
    emailAndPassword: { enabled: false },
    session: { expiresIn: SESSION_TTL_S, updateAge: 60 * 60 * 24 },
    telemetry: { enabled: false },
    plugins: [bearer()],
    databaseHooks: {
      session: {
        create: {
          // A suspended account can't start a session (website or extension).
          before: async (s) => {
            if ((await profileOf(s.userId)).suspended) throw new APIError('FORBIDDEN', { message: 'This account is suspended.' });
          },
        },
      },
    },
  });
}

let auth: ReturnType<typeof createAuth> | null = null;

export function getAuth() {
  if (!accountsConfigured()) return null;
  auth ??= createAuth();
  return auth;
}
