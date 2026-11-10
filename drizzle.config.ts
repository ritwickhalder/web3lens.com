import { defineConfig } from 'drizzle-kit';

/** `npm run db:generate` writes SQL migrations from lib/db/schema.ts; `npm run db:migrate` applies them to DATABASE_URL. */
export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
