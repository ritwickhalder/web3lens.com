import { accountsConfigured } from '@/lib/server/env';
import { optOut, verifyEmailUnsubscribe } from '@/lib/server/lifecycle-mail';

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>${title}</title><body style="font:16px system-ui;max-width:32rem;margin:15vh auto;padding:0 16px;color:#0a1520"><h1 style="font-size:1.4rem">${title}</h1><p>${body}</p><p><a href="/">Back to Web3Lens</a></p></body>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );

async function handle(request: Request) {
  const userId = verifyEmailUnsubscribe(new URL(request.url).searchParams.get('t') ?? '');
  if (!accountsConfigured() || !userId) return page('Link not valid', 'This unsubscribe link is damaged or expired.', 400);
  try {
    return (await optOut(userId))
      ? page('Unsubscribed', 'You will no longer get product emails from Web3Lens. Watchlist alerts have their own switch on your watchlist.')
      : page('Account not found', 'This account no longer exists, so there is nothing to unsubscribe.', 404);
  } catch (e) {
    console.error('[email/unsubscribe]', e instanceof Error ? e.message : e);
    return page('Please try again', 'We could not save that right now. Please try the link again in a minute.', 503);
  }
}

/** GET (link click) and POST (RFC 8058 one-click from mail clients): stop product emails for one account. */
export const GET = handle;
export const POST = handle;
