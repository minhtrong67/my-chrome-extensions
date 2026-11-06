// Bộ phân tích bộ lọc kiểu ABP / uBlock → quy tắc declarativeNetRequest + dữ liệu cosmetic.
// Dùng chung cho service worker, trang tùy chọn và công cụ build (Node). Không phụ thuộc DOM/chrome.

const TYPE_MAP = {
  script: 'script',
  image: 'image',
  stylesheet: 'stylesheet',
  css: 'stylesheet',
  font: 'font',
  media: 'media',
  object: 'object',
  xhr: 'xmlhttprequest',
  xmlhttprequest: 'xmlhttprequest',
  subdocument: 'sub_frame',
  frame: 'sub_frame',
  document: 'main_frame',
  doc: 'main_frame',
  ping: 'ping',
  websocket: 'websocket',
  other: 'other',
};

const OPT_RE = /^~?[a-z0-9_-]+(=[^,]*)?(,~?[a-z0-9_-]+(=[^,]*)?)*$/i;
const COSMETIC_RE = /^([a-z0-9.,~*_-]*)(#@?[?$%]?#)(.+)$/i;
const PROCEDURAL_RE =
  /:(has-text|xpath|matches-css(-before|-after)?|matches-path|matches-media|upward|min-text-length|watch-attr|contains|if|if-not|remove|style|nth-ancestor|others|-abp-[a-z-]+)\(/i;
const DOMAIN_ONLY_RE = /^\|\|([a-z0-9][a-z0-9.-]*\.[a-z0-9-]+)\^?$/i;
const DOMAIN_RE = /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/;
// urlFilter hợp lệ: ASCII; '|' chỉ ở đầu ('|' hoặc '||') hoặc cuối; không bắt đầu bằng '||*'.
function validUrlFilter(p) {
  if (!p || !/^[\x21-\x7e]+$/.test(p) || p.startsWith('||*') || p.startsWith('|||')) return false;
  const core = p.replace(/^\|\|?/, '').replace(/\|$/, '');
  return !core.includes('|') && core.length > 0;
}
const HOSTS_RE = /^(?:0\.0\.0\.0|127\.0\.0\.1)\s+([a-z0-9][a-z0-9.-]*\.[a-z0-9-]+)$/i;

// Tài nguyên thay thế (uBO $redirect=) — chỉ những tệp được đóng gói sẵn trong res/.
const REDIRECT_RES = {
  'noop.js': 'noop.js', noopjs: 'noop.js', 'noop.txt': 'noop.txt', nooptext: 'noop.txt', empty: 'noop.txt', 'noop.css': 'noop.css',
  'noop.html': 'noop.html', noopframe: 'noop.html', '1x1.gif': '1x1.gif', '1x1-transparent.gif': '1x1.gif',
  '2x2.png': '2x2.png', '2x2-transparent.png': '2x2.png', '3x2.png': '3x2.png', '3x2-transparent.png': '3x2.png',
};
const ALL_TYPES = ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'media', 'websocket', 'other'];
export const PRIORITY = { block: 1, allow: 2, redirect: 2, important: 3, domainAllow: 900, siteAllow: 1000 };

export function emptyCosmetic() {
  return { generic: [], genericEx: [], hosts: {}, hostEx: {} };
}
export function emptyScriptlets() {
  return { generic: [], hosts: {}, hostEx: {} };
}

const BADFILTER_RE = /[$,]badfilter(?=,|$)/i;
const normBad = (l) => l.trim().replace(/,badfilter(?=,|$)/i, '').replace(/\$badfilter,/i, '$').replace(/\$badfilter$/i, '');

/** a.b.example.com → [a.b.example.com, b.example.com, example.com] */
export function hostChain(host) {
  const parts = String(host || '').toLowerCase().split('.').filter(Boolean);
  const out = [];
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join('.'));
  if (!out.length && parts.length) out.push(parts[0]);
  return out;
}

function parseDomainList(str, sep) {
  const include = [];
  const exclude = [];
  let droppedInc = 0;
  let droppedExc = 0;
  for (const raw of str.split(sep)) {
    let d = raw.trim().toLowerCase();
    if (!d) continue;
    if (d.includes('*') || d.includes('/')) {
      // entity (example.*) / regex: chưa hỗ trợ — ghi nhận để người gọi từ chối quy tắc thay vì nới rộng nó
      if (d.startsWith('~')) droppedExc++;
      else droppedInc++;
      continue;
    }
    if (d.startsWith('~')) {
      d = d.slice(1);
      if (d) exclude.push(d);
    } else include.push(d);
  }
  return { include, exclude, droppedInc, droppedExc };
}

