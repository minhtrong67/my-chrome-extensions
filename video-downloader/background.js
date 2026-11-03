importScripts('shared/core.js', 'shared/logic.js');

const BLOCK_HOST = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|googlevideo\.com)$/i;
const VIDEO_EXT = /\.(mp4|webm|mkv|mov|m4v|flv|avi|ogv|m3u8)(\?|#|$)/i;
const SEGMENT = /\.(m4s|ts|aac|vtt|srt)(\?|#|$)|[\/_-](seg|segment|chunk|frag)[\w-]*\d/i;
const key = id => `m${id}`, tkey = id => `t${id}`, akey = id => `a${id}`;

/* ---------- detected media per tab (session storage) ---------- */
let q = Promise.resolve();
function enqueue(fn) { const p = q.then(fn); q = p.catch(() => {}); return p; }
async function getList(tabId) { const r = await chrome.storage.session.get(key(tabId)); return r[key(tabId)] || []; }
function dir(u) { try { const x = new URL(u); return x.origin + x.pathname.replace(/[^/]*$/, ''); } catch { return u; } }

function keyOf(i) {                       // same video served from other hosts / with other tokens = same key
  if (i.page && i.vid) return `p:${i.site}:${i.vid}:${i.q}`;
  try { return 'u:' + new URL(i.url).pathname; } catch { return 'x:' + i.url; }
}
function addItem(tabId, item) {
  return enqueue(async () => {
    const list = await getList(tabId);
    const k = keyOf(item), idx = list.findIndex(i => keyOf(i) === k);
    if (idx >= 0) {
      const old = list[idx];
      if (item.ts - old.ts < 4000 && (!item.page || old.url === item.url)) return;     // no storage write for every range request
      old.ts = item.ts; old.size = Math.max(old.size || 0, item.size || 0);
      if (item.page) old.url = item.url;                                               // newest signed link
    } else {
      if (item.kind === 'hls' && list.some(i => i.kind === 'hls' && item.url.startsWith(dir(i.url)))) return; // variant of a known master
      list.unshift({ ...item, t0: item.ts });
    }
    list.length = Math.min(list.length, 40);
    await chrome.storage.session.set({ [key(tabId)]: list });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#6750A4' });
    chrome.action.setBadgeText({ tabId, text: String(list.filter(i => !i.audio).length) });
  });
}
function clearTab(tabId) {
  return enqueue(async () => {
    await chrome.storage.session.remove([key(tabId), tkey(tabId), akey(tabId)]);
    chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
  });
}
chrome.tabs.onRemoved.addListener(clearTab);
chrome.tabs.onUpdated.addListener((id, info) => { if (info.status === 'loading' && info.url) clearTab(id); });

/* ---------- sniff network responses ---------- */
chrome.webRequest.onResponseStarted.addListener(d => {
  if (d.tabId < 0) return;
  try {
    if (BLOCK_HOST.test(new URL(d.url).hostname)) return;
    if (d.initiator && BLOCK_HOST.test(new URL(d.initiator).hostname)) return;
  } catch { return; }
  const h = n => ((d.responseHeaders || []).find(x => x.name.toLowerCase() === n) || {}).value || '';
  const url = normUrl(d.url);
  const mime = h('content-type').split(';')[0].trim().toLowerCase();
  const isHls = /mpegurl/.test(mime) || /\.m3u8(\?|#|$)/i.test(d.url);
  const generic = mime === 'application/octet-stream' || mime === 'binary/octet-stream';
  const audio = !isHls && (isAudioOnly(url) || mime.startsWith('audio/'));
  const isFile = !audio && ((mime.startsWith('video/') && mime !== 'video/mp2t') || mime === 'application/mp4' || mime === 'application/x-mp4' || (generic && VIDEO_EXT.test(d.url)));
  if (!isHls && !audio && !isFile) return;
  let size = parseInt(h('content-length'), 10) || 0;
  const cr = h('content-range').match(/\/(\d+)$/);
  if (cr) size = parseInt(cr[1], 10);
  if (!isHls && (SEGMENT.test(d.url) || (size && size < (audio ? 20 : 200) * 1024))) return;
  addItem(d.tabId, {
    url, kind: isHls ? 'hls' : 'file', mime, size: isHls ? 0 : size, ts: Date.now(),
    audio: audio || undefined, vonly: (!audio && !isHls && isVideoOnly(url)) || undefined
  });
}, { urls: ['<all_urls>'], types: ['media', 'xmlhttprequest', 'other'] }, ['responseHeaders']);

/* ---------- Referer for requests made by the extension itself (many CDNs refuse downloads without it) ---------- */
async function setReferer(url, tabUrl) {
  try {
    const host = new URL(url).hostname, ref = new URL(tabUrl).origin + '/';
    if (!/^https?:/.test(ref)) return;
    const p = host.split('.');
    const dom = p.length >= 3 && p[p.length - 2].length <= 3 ? p.slice(-3).join('.') : p.slice(-2).join('.');
    let id = 0; for (const c of dom) id = (id * 31 + c.charCodeAt(0)) >>> 0;
    id = (id % 2000000000) + 1;
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [id],
      addRules: [{ id, priority: 1, action: { type: 'modifyHeaders', requestHeaders: [{ header: 'referer', operation: 'set', value: ref }] },
        condition: { requestDomains: [dom], tabIds: [chrome.tabs.TAB_ID_NONE], resourceTypes: ['other', 'xmlhttprequest', 'media'] } }]
    });
  } catch {}
}

/* ---------- offscreen document (HLS assembling, muxing with ffmpeg.wasm, thumbnails) ---------- */
let offP = null, busy = 0, closeT = 0;
async function ensureOffscreen() {
  clearTimeout(closeT);
  const ctx = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (ctx.length) return;
  if (!offP) offP = chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['BLOBS', 'WORKERS'], justification: 'Assemble and merge video streams into one file, make thumbnails' }).finally(() => { offP = null; });
  await offP;
}
function scheduleClose() {
  clearTimeout(closeT);
  closeT = setTimeout(() => { if (!jobs.size && !busy) chrome.offscreen.closeDocument().catch(() => {}); }, 20000);
}
const toOff = m => chrome.runtime.sendMessage({ target: 'offscreen', ...m }).catch(() => {});

