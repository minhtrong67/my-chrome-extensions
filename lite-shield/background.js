import { compile, resolveCosmetic, hostChain, PRIORITY } from './shared/filters.js';
import { buildScheme } from './shared/theme.js';
import { toSelectorChunks } from './shared/selector.js';
import { BASE, SOURCES } from './shared/sources.js';

// Phân vùng ID của quy tắc động (mỗi vùng do một chức năng quản lý).
const ID = { siteAllow: 1, domainAllow: 5000, user: 10000, ads: 100000, trackers: 200000, end: 300000 };
const RULESET_IDS = ['ads', 'trackers', 'annoyances'];
const UPDATABLE = ['ads', 'trackers'];

const DEFAULT_SETTINGS = {
  theme: { hue: 150, mode: 'auto' },
  rulesets: { ads: true, trackers: true, annoyances: false },
  genericCosmetic: true,
  autoUpdate: true,
  scriptlets: { youtube: true },
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
  const d = await chrome.storage.local.get(['settings', 'userFilters', 'disabledSites', 'allowedDomains', 'compiled', 'updateInfo']);
  const s = d.settings ?? {};
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      ...s,
      theme: { ...DEFAULT_SETTINGS.theme, ...s.theme },
      rulesets: { ...DEFAULT_SETTINGS.rulesets, ...s.rulesets },
      scriptlets: { ...DEFAULT_SETTINGS.scriptlets, ...s.scriptlets },
    },
    userFilters: d.userFilters ?? '',
    disabledSites: d.disabledSites ?? [],
    allowedDomains: d.allowedDomains ?? [],
    compiled: d.compiled ?? null,
    updateInfo: d.updateInfo ?? null,
  };
}

// Dữ liệu ẩn phần tử dựng sẵn; nếu đã cập nhật danh sách thì dùng bản mới.
let builtinPromise;
const loadBuiltin = () =>
  (builtinPromise ??= (async () => {
    const { updateInfo, updCosmetic } = await chrome.storage.local.get(['updateInfo', 'updCosmetic']);
    const base = await fetch(chrome.runtime.getURL('rulesets/cosmetic.json')).then((r) => r.json()).catch(() => ({ ads: null, annoyances: null }));
    return updateInfo && updCosmetic ? { ...base, ads: updCosmetic } : base;
  })());

let genericPromise;
const loadGeneric = () =>
  (genericPromise ??= fetch(chrome.runtime.getURL('rulesets/generic.json')).then((r) => r.json()).catch(() => ({ ads: [], annoyances: [] })));

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
    await replaceRange(ID.trackers, ID.end, settings.rulesets.trackers ? updRules?.trackers ?? [] : []);
  });

async function applyRulesets(settings, updateInfo) {
  const enabled = new Set(await chrome.declarativeNetRequest.getEnabledRulesets());
  const enable = [];
  const disable = [];
  for (const id of RULESET_IDS) {
    // Đã cập nhật → quy tắc động thay thế ruleset tĩnh tương ứng.
    const want = !!settings.rulesets[id] && !(UPDATABLE.includes(id) && updateInfo);
    if (want && !enabled.has(id)) enable.push(id);
    if (!want && enabled.has(id)) disable.push(id);
  }
  if (enable.length || disable.length)
    await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: enable, disableRulesetIds: disable });
}

// ---------- CSS ẩn phần tử chung + scriptlet: đăng ký như content script ----------
const SCRIPT_IDS = ['generic-ads', 'generic-annoyances', 'scriptlet-youtube'];

const syncScripts = () =>
  serial(async () => {
    const { settings, disabledSites } = await getData();
    const want = new Map();
    if (settings.genericCosmetic) {
      for (const key of ['ads', 'annoyances']) if (settings.rulesets[key]) want.set(`generic-${key}`, { css: [`rulesets/generic-${key}.css`] });
    }
    if (settings.scriptlets.youtube) {
      want.set('scriptlet-youtube', {
        js: ['scriptlets/youtube.js'],
        world: 'MAIN',
        matches: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'],
      });
    }
    const excludeMatches = disabledSites.map((h) => `*://*.${h}/*`);
    const have = new Set((await chrome.scripting.getRegisteredContentScripts()).map((x) => x.id));

    const drop = SCRIPT_IDS.filter((id) => have.has(id) && !want.has(id));
    if (drop.length) await chrome.scripting.unregisterContentScripts({ ids: drop });

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
        excludeMatches,
      };
      if (have.has(id)) await chrome.scripting.updateContentScripts([script]);
      else await chrome.scripting.registerContentScripts([script]);
    }
  });

