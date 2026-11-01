import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRateLimiter, escapeHtml, renderContactEmail, validateContact } from '../../lib/contact';

const NOW = 1_800_000_000_000;
const valid = {
  name: 'Ada',
  email: 'ada@example.com',
  subject: 'Feature idea',
  message: 'Please add support for searching Base and Arbitrum addresses.',
  submittedAt: NOW - 10_000,
};

test('accepts a normal message', () => {
  const r = validateContact(valid, NOW);
  assert.equal(r.ok, true);
});

test('honeypot submissions are flagged so the route can fake success', () => {
  assert.deepEqual(validateContact({ ...valid, website: 'http://spam' }, NOW), { ok: false, honeypot: true });
});

test('rejects missing fields, bad email, too-fast and expired forms, spam', () => {
  const cases = [
    { ...valid, subject: '' },
    { ...valid, email: 'nope' },
    { ...valid, submittedAt: NOW - 500 },
    { ...valid, submittedAt: NOW - 3 * 60 * 60 * 1000 },
    { ...valid, submittedAt: undefined },
    { ...valid, message: 'aaaaaaaaaaaaaaaa' },
    { ...valid, message: 'see a.com b.com c.com' },
    { ...valid, message: 'x'.repeat(2001) },
  ];
  for (const body of cases) {
    const r = validateContact(body, NOW);
    assert.equal(r.ok, false, JSON.stringify(body).slice(0, 80));
    assert.ok(!r.ok && !r.honeypot && r.status === 400);
  }
});

test('email output escapes HTML and keeps the subject on one line', () => {
  const mail = renderContactEmail({ name: '<b>x</b>', email: 'a@b.co', subject: 'hi\r\nBcc: evil@x.com', message: '<script>' });
  assert.ok(!mail.html.includes('<script>'));
  assert.ok(mail.html.includes('&lt;b&gt;x&lt;/b&gt;'));
  assert.ok(!/[\r\n]/.test(mail.subject));
  assert.equal(escapeHtml(`"'&`), '&quot;&#39;&amp;');
});

test('rate limiter allows max hits per window, then resets', () => {
  const limited = createRateLimiter(2, 1000);
  assert.equal(limited('k', 0), false);
  assert.equal(limited('k', 1), false);
  assert.equal(limited('k', 2), true);
  assert.equal(limited('other', 2), false);
  assert.equal(limited('k', 1001), false);
});
