/**
 * Admin tools for plan overrides and suspensions. Admins are the signed-in users whose email is in ADMIN_EMAILS
 * (comma-separated); everyone else gets a 404, so the routes don't reveal they exist. Every action is audited.
 */
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { accountsConfigured } from '@/lib/server/env';
import { currentUser, meFor, planOf } from '@/lib/server/session';

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function adminCaller(headers: Headers): Promise<{ id: string; email: string } | null> {
  if (!accountsConfigured()) return null;
  const who = await currentUser(headers);
  if (!who) return null;
  return adminEmails().includes(who.user.email.toLowerCase()) ? { id: who.user.id, email: who.user.email } : null;
}

export async function findUser(email: string) {
  const [u] = await getDb().select().from(schema.user).where(sql`lower(${schema.user.email}) = lower(${email.trim()})`).limit(1);
  if (!u) return null;
  const db = getDb();
  const [profile] = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, u.id)).limit(1);
  const p = await planOf(u);
  const sessions = await db
    .select({ id: schema.session.id, createdAt: schema.session.createdAt, expiresAt: schema.session.expiresAt, userAgent: schema.session.userAgent })
    .from(schema.session)
    .where(and(eq(schema.session.userId, u.id), gt(schema.session.expiresAt, new Date())));
  const actions = await db.select().from(schema.adminActions).where(eq(schema.adminActions.targetUserId, u.id)).orderBy(desc(schema.adminActions.createdAt)).limit(20);
  const me = await meFor(u);
  return {
    user: { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt.toISOString() },
    plan: { plan: p.plan, source: p.source, until: p.until?.toISOString() ?? null, trial: p.trial.status },
    override: profile?.planOverride ? { plan: profile.planOverride, until: profile.overrideUntil?.toISOString() ?? null } : null,
    suspended: !!profile?.suspendedAt,
    subscriptions: p.rows.map((r) => ({ id: r.id, plan: r.plan, status: r.status, endsAt: r.endsAt?.toISOString() ?? null, refunded: !!r.refundedAt })),
    usage: me.usage,
    sessions: sessions.map((s) => ({ id: s.id, createdAt: s.createdAt.toISOString(), expiresAt: s.expiresAt.toISOString(), kind: s.userAgent?.startsWith('Web3Lens extension') ? 'extension' : 'web' })),
    actions: actions.map((a) => ({ action: a.action, detail: a.detail, createdAt: a.createdAt.toISOString() })),
  };
}

export type AdminAction =
  | { action: 'override'; plan: 'free' | 'pro' | 'lifetime'; until: Date | null }
  | { action: 'clearOverride' }
  | { action: 'suspend' }
  | { action: 'unsuspend' }
  | { action: 'revokeSessions' };

export async function applyAdminAction(adminId: string, targetId: string, a: AdminAction): Promise<boolean> {
  const db = getDb();
  const [target] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.id, targetId)).limit(1);
  if (!target) return false;
  const p = schema.userProfiles;
  const upsert = (set: Partial<typeof p.$inferInsert>) =>
    db
      .insert(p)
      .values({ userId: targetId, ...set })
      .onConflictDoUpdate({ target: p.userId, set: { ...set, updatedAt: new Date() } });
  switch (a.action) {
    case 'override':
      await upsert({ planOverride: a.plan, overrideUntil: a.until });
      break;
    case 'clearOverride':
      await upsert({ planOverride: null, overrideUntil: null });
      break;
    case 'suspend':
      await upsert({ suspendedAt: new Date() });
      // Suspension also ends every session; the session hook (lib/server/auth.ts) blocks new ones.
      await db.delete(schema.session).where(eq(schema.session.userId, targetId));
      break;
    case 'unsuspend':
      await upsert({ suspendedAt: null });
      break;
    case 'revokeSessions':
      await db.delete(schema.session).where(eq(schema.session.userId, targetId));
      break;
  }
  await db.insert(schema.adminActions).values({ adminUserId: adminId, targetUserId: targetId, action: a.action, detail: 'plan' in a ? { plan: a.plan, until: a.until?.toISOString() ?? null } : {} });
  return true;
}
