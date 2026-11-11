/**
 * Applies the SQL migrations in drizzle/ to the Neon database in DATABASE_URL, over Neon's HTTPS driver (no extra
 * packages, works the same on Windows, macOS and Linux). Reads .env.local first, so after `vercel env pull .env.local`
 * this is just `npm run db:migrate`. Safe to run again: already-applied migrations are skipped.
 */
import { existsSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

if (existsSync('.env.local') && !process.env.DATABASE_URL) process.loadEnvFile('.env.local');
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add it in Vercel (Settings → Environment Variables), then run: vercel env pull .env.local --environment=production');
  process.exit(1);
}
console.log(`Migrating ${new URL(url).host} …`);
await migrate(drizzle(neon(url)), { migrationsFolder: 'drizzle' });
console.log('Done: the database is up to date.');
