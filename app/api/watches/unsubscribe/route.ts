import { verifyUnsubscribe } from '@/lib/server/watch';
import { unsubscribeWatch } from '@/lib/server/watch-store';
import { accountsConfigured } from '@/lib/server/env';

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>${title}</title><body style="font:16px system-ui;max-width:32rem;margin:15vh auto;padding:0 16px;color:#0a1520"><h1 style="font-size:1.4rem">${title}</h1><p>${body}</p><p><a href="/watchlist">Open your watchlist</a></p></body>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  );

async function handle(request: Request) {
  const id = verifyUnsubscribe(new URL(request.url).searchParams.get('t') ?? '');
  if (!accountsConfigured() || !id) return page('Link not valid', 'This unsubscribe link is damaged or expired. You can turn emails off on your watchlist.', 400);
  const ok = await unsubscribeWatch(id);
  return ok ? page('Emails stopped', 'You will no longer get emails for this address. It stays on your watchlist.') : page('Already removed', 'This address is no longer on a watchlist.', 404);
}

/** GET (link click) and POST (RFC 8058 one-click from mail clients): turn email off for one watch. */
export const GET = handle;
export const POST = handle;
