import { compile, resolveCosmetic, hostChain, PRIORITY } from './shared/filters.js';
import { schemeFor, nearestColorKey } from './shared/theme.js';
import { toSelectorChunks } from './shared/selector.js';
import { BASE, SOURCES, EXTRA } from './shared/sources.js';
import { translate } from './shared/i18n.js';

// Phân vùng ID của quy tắc động (mỗi vùng do một chức năng quản lý).
const ID = { siteAllow: 1, domainAllow: 5000, user: 10000, ads: 100000, trackers: 200000, vn: 300000, end: 400000 };
const RULESET_IDS = ['ads', 'trackers', 'vn', 'ubo', 'annoyances', 'adguard'];
const UPDATABLE = ['ads', 'trackers', 'vn']; // được thay bằng quy tắc động sau khi cập nhật
const COSMETIC_KEYS = ['ads', 'vn', 'ubo', 'annoyances', 'adguard'];
const SCRIPTLET_LISTS = ['ubo', 'vn', 'adguard'];

const DEFAULT_SETTINGS = {
  theme: { color: 'green', mode: 'auto' },
  rulesets: { ads: true, trackers: true, vn: true, ubo: true, annoyances: false, adguard: false },
  genericCosmetic: true,
  autoUpdate: true,
  scriptlets: { youtube: true, lists: true },
  language: 'vi',
  fontSize: 'medium',
  fontFamily: 'system',
};

// ---------- tiện ích ----------
const hostOf = (url) => {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? u.hostname.toLowerCase() : '';
  } catch {
    return '';
  }
};
const isDisabled = (sites, host) => hostChain(host).some((h) => sites.includes(h));

// Một hàng đợi duy nhất cho mọi thay đổi quy tắc động / script đăng ký → không đua dữ liệu.
let queue = Promise.resolve();
const serial = (fn) => (queue = queue.catch(() => {}).then(fn));

function chain(fn) {
  let p = Promise.resolve();
  return (...a) => (p = p.catch(() => {}).then(() => fn(...a)));
}

async function getData() {
  const d = await chrome.storage.local.get(['settings', 'userFilters', 'disabledSites', 'basicSites', 'allowedDomains', 'compiled', 'updateInfo']);
  const s = d.settings ?? {};
  // Cài đặt cũ lưu màu theo hue → đổi sang màu Material gần nhất.
  const theme = { ...s.theme };
  if (theme.color == null && theme.hue != null) theme.color = theme.hue === 295 ? 'green' : nearestColorKey(theme.hue);
  delete theme.hue;
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      ...s,
      theme: { ...DEFAULT_SETTINGS.theme, ...theme },
      rulesets: { ...DEFAULT_SETTINGS.rulesets, ...s.rulesets },
      scriptlets: { ...DEFAULT_SETTINGS.scriptlets, ...s.scriptlets },
    },
    userFilters: d.userFilters ?? '',
    disabledSites: d.disabledSites ?? [],
    basicSites: d.basicSites ?? [],
    allowedDomains: d.allowedDomains ?? [],
    compiled: d.compiled ?? null,
    updateInfo: d.updateInfo ?? null,
  };
}

// Dữ liệu ẩn phần tử dựng sẵn theo từng danh sách (nạp khi cần); nếu đã cập nhật thì dùng bản mới.
const cosmeticCache = new Map();
const loadCosmetic = (key) => {
  if (!cosmeticCache.has(key))
    cosmeticCache.set(
      key,
      (async () => {
        const { updateInfo, updCosmetic } = await chrome.storage.local.get(['updateInfo', 'updCosmetic']);
        const upd = updCosmetic?.hosts ? { ads: updCosmetic } : updCosmetic; // định dạng cũ: chỉ có "ads"
        if (updateInfo && upd?.[key]) return upd[key];
        return fetch(chrome.runtime.getURL(`rulesets/cosmetic-${key}.json`)).then((r) => r.json()).catch(() => null);
      })(),
    );
  return cosmeticCache.get(key);
};

let genericPromise;
const loadGeneric = () =>
  (genericPromise ??= fetch(chrome.runtime.getURL('rulesets/generic.json')).then((r) => r.json()).catch(() => ({})));

