/**
 * The new explorer routing must do exactly what legacy/select.js did, for every chain.
 * Runs the original switch in a vm sandbox (scripts/lib/legacy-select.mjs) and compares.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHAINS } from '../../lib/chains';
import { resolveExplorer } from '../../lib/explorer';
import { loadLegacyExplorer, readLegacyOptions } from '../lib/legacy-select.mjs';

const SAMPLE = '0xAbC123def456';

test('every legacy dropdown option has a chain, in the same order', () => {
  const options = readLegacyOptions();
  assert.equal(CHAINS.length, options.length);
  assert.deepEqual(
    CHAINS.map((c) => c.legacyValue),
    options.map((o) => o.value),
  );
  assert.equal(new Set(CHAINS.map((c) => c.id)).size, CHAINS.length, 'chain ids are unique');
});

test('resolveExplorer matches the legacy explorer() for all chains', () => {
  const runLegacy = loadLegacyExplorer();
  for (const chain of CHAINS) {
    const legacy = runLegacy(chain.legacyValue, SAMPLE);
    const action = resolveExplorer(chain, SAMPLE);
    assert.equal(Boolean(chain.fallback), legacy.alerted, `${chain.name}: fallback flag`);

    if (legacy.submitted) {
      assert.deepEqual(action, { kind: 'form', ...legacy.submitted }, chain.name);
      continue;
    }
    assert.equal(action.kind, 'url', chain.name);
    if (action.kind !== 'url') continue;
    // Legacy bugs fixed on purpose: a trailing "_blank" on `open(url + t, '_blank')` cases, and the
    // Google default glueing the query onto "Explorer" without a space.
    const legacyUrl = legacy.opened[0].replace(/_blank$/, '');
    if (chain.explorer.kind === 'google') {
      assert.ok(action.href.startsWith('https://www.google.com/search?q='), chain.name);
      assert.ok(decodeURIComponent(action.href).endsWith(`Blockchain Explorer ${SAMPLE}`), chain.name);
    } else {
      assert.equal(action.href, legacyUrl, chain.name);
    }
  }
});
