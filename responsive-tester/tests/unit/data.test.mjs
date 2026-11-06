import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function load(file, extra = {}) {
  const win = { ...extra };
  win.window = win;
  vm.runInNewContext(read(file), win);
  return win;
}

test('device database is well formed', () => {
  const { RT_DEVICES: list, RT_BREAKPOINTS: bps } = load('js/devices.js');
  assert.ok(list.length >= 70, 'at least 70 devices');
  const ids = new Set();
  for (const d of list) {
    assert.ok(!ids.has(d.id), 'duplicate id ' + d.id); ids.add(d.id);
    assert.ok(d.name && d.group, 'name/group ' + d.id);
    assert.ok(['phone', 'tablet', 'foldable', 'watch', 'desktop'].includes(d.type), 'type ' + d.id);
    assert.ok(['ios', 'android', 'other'].includes(d.os), 'os ' + d.id);
    assert.ok(d.w >= 100 && d.h >= 100 && d.dpr >= 1, 'size ' + d.id);
    assert.ok(['none', 'island', 'notch', 'punch', 'home'].includes(d.cutout), 'cutout ' + d.id);
  }
  assert.deepEqual([...bps], [...bps].sort((a, b) => a - b));
});

test('every device group has a translation key', () => {
  const { RT_DEVICES: list } = load('js/devices.js');
  const app = read('js/app.js'), i18n = read('js/i18n.js');
  const groups = [...new Set(list.map((d) => d.group))];
  for (const g of groups) {
    assert.ok(app.includes(`'${g}':`), 'GROUP_KEY missing ' + g);
  }
  for (const k of [...app.matchAll(/'[^']+': '(g_\w+)'/g)].map((m) => m[1])) assert.ok(new RegExp(`${k}:`).test(i18n), 'i18n key ' + k);
});

test('English and Vietnamese dictionaries have the same keys', () => {
  const src = read('js/i18n.js');
  const keys = (block) => new Set([...block.matchAll(/(?:^|[,{\s])([A-Za-z_][\w]*):\s*'/g)].map((m) => m[1]));
  const en = keys(src.slice(src.indexOf('const EN'), src.indexOf('const VI')));
  const vi = keys(src.slice(src.indexOf('const VI'), src.indexOf('let cur')));
  const missingVi = [...en].filter((k) => !vi.has(k)), missingEn = [...vi].filter((k) => !en.has(k));
  assert.deepEqual(missingVi, [], 'missing in Vietnamese');
  assert.deepEqual(missingEn, [], 'missing in English');
});

test('every translation key used by the UI exists', () => {
  const src = read('js/i18n.js');
  const en = new Set([...src.slice(src.indexOf('const EN'), src.indexOf('const VI')).matchAll(/(?:^|[,{\s])([A-Za-z_][\w]*):\s*'/g)].map((m) => m[1]));
  const used = new Set();
  for (const f of ['js/app.js', 'js/template.js']) {
    const text = read(f);
    for (const m of text.matchAll(/\bt\('([A-Za-z_]\w*)'\)/g)) used.add(m[1]);
    for (const m of text.matchAll(/data-i18n(?:-title|-ph)?="([A-Za-z_]\w*)"/g)) used.add(m[1]);
  }
  const missing = [...used].filter((k) => !en.has(k));
  assert.deepEqual(missing, [], 'keys used but not defined');
});

test('manifest references existing files and locales', () => {
  const m = JSON.parse(read('manifest.json'));
  assert.equal(m.manifest_version, 3);
  for (const f of [m.background.service_worker, ...m.content_scripts.flatMap((c) => c.js), ...Object.values(m.icons)]) assert.ok(fs.existsSync(path.join(ROOT, f)), 'missing ' + f);
  for (const loc of ['en', 'vi']) {
    const msgs = JSON.parse(read(`_locales/${loc}/messages.json`));
    for (const k of [...JSON.stringify(m).matchAll(/__MSG_(\w+)__/g)].map((x) => x[1])) assert.ok(msgs[k], `${loc} message ${k}`);
  }
  const bg = read('background.js');
  for (const f of [...bg.matchAll(/'((?:js|lib)\/[\w.]+\.js)'/g)].map((x) => x[1])) assert.ok(fs.existsSync(path.join(ROOT, f)), 'injected file ' + f);
});

test('GIF encoder produces a valid GIF89a stream', () => {
  const { RTGif } = load('js/gif.js', { Blob: class { constructor(parts) { this.parts = parts; } } });
  const w = 32, h = 24, g = new RTGif(w, h), px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { px[i * 4] = (i * 7) & 255; px[i * 4 + 1] = (i * 3) & 255; px[i * 4 + 2] = 128; px[i * 4 + 3] = 255; }
  g.addFrame(px, 100); g.addFrame(px, 100);
  const blob = g.finish();
  const bytes = Buffer.concat(blob.parts.map((p) => Buffer.from(p)));
  assert.equal(bytes.subarray(0, 6).toString(), 'GIF89a');
  assert.equal(bytes.readUInt16LE(6), w); assert.equal(bytes.readUInt16LE(8), h);
  assert.equal(bytes[bytes.length - 1], 0x3b, 'trailer');
  assert.equal([...bytes].filter((b, i) => b === 0x2c && bytes[i - 1] === 0).length >= 2, true, 'two image descriptors');
});