// Token class/id của selector chung (ví dụ ".ad-banner", "#top-ad"): content.js chỉ hỏi những token thật sự có trên trang.
const tokenCache = new Map();
const loadTokens = (key) => {
  if (!tokenCache.has(key))
    tokenCache.set(key, fetch(chrome.runtime.getURL(`rulesets/generic-${key}.tokens.json`)).then((r) => r.json()).then((a) => new Set(a)).catch(() => new Set()));
  return tokenCache.get(key);
};

const isBasicOrOff = (d, host) => isDisabled(d.disabledSites, host) || isDisabled(d.basicSites, host);

// ---------- quy tắc động theo vùng ID ----------
async function replaceRange(lo, hi, addRules) {
  const dnr = chrome.declarativeNetRequest;
  const removeRuleIds = (await dnr.getDynamicRules()).filter((r) => r.id >= lo && r.id < hi).map((r) => r.id);
  await dnr.updateDynamicRules({ removeRuleIds, addRules });
}

const rebuildDynamic = () =>
  serial(async () => {
    const { userFilters, disabledSites, allowedDomains } = await getData();
    const res = compile(userFilters, { startId: ID.user, optimize: true });

    const site = disabledSites.slice(0, ID.domainAllow - ID.siteAllow - 1).map((h, i) => ({
      id: ID.siteAllow + i,
      priority: PRIORITY.siteAllow,
      action: { type: 'allowAllRequests' },
      condition: { requestDomains: [h], resourceTypes: ['main_frame', 'sub_frame'] },
    }));
    const domain = allowedDomains.slice(0, ID.user - ID.domainAllow - 1).map((h, i) => ({
      id: ID.domainAllow + i,
      priority: PRIORITY.domainAllow,
      action: { type: 'allow' },
      condition: { requestDomains: [h] },
    }));
    await replaceRange(ID.siteAllow, ID.domainAllow, site);
    await replaceRange(ID.domainAllow, ID.user, domain);

    const ruleErrors = [];
    try {
      await replaceRange(ID.user, ID.ads, res.rules);
    } catch {
      // Có quy tắc bị Chrome từ chối → thêm lần lượt để tìm ra quy tắc lỗi.
      await replaceRange(ID.user, ID.ads, []);
      for (const r of res.rules) {
        try {
          await chrome.declarativeNetRequest.updateDynamicRules({ addRules: [r] });
        } catch (e) {
          ruleErrors.push({ line: res.ruleLine[r.id] ?? 0, text: '', msg: String(e.message || e).replace(/^.*?: /, '') });
        }
      }
    }
    const compiled = { cosmetic: res.cosmetic, errors: [...res.errors, ...ruleErrors], counts: res.counts };
    await chrome.storage.local.set({ compiled });
    return compiled;
  });

// Quy tắc của danh sách đã cập nhật (nếu có) theo các công tắc bật/tắt.
const syncListRules = () =>
  serial(async () => {
    const { settings } = await getData();
    const { updRules } = await chrome.storage.local.get('updRules');
    await replaceRange(ID.ads, ID.trackers, settings.rulesets.ads ? updRules?.ads ?? [] : []);
    await replaceRange(ID.trackers, ID.vn, settings.rulesets.trackers ? updRules?.trackers ?? [] : []);
    await replaceRange(ID.vn, ID.end, settings.rulesets.vn ? updRules?.vn ?? [] : []);
  });

async function applyRulesets(settings, updateInfo) {
  const enabled = new Set(await chrome.declarativeNetRequest.getEnabledRulesets());
  const enable = [];
  const disable = [];
  for (const id of RULESET_IDS) {
    // Đã cập nhật → quy tắc động thay thế ruleset tĩnh tương ứng.
    const want = !!settings.rulesets[id] && !(UPDATABLE.includes(id) && updateInfo?.[id] != null);
    if (want && !enabled.has(id)) enable.push(id);
    if (!want && enabled.has(id)) disable.push(id);
  }
  if (enable.length || disable.length)
    await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: enable, disableRulesetIds: disable });
  return { enable, disable };
}

// ---------- CSS ẩn phần tử chung + scriptlet: đăng ký như content script ----------
const SCRIPT_PREFIX = /^(generic-|scriptlet-|sl-)/;
const indexCache = new Map();
const loadScriptletIndex = (id) => {
  if (!indexCache.has(id)) indexCache.set(id, fetch(chrome.runtime.getURL(`scriptlets/${id}.index.json`)).then((r) => r.json()).catch(() => ({ shards: [], generic: false })));
  return indexCache.get(id);
};
const matchPattern = (d) => (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? `*://*.${d}/*` : null);
const appliedSig = new Map();