/* ---------- jobs ---------- */
const jobs = new Map();   // jobId -> { tabId, base, site, S, flash, dlId, timer, blob }
function emit(jobId, p) {
  const job = jobs.get(jobId), m = { type: 'job', jobId, ...p };
  if (job) job.last = { state: p.state, pct: p.pct, downloadId: p.downloadId };
  chrome.runtime.sendMessage(m).catch(() => {});
  if (job && job.tabId >= 0) chrome.tabs.sendMessage(job.tabId, { ...m, flash: !!job.flash }).catch(() => {});
}
function finish(jobId, p) {
  const job = jobs.get(jobId); if (!job) return;
  clearInterval(job.timer);
  emit(jobId, p);
  if (job.blob) toOff({ type: 'revoke', jobId });
  jobs.delete(jobId); scheduleClose();
}
function track(jobId, dlId) {
  const job = jobs.get(jobId); if (!job) return;
  job.dlId = dlId;
  job.timer = setInterval(async () => {
    const [d] = await chrome.downloads.search({ id: dlId });
    if (!d) return finish(jobId, { state: 'error', error: 'MISSING' });
    if (d.state === 'complete') finish(jobId, { state: 'saved', downloadId: dlId, noAudio: job.noAudio });
    else if (d.state === 'interrupted') finish(jobId, { state: 'error', error: d.error || 'FAILED' });
    else emit(jobId, { state: 'save', downloadId: dlId, pct: d.totalBytes > 0 ? Math.round(d.bytesReceived / d.totalBytes * 100) : -1 });
  }, 700);
}
async function saveFile(url, name, job) {
  const folder = [cleanFolder(job.S.folder), job.S.siteFolder ? sanitize(job.site) : ''].filter(Boolean).join('/');
  try {
    const id = await chrome.downloads.download({ url, filename: folder ? `${folder}/${name}` : name, saveAs: !!job.S.askWhere, conflictAction: 'uniquify' });
    return { ok: true, id };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

async function startDownload(item, tabId, flash = false) {
  const S = await getSettings();
  const tab = await chrome.tabs.get(tabId).catch(() => ({}));
  const tabUrl = tab.url || '';
  await setReferer(item.url, tabUrl);
  const jobId = crypto.randomUUID();
  const site = item.site || siteOf(tabUrl);
  const job = { tabId, S, site, flash, url: item.url, base: buildName(S, item, tab.title || '', tabUrl) };
  jobs.set(jobId, job);

  if (item.kind === 'hls') {
    await ensureOffscreen();
    toOff({ type: 'hls-start', jobId, url: item.url });
    return { ok: true, jobId, hls: true };
  }
  if (item.vonly) {                                           // video-only track: find its sound track and merge
    const list = await getList(tabId);
    const twins = list.filter(i => i.audio && Math.abs(i.ts - item.ts) < 30000).sort((a, b) => Math.abs(a.ts - item.ts) - Math.abs(b.ts - item.ts));
    if (twins.length) {
      for (const t of twins.slice(0, 3)) await setReferer(t.url, tabUrl);
      await ensureOffscreen();
      toOff({ type: 'mux-start', jobId, videoUrl: item.url, audioUrls: twins.slice(0, 3).map(t => t.url) });
      return { ok: true, jobId, hls: true };
    }
  }
  const r = await saveFile(item.url, `${job.base}.${extOf(item)}`, job);
  if (!r.ok) { jobs.delete(jobId); return r; }
  track(jobId, r.id);
  return { ok: true, jobId };
}

async function downloadBest(tabId, srcs = []) {
  const flashTab = (k, kind) => chrome.tabs.sendMessage(tabId, { type: 'flash', key: k, kind }).catch(() => {});
  const S = await getSettings();
  const list = await enqueue(() => getList(tabId));
  const tab = await chrome.tabs.get(tabId).catch(() => ({}));
  const item = choose(list, srcs, tab.url || '', '', S.quality) || (srcs[0] && /^https?:/.test(srcs[0]) ? { url: srcs[0], kind: /\.m3u8/i.test(srcs[0]) ? 'hls' : 'file', mime: '' } : null);
  if (!item) return flashTab('noSource', 'err');
  const r = await startDownload(item, tabId, true);
  flashTab(r.ok ? 'started' : 'failed', r.ok ? 'ok' : 'err');
}

/* ---------- context menu + keyboard shortcut ---------- */
async function setupMenu() {
  const S = await getSettings();
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: 'vdl', title: tr(S.lang, 'ctxDownload'), contexts: ['video', 'page'] });
}
chrome.runtime.onInstalled.addListener(setupMenu);
chrome.runtime.onStartup.addListener(setupMenu);
chrome.storage.onChanged.addListener((c, area) => { if (area === 'local' && c.lang) setupMenu(); });
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'vdl' && tab) downloadBest(tab.id, info.srcUrl ? [info.srcUrl] : []);
});
chrome.commands.onCommand.addListener(async cmd => {
  if (cmd !== 'download-current') return;
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (t) downloadBest(t.id);
});