// +js(name, arg1, arg2…) — tách theo dấu phẩy, tôn trọng "\," và dấu nháy.
function parseScriptlet(sel, op, domainStr) {
  if (!sel.endsWith(')')) return { kind: 'error', msg: 'Scriptlet không hợp lệ', key: 'err.scriptlet' };
  const body = sel.slice(4, -1);
  // Hậu tố như :matches-path(...) chưa hỗ trợ — nếu bỏ qua, scriptlet sẽ chạy trên MỌI trang (nguy hiểm).
  if (/\)\s*:[a-z-]+\(/i.test(body + ')')) return { kind: 'error', msg: 'Scriptlet có điều kiện phụ chưa được hỗ trợ', key: 'err.scriptlet' };
  const parts = [];
  let cur = '';
  let q = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '\\' && body[i + 1] === ',') { cur += ','; i++; continue; }
    if (q) { if (c === q) q = ''; else cur += c; continue; }
    if ((c === "'" || c === '"') && cur.trim() === '') { q = c; continue; }
    if (c === ',') { parts.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  parts.push(cur.trim());
  const name = parts.shift();
  if (op === '#@#' && !name) return { kind: 'scriptlet', exception: true, domains: parseDomainList(domainStr, ','), name: '', args: [] };
  if (!name || name.startsWith('trusted-')) return { kind: 'error', msg: 'Scriptlet chưa được hỗ trợ', key: 'err.scriptlet' };
  const domains = parseDomainList(domainStr, ',');
  // Scriptlet không gắn tên miền sẽ chạy trên mọi trang và có thể làm hỏng chúng → chỉ chấp nhận khi có ít nhất một tên miền cụ thể.
  if (op !== '#@#' && !domains.include.length) return { kind: 'error', msg: 'Scriptlet phải gắn với tên miền', key: 'err.scriptlet' };
  return { kind: 'scriptlet', exception: op === '#@#', domains, name, args: parts };
}

function parseCosmetic(line, m) {
  const [, domainStr, op, selector] = m;
  if (op !== '##' && op !== '#@#') return { kind: 'error', msg: 'Bộ lọc thủ tục (#?#, #$#, #%#) chưa được hỗ trợ', key: 'err.procedural' };
  const sel = selector.trim();
  if (!sel) return { kind: 'error', msg: 'Selector trống', key: 'err.emptySelector' };
  if (/[{}\n]/.test(sel)) return { kind: 'error', msg: 'Selector chứa ký tự không hợp lệ', key: 'err.badSelector' };
  if (sel.startsWith('+js(')) return parseScriptlet(sel, op, domainStr);
  if (PROCEDURAL_RE.test(sel)) return { kind: 'error', msg: 'Toán tử thủ tục (:has-text, :xpath…) chưa được hỗ trợ', key: 'err.procOperator' };
  const domains = parseDomainList(domainStr, ',');
  // Tên miền entity (example.*) chưa hỗ trợ: nếu bỏ đi, luật theo trang sẽ biến thành luật TOÀN CỤC và ẩn nhầm phần tử trên mọi trang.
  if (domains.droppedInc && !domains.include.length) return { kind: 'error', msg: 'Tên miền entity (example.*) chưa được hỗ trợ', key: 'err.asciiPattern' };
  if (domains.droppedExc) return { kind: 'error', msg: 'Tên miền entity (~example.*) chưa được hỗ trợ', key: 'err.asciiPattern' };
  return {
    kind: 'cosmetic',
    exception: op === '#@#',
    domains,
    selector: sel,
  };
}

