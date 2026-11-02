import assert from 'node:assert/strict';
import { test } from 'node:test';
import { timeAgo } from '../../lib/format';

test('timeAgo: small clock skew reads as just now, not "in the future"', () => {
  const now = 1_800_000_000_000;
  assert.equal(timeAgo(now + 4_000, now), 'just now');
  assert.equal(timeAgo(now + 299_000, now), 'just now');
  assert.equal(timeAgo(now, now), 'just now');
  assert.equal(timeAgo(now + 3_600_000, now), 'in the future');
  assert.equal(timeAgo(now - 5_000, now), '5s ago');
  assert.equal(timeAgo(now - 7_200_000, now), '2 h ago');
  assert.equal(timeAgo(new Date(now - 90_000).toISOString(), now), '1 min ago');
  assert.equal(timeAgo(null, now), '');
});
