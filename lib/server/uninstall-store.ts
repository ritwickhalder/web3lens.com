/**
 * Saves an uninstall survey answer: to Neon when DATABASE_URL is set (one INSERT, a repeated visit key is ignored),
 * otherwise as an email to the site owner, so answers are not lost before the database is switched on. Neither
 * available → `unavailable` and the page says it couldn't save.
 */
import { SITE } from '@/config/site';
import { escapeHtml, headerSafe } from '@/lib/contact';
import { getDb, schema } from '@/lib/db';
import { serverEnv } from '@/lib/server/env';
import { mailer, mailSender, ownerInbox } from '@/lib/server/mailer';
import { reasonLabel, type UninstallFeedback } from '@/lib/uninstall';
import { desc } from 'drizzle-orm';

export type SaveResult = 'saved' | 'emailed' | 'unavailable' | 'failed';

export async function saveUninstallFeedback(f: UninstallFeedback): Promise<SaveResult> {
  if (serverEnv.databaseUrl) {
    try {
      await getDb()
        .insert(schema.uninstallFeedback)
        .values({ reason: f.reason, details: f.details, competitor: f.competitor, extensionVersion: f.version, browser: f.browser, visitKey: f.visitKey })
        .onConflictDoNothing();
      return 'saved';
    } catch (e) {
      // Most likely the migration hasn't run yet: fall through to email rather than lose the answer.
      console.error('[uninstall] insert failed', e);
    }
  }
  const t = mailer();
  if (!t) return serverEnv.databaseUrl ? 'failed' : 'unavailable';
  const answer = f.competitor ? `Switched to: ${f.competitor}` : f.details ? f.details : '(no comment)';
  const meta = `Extension ${f.version ?? 'version unknown'} on ${f.browser}`;
  try {
    await t.sendMail({
      from: `${SITE.name} <${mailSender()}>`,
      to: ownerInbox(),
      subject: headerSafe(`Uninstall survey: ${reasonLabel(f.reason)}`).slice(0, 200),
      text: `${reasonLabel(f.reason)}\n\n${answer}\n\n${meta}`,
      html: `<p><b>${escapeHtml(reasonLabel(f.reason))}</b></p><p>${escapeHtml(answer)}</p><p><small>${escapeHtml(meta)}</small></p>`,
    });
    return 'emailed';
  } catch (e) {
    console.error('[uninstall] email failed', e);
    return 'failed';
  }
}

/** Latest answers for /admin. Empty when there is no database or the table doesn't exist yet. */
export async function recentUninstallFeedback(limit = 100) {
  if (!serverEnv.databaseUrl) return [];
  try {
    return await getDb().select().from(schema.uninstallFeedback).orderBy(desc(schema.uninstallFeedback.createdAt)).limit(limit);
  } catch (e) {
    console.error('[uninstall] read failed', e);
    return [];
  }
}
