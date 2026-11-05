#!/usr/bin/env node
// Kiểm tra vi/en có cùng bộ khóa, không rỗng, và mọi data-i18n trong HTML đều tồn tại.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { vi } from '../shared/lang/vi.js';
import { en } from '../shared/lang/en.js';
const a = Object.keys(vi), b = new Set(Object.keys(en));
assert.deepEqual(a.filter((k) => !b.has(k)), [], 'thiếu trong en');
assert.deepEqual([...b].filter((k) => !(k in vi)), [], 'thiếu trong vi');
for (const [k, v] of [...Object.entries(vi), ...Object.entries(en)]) assert.ok(String(v).length, `rỗng: ${k}`);
const files = ['options/options.html', 'popup/popup.html', 'landing/index.html'];
const missing = [];
for (const f of files) {
  const h = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  for (const m of h.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) if (!(m[1] in vi)) missing.push(`${f}: ${m[1]}`);
  for (const m of h.matchAll(/data-i18n-attr="([^"]+)"/g)) for (const p of m[1].split(';')) { const k = p.split(':')[1]; if (k && !(k in vi)) missing.push(`${f}: ${k}`); }
}
assert.deepEqual(missing, [], 'khóa i18n không tồn tại');
console.log(`i18n OK — ${a.length} khóa`);