const syncScripts = (force = false) =>
  serial(async () => {
    const { settings, disabledSites, basicSites } = await getData();
    const want = new Map();
    if (settings.genericCosmetic) {
      for (const key of COSMETIC_KEYS) if (settings.rulesets[key]) want.set(`generic-${key}`, { css: [`rulesets/generic-${key}.css`] });
    }
    if (settings.scriptlets.youtube) {
      want.set('scriptlet-youtube', {
        js: ['scriptlets/youtube.js'],
        world: 'MAIN',
        matches: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'],
      });
    }
    if (settings.scriptlets.lists) {
      for (const id of SCRIPTLET_LISTS) {
        if (!settings.rulesets[id]) continue;
        const idx = await loadScriptletIndex(id);
        for (const [n, sh] of idx.shards.entries()) {
          const matches = sh.domains.map(matchPattern).filter(Boolean);
          if (matches.length) want.set(`sl-${id}-${n}`, { js: ['scriptlets/engine.js', sh.file], world: 'MAIN', matches });
        }
        if (idx.generic) want.set(`sl-${id}-generic`, { js: ['scriptlets/engine.js', `scriptlets/${id}-generic.js`], world: 'MAIN' });
      }
    }
    // Trang "tắt" và trang "chỉ chặn mạng" đều không nhận CSS ẩn phần tử và scriptlet.
    const excludeMatches = [...new Set([...disabledSites, ...basicSites])].map((h) => `*://*.${h}/*`);
    const have = new Set((await chrome.scripting.getRegisteredContentScripts()).map((x) => x.id));

    const drop = [...have].filter((id) => SCRIPT_PREFIX.test(id) && !want.has(id));
    if (drop.length) {
      await chrome.scripting.unregisterContentScripts({ ids: drop });
      drop.forEach((id) => appliedSig.delete(id));
    }

    const toAdd = [];
    const toUpdate = [];
    for (const [id, cfg] of want) {
      const script = {
        id,
        matches: ['http://*/*', 'https://*/*'],
        allFrames: true,
        matchOriginAsFallback: true,
        runAt: 'document_start',
        persistAcrossSessions: true,
        ...cfg,
        // Luôn truyền (kể cả mảng rỗng): updateContentScripts giữ giá trị cũ nếu bỏ trống.
        // Scriptlet YouTube riêng đã xử lý youtube.com đầy đủ hơn; để hai bên cùng móc một biến toàn cục sẽ giẫm chân nhau.
        excludeMatches: id.startsWith('sl-') && settings.scriptlets.youtube ? [...excludeMatches, '*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'] : excludeMatches,
      };
      const sig = JSON.stringify(script);
      if (have.has(id)) {
        if (force || appliedSig.get(id) !== sig) toUpdate.push(script);
      } else toAdd.push(script);
      appliedSig.set(id, sig);
    }
    if (toAdd.length) await chrome.scripting.registerContentScripts(toAdd);
    if (toUpdate.length) await chrome.scripting.updateContentScripts(toUpdate);
  });

