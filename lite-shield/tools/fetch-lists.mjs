#!/usr/bin/env node
// Tải danh sách bộ lọc công khai (EasyList, EasyPrivacy) vào lists/vendor/ rồi bạn chạy build-rulesets.mjs.
// Dùng:  node tools/fetch-lists.mjs && node tools/build-rulesets.mjs
// Giấy phép: EasyList/EasyPrivacy dùng GPLv3 / CC BY-SA 3.0 — xem https://easylist.to
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, SOURCES } from '../shared/sources.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'lists', 'vendor');
for (const [group, files] of Object.entries(SOURCES)) {
  const dir = join(root, group);
  mkdirSync(dir, { recursive: true });
  for (const f of files) {
    const res = await fetch(`${BASE}/${f}`);
    if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
    const text = await res.text();
    writeFileSync(join(dir, f.split('/').pop()), text);
    console.log(`${group.padEnd(13)} ${f.split('/').pop().padEnd(36)} ${(text.length / 1024).toFixed(0)} KB`);
  }
}
console.log('Xong. Chạy tiếp: node tools/build-rulesets.mjs');
