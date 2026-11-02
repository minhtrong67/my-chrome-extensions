importScripts('shared/core.js');

/* ---------- storage of detected media (per tab, session) ---------- */
const BLOCK_HOST = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|googlevideo\.com)$/i;
const VIDEO_EXT = /\.(mp4|webm|mkv|mov|m4v|flv|avi|ogv|m3u8)(\?|#|$)/i;
const SEGMENT = /\.(m4s|ts|aac|vtt|srt)(\?|#|$)|[\/_-](seg|segment|chunk|frag)[\w-]*\d/i;
const key = id => `m${id}`;
const tkey = id => `t${id}`;
// Facebook/Instagram CDN serve one file as many byte-range requests: strip them to get a single full-file URL
function normUrl(u) {
  try {
    const x = new URL(u);
    if (x.searchParams.has('bytestart') || x.searchParams.has('byteend')) {
      x.searchParams.delete('bytestart'); x.searchParams.delete('byteend'); return x.href;
    }
  } catch {}
  return u;
}
// DASH audio-only tracks (cannot be played alone as a video) are skipped
function isAudioOnly(u) {
  try {
    const e = new URL(u).searchParams.get('efg'); if (!e) return false;
    const j = atob(e.replace(/-/g, '+').replace(/_/g, '/'));
    return /audio/i.test((j.match(/"vencode_tag":"([^"]*)"/) || [])[1] || '');
  } catch { return false; }
}

let q = Promise.resolve();
function enqueue(fn) { const p = q.then(fn); q = p.catch(() => {}); return p; }

async function getList(tabId) { const r = await chrome.storage.session.get(key(tabId)); return r[key(tabId)] || []; }
function dir(u) { try { const x = new URL(u); return x.origin + x.pathname.replace(/[^/]*$/, ''); } catch { return u; } }

function addItem(tabId, item) {
  return enqueue(async () => {
    const list = await getList(tabId);
    const idx = list.findIndex(i => i.url === item.url);
    if (idx >= 0) {                                   // already known: just mark as most recent
      const [old] = list.splice(idx, 1);
      old.ts = item.ts; old.size = Math.max(old.size || 0, item.size || 0);
      list.unshift(old);
    } else {
      if (item.kind === 'hls' && list.some(i => i.kind === 'hls' && item.url.startsWith(dir(i.url)))) return; // variant of a known master
      list.unshift(item);
    }
    list.length = Math.min(list.length, 20);
    await chrome.storage.session.set({ [key(tabId)]: list });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#6750A4' });
    chrome.action.setBadgeText({ tabId, text: String(list.length) });
  });
}
function clearTab(tabId) {
  return enqueue(async () => {
    await chrome.storage.session.remove([key(tabId), tkey(tabId)]);
    chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
  });
}
chrome.tabs.onRemoved.addListener(clearTab);
chrome.tabs.onUpdated.addListener((id, info) => { if (info.status === 'loading' && info.url) clearTab(id); });

/* ---------- sniff network responses ---------- */
chrome.webRequest.onResponseStarted.addListener(d => {
  if (d.tabId < 0) return;
  try {
    const host = new URL(d.url).hostname;
    if (BLOCK_HOST.test(host)) return;
    if (d.initiator && BLOCK_HOST.test(new URL(d.initiator).hostname)) return;
  } catch { return; }
  const h = n => ((d.responseHeaders || []).find(x => x.name.toLowerCase() === n) || {}).value || '';
  const url = normUrl(d.url);
  if (isAudioOnly(url)) return;
  const mime = h('content-type').split(';')[0].trim().toLowerCase();
  const isHls = /mpegurl/.test(mime) || /\.m3u8(\?|#|$)/i.test(d.url);
  const generic = mime === 'application/octet-stream' || mime === 'binary/octet-stream';
  const isFile = (mime.startsWith('video/') && mime !== 'video/mp2t') || mime === 'application/mp4' || mime === 'application/x-mp4' || (generic && VIDEO_EXT.test(d.url));
  if (!isHls && !isFile) return;
  let size = parseInt(h('content-length'), 10) || 0;
  const cr = h('content-range').match(/\/(\d+)$/);
  if (cr) size = parseInt(cr[1], 10);
  if (!isHls && (SEGMENT.test(d.url) || (size && size < 200 * 1024))) return;
  addItem(d.tabId, { url, kind: isHls ? 'hls' : 'file', mime, size: isHls ? 0 : size, ts: Date.now() });
}, { urls: ['<all_urls>'], types: ['media', 'xmlhttprequest', 'other'] }, ['responseHeaders']);

/* ---------- downloads ---------- */
const sanitize = s => String(s).replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '');
function cleanFolder(f) {
  return String(f || '').split(/[\\/]+/).map(sanitize).filter(p => p && p !== '..').join('/');
}
async function baseName(tabId) {
  let title = '';
  try { title = (await chrome.tabs.get(tabId)).title || ''; } catch {}
  return sanitize(title).slice(0, 80) || 'video';
}
async function saveFile(url, name, S) {
  const folder = cleanFolder(S.folder);
  try {
    const id = await chrome.downloads.download({ url, filename: folder ? `${folder}/${name}` : name, saveAs: !!S.askWhere, conflictAction: 'uniquify' });
    return { ok: true, id };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

// choose the best source for the video the user means
function choose(list, srcs, tabUrl) {
  const set = new Set((srcs || []).map(normUrl));
  const own = list.find(i => set.has(i.url));
  if (own) return own;
  const page = list.filter(i => i.page);
  if (page.length) {                                  // links from the page data (video + sound in one file)
    const vid = ((tabUrl || '').match(/(?:reel\/|reels\/|videos\/|\/p\/|\/tv\/|\/status\/|\/video\/|[?&]v=)([A-Za-z0-9_-]{5,})/) || [])[1];
    const pool = (vid && page.filter(i => i.vid === vid)) || [];
    const arr = pool.length ? pool : page;
    const newest = Math.max(...arr.map(i => i.ts));
    const grp = arr.filter(i => newest - i.ts < 3000);
    return grp.sort((a, b) => ((b.q === 'hd') - (a.q === 'hd')) || ((b.b || 0) - (a.b || 0)))[0];
  }
  return list.find(i => !i.meta) || list[0];
}
const jobs = new Map();          // jobId -> { tabId, base, S }
const blobDownloads = new Map(); // downloadId -> jobId

async function ensureOffscreen() {
  const ctx = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (ctx.length) return;
  await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['BLOBS'], justification: 'Assemble HLS segments into one downloadable file' });
}
function toTab(job, payload) { if (job && job.tabId >= 0) chrome.tabs.sendMessage(job.tabId, { type: 'progress', ...payload }).catch(() => {}); }

// many CDNs refuse downloads without a Referer from the page: add one for requests made by the extension itself
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
        condition: { requestDomains: [dom], tabIds: [chrome.tabs.TAB_ID_NONE], resourceTypes: ['other', 'xmlhttprequest'] } }]
    });
  } catch {}
}
async function startDownload(item, tabId) {
  const S = await getSettings();
  const tabUrl = (await chrome.tabs.get(tabId).catch(() => ({}))).url || '';
  await setReferer(item.url, tabUrl);
  const base = item.page ? (item.site || 'video') + (item.vid ? '-' + item.vid : '') : await baseName(tabId);
  if (item.kind === 'hls') {
    const jobId = crypto.randomUUID();
    jobs.set(jobId, { tabId, base, S });
    await ensureOffscreen();
    chrome.runtime.sendMessage({ target: 'offscreen', type: 'hls-start', jobId, url: item.url }).catch(() => {});
    return { ok: true, hls: true, jobId };
  }
  return saveFile(item.url, `${base}.${extOf(item)}`, S);
}