function parseNetwork(raw) {
  let s = raw;
  let exception = false;
  if (s.startsWith('@@')) {
    exception = true;
    s = s.slice(2);
  }

  let pattern = s;
  let optStr = '';
  const isRegex = s.length > 2 && s.startsWith('/') && s.endsWith('/');
  const i = s.lastIndexOf('$');
  if (i >= 0 && !isRegex) {
    const tail = s.slice(i + 1);
    if (OPT_RE.test(tail)) {
      pattern = s.slice(0, i);
      optStr = tail;
    }
  }

  const condition = {};
  const types = new Set();
  const notTypes = new Set();
  let priority = exception ? PRIORITY.allow : PRIORITY.block;
  let special = null; // removeparam | redirect | csp
  let badfilter = false;

  for (const o of optStr ? optStr.split(',') : []) {
    const neg = o.startsWith('~');
    const body = neg ? o.slice(1) : o;
    const eq = body.indexOf('=');
    const key = (eq < 0 ? body : body.slice(0, eq)).toLowerCase();
    const val = eq < 0 ? '' : body.slice(eq + 1);

    if (key === 'third-party' || key === '3p') condition.domainType = neg ? 'firstParty' : 'thirdParty';
    else if (key === 'first-party' || key === '1p') condition.domainType = neg ? 'thirdParty' : 'firstParty';
    else if (key === 'domain' || key === 'from') {
      const { include, exclude, droppedInc, droppedExc } = parseDomainList(val, '|');
      if ((droppedInc && !include.length) || droppedExc) return { kind: 'error', msg: 'Tuỳ chọn domain= chưa hỗ trợ (entity/regex)', key: 'err.asciiPattern' };
      if (include.length) condition.initiatorDomains = include;
      if (exclude.length) condition.excludedInitiatorDomains = exclude;
    } else if (key === 'all') ALL_TYPES.forEach((x) => types.add(x));
    else if (key === 'to' || key === 'denyallow') {
      const { include, exclude, droppedInc, droppedExc } = parseDomainList(val, '|');
      if (droppedInc || droppedExc) return { kind: 'error', msg: 'Tuỳ chọn to=/denyallow= chưa hỗ trợ (entity/regex)', key: 'err.asciiPattern' };
      if (key === 'to' && include.length) condition.requestDomains = include;
      const ex = key === 'to' ? exclude : include;
      if (ex.length) condition.excludedRequestDomains = ex;
    } else if (key === 'method') {
      const inc = [];
      const exc = [];
      for (const m of val.toLowerCase().split('|')) (m.startsWith('~') ? exc : inc).push(m.replace(/^~/, ''));
      if (inc.length) condition.requestMethods = inc;
      else if (exc.length) condition.excludedRequestMethods = exc;
    } else if (key === 'badfilter') badfilter = true;
    else if (key === 'removeparam' || key === 'queryprune') {
      if (neg || !val || val.startsWith('/') || val.includes('=')) return { kind: 'error', msg: 'removeparam dạng regex/rỗng chưa được hỗ trợ', key: 'err.option', args: { key } };
      special = { type: 'removeparam', name: val };
    } else if (key === 'redirect') {
      const res = REDIRECT_RES[val.split(':')[0]];
      if (!res) return { kind: 'error', msg: `Tài nguyên redirect chưa hỗ trợ: ${val}`, key: 'err.option', args: { key: `redirect=${val}` } };
      special = { type: 'redirect', res };
    } else if (key === 'csp') {
      if (!val) return { kind: 'error', msg: 'csp rỗng', key: 'err.option', args: { key } };
      special = { type: 'csp', value: val };
    } else if (key === 'important') {
      if (!exception) priority = PRIORITY.important;
    } else if (key === 'match-case') condition.isUrlFilterCaseSensitive = true;
    else if (TYPE_MAP[key]) (neg ? notTypes : types).add(TYPE_MAP[key]);
    else return { kind: 'error', msg: `Tuỳ chọn chưa hỗ trợ: ${key}`, key: 'err.option', args: { key } };
  }

  if (badfilter) return { kind: 'badfilter' };
  if (special && exception) return { kind: 'error', msg: 'Ngoại lệ cho tuỳ chọn này chưa được hỗ trợ', key: 'err.option', args: { key: special.type } };
  let action = { type: exception ? 'allow' : 'block' };
  if (special?.type === 'removeparam') {
    action = { type: 'redirect', redirect: { transform: { queryTransform: { removeParams: [special.name] } } } };
    if (!types.size) ALL_TYPES.forEach((x) => types.add(x));
  } else if (special?.type === 'redirect') {
    action = { type: 'redirect', redirect: { extensionPath: `/res/${special.res}` } };
    priority = PRIORITY.redirect;
  } else if (special?.type === 'csp') {
    action = { type: 'modifyHeaders', responseHeaders: [{ header: 'Content-Security-Policy', operation: 'append', value: special.value }] };
    if (!types.size) ['main_frame', 'sub_frame'].forEach((x) => types.add(x));
  }
  if (exception && types.has('main_frame') && !special) {
    action = { type: 'allowAllRequests' };
    types.clear();
    types.add('main_frame');
    types.add('sub_frame');
  }
  if (types.size) {
    const list = [...types].filter((t) => !notTypes.has(t));
    if (!list.length) return { kind: 'error', msg: 'Loại tài nguyên mâu thuẫn', key: 'err.typeConflict' };
    condition.resourceTypes = list;
  } else if (notTypes.size) condition.excludedResourceTypes = [...notTypes];

  if (isRegex) condition.regexFilter = pattern.slice(1, -1);
  else if (pattern === '' || pattern === '*') {
    if (!condition.initiatorDomains && !condition.resourceTypes) return { kind: 'error', msg: 'Mẫu URL trống', key: 'err.emptyPattern' };
  } else {
    if (!/^[\x21-\x7e]+$/.test(pattern)) return { kind: 'error', msg: 'Mẫu URL phải là ASCII, không có khoảng trắng', key: 'err.asciiPattern' };
    condition.urlFilter = pattern;
  }

  // Chrome từ chối cả tệp ruleset nếu một quy tắc có giá trị không hợp lệ → kiểm tra trước, bỏ riêng quy tắc đó.
  if (condition.urlFilter !== undefined && !validUrlFilter(condition.urlFilter)) return { kind: 'error', msg: 'Mẫu URL không hợp lệ với Chrome', key: 'err.asciiPattern' };
  if (isRegex && (/\/\$[a-z~]/i.test(s) || pattern.length > 1500 || /\{\d{3,}/.test(pattern))) return { kind: 'error', msg: 'Biểu thức chính quy không hợp lệ', key: 'err.asciiPattern' };
  for (const k of ['initiatorDomains', 'excludedInitiatorDomains', 'requestDomains', 'excludedRequestDomains'])
    if (condition[k] && !condition[k].every((d) => DOMAIN_RE.test(d))) return { kind: 'error', msg: 'Tên miền không hợp lệ', key: 'err.asciiPattern' };

  // Quy tắc "cho phép" không có mẫu URL lẫn tên miền sẽ cho phép MỌI yêu cầu cùng loại → tuyệt đối không phát ra.
  if ((action.type === 'allow' || action.type === 'allowAllRequests') && !(condition.urlFilter && condition.urlFilter !== '*') && !condition.regexFilter && !condition.initiatorDomains && !condition.requestDomains)
    return { kind: 'error', msg: 'Quy tắc cho phép quá rộng', key: 'err.asciiPattern' };

  const domainOnly =
    !optStr && !isRegex && DOMAIN_ONLY_RE.exec(pattern) && action.type !== 'allowAllRequests' ? DOMAIN_ONLY_RE.exec(pattern)[1].toLowerCase() : null;

  return { kind: 'network', action, priority, condition, domainOnly, special: special?.type ?? null, param: special?.name };
}

export function parseLine(line) {
  const s = line.trim();
  if (!s || s.startsWith('!')) return { kind: 'empty' };
  const cm = COSMETIC_RE.exec(s);
  if (cm) return parseCosmetic(s, cm);
  if (s.startsWith('#')) return { kind: 'empty' };
  const hm = HOSTS_RE.exec(s);
  if (hm) {
    const d = hm[1].toLowerCase();
    return {
      kind: 'network',
      action: { type: 'block' },
      priority: PRIORITY.block,
      condition: { urlFilter: `||${d}^` },
      domainOnly: d,
    };
  }
  if (/^\[.*\]$/.test(s)) return { kind: 'empty' };
  return parseNetwork(s);
}

/**
 * Biên dịch văn bản bộ lọc.
 * @param {string} text
 * @param {{startId?: number, optimize?: boolean, chunk?: number}} opts
 */
export function compile(text, opts = {}) {
  const { startId = 1, optimize = true, chunk = 500 } = opts;
  const rules = [];
  const ruleLine = {};
  const errors = [];
  const cosmetic = emptyCosmetic();
  const buckets = new Map();
  const scriptlets = emptyScriptlets();
  const globalParams = new Set();
  const counts = { network: 0, exceptions: 0, cosmetic: 0, scriptlets: 0 };
  let nextId = startId;

  const lines = String(text || '').split(/\r?\n/);
  // $badfilter: vô hiệu hoá bộ lọc giống hệt (trừ tuỳ chọn badfilter) trong cùng danh sách.
  const bad = new Set();
  for (const l of lines) if (l.includes('badfilter') && BADFILTER_RE.test(l)) bad.add(normBad(l));
  lines.forEach((line, idx) => {
    if (bad.size && !BADFILTER_RE.test(line) && bad.has(line.trim())) return;
    const p = parseLine(line);
    if (p.kind === 'badfilter') return;
    if (p.kind === 'scriptlet') {
      counts.scriptlets++;
      const { include, exclude } = p.domains;
      const entry = [p.name, ...p.args];
      if (p.exception) {
        for (const d of include.length ? include : ['*']) (scriptlets.hostEx[d] ??= []).push(p.args.length || p.name ? entry : []);
      } else if (include.length) for (const d of include) (scriptlets.hosts[d] ??= []).push(entry);
      else scriptlets.generic.push(exclude.length ? { e: entry, ex: exclude } : { e: entry });
      return;
    }
    if (p.kind === 'empty') return;
    if (p.kind === 'error') {
      errors.push({ line: idx + 1, text: line.trim(), msg: p.msg, key: p.key, args: p.args });
      return;
    }
    if (p.kind === 'cosmetic') {
      counts.cosmetic++;
      const { include, exclude } = p.domains;
      if (p.exception) {
        for (const d of include.length ? include : ['*']) (cosmetic.hostEx[d] ??= []).push(p.selector);
      } else if (include.length) {
        for (const d of include) (cosmetic.hosts[d] ??= []).push(p.selector);
      } else if (exclude.length) cosmetic.genericEx.push([p.selector, exclude]);
      else cosmetic.generic.push(p.selector);
      return;
    }
    // network
    if (p.action.type === 'allow') counts.exceptions++;
    else counts.network++;
    if (optimize && p.domainOnly) {
      const key = `${p.action.type}|${p.priority}`;
      if (!buckets.has(key)) buckets.set(key, { action: p.action, priority: p.priority, domains: new Set(), line: idx + 1 });
      buckets.get(key).domains.add(p.domainOnly);
      return;
    }
    if (p.special === 'removeparam' && !Object.keys(p.condition).some((k) => k !== 'resourceTypes')) {
      globalParams.add(p.param); // không điều kiện riêng → gộp thành một quy tắc
      return;
    }
    const id = nextId++;
    rules.push({ id, priority: p.priority, action: p.action, condition: p.condition });
    ruleLine[id] = idx + 1;
  });

  if (globalParams.size) {
    const id = nextId++;
    rules.push({
      id,
      priority: PRIORITY.block,
      action: { type: 'redirect', redirect: { transform: { queryTransform: { removeParams: [...globalParams] } } } },
      condition: { resourceTypes: ALL_TYPES },
    });
    ruleLine[id] = 0;
  }

  for (const b of buckets.values()) {
    const all = [...b.domains];
    for (let i = 0; i < all.length; i += chunk) {
      const id = nextId++;
      rules.push({
        id,
        priority: b.priority,
        action: b.action,
        condition: { requestDomains: all.slice(i, i + chunk) },
      });
      ruleLine[id] = b.line;
    }
  }

  cosmetic.generic = [...new Set(cosmetic.generic)];
  return { rules, ruleLine, cosmetic, scriptlets, errors, counts };
}

/** Các selector cần ẩn cho một hostname. */
export function resolveCosmetic(c, host, { generic = true } = {}) {
  if (!c) return [];
  const chain = hostChain(host);
  const except = new Set(c.hostEx?.['*'] ?? []);
  for (const h of chain) for (const s of c.hostEx?.[h] ?? []) except.add(s);
  const out = new Set();
  if (generic) {
    for (const s of c.generic ?? []) out.add(s);
    for (const [s, ex] of c.genericEx ?? []) if (!chain.some((h) => ex.includes(h))) out.add(s);
  }
  for (const h of chain) for (const s of c.hosts?.[h] ?? []) out.add(s);
  return [...out].filter((s) => !except.has(s));
}

/** Các scriptlet áp dụng cho một hostname: [[tên, ...đối số], ...] */
export function resolveScriptlets(sc, host) {
  if (!sc) return [];
  const chain = hostChain(host);
  const ex = [];
  for (const h of ['*', ...chain]) for (const e of sc.hostEx?.[h] ?? []) ex.push(e);
  const blockAll = ex.some((e) => !e.length);
  if (blockAll) return [];
  const exKeys = new Set(ex.map((e) => JSON.stringify(e)));
  const out = [];
  for (const g of sc.generic ?? []) if (!g.ex || !chain.some((h) => g.ex.includes(h))) out.push(g.e);
  for (const h of chain) for (const e of sc.hosts?.[h] ?? []) out.push(e);
  return out.filter((e) => !exKeys.has(JSON.stringify(e)));
}