// ---------- tự cập nhật danh sách ----------
let updating = false;
async function updateLists() {
  if (updating) return { error: 'busy' };
  updating = true;
  try {
    const text = {};
    const fetchText = async (url, label) => {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`${label}: HTTP ${r.status}`);
      return r.text();
    };
    text.vn = (await Promise.all(Object.entries(EXTRA.vn.files).map(([n, u]) => fetchText(u, n)))).join('\n');
    for (const [group, files] of Object.entries(SOURCES)) {
      const parts = await Promise.all(
        files.map(async (f) => {
          const r = await fetch(`${BASE}/${f}`, { cache: 'no-store' });
          if (!r.ok) throw new Error(`${f.split('/').pop()}: HTTP ${r.status}`);
          return r.text();
        }),
      );
      text[group] = parts.join('\n');
    }
    const seed = (name) => fetch(chrome.runtime.getURL(`lists/${name}.txt`)).then((r) => r.text()).catch(() => '');
    const [sAds, sTrackers, sCos] = await Promise.all([seed('ads'), seed('trackers'), seed('cosmetic-ads')]);

    const ads = compile(`${sAds}\n${text.ads}`, { startId: ID.ads, optimize: true });
    const trackers = compile(`${sTrackers}\n${text.trackers}`, { startId: ID.trackers, optimize: true });
    const cos = compile(`${sCos}\n${text['cosmetic-ads']}`);
    cos.cosmetic.generic = []; // phần chung đã nằm trong CSS tĩnh của gói cài đặt
    const vn = compile(text.vn, { startId: ID.vn, optimize: true });
    vn.cosmetic.generic = [];
    if (ads.rules.length < 50 || trackers.rules.length < 50 || vn.rules.length < 20) throw new Error('invalid-list');

    const prev = await chrome.storage.local.get(['updateInfo', 'updRules', 'updCosmetic']);
    const updateInfo = { at: Date.now(), ads: ads.rules.length, trackers: trackers.rules.length, vn: vn.rules.length, cosmetic: cos.counts.cosmetic + vn.counts.cosmetic };
    await chrome.storage.local.set({ updRules: { ads: ads.rules, trackers: trackers.rules, vn: vn.rules }, updCosmetic: { ads: cos.cosmetic, vn: vn.cosmetic }, updateInfo });
    try {
      await syncListRules();
    } catch (e) {
      // Chrome từ chối (vd. vượt giới hạn) → khôi phục trạng thái cũ.
      await chrome.storage.local.set(prev);
      if (!prev.updateInfo) await chrome.storage.local.remove(['updateInfo', 'updRules', 'updCosmetic']);
      await syncListRules().catch(() => {});
      throw e;
    }
    cosmeticCache.clear();
    tokenCache.clear();
    await applyRulesets((await getData()).settings, updateInfo);
    return { ok: true, updateInfo };
  } catch (e) {
    return { error: String(e?.message || e) };
  } finally {
    updating = false;
  }
}

async function syncAlarm(settings) {
  const cur = await chrome.alarms.get('update-lists');
  if (settings.autoUpdate && !cur) chrome.alarms.create('update-lists', { delayInMinutes: 60, periodInMinutes: 1440 });
  if (!settings.autoUpdate && cur) chrome.alarms.clear('update-lists');
}
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'update-lists') updateLists();
});

// ---------- khởi tạo ----------
async function applyBadge(settings) {
  const scheme = schemeFor(settings.theme, false);
  chrome.action.setBadgeBackgroundColor({ color: scheme.primary });
  chrome.action.setBadgeTextColor?.({ color: scheme.onPrimary });
  chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
}

async function init() {
  const data = await getData();
  await chrome.storage.local.set({ settings: data.settings });
  await applyRulesets(data.settings, data.updateInfo);
  await rebuildDynamic();
  await syncListRules();
  await syncScripts();
  await syncAlarm(data.settings);
  await applyBadge(data.settings);
}

chrome.runtime.onInstalled.addListener(async () => {
  init();
  chrome.contextMenus.removeAll(async () => {
    const { settings } = await getData();
    chrome.contextMenus.create({ id: 'ls-pick', title: translate(settings.language, 'menu.pick'), contexts: ['page', 'frame', 'link', 'image', 'video', 'selection'] });
  });
});
const syncMenuTitle = (language) => chrome.contextMenus.update('ls-pick', { title: translate(language, 'menu.pick') }).catch(() => {});
chrome.runtime.onStartup.addListener(init);

// ---------- chọn & ẩn: menu chuột phải + phím tắt ----------
const startPicker = (tabId) => chrome.scripting.executeScript({ target: { tabId }, files: ['picker.js'] }).catch(() => {});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ls-pick' && tab?.id != null) startPicker(tab.id);
});
chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'start-picker') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id != null) startPicker(tab.id);
});

// ---------- theo dõi tab ----------
// Bắt đầu điều hướng mới trong tab → xoá nhật ký/bộ đếm của trang cũ (không cần quyền webNavigation).
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status !== 'loading') return;
  logBuf.delete(tabId);
  chrome.storage.session.remove([`hidden:${tabId}`, `log:${tabId}`]);
  chrome.storage.session.set({ [`nav:${tabId}`]: Date.now() });
});
chrome.tabs.onRemoved.addListener((tabId) => {
  logBuf.delete(tabId);
  chrome.storage.session.remove([`hidden:${tabId}`, `nav:${tabId}`, `log:${tabId}`]);
});

const saveHidden = chain(async (tabId, frameId, count) => {
  const key = `hidden:${tabId}`;
  const cur = (await chrome.storage.session.get(key))[key] ?? {};
  cur[frameId] = count;
  await chrome.storage.session.set({ [key]: cur });
});