chrome.downloads.onChanged.addListener(async delta => {
  const jobId = blobDownloads.get(delta.id);
  if (!jobId || !delta.state) return;
  if (delta.state.current === 'complete' || delta.state.current === 'interrupted') {
    toTab(jobs.get(jobId), { jobId, state: delta.state.current === 'complete' ? 'saved' : 'error' });
    chrome.runtime.sendMessage({ target: 'offscreen', type: 'revoke', jobId }).catch(() => {});
    blobDownloads.delete(delta.id); jobs.delete(jobId);
    if (!jobs.size) chrome.offscreen.closeDocument().catch(() => {});
  }
});

/* ---------- messages ---------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target === 'offscreen') return;
  const tabId = msg.tabId ?? (sender.tab && sender.tab.id);

  if (msg.type === 'report' && sender.tab) {
    try { if (BLOCK_HOST.test(new URL(sender.tab.url).hostname)) return; } catch {}
    for (const url of msg.urls) {
      addItem(sender.tab.id, { url, kind: /\.m3u8(\?|#|$)/i.test(url) ? 'hls' : 'file', mime: '', size: 0, ts: Date.now(), meta: msg.meta ? true : undefined });
    }
    return;
  }
  if (msg.type === 'thumb' && sender.tab && msg.thumb) { enqueue(() => chrome.storage.session.set({ [tkey(sender.tab.id)]: msg.thumb })); return; }
  if (msg.type === 'pagesrc' && sender.tab) {
    for (const it of (msg.items || [])) {
      if (it && typeof it.url === 'string' && /^https:\/\//.test(it.url))
        addItem(sender.tab.id, { url: it.url, kind: 'file', mime: 'video/mp4', size: 0, ts: Date.now(), page: true, site: String(it.site || 'video').replace(/[^\w-]/g, ''), vid: String(it.vid || ''), q: it.q === 'hd' ? 'hd' : 'sd', b: +it.b || 0 });
    }
    return;
  }
  if (msg.type === 'getMedia') {
    enqueue(async () => {
      const list = await getList(tabId);
      const tabUrl = (await chrome.tabs.get(tabId).catch(() => ({}))).url || '';
      const best = choose(list, [], tabUrl);
      return { items: best ? [best, ...list.filter(i => i !== best)] : list, thumb: (await chrome.storage.session.get(tkey(tabId)))[tkey(tabId)] || '' };
    }).then(sendResponse);
    return true;
  }
  if (msg.type === 'download') {
    (async () => {
      let item = msg.item;
      if (msg.pick) {                                  // the video the user clicked: its own source, else the most recent one
        if (msg.thumb) chrome.storage.session.set({ [tkey(tabId)]: msg.thumb });
        const list = await enqueue(() => getList(tabId));
        const tabUrl = (await chrome.tabs.get(tabId).catch(() => ({}))).url || '';
        item = choose(list, msg.srcs, tabUrl) || (msg.srcs && msg.srcs[0] && { url: msg.srcs[0], kind: /\.m3u8/i.test(msg.srcs[0]) ? 'hls' : 'file', mime: '' });
        if (!item) return { ok: false, error: 'none' };
      }
      return startDownload(item, tabId);
    })().then(sendResponse);
    return true;
  }

  const job = jobs.get(msg.jobId);
  if (msg.type === 'hls-progress') toTab(job, { jobId: msg.jobId, state: 'running', pct: msg.pct });
  if (msg.type === 'hls-error') {
    toTab(job, { jobId: msg.jobId, state: 'error', error: msg.error });
    jobs.delete(msg.jobId);
    if (!jobs.size) chrome.offscreen.closeDocument().catch(() => {});
  }
  if (msg.type === 'hls-done' && job) {
    saveFile(msg.blobUrl, `${job.base}.${msg.ext}`, job.S).then(r => {
      if (r.ok) blobDownloads.set(r.id, msg.jobId);
      else { toTab(job, { jobId: msg.jobId, state: 'error', error: r.error }); jobs.delete(msg.jobId); }
    });
  }
});