// ---------- tự cập nhật danh sách ----------
let updating = false;
async function updateLists() {
  if (updating) return { error: 'Đang cập nhật…' };
  updating = true;
  try {
    const text = {};
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
    if (ads.rules.length < 50 || trackers.rules.length < 50) throw new Error('Danh sách tải về có vẻ không hợp lệ');

    const prev = await chrome.storage.local.get(['updateInfo', 'updRules', 'updCosmetic']);
    const updateInfo = { at: Date.now(), ads: ads.rules.length, trackers: trackers.rules.length, cosmetic: cos.counts.cosmetic };
    await chrome.storage.local.set({ updRules: { ads: ads.rules, trackers: trackers.rules }, updCosmetic: cos.cosmetic, updateInfo });
    try {
      await syncListRules();
    } catch (e) {
      // Chrome từ chối (vd. vượt giới hạn) → khôi phục trạng thái cũ.
      await chrome.storage.local.set(prev);
      if (!prev.updateInfo) await chrome.storage.local.remove(['updateInfo', 'updRules', 'updCosmetic']);
      await syncListRules().catch(() => {});
      throw e;
    }
    builtinPromise = undefined;
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
  const scheme = buildScheme(settings.theme.hue, false);
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

chrome.runtime.onInstalled.addListener(async (details) => {
  // Bản trước 0.2.1 mặc định màu tím (hue 295): chuyển sang xanh lá mới nếu người dùng chưa tự đổi.
  if (details.reason === 'update') {
    const { settings } = await chrome.storage.local.get('settings');
    if (settings?.theme?.hue === 295) await chrome.storage.local.set({ settings: { ...settings, theme: { ...settings.theme, hue: 150 } } });
  }
  init();
  chrome.contextMenus.removeAll(() =>
    chrome.contextMenus.create({ id: 'ls-pick', title: 'Lite Shield: Chọn & ẩn phần tử…', contexts: ['page', 'frame', 'link', 'image', 'video', 'selection'] }),
  );
});
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
chrome.webNavigation.onBeforeNavigate.addListener((d) => {
  if (d.frameId !== 0) return;
  logBuf.delete(d.tabId);
  chrome.storage.session.remove([`hidden:${d.tabId}`, `log:${d.tabId}`]);
  chrome.storage.session.set({ [`nav:${d.tabId}`]: Date.now() });
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

chrome.webRequest.onErrorOccurred.addListener(
  (d) => {
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
  },
  { urls: ['<all_urls>'] },
);

// ---------- xử lý thông điệp ----------
async function handle(msg, sender) {
  switch (msg?.type) {
    case 'cosmetic': {
      const topHost = hostOf(sender.tab?.url);
      const host = msg.host || topHost;
      if (!host) return { chunks: [] };
      const d = await getData();
      if (isDisabled(d.disabledSites, topHost || host)) return { chunks: [] };
      const b = await loadBuiltin();
      const out = new Set();
      // Selector chung của danh sách dựng sẵn đã nằm trong CSS tĩnh → chỉ lấy selector riêng theo trang.
      if (d.settings.rulesets.ads) resolveCosmetic(b.ads, host, { generic: false }).forEach((s) => out.add(s));
      if (d.settings.rulesets.annoyances) resolveCosmetic(b.annoyances, host, { generic: false }).forEach((s) => out.add(s));
      resolveCosmetic(d.compiled?.cosmetic, host).forEach((s) => out.add(s));
      const res = { chunks: toSelectorChunks([...out]) };
      // Frame trên cùng cũng nhận các nhóm chung để đếm số phần tử đã ẩn.
      if (msg.top && d.settings.genericCosmetic) {
        const g = await loadGeneric();
        res.countChunks = [...(d.settings.rulesets.ads ? g.ads : []), ...(d.settings.rulesets.annoyances ? g.annoyances : [])];
      }
      return res;
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
      return { host, supported: !!host, enabled: !!host && !isDisabled(d.disabledSites, host), blocked, hidden, hiddenByMe: mine };
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

    case 'set-site-enabled': {
      const d = await getData();
      const set = new Set(d.disabledSites);
      if (msg.enabled) hostChain(msg.host).forEach((h) => set.delete(h));
      else set.add(msg.host);
      await chrome.storage.local.set({ disabledSites: [...set] });
      await rebuildDynamic();
      await syncScripts();
      return { ok: true };
    }

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
      await applyRulesets(settings, d.updateInfo);
      await syncListRules();
      await syncScripts();
      await syncAlarm(settings);
      await applyBadge(settings);
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
      return { mode: settings.theme.mode, light: buildScheme(settings.theme.hue, false), dark: buildScheme(settings.theme.hue, true) };
    }

    default:
      return { error: 'unknown message' };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg, sender).then(sendResponse, (e) => sendResponse({ error: String(e?.message || e) }));
  return true;
});
