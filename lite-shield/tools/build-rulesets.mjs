#!/usr/bin/env node
// Biên dịch lists/*.txt (cú pháp ABP/uBlock) → rulesets/*.json (declarativeNetRequest) + rulesets/cosmetic.json.
// Dùng:  node tools/build-rulesets.mjs
// Muốn thêm EasyList / uBO filters: tải file .txt vào lists/ (ví dụ lists/ads.txt nối thêm) rồi chạy lại.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../shared/filters.js';
import { toSelectorChunks, hideCss } from '../shared/selector.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'rulesets');
mkdirSync(out, { recursive: true });

const read = (name) => {
  const p = join(root, 'lists', name);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
};
// Gộp thêm mọi tệp trong lists/vendor/<nhóm>/*.txt (do tools/fetch-lists.mjs tải về).
const vendor = (group) => {
  const d = join(root, 'lists', 'vendor', group);
  if (!existsSync(d)) return '';
  return readdirSync(d).filter((f) => f.endsWith('.txt')).sort()
    .map((f) => readFileSync(join(d, f), 'utf8')).join('\n');
};

let totalErrors = 0;
for (const id of ['ads', 'trackers', 'annoyances']) {
  const res = compile(read(`${id}.txt`) + '\n' + vendor(id), { startId: 1, optimize: true });
  writeFileSync(join(out, `${id}.json`), JSON.stringify(res.rules));
  const domains = res.rules.reduce((n, r) => n + (r.condition.requestDomains?.length ?? 1), 0);
  console.log(`${id.padEnd(11)} ${String(res.rules.length).padStart(5)} rules  (~${domains} domain/pattern)  skipped: ${res.errors.length}`);
  if (res.rules.length > 30000) console.warn(`  ⚠ ${id}: vượt 30.000 quy tắc đảm bảo của Chrome`);
  for (const e of res.errors.slice(0, 5)) console.warn(`  dòng ${e.line}: ${e.msg} — ${e.text.slice(0, 80)}`);
  totalErrors += res.errors.length;
}

const cosmetic = {};
const generic = {};
for (const [key, file] of [['ads', 'cosmetic-ads.txt'], ['annoyances', 'cosmetic-annoyances.txt']]) {
  const res = compile(read(file) + '\n' + vendor(`cosmetic-${key}`));
  // Selector chung → CSS tĩnh (Chrome áp dụng qua registerContentScripts, không cần nhắn tin).
  const chunks = toSelectorChunks(res.cosmetic.generic);
  generic[key] = chunks;
  writeFileSync(join(out, `generic-${key}.css`), hideCss(chunks));
  res.cosmetic.generic = [];
  cosmetic[key] = res.cosmetic;
  console.log(`cosmetic:${key.padEnd(10)} ${res.counts.cosmetic} selector (${chunks.length} nhóm CSS chung)  skipped: ${res.errors.length}`);
  totalErrors += res.errors.length;
}
writeFileSync(join(out, 'cosmetic.json'), JSON.stringify(cosmetic));
writeFileSync(join(out, 'generic.json'), JSON.stringify(generic));
console.log(totalErrors ? `Xong (có ${totalErrors} dòng bị bỏ qua).` : 'Xong.');
