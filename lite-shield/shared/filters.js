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
const HOSTS_RE = /^(?:0\.0\.0\.0|127\.0\.0\.1)\s+([a-z0-9][a-z0-9.-]*\.[a-z0-9-]+)$/i;

export const PRIORITY = { block: 1, allow: 2, important: 3, domainAllow: 900, siteAllow: 1000 };

export function emptyCosmetic() {
  return { generic: [], genericEx: [], hosts: {}, hostEx: {} };
}

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
  for (const raw of str.split(sep)) {
    let d = raw.trim().toLowerCase();
    if (!d || d.includes('*') || d.includes('/')) continue;
    if (d.startsWith('~')) {
      d = d.slice(1);
      if (d) exclude.push(d);
    } else include.push(d);
  }
  return { include, exclude };
}

function parseCosmetic(line, m) {
  const [, domainStr, op, selector] = m;
  if (op !== '##' && op !== '#@#') return { kind: 'error', msg: 'Bộ lọc thủ tục (#?#, #$#, #%#) chưa được hỗ trợ' };
  const sel = selector.trim();
  if (!sel) return { kind: 'error', msg: 'Selector trống' };
  if (/[{}\n]/.test(sel)) return { kind: 'error', msg: 'Selector chứa ký tự không hợp lệ' };
  if (sel.startsWith('+js(')) return { kind: 'error', msg: 'Scriptlet (+js) chưa được hỗ trợ' };
  if (PROCEDURAL_RE.test(sel)) return { kind: 'error', msg: 'Toán tử thủ tục (:has-text, :xpath…) chưa được hỗ trợ' };
  return {
    kind: 'cosmetic',
    exception: op === '#@#',
    domains: parseDomainList(domainStr, ','),
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

  for (const o of optStr ? optStr.split(',') : []) {
    const neg = o.startsWith('~');
    const body = neg ? o.slice(1) : o;
    const eq = body.indexOf('=');
    const key = (eq < 0 ? body : body.slice(0, eq)).toLowerCase();
    const val = eq < 0 ? '' : body.slice(eq + 1);

    if (key === 'third-party' || key === '3p') condition.domainType = neg ? 'firstParty' : 'thirdParty';
    else if (key === 'first-party' || key === '1p') condition.domainType = neg ? 'thirdParty' : 'firstParty';
    else if (key === 'domain' || key === 'from') {
      const { include, exclude } = parseDomainList(val, '|');
      if (include.length) condition.initiatorDomains = include;
      if (exclude.length) condition.excludedInitiatorDomains = exclude;
    } else if (key === 'important') {
      if (!exception) priority = PRIORITY.important;
    } else if (key === 'match-case') condition.isUrlFilterCaseSensitive = true;
    else if (TYPE_MAP[key]) (neg ? notTypes : types).add(TYPE_MAP[key]);
    else return { kind: 'error', msg: `Tuỳ chọn chưa hỗ trợ: ${key}` };
  }

  let action = { type: exception ? 'allow' : 'block' };
  if (exception && types.has('main_frame')) {
    action = { type: 'allowAllRequests' };
    types.clear();
    types.add('main_frame');
    types.add('sub_frame');
  }
  if (types.size) {
    const list = [...types].filter((t) => !notTypes.has(t));
    if (!list.length) return { kind: 'error', msg: 'Loại tài nguyên mâu thuẫn' };
    condition.resourceTypes = list;
  } else if (notTypes.size) condition.excludedResourceTypes = [...notTypes];

  if (isRegex) condition.regexFilter = pattern.slice(1, -1);
  else if (pattern === '' || pattern === '*') {
    if (!condition.initiatorDomains && !condition.resourceTypes) return { kind: 'error', msg: 'Mẫu URL trống' };
  } else {
    if (!/^[\x21-\x7e]+$/.test(pattern)) return { kind: 'error', msg: 'Mẫu URL phải là ASCII, không có khoảng trắng' };
    condition.urlFilter = pattern;
  }

  const domainOnly =
    !optStr && !isRegex && DOMAIN_ONLY_RE.exec(pattern) && action.type !== 'allowAllRequests' ? DOMAIN_ONLY_RE.exec(pattern)[1].toLowerCase() : null;

  return { kind: 'network', action, priority, condition, domainOnly };
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
  const counts = { network: 0, exceptions: 0, cosmetic: 0 };
  let nextId = startId;

  const lines = String(text || '').split(/\r?\n/);
  lines.forEach((line, idx) => {
    const p = parseLine(line);
    if (p.kind === 'empty') return;
    if (p.kind === 'error') {
      errors.push({ line: idx + 1, text: line.trim(), msg: p.msg });
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
    const id = nextId++;
    rules.push({ id, priority: p.priority, action: p.action, condition: p.condition });
    ruleLine[id] = idx + 1;
  });

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
  return { rules, ruleLine, cosmetic, errors, counts };
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
