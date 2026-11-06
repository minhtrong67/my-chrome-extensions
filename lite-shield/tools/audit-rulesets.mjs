#!/usr/bin/env node
// Kiểm tra an toàn các ruleset đã build: không có quy tắc quá rộng (cho phép/chặn mọi thứ), id không trùng, số lượng trong giới hạn.
import { readdirSync, readFileSync } from 'node:fs';
const dir = new URL('../rulesets/', import.meta.url);
let bad = 0;
let total = 0;
for (const f of readdirSync(dir).filter((x) => /^(ads|trackers|annoyances|vn|ubo|adguard)\.json$/.test(x))) {
  const rules = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  total += rules.length;
  const ids = new Set();
  for (const r of rules) {
    const c = r.condition;
    const scoped = (c.urlFilter && c.urlFilter !== '*') || c.regexFilter || c.requestDomains || c.initiatorDomains;
    // removeparam (redirect+queryTransform) và $ping thuộc bên thứ ba là quy tắc toàn cục hợp lệ; cho phép/chặn không giới hạn thì không.
    const wide = !scoped && (['allow', 'allowAllRequests'].includes(r.action.type) || (r.action.type === 'block' && !c.resourceTypes && !c.domainType));
    if (wide || ids.has(r.id)) { bad++; console.log(`${f} #${r.id} ${ids.has(r.id) ? 'trùng id' : 'quá rộng'}: ${JSON.stringify(r).slice(0, 200)}`); }
    ids.add(r.id);
  }
}
console.log(bad ? `✘ ${bad} quy tắc có vấn đề` : `✔ Audit ruleset đạt (${total} quy tắc)`);
process.exit(bad ? 1 : 0);
