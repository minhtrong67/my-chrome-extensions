/* Download queue (service worker) */
importScripts('shared/defaults.js', 'shared/i18n.js', 'shared/naming.js');

const Q = { queue: [], active: new Map(), total: 0, done: 0, failed: 0, running: false, cancelled: false, ctx: {}, settings: null };
const waiters = new Map(); // downloadId -> {resolve}
let keepAlive = null;
let pending = 0;
let metaChain = Promise.resolve();

const status = () => ({ running: Q.running, total: Q.total, done: Q.done, failed: Q.failed, cancelled: Q.cancelled });

function broadcast() {
  chrome.runtime.sendMessage({ type: 'dd-progress', ...status() }).catch(() => {});
  const remaining = Q.total - Q.done - Q.failed;
  chrome.action.setBadgeBackgroundColor({ color: '#4557a7' });
  chrome.action.setBadgeText({ text: Q.running && remaining > 0 ? String(remaining) : '' });
}

// post metadata (artist/character/copyright) only when the templates need it; 1 request per ~350 ms
function fetchMeta(item) {
  const job = metaChain.then(async () => {
    try {
      const res = await fetch(`${item.origin}/posts/${item.id}.json`, { credentials: 'include' });
      if (!res.ok) return null;
      const j = await res.json();
      const pick = (s) => String(s || '').split(' ').filter(Boolean).slice(0, 2).join('+');
      return { artist: pick(j.tag_string_artist), character: pick(j.tag_string_character), copyright: pick(j.tag_string_copyright) };
    } catch { return null; }
  });
  metaChain = job.then(() => new Promise((r) => setTimeout(r, 350)));
  return job;
}

function waitFor(downloadId) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { waiters.delete(downloadId); resolve(false); }, 10 * 60 * 1000);
    waiters.set(downloadId, { resolve: (ok) => { clearTimeout(timer); resolve(ok); } });
    // the download may already have finished before the listener was registered
    chrome.downloads.search({ id: downloadId }).then((r) => {
      const st = r[0] && r[0].state, w = waiters.get(downloadId);
      if (w && (st === 'complete' || st === 'interrupted')) { waiters.delete(downloadId); w.resolve(st === 'complete'); }
    }).catch(() => {});
  });
}

async function startDownload(item, attempt = 0) {
  const s = Q.settings;
  const meta = DD.needsMeta(s.filenameTemplate, s.saveFolder) ? await fetchMeta(item) : null;
  const filename = DD.buildPath(s, item, Q.ctx, meta);
  let id;
  try {
    id = await chrome.downloads.download({ url: item.url, filename, saveAs: false, conflictAction: s.conflict === 'overwrite' ? 'overwrite' : 'uniquify' });
  } catch (e) {
    return false;
  }
  Q.active.set(item.id, id);
  const ok = await waitFor(id);
  Q.active.delete(item.id);
  if (!ok && !Q.cancelled && attempt < 1) return startDownload(item, attempt + 1);
  return ok;
}

function pump() {
  while (!Q.cancelled && pending < Q.settings.concurrency && Q.queue.length) {
    const item = Q.queue.shift();
    pending++;
    startDownload(item).then((ok) => {
      pending--;
      if (Q.cancelled) return;
      ok ? Q.done++ : Q.failed++;
      broadcast();
      pump();
    });
  }
  if (!Q.cancelled && Q.queue.length === 0 && pending === 0 && Q.running) finish();
}

async function finish() {
  Q.running = false;
  clearInterval(keepAlive);
  broadcast();
  const t = DD.makeT(Q.settings.lang);
  const text = t('popup.done', { ok: Q.done, fail: Q.failed });
  if (Q.settings.notifyDone) {
    chrome.notifications.create('dd-done', { type: 'basic', iconUrl: 'icons/icon128.png', title: t('app.name'), message: text });
  }
  if (Q.settings.openFolderDone && Q.done > 0) chrome.downloads.showDefaultFolder();
  chrome.action.setBadgeBackgroundColor({ color: '#2e7d32' });
  chrome.action.setBadgeText({ text: '✓' });
  setTimeout(() => { if (!Q.running) chrome.action.setBadgeText({ text: '' }); }, 6000);
}

chrome.downloads.onChanged.addListener((delta) => {
  const w = waiters.get(delta.id);
  if (!w || !delta.state) return;
  if (delta.state.current === 'complete') { waiters.delete(delta.id); w.resolve(true); }
  else if (delta.state.current === 'interrupted') { waiters.delete(delta.id); w.resolve(false); }
});

async function enqueue(items, ctx) {
  const settings = await DD.getSettings();
  if (!Q.running) {
    Object.assign(Q, { queue: [], total: 0, done: 0, failed: 0, cancelled: false, running: true });
    pending = 0;
    keepAlive = setInterval(() => chrome.runtime.getPlatformInfo(() => {}), 20000);
  }
  Q.settings = settings;
  Q.ctx = ctx || {};
  items.forEach((it, i) => Q.queue.push({ ...it, index: Q.total + i + 1 }));
  Q.total += items.length;
  broadcast();
  pump();
}

function cancelAll() {
  Q.cancelled = true;
  Q.queue = [];
  for (const [, id] of Q.active) chrome.downloads.cancel(id).catch(() => {});
  Q.active.clear();
  waiters.forEach((w) => w.resolve(false));
  waiters.clear();
  Q.running = false;
  pending = 0;
  clearInterval(keepAlive);
  chrome.action.setBadgeText({ text: '' });
  chrome.runtime.sendMessage({ type: 'dd-progress', ...status() }).catch(() => {});
}

chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'dd-download') { enqueue(msg.items || [], msg.ctx).then(() => send({ ok: true })); return true; }
  if (msg.type === 'dd-cancel') { cancelAll(); send({ ok: true }); }
  if (msg.type === 'dd-status') send(status());
});
