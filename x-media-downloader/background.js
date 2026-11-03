importScripts('src/shared.js');
const { DEFAULTS, buildFilename, slimMedia } = XMD;

const MAX_ACTIVE = 3;       // số tệp tải đồng thời tối đa
const LOG_MAX = 60;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const notify = (tabId, msg) => { if (tabId != null) chrome.tabs.sendMessage(tabId, msg).catch(() => {}); };

chrome.runtime.onInstalled.addListener((d) => { if (d.reason === 'install') chrome.runtime.openOptionsPage(); });
chrome.commands.onCommand.addListener((cmd, tab) => {
  if (cmd === 'download-media' && tab && tab.id != null) notify(tab.id, { type: 'trigger' });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === 'fetchTweet') return sendResponse(await fetchSyndication(msg.id));
    if (msg.type === 'download') return sendResponse(await doDownload(msg.jobs, sender.tab && sender.tab.id, msg.tid));
    if (msg.type === 'log') { await log({ level: msg.level, code: msg.code, tweetId: msg.tweetId }); return sendResponse(true); }
    sendResponse(null);
  })().catch((e) => sendResponse({ ok: false, error: String(e) }));
  return true;
});

// ---------- nhật ký ----------
async function log(entry) {
  try {
    const { log: arr = [] } = await chrome.storage.local.get('log');
    arr.unshift({ ts: Date.now(), ...entry });
    await chrome.storage.local.set({ log: arr.slice(0, LOG_MAX) });
  } catch (_) { /* bỏ qua */ }
}

// ---------- theo dõi lượt tải (lưu ở storage.session để sống sót khi service worker ngủ) ----------
const getDl = async () => (await chrome.storage.session.get('dl')).dl || {};
const setDl = (dl) => chrome.storage.session.set({ dl });
async function addDl(id, meta) {
  const dl = await getDl();
  const now = Date.now();
  for (const k in dl) if (dl[k].ts < now - 15 * 60 * 1000) delete dl[k];
  dl[id] = { ...meta, ts: now };
  await setDl(dl);
}

async function activeCount() {
  const dl = await getDl();
  const ids = new Set(Object.keys(dl).map(Number));
  const running = await chrome.downloads.search({ state: 'in_progress' });
  return running.filter((d) => ids.has(d.id)).length;
}
async function waitSlot() {
  const t0 = Date.now();
  while (Date.now() - t0 < 120000 && (await activeCount()) >= MAX_ACTIVE) await sleep(400);
}

