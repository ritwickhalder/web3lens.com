/**
 * Extension release checks: the three browsers stay in feature parity, permissions stay minimal,
 * no remote code, and the generated files match the shared source.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { buildFiles, existingFiles, TARGETS } from '../build-extensions.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
type Manifest = Record<string, unknown> & {
  manifest_version: number;
  version: string;
  permissions: string[];
  background: { service_worker?: string; scripts?: string[] };
  content_security_policy: { extension_pages: string };
  browser_specific_settings?: { gecko?: { id?: string; data_collection_permissions?: unknown } };
};
const manifest = (dir: string) => JSON.parse(fs.readFileSync(path.join(ROOT, dir, 'manifest.json'), 'utf8')) as Manifest;
const ALLOWED_PERMISSIONS = ['storage', 'contextMenus', 'activeTab', 'scripting'];
// Keys that must be identical in every browser's manifest (feature parity). `name` differs: Edge Add-ons and
// Firefox AMO cap it at 45 characters, Chrome at 75.
const SHARED_KEYS = ['manifest_version', 'short_name', 'version', 'description', 'homepage_url', 'icons', 'action', 'options_ui', 'permissions', 'omnibox', 'commands', 'content_security_policy'];

test('three extension directories with MV3 manifests', () => {
  assert.deepEqual(TARGETS, ['extension-chrome', 'extension-firefox', 'extension-edge']);
  for (const dir of TARGETS) assert.equal(manifest(dir).manifest_version, 3, dir);
});

test('manifests agree on every shared key (feature parity)', () => {
  const [chrome, ...others] = TARGETS.map(manifest);
  for (const [i, m] of others.entries()) {
    for (const key of SHARED_KEYS) assert.deepEqual(m[key], chrome[key], `${TARGETS[i + 1]}: ${key}`);
  }
});

test('browser-specific adapters', () => {
  assert.equal(manifest('extension-chrome').background.service_worker, 'background.js');
  assert.equal(manifest('extension-edge').background.service_worker, 'background.js');
  const ff = manifest('extension-firefox');
  assert.deepEqual(ff.background.scripts, ['background.js']);
  assert.match(ff.browser_specific_settings?.gecko?.id ?? '', /@/);
  assert.ok(ff.browser_specific_settings?.gecko?.data_collection_permissions, 'Firefox requires data collection disclosure');
});

test('minimal permissions: no host permissions, no content scripts, locked-down CSP', () => {
  for (const dir of TARGETS) {
    const m = manifest(dir);
    for (const p of m.permissions) assert.ok(ALLOWED_PERMISSIONS.includes(p), `${dir}: unexpected permission ${p}`);
    for (const key of ['host_permissions', 'optional_host_permissions', 'content_scripts', 'web_accessible_resources', 'externally_connectable']) {
      assert.equal(m[key], undefined, `${dir}: ${key}`);
    }
    const csp = m.content_security_policy.extension_pages;
    assert.match(csp, /script-src 'self'/);
    assert.doesNotMatch(csp, /unsafe-eval|unsafe-inline|https?:\/\/[^ ;]*\*|script-src[^;]*https?:/);
    assert.match(csp, /connect-src https:\/\/web3lens\.com/);
  }
});

test('no remote code: local scripts only, no eval', () => {
  for (const dir of TARGETS) {
    const files = existingFiles(path.join(ROOT, dir)) as Record<string, Buffer>;
    for (const [name, buf] of Object.entries(files)) {
      const text = buf.toString('utf8');
      if (name.endsWith('.html')) {
        for (const [, src] of text.matchAll(/<script[^>]*src="([^"]+)"/g)) assert.doesNotMatch(src, /^(https?:)?\/\//, `${dir}/${name}`);
        assert.doesNotMatch(text, /<script>(?!<\/script>)/, `${dir}/${name}: inline script`);
        assert.doesNotMatch(text, /fonts\.googleapis|cdn\./, `${dir}/${name}: remote asset`);
      }
      if (name.endsWith('.js')) {
        assert.doesNotMatch(text, /\beval\(|new Function\(/, `${dir}/${name}`);
        assert.doesNotMatch(text, /\.innerHTML\s*=/, `${dir}/${name}: innerHTML`);
        assert.doesNotMatch(text, /import\(\s*['"]https?:/, `${dir}/${name}: remote import`);
      }
    }
  }
});

test('every directory has the same entry points and icons', () => {
  for (const dir of TARGETS) {
    const m = manifest(dir);
    for (const f of ['popup.html', 'app.html', 'options.html', 'popup.js', 'app.js', 'background.js', 'styles.css', ...Object.values(m.icons as Record<string, string>)]) {
      assert.ok(fs.existsSync(path.join(ROOT, dir, f)), `${dir}/${f}`);
    }
  }
});

test('generated files are up to date with extension-src (npm run ext:build)', async () => {
  const want = (await buildFiles()) as Record<string, Buffer>;
  for (const dir of TARGETS) {
    const have = existingFiles(path.join(ROOT, dir)) as Record<string, Buffer>;
    assert.deepEqual(Object.keys(have).sort(), Object.keys(want).sort(), dir);
    for (const [name, buf] of Object.entries(want)) assert.ok(have[name].equals(buf), `${dir}/${name} is stale: run npm run ext:build`);
  }
});

test('every official coin logo and UI icon renders (no empty icon variants)', async () => {
  const { renderIcons } = await import('../build-extensions.mjs');
  const icons = (await renderIcons()) as { ui: Record<string, string>; chains: Record<string, string> };
  assert.ok(Object.keys(icons.chains).length > 50);
  for (const [id, svg] of Object.entries({ ...icons.chains, ...icons.ui })) assert.ok(svg.startsWith('<svg') && svg.length > 150, `${id} renders an empty icon`);
});

test('store limits: name ≤ 75 (Chrome) or ≤ 45 (Edge, Firefox AMO), short name ≤ 12, description ≤ 132 characters', () => {
  const NAME_MAX: Record<string, number> = { 'extension-chrome': 75, 'extension-edge': 45, 'extension-firefox': 45 };
  for (const dir of TARGETS) {
    const m = manifest(dir) as Manifest & { name: string; short_name: string; description: string };
    assert.ok(m.name.length <= NAME_MAX[dir], `${dir}: name is ${m.name.length} characters (max ${NAME_MAX[dir]})`);
    assert.match(m.name, /Web3Lens|Blockchain/, `${dir}: name`);
    assert.ok(m.short_name.length <= 12, `${dir}: short_name`);
    assert.ok(m.description.length <= 132, `${dir}: description is ${m.description.length} characters`);
  }
});