// ---------- nhật ký chặn + thống kê ----------
const logBuf = new Map(); // tabId → Map(host → {n, types:Set})
let pendingCount = 0;
let flushTimer;

const writeLog = chain(async () => {
  for (const [tabId, hosts] of [...logBuf]) {
    const key = `log:${tabId}`;
    const cur = (await chrome.storage.session.get(key))[key] ?? {};
    for (const [host, v] of hosts) {
      const e = (cur[host] ??= { n: 0, types: [] });
      e.n += v.n;
      for (const t of v.types) if (!e.types.includes(t)) e.types.push(t);
    }
    logBuf.delete(tabId);
    await chrome.storage.session.set({ [key]: cur });
  }
});

const dayKey = (t = Date.now()) => new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const writeStats = chain(async () => {
  if (!pendingCount) return;
  const add = pendingCount;
  pendingCount = 0;
  const { stats } = await chrome.storage.local.get('stats');
  const s = stats ?? { total: 0, days: {} };
  s.total += add;
  const k = dayKey();
  s.days[k] = (s.days[k] ?? 0) + add;
  const keep = Object.keys(s.days).sort().slice(-30);
  s.days = Object.fromEntries(keep.map((d) => [d, s.days[d]]));
  await chrome.storage.local.set({ stats: s });
});

const flushAll = () => Promise.all([writeLog(), writeStats()]);

// Nhật ký + thống kê cần quyền webRequest (tuỳ chọn, người dùng cấp trong popup/cài đặt).
let logAttached = false;
const onBlockedRequest = (d) => {
    if (d.error !== 'net::ERR_BLOCKED_BY_CLIENT') return;
    pendingCount++;
    if (d.tabId >= 0) {
      const host = hostOf(d.url);
      if (host) {
        const hosts = logBuf.get(d.tabId) ?? new Map();
        const e = hosts.get(host) ?? { n: 0, types: new Set() };
        e.n++;
        e.types.add(d.type);
        hosts.set(host, e);
        logBuf.set(d.tabId, hosts);
      }
    }
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flushAll, 800);
};
function setupLog() {
  if (logAttached || !chrome.webRequest?.onErrorOccurred) return;
  chrome.webRequest.onErrorOccurred.addListener(onBlockedRequest, { urls: ['<all_urls>'] });
  logAttached = true;
}
setupLog();
chrome.permissions.onAdded.addListener(setupLog);

// full = chặn đầy đủ · network = chỉ chặn mạng (tắt ẩn phần tử + scriptlet) · off = tắt hẳn
async function setSiteMode(host, mode) {
  const d = await getData();
  const off = new Set(d.disabledSites);
  const basic = new Set(d.basicSites);
  for (const h of hostChain(host)) {
    off.delete(h);
    basic.delete(h);
  }
  if (mode === 'off') off.add(host);
  if (mode === 'network') basic.add(host);
  await chrome.storage.local.set({ disabledSites: [...off], basicSites: [...basic] });
  await rebuildDynamic();
  await syncScripts();
  return { ok: true };
}

