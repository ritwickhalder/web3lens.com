import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { encodeQr, qrSvgPath } from '../../lib/codec/qr';

type Case = { text: string; mask: number; version: number; sha256: string };
const { cases } = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'fixtures', 'qr-reference.json'), 'utf8')) as { cases: Case[] };

test('QR matrices match the reference implementation for every version 1-10 and all 8 masks', () => {
  assert.deepEqual([...new Set(cases.map((c) => c.version))].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const c of cases) {
    const m = encodeQr(c.text, { mask: c.mask });
    assert.equal(m.version, c.version, `${c.text.slice(0, 12)} version`);
    const rows = m.modules.map((r) => r.map((d) => (d ? '1' : '0')).join('')).join('\n');
    assert.equal(createHash('sha256').update(rows).digest('hex'), c.sha256, `${c.text.slice(0, 12)} mask ${c.mask}`);
  }
});

test('QR picks a mask, renders SVG and rejects oversize input', () => {
  const m = encodeQr('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48');
  assert.ok(m.mask >= 0 && m.mask < 8);
  assert.equal(m.size, m.version * 4 + 17);
  const svg = qrSvgPath(m);
  assert.equal(svg.viewBox, `0 0 ${m.size + 8} ${m.size + 8}`);
  assert.match(svg.path, /^M\d+ \d+h1v1h-1z/);
  assert.throws(() => encodeQr('z'.repeat(300)), /Too long/);
});
