/**
 * Runs the legacy `legacy/select.js` explorer() switch inside a Node vm sandbox with a
 * stubbed DOM, and records what it would have done for one option + query: the URL it
 * opened, the hidden form it submitted, and any "not yet supported" alert.
 *
 * Executing the original code (instead of parsing it) keeps fall-through cases such as
 * `Bitdeal` and one-off call shapes such as `open(url + t, '_blank')` exact. Used by
 * scripts/convert-legacy-chains.mjs and by the parity test.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const LEGACY_DIR = path.join(ROOT, 'legacy');

export function readLegacyOptions() {
  const html = fs.readFileSync(path.join(LEGACY_DIR, 'index.html'), 'utf8');
  const select = html.slice(html.indexOf('<select'), html.indexOf('</select>'));
  return [...select.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map((m) => ({
    value: m[1],
    label: m[2].trim(),
  }));
}

export function loadLegacyExplorer() {
  const source = fs.readFileSync(path.join(LEGACY_DIR, 'select.js'), 'utf8');
  const script = new vm.Script(`${source}\n;explorer;`, { filename: 'legacy/select.js' });

  /** @returns {{ opened: string[], submitted: null | { action: string, method: string, param: string, value: string }, alerted: boolean }} */
  return function runLegacy(optionValue, query) {
    const record = { opened: [], submitted: null, alerted: false };
    const input = { value: query, name: '' };
    const form = {
      action: 'javascript:;',
      method: 'GET',
      submit() {
        record.submitted = {
          action: form.action,
          method: String(form.method).toLowerCase(),
          param: input.name,
          value: input.value,
        };
      },
    };
    const elements = {
      blockchainSelector: { options: [{ value: optionValue }], selectedIndex: 0 },
      myInput: input,
      frm: form,
    };
    const sandbox = {
      document: { getElementById: (id) => elements[id] },
      window: { open: (url) => record.opened.push(url) },
      alert: () => {
        record.alerted = true;
      },
    };
    const explorer = script.runInNewContext(sandbox);
    explorer();
    return record;
  };
}
