/**
 * Both themes keep WCAG AA contrast (4.5:1) for text on the surfaces it's used on. Reads the
 * tokens straight from app/globals.css, so a palette change that hurts legibility fails here.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { sanitizeTheme, THEME_INIT_SCRIPT, THEME_KEY } from '../../lib/theme';

const css = fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'app', 'globals.css'), 'utf8');

function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}
const dark = tokens(/@theme\s*\{([\s\S]*?)\n\}/.exec(css)![1]);
const light = tokens(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\}/.exec(css)![1]);
const system = tokens(/:root\[data-theme="system"\]\s*\{([\s\S]*?)\}/.exec(css)![1]);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [text, background]: text tokens on the surfaces they appear on, and ink text on accent buttons.
const PAIRS: [string, string][] = [
  ['fg', 'ink'],
  ['fg', 'ink-2'],
  ['muted', 'ink'],
  ['muted', 'ink-2'],
  ['faint', 'ink'],
  ['faint', 'ink-2'],
  ['accent', 'ink'],
  ['accent', 'ink-2'],
  ['redline', 'ink-2'],
  ['danger', 'ink-2'],
  ['ink', 'accent'],
];

for (const [name, t] of [
  ['dark', dark],
  ['light', light],
] as const) {
  test(`${name} theme: text tokens meet WCAG AA (4.5:1)`, () => {
    for (const [fg, bg] of PAIRS) {
      assert.ok(t[fg] && t[bg], `${name}: missing --color-${fg} or --color-${bg}`);
      const ratio = contrast(t[fg], t[bg]);
      assert.ok(ratio >= 4.5, `${name}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
    }
  });
}

test('light and system blocks define the same tokens as the dark theme', () => {
  assert.deepEqual(Object.keys(light).sort(), Object.keys(dark).sort());
  assert.deepEqual(system, light, 'the system (prefers light) block must match the light block');
});

test('theme preference is sanitised and the init script mirrors it', () => {
  assert.equal(sanitizeTheme('light'), 'light');
  assert.equal(sanitizeTheme('system'), 'system');
  assert.equal(sanitizeTheme('<script>'), 'dark');
  assert.equal(sanitizeTheme(undefined), 'dark');
  assert.ok(THEME_INIT_SCRIPT.includes(JSON.stringify(THEME_KEY)));
  assert.doesNotMatch(THEME_INIT_SCRIPT, /innerHTML|eval|<\/script/);
});

test('the extensions use the same light palette as the website', () => {
  const extCss = fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'extension-src', 'static', 'styles.css'), 'utf8');
  const block = /:root\[data-theme="light"\]\s*\{([\s\S]*?)\}/.exec(extCss)![1];
  const ext = Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
  assert.deepEqual(ext, light);
});