// ---------- tra cứu dự phòng: API syndication công khai ----------
function fromSyndication(j, id) {
  return {
    id: id || j.id_str || '',
    screenName: (j.user && j.user.screen_name) || '',
    name: (j.user && j.user.name) || '',
    text: j.text || '',
    createdAt: j.created_at || '',
    quotedId: (j.quoted_tweet && j.quoted_tweet.id_str) || '',
    media: (j.mediaDetails || []).map(slimMedia).filter(Boolean)
  };
}
async function fetchSyndication(id) {
  try {
    const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
    const r = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token}`);
    if (!r.ok) { await log({ level: 'warning', code: 'LOOKUP', tweetId: id }); return null; }
    const j = await r.json();
    const tw = fromSyndication(j, id);
    if (j.quoted_tweet) tw.quoted = fromSyndication(j.quoted_tweet);
    return tw;
  } catch (_) {
    await log({ level: 'warning', code: 'LOOKUP', tweetId: id });
    return null;
  }
}

// ---------- tải xuống ----------
function photoInfo(u) {
  const m = u.match(/^(.*)\.(\w+)(?:\?.*)?$/);
  if (!m) return { url: u, ext: 'jpg', base: 'media' };
  const ext = m[2] === 'jpeg' ? 'jpg' : m[2];
  return { url: `${m[1]}?format=${ext}&name=orig`, ext, base: m[1].split('/').pop() };
}
const urlFor = (m, thumb) => (thumb ? photoInfo(m.thumb) : m.type === 'photo' ? photoInfo(m.url) : { url: m.url });

async function dl(url, filename, fallback) {
  try {
    return await chrome.downloads.download({ url, filename, conflictAction: 'uniquify', saveAs: false });
  } catch (_) {
    return chrome.downloads.download({ url, filename: fallback, conflictAction: 'uniquify', saveAs: false });
  }
}

const recent = new Map();

// jobs: [{ tweet, only: [chỉ số 1-based] | null }]
async function doDownload(jobs, tabId, tid) {
  if (!Array.isArray(jobs) || !jobs.length) return { ok: false, count: 0 };
  const key = jobs.map((j) => `${j.tweet.id}:${(j.only || []).join(',')}`).join('|');
  const now = Date.now();
  if ((recent.get(key) || 0) > now - 3000) return { ok: true, count: 0, dup: true };
  recent.set(key, now);
  if (recent.size > 50) for (const [k, v] of recent) if (v < now - 10000) recent.delete(k);

  const s = await chrome.storage.sync.get(DEFAULTS);
  let count = 0;
  for (const { tweet: tw, only } of jobs) {
    for (let i = 0; i < tw.media.length; i++) {
      const index = i + 1;
      if (only && !only.includes(index)) continue;
      const m = tw.media[i];
      const p = m.type === 'photo' ? photoInfo(m.url)
        : { url: m.url, ext: 'mp4', base: (m.url.split('?')[0].split('/').pop() || 'video').replace(/\.\w+$/, '') };
      const base = buildFilename(s.filenameTemplate, {
        username: tw.screenName, name: tw.name, tweetId: tw.id, index, createdAt: tw.createdAt,
        text: tw.text, type: m.type, filename: p.base
      });
      const fb = `${tw.id}-${index}`;
      const files = [{ url: p.url, name: `${base}.${p.ext}`, fb: `${fb}.${p.ext}`, thumb: false }];
      if (m.type !== 'photo' && s.downloadThumbnail && m.thumb) {
        const th = photoInfo(m.thumb);
        files.push({ url: th.url, name: `${base}-thumb.${th.ext}`, fb: `${fb}-thumb.${th.ext}`, thumb: true });
      }
      for (const f of files) {
        await waitSlot();
        const id = await dl(f.url, f.name, f.fb);
        await addDl(id, { tweetId: tw.id, index, thumb: f.thumb, filename: f.name, fallback: f.fb, tabId, tid, retried: false });
        count++;
      }
    }
  }
  if (count && tid && tabId != null) trackProgress(tid, tabId, count);
  return { ok: count > 0, count };
}

// Báo tiến độ về nút trên trang (poll nhẹ, kết thúc khi mọi lượt tải xong/lỗi)
async function trackProgress(tid, tabId, total) {
  const t0 = Date.now();
  while (Date.now() - t0 < 10 * 60 * 1000) {
    await sleep(500);
    const dl = await getDl();
    const mine = Object.entries(dl).filter(([, m]) => m.tid === tid);
    let partial = 0;
    for (const [id] of mine) {
      const [it] = await chrome.downloads.search({ id: Number(id) });
      if (it && it.totalBytes > 0) partial += it.bytesReceived / it.totalBytes;
    }
    const done = total - mine.length;
    notify(tabId, { type: 'progress', tid, pct: Math.min(1, (done + partial) / total), done: mine.length === 0 });
    if (mine.length === 0) return;
  }
}

chrome.downloads.onChanged.addListener(async (d) => {
  const st = d.state && d.state.current;
  if (st !== 'complete' && st !== 'interrupted') return;
  const dl = await getDl();
  const meta = dl[d.id];
  if (!meta) return;
  delete dl[d.id];
  await setDl(dl);
  if (st === 'complete') return;

  const [item] = await chrome.downloads.search({ id: d.id });
  const code = (item && item.error) || (d.error && d.error.current) || 'UNKNOWN';
  if (code === 'USER_CANCELED') { await log({ level: 'info', code, tweetId: meta.tweetId, index: meta.index }); return; }

  // Hết hạn / lỗi mạng: làm mới liên kết bằng API dự phòng và thử lại đúng một lần
  if (!meta.retried && /^(SERVER_|NETWORK_)/.test(code)) {
    const fresh = await fetchSyndication(meta.tweetId);
    const m = fresh && fresh.media && fresh.media[meta.index - 1];
    if (m) {
      try {
        const id = await dl_(urlFor(m, meta.thumb).url, meta.filename, meta.fallback);
        await addDl(id, { ...meta, retried: true });
        await log({ level: 'info', code: 'RETRY_OK', tweetId: meta.tweetId, index: meta.index });
        return;
      } catch (_) { /* rơi xuống lỗi cuối */ }
    }
  }
  await log({ level: 'error', code, tweetId: meta.tweetId, index: meta.index });
  notify(meta.tabId, { type: 'dlFailed' });
});
const dl_ = dl;
