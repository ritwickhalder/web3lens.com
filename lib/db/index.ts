/**
 * Database access. Neon over HTTP in production (one round trip per statement, no pool to manage on serverless).
 * Every write path is a single statement (conditional upserts, UPDATE … RETURNING), so nothing here needs an
 * interactive transaction, which the HTTP driver doesn't offer. Tests inject an in-process Postgres (PGlite) with
 * setDbForTests. Created on first use, never at build time, so the site builds and runs signed-out without
 * DATABASE_URL.
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { serverEnv } from '@/lib/server/env';
import * as schema from './schema';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let db: Db | null = null;

export function getDb(): Db {
  if (db) return db;
  const url = serverEnv.databaseUrl;
  if (!url) throw new Error('DATABASE_URL is not set');
  db = drizzle(neon(url), { schema });
  return db;
}

/** Tests only: use another Drizzle database (PGlite) with the same schema. */
export function setDbForTests(test: unknown) {
  db = test as Db | null;
}

export { schema };