/* ---------- thumbnails ---------- */
const thumbMem = new Map();
async function thumbOf(url, tabId) {
  if (thumbMem.has(url)) return thumbMem.get(url);
  busy++;
  try {
    const tab = await chrome.tabs.get(tabId).catch(() => ({}));
    await setReferer(url, tab.url || '');
    await ensureOffscreen();
    const r = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'thumb', url });
    if (r && r.thumb) thumbMem.set(url, r.thumb);
    return (r && r.thumb) || '';
  } catch { return ''; } finally { busy--; scheduleClose(); }
}

/* ---------- thumbnails captured from the page (per video) ---------- */
function saveThumb(tabId, m) {
  return enqueue(async () => {
    let arr = (await chrome.storage.session.get(tkey(tabId)))[tkey(tabId)];
    if (!Array.isArray(arr)) arr = [];
    const srcs = (m.srcs || []).map(normUrl).slice(0, 5);
    arr = arr.filter(t => !((m.vid && t.vid === m.vid) || t.srcs.some(s => srcs.includes(s))));
    arr.unshift({ thumb: m.thumb, vid: m.vid || '', srcs, ts: Date.now() });
    arr.length = Math.min(arr.length, 14);
    await chrome.storage.session.set({ [tkey(tabId)]: arr });
  });
}

