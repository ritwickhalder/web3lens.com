/** The extensions' store title and short description are frozen (scripts/store-metadata-guard.mjs). */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { problems, snapshot } from '../store-metadata-guard.mjs';

test('store title and short description match the frozen baseline', () => {
  assert.deepEqual(problems(), [], 'Revert the wording, or run `npm run store:guard -- --update` only if the owner asked for this change');
});

test('the guard catches a changed, missing or new value', () => {
  const s = snapshot();
  const key = Object.keys(s).find((k) => k.endsWith(':: name'))!;
  assert.ok(key, 'a manifest name is frozen');
  assert.match(problems({ ...s, [key]: `${s[key]} – Better` }).join('\n'), /CHANGED/);
  const { [key]: _gone, ...rest } = s;
  assert.match(problems(rest).join('\n'), /MISSING/);
  assert.match(problems({ ...s, 'extension-chrome/manifest.json :: extra': 'x' }).join('\n'), /NEW/);
});
