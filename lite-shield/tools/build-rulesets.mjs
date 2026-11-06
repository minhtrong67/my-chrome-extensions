#!/usr/bin/env node
// Biên dịch lists/*.txt (cú pháp ABP/uBlock) → rulesets/*.json (declarativeNetRequest) + rulesets/cosmetic.json.
// Dùng:  node tools/build-rulesets.mjs
// Muốn thêm EasyList / uBO filters: tải file .txt vào lists/ (ví dụ lists/ads.txt nối thêm) rồi chạy lại.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../shared/filters.js';
import { EXTRA } from '../shared/sources.js';
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

const meta = {};
const countRegex = (rules) => rules.filter((r) => r.condition.regexFilter).length;
let totalErrors = 0;
for (const id of ['ads', 'trackers', 'annoyances']) {
  const res = compile(read(`${id}.txt`) + '\n' + vendor(id), { startId: 1, optimize: true });
  writeFileSync(join(out, `${id}.json`), JSON.stringify(res.rules));
  const domains = res.rules.reduce((n, r) => n + (r.condition.requestDomains?.length ?? 1), 0);
  meta[id] = { rules: res.rules.length, units: domains, regex: countRegex(res.rules) };
  console.log(`${id.padEnd(11)} ${String(res.rules.length).padStart(5)} rules  (~${domains} domain/pattern)  skipped: ${res.errors.length}`);
  if (res.rules.length > 30000) console.warn(`  ⚠ ${id}: vượt 30.000 quy tắc đảm bảo của Chrome`);
  for (const e of res.errors.slice(0, 5)) console.warn(`  dòng ${e.line}: ${e.msg} — ${e.text.slice(0, 80)}`);
  totalErrors += res.errors.length;
}

const cosmetic = {};
const generic = {};
// Selector chung dạng .class / #id (chiếm ~97%) không đưa vào CSS tĩnh nữa: mỗi tab phải giữ hàng chục nghìn luật trong RAM.
// Thay vào đó lưu danh sách token; content.js chỉ hỏi những class/id thật sự có trên trang (xem content.js, 'generic-match').
const SIMPLE_TOKEN = /^[.#](?:[\w-]|\\.)+$/;
function splitGeneric(key, selectors) {
  const tokens = [];
  const rest = [];
  for (const s of selectors) (SIMPLE_TOKEN.test(s) ? tokens : rest).push(s);
  writeFileSync(join(out, `generic-${key}.tokens.json`), JSON.stringify([...new Set(tokens)]));
  const chunks = toSelectorChunks(rest);
  generic[key] = chunks;
  writeFileSync(join(out, `generic-${key}.css`), hideCss(chunks));
  return { chunks, tokens: tokens.length };
}

for (const [key, file] of [['ads', 'cosmetic-ads.txt'], ['annoyances', 'cosmetic-annoyances.txt']]) {
  const res = compile(read(file) + '\n' + vendor(`cosmetic-${key}`));
  // Selector chung → CSS tĩnh (Chrome áp dụng qua registerContentScripts, không cần nhắn tin).
  const { chunks, tokens } = splitGeneric(key, res.cosmetic.generic);
  res.cosmetic.generic = [];
  cosmetic[key] = res.cosmetic;
  console.log(`cosmetic:${key.padEnd(10)} ${res.counts.cosmetic} selector (${tokens} token class/id + ${chunks.length} nhóm CSS chung)  skipped: ${res.errors.length}`);
  totalErrors += res.errors.length;
}
// ---- danh sách bổ sung (vn, ubo, adguard): network + ẩn phần tử + scriptlet ----
const SHARDS = 32;
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
mkdirSync(join(root, 'scriptlets'), { recursive: true });
for (const id of Object.keys(EXTRA)) {
  const res = compile(read(`${id}.txt`) + "\n" + vendor(id), { startId: 1, optimize: true });
  writeFileSync(join(out, `${id}.json`), JSON.stringify(res.rules));
  const units = res.rules.reduce((n, r) => n + (r.condition.requestDomains?.length ?? 1), 0);
  splitGeneric(id, res.cosmetic.generic);
  res.cosmetic.generic = [];
  cosmetic[id] = res.cosmetic;

  // Scriptlet: chia shard theo tên miền; mỗi shard được đăng ký chỉ cho các tên miền của nó.
  const shards = Array.from({ length: SHARDS }, () => ({}));
  for (const [host, list] of Object.entries(res.scriptlets.hosts)) shards[hash(host) % SHARDS][host] = list;
  const index = { shards: [], generic: res.scriptlets.generic.length > 0 };
  shards.forEach((hosts, n) => {
    const names = Object.keys(hosts);
    if (!names.length) return;
    const file = `scriptlets/${id}-${n}.js`;
    writeFileSync(join(root, file), `__lsRun(${JSON.stringify(hosts)},${JSON.stringify(res.scriptlets.hostEx)});\n`);
    index.shards.push({ file, domains: names });
  });
  if (index.generic) writeFileSync(join(root, `scriptlets/${id}-generic.js`), `__lsRun({},${JSON.stringify(res.scriptlets.hostEx)},${JSON.stringify(res.scriptlets.generic)});\n`);
  writeFileSync(join(root, `scriptlets/${id}.index.json`), JSON.stringify(index));

  meta[id] = { rules: res.rules.length, units, regex: countRegex(res.rules), cosmetic: res.counts.cosmetic, scriptlets: res.counts.scriptlets };
  console.log(`${id.padEnd(11)} ${String(res.rules.length).padStart(5)} rules  cosmetic ${res.counts.cosmetic}  scriptlet ${res.counts.scriptlets}  skipped: ${res.errors.length}`);
  totalErrors += res.errors.length;
}
writeFileSync(join(out, 'meta.json'), JSON.stringify(meta));
const totalRules = Object.values(meta).reduce((n, m) => n + m.rules, 0);
const totalRegex = Object.values(meta).reduce((n, m) => n + m.regex, 0);
console.log(`Tổng ${totalRules} quy tắc tĩnh (đảm bảo 30.000), regex ${totalRegex} (giới hạn 1.000)`);
for (const [k, v] of Object.entries(cosmetic)) writeFileSync(join(out, `cosmetic-${k}.json`), JSON.stringify(v));
writeFileSync(join(out, 'generic.json'), JSON.stringify(generic));
console.log(totalErrors ? `Xong (có ${totalErrors} dòng bị bỏ qua).` : 'Xong.');