// ---------- xử lý thông điệp ----------
async function handle(msg, sender) {
  switch (msg?.type) {
    case 'cosmetic': {
      const topHost = hostOf(sender.tab?.url);
      const host = msg.host || topHost;
      if (!host) return { chunks: [] };
      const d = await getData();
      // Chỉ chặn mạng / tắt hẳn → không ẩn phần tử, kể cả selector của người dùng.
      if (isBasicOrOff(d, topHost || host)) return { chunks: [] };
      const out = new Set();
      // Selector chung của danh sách dựng sẵn đã nằm trong CSS tĩnh → chỉ lấy selector riêng theo trang.
      for (const key of COSMETIC_KEYS) {
        if (d.settings.rulesets[key]) resolveCosmetic(await loadCosmetic(key), host, { generic: false }).forEach((s) => out.add(s));
      }
      resolveCosmetic(d.compiled?.cosmetic, host).forEach((s) => out.add(s));
      const res = { chunks: toSelectorChunks([...out]), lazy: d.settings.genericCosmetic && COSMETIC_KEYS.some((k) => d.settings.rulesets[k]) };
      // Frame trên cùng cũng nhận các nhóm chung để đếm số phần tử đã ẩn.
      if (msg.top && d.settings.genericCosmetic) {
        const g = await loadGeneric();
        res.countChunks = COSMETIC_KEYS.filter((k) => d.settings.rulesets[k]).flatMap((k) => g[k] ?? []);
      }
      return res;
    }

    case 'generic-match': {
      const topHost = hostOf(sender.tab?.url);
      const d = await getData();
      if (!d.settings.genericCosmetic || !Array.isArray(msg.tokens) || (topHost && isBasicOrOff(d, topHost))) return { match: [] };
      const sets = await Promise.all(COSMETIC_KEYS.filter((k) => d.settings.rulesets[k]).map(loadTokens));
      const match = [];
      for (const t of msg.tokens.slice(0, 3000)) if (typeof t === 'string' && sets.some((s) => s.has(t))) match.push(t);
      return { match };
    }

    case 'hidden-count': {
      if (sender.tab?.id != null) await saveHidden(sender.tab.id, sender.frameId ?? 0, msg.count | 0);
      return {};
    }

    case 'get-site-state': {
      const host = hostOf(msg.url);
      const d = await getData();
      let blocked = 0;
      let hidden = 0;
      if (host && msg.tabId != null) {
        const nav = (await chrome.storage.session.get(`nav:${msg.tabId}`))[`nav:${msg.tabId}`] ?? 0;
        try {
          const r = await chrome.declarativeNetRequest.getMatchedRules({ tabId: msg.tabId, minTimeStamp: nav });
          blocked = r.rulesMatchedInfo.filter((x) => !(x.rule.rulesetId === '_dynamic' && x.rule.ruleId < ID.user)).length;
        } catch {
          /* bị giới hạn tần suất — bỏ qua */
        }
        const h = (await chrome.storage.session.get(`hidden:${msg.tabId}`))[`hidden:${msg.tabId}`] ?? {};
        hidden = Object.values(h).reduce((a, n) => a + n, 0);
      }
      const bare = host.replace(/^www\./, '');
      const mine = host ? d.userFilters.split(/\r?\n/).filter((l) => l.startsWith(`${bare}##`) || l.startsWith(`${host}##`)).length : 0;
      const off = isDisabled(d.disabledSites, host);
      const mode = off ? 'off' : isDisabled(d.basicSites, host) ? 'network' : 'full';
      return { host, supported: !!host, enabled: !!host && !off, mode, blocked, hidden, hiddenByMe: mine };
    }

    case 'get-log': {
      await flushAll();
      const d = await getData();
      const key = `log:${msg.tabId}`;
      const cur = (await chrome.storage.session.get(key))[key] ?? {};
      const entries = Object.entries(cur)
        .map(([host, v]) => ({ host, n: v.n, types: v.types, allowed: isDisabled(d.allowedDomains, host) }))
        .sort((a, b) => b.n - a.n);
      return { entries };
    }

    case 'set-domain-allowed': {
      const d = await getData();
      const set = new Set(d.allowedDomains);
      if (msg.allowed) set.add(String(msg.domain).toLowerCase());
      else hostChain(msg.domain).forEach((h) => set.delete(h));
      await chrome.storage.local.set({ allowedDomains: [...set] });
      await rebuildDynamic();
      return { ok: true, allowedDomains: [...set] };
    }

    case 'get-stats': {
      await writeStats();
      const { stats } = await chrome.storage.local.get('stats');
      const s = stats ?? { total: 0, days: {} };
      return { total: s.total, today: s.days[dayKey()] ?? 0 };
    }

    case 'reset-stats': {
      await chrome.storage.local.set({ stats: { total: 0, days: {} } });
      return { ok: true };
    }

    case 'update-lists':
      return await updateLists();

    case 'set-site-enabled':
      return await setSiteMode(msg.host, msg.enabled ? 'full' : 'off');

    case 'set-site-mode':
      return await setSiteMode(msg.host, msg.mode);

    case 'get-report': {
      const d = await getData();
      const host = hostOf(msg.url);
      const enabledRs = Object.entries(d.settings.rulesets).filter(([, v]) => v).map(([k]) => k);
      let matched = [];
      try {
        const r = await chrome.declarativeNetRequest.getMatchedRules({ tabId: msg.tabId });
        const by = {};
        for (const x of r.rulesMatchedInfo) by[`${x.rule.rulesetId}#${x.rule.ruleId}`] = (by[`${x.rule.rulesetId}#${x.rule.ruleId}`] ?? 0) + 1;
        matched = Object.entries(by).slice(0, 40).map(([k, n]) => `${k}${n > 1 ? ` ×${n}` : ''}`);
      } catch {
        /* giới hạn tần suất */
      }
      const key = `log:${msg.tabId}`;
      const log = (await chrome.storage.session.get(key))[key] ?? {};
      const blocked = Object.entries(log).sort((a, b) => b[1].n - a[1].n).slice(0, 20).map(([h, v]) => `${h} ×${v.n}`);
      const mode = isDisabled(d.disabledSites, host) ? 'off' : isDisabled(d.basicSites, host) ? 'network' : 'full';
      const text = [
        `Lite Shield ${chrome.runtime.getManifest().version} — ${host || '(n/a)'}`,
        `Chrome: ${navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] ?? '?'}`,
        `Chế độ trang: ${mode}`,
        `Danh sách bật: ${enabledRs.join(', ')}`,
        `Scriptlet: youtube=${d.settings.scriptlets.youtube} lists=${d.settings.scriptlets.lists}; ẩn phần tử chung=${d.settings.genericCosmetic}`,
        `Quy tắc đã khớp (ruleset#id): ${matched.join(', ') || '—'}`,
        `Tên miền bị chặn: ${blocked.join(', ') || '— (nhật ký tắt hoặc trống)'}`,
      ].join('\n');
      return { text };
    }

    case 'log-status':
      return { granted: !!chrome.webRequest?.onErrorOccurred, attached: logAttached };

    case 'start-picker': {
      await chrome.scripting.executeScript({ target: { tabId: msg.tabId }, files: ['picker.js'] });
      return { ok: true };
    }

    case 'add-filter': {
      const d = await getData();
      const line = `${msg.host}##${msg.selector}`;
      if (!d.userFilters.split(/\r?\n/).includes(line)) {
        const text = d.userFilters.replace(/\s*$/, '') + (d.userFilters.trim() ? '\n' : '') + line + '\n';
        await chrome.storage.local.set({ userFilters: text });
        await rebuildDynamic();
      }
      return { ok: true };
    }

    case 'restore-site': {
      const d = await getData();
      const lines = d.userFilters.split(/\r?\n/);
      const kept = lines.filter((l) => !l.startsWith(`${msg.host}##`) && !l.startsWith(`www.${msg.host}##`));
      await chrome.storage.local.set({ userFilters: kept.join('\n') });
      await rebuildDynamic();
      return { removed: lines.length - kept.length };
    }

    case 'save-user-filters': {
      await chrome.storage.local.set({ userFilters: String(msg.text ?? '') });
      return await rebuildDynamic();
    }

    case 'get-options': {
      const d = await getData();
      return { ...d };
    }

    case 'set-settings': {
      const d = await getData();
      const settings = {
        ...d.settings,
        ...msg.settings,
        theme: { ...d.settings.theme, ...msg.settings?.theme },
        rulesets: { ...d.settings.rulesets, ...msg.settings?.rulesets },
        scriptlets: { ...d.settings.scriptlets, ...msg.settings?.scriptlets },
      };
      await chrome.storage.local.set({ settings });
      try {
        await applyRulesets(settings, d.updateInfo);
      } catch (e) {
        // Chrome từ chối bật ruleset (vượt giới hạn quy tắc) → hoàn tác công tắc.
        await chrome.storage.local.set({ settings: d.settings });
        await applyRulesets(d.settings, d.updateInfo).catch(() => {});
        return { error: 'ruleset-limit', detail: String(e?.message || e) };
      }
      await syncListRules();
      await syncScripts();
      await syncAlarm(settings);
      await applyBadge(settings);
      syncMenuTitle(settings.language);
      return { ok: true };
    }

    case 'set-disabled-sites': {
      await chrome.storage.local.set({ disabledSites: [...new Set(msg.sites)] });
      await rebuildDynamic();
      await syncScripts();
      return { ok: true };
    }

    case 'set-allowed-domains': {
      await chrome.storage.local.set({ allowedDomains: [...new Set(msg.domains)] });
      await rebuildDynamic();
      return { ok: true };
    }

    case 'theme-tokens': {
      const { settings } = await getData();
      return { mode: settings.theme.mode, language: settings.language, light: schemeFor(settings.theme, false), dark: schemeFor(settings.theme, true) };
    }

    default:
      return { error: 'unknown message' };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg, sender).then(sendResponse, (e) => sendResponse({ error: String(e?.message || e) }));
  return true;
});