/* ---------- messages ---------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target === 'offscreen') return;
  const tabId = msg.tabId ?? (sender.tab && sender.tab.id);

  if (msg.type === 'report' && sender.tab) {
    try { if (BLOCK_HOST.test(new URL(sender.tab.url).hostname)) return; } catch {}
    for (const url of msg.urls) addItem(sender.tab.id, { url, kind: /\.m3u8(\?|#|$)/i.test(url) ? 'hls' : 'file', mime: '', size: 0, ts: Date.now(), meta: msg.meta ? true : undefined });
    return;
  }
  if (msg.type === 'pagesrc' && sender.tab) {
    for (const it of (msg.items || [])) {
      if (it && typeof it.url === 'string' && /^https:\/\//.test(it.url))
        addItem(sender.tab.id, { url: it.url, kind: 'file', mime: 'video/mp4', size: 0, ts: Date.now(), page: true, site: String(it.site || 'video').replace(/[^\w-]/g, ''), vid: String(it.vid || ''), q: it.q === 'hd' ? 'hd' : 'sd', b: +it.b || 0 });
    }
    return;
  }
  if (msg.type === 'thumb' && sender.tab && msg.thumb) { saveThumb(sender.tab.id, msg); return; }
  if (msg.type === 'active' && sender.tab) { enqueue(() => chrome.storage.session.set({ [akey(sender.tab.id)]: { vid: msg.vid || '', srcs: (msg.srcs || []).slice(0, 5), ts: Date.now() } })); return; }
  if (msg.type === 'thumb-of') { thumbOf(msg.url, tabId).then(thumb => sendResponse({ thumb })); return true; }

  if (msg.type === 'getMedia') {
    (async () => {
      const S = await getSettings();
      const list = await enqueue(() => getList(tabId));
      const tabUrl = (await chrome.tabs.get(tabId).catch(() => ({}))).url || '';
      const act = (await chrome.storage.session.get(akey(tabId)))[akey(tabId)] || {};
      const best = choose(list, act.srcs || [], tabUrl, act.vid || '', S.quality);
      const shown = list.filter(i => !i.audio).sort((x, y) => (y.t0 || y.ts) - (x.t0 || x.ts));    // stable order: first seen = last
      const thumbs = (await chrome.storage.session.get(tkey(tabId)))[tkey(tabId)];
      return { items: best ? [best, ...shown.filter(i => i !== best)] : shown, thumbs: Array.isArray(thumbs) ? thumbs : [] };
    })().then(sendResponse);
    return true;
  }
  if (msg.type === 'download') {
    (async () => {
      let item = msg.item;
      if (msg.pick) {                                    // the video the user clicked
        if (msg.thumb) saveThumb(tabId, { thumb: msg.thumb, vid: msg.vid, srcs: msg.srcs });
        const S = await getSettings();
        const list = await enqueue(() => getList(tabId));
        const tabUrl = (await chrome.tabs.get(tabId).catch(() => ({}))).url || '';
        item = choose(list, msg.srcs, tabUrl, msg.vid, S.quality) ||
          (msg.srcs && /^https?:/.test(msg.srcs[0] || '') ? { url: msg.srcs[0], kind: /\.m3u8/i.test(msg.srcs[0]) ? 'hls' : 'file', mime: '' } : null);
        if (!item) return { ok: false, error: 'none' };
      }
      return startDownload(item, tabId);
    })().then(sendResponse);
    return true;
  }
  if (msg.type === 'jobs') { sendResponse([...jobs].filter(([, j]) => j.tabId === tabId).map(([jobId, j]) => ({ jobId, url: j.url, ...(j.last || { state: 'prepare', pct: 0 }) }))); return; }
  if (msg.type === 'cancel') {
    const job = jobs.get(msg.jobId);
    if (job) {
      if (job.dlId != null) chrome.downloads.cancel(job.dlId).catch(() => {});
      else toOff({ type: 'cancel', jobId: msg.jobId });
      finish(msg.jobId, { state: 'error', error: 'USER_CANCELED' });
    }
    return;
  }

  /* results coming from the offscreen document */
  const job = jobs.get(msg.jobId);
  if (!job) return;
  if (msg.type === 'job-progress') emit(msg.jobId, { state: 'prepare', pct: msg.pct });
  else if (msg.type === 'job-error') finish(msg.jobId, { state: 'error', error: msg.error });
  else if (msg.type === 'job-done') {
    job.blob = true; job.noAudio = !!msg.noAudio;
    saveFile(msg.blobUrl, `${job.base}.${msg.ext}`, job).then(r => {
      if (r.ok) track(msg.jobId, r.id); else finish(msg.jobId, { state: 'error', error: r.error });
    });
  }
});
