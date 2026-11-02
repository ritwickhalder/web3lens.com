/**
 * Store packages: dist-extensions/web3lens-<browser>-<version>.zip for Chrome Web Store, Edge
 * Add-ons and Firefox AMO, plus web3lens-extension-source-<version>.zip (AMO asks for the source of
 * bundled code). Checks the build is up to date first. Zips are written natively (zlib), with fixed
 * timestamps so the same input gives the same bytes.
 *
 *   npm run ext:pack
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'dist-extensions');

execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-extensions.mjs'), '--check'], { stdio: 'inherit' });

function listFiles(dir, base = dir, skip = () => false) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    if (skip(rel)) continue;
    if (e.isDirectory()) out.push(...listFiles(full, base, skip));
    else out.push({ name: rel, data: fs.readFileSync(full) });
  }
  return out;
}

function zip(files) {
  const DOS_TIME = 0;
  const DOS_DATE = (2026 - 1980) << 9 | 1 << 5 | 1; // 2026-01-01
  const locals = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const compressed = zlib.deflateRawSync(f.data, { level: 9 });
    const crc = zlib.crc32(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, compressed);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(8, 10);
    c.writeUInt16LE(DOS_TIME, 12);
    c.writeUInt16LE(DOS_DATE, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(compressed.length, 20);
    c.writeUInt32LE(f.data.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(c, name);
    offset += 30 + name.length + compressed.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

fs.mkdirSync(OUT, { recursive: true });
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'extension-chrome', 'manifest.json'), 'utf8')).version;
for (const browser of ['chrome', 'edge', 'firefox']) {
  const dir = path.join(ROOT, `extension-${browser}`);
  const files = listFiles(dir, dir, (rel) => rel === 'README.md' || rel.endsWith('.md'));
  const file = path.join(OUT, `web3lens-${browser}-${version}.zip`);
  fs.writeFileSync(file, zip(files));
  console.log(`${path.relative(ROOT, file)}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB, ${files.length} files`);
}

// Source archive for reviewers: everything needed to reproduce the bundles with `npm ci && npm run ext:build`.
const SOURCE = ['extension-src', 'lib', 'data', 'config/tools.ts', 'scripts/build-extensions.mjs', 'package.json', 'package-lock.json', 'tsconfig.json', 'extension-firefox/COMPATIBILITY.md'];
const sourceFiles = [];
for (const p of SOURCE) {
  const full = path.join(ROOT, p);
  if (fs.statSync(full).isDirectory()) sourceFiles.push(...listFiles(full, ROOT));
  else sourceFiles.push({ name: p, data: fs.readFileSync(full) });
}
sourceFiles.push({
  name: 'BUILD.md',
  data: Buffer.from(
    `# Building the Web3Lens extension from source\n\nRequires Node.js 22+.\n\n    npm ci\n    npm run ext:build\n\nThe output is written to extension-chrome/, extension-firefox/ and extension-edge/. The bundles are produced by esbuild (bundled, not minified) from extension-src/ and lib/.\n`,
  ),
});
const srcFile = path.join(OUT, `web3lens-extension-source-${version}.zip`);
fs.writeFileSync(srcFile, zip(sourceFiles));
console.log(`${path.relative(ROOT, srcFile)}  ${(fs.statSync(srcFile).size / 1024).toFixed(0)} KB, ${sourceFiles.length} files`);
