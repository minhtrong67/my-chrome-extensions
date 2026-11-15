importScripts('shared/common.js');
const { DEFAULTS, buildFilename, dirname, migrate } = DLA;

chrome.runtime.onInstalled.addListener((d) => {
  if (d.reason === 'install') chrome.runtime.openOptionsPage();
});
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

/* ---- wait for a download to finish ---- */
const waiting = new Map();
chrome.downloads.onChanged.addListener((delta) => {
  const w = waiting.get(delta.id);
  if (!w) return;
  const state = delta.state && delta.state.current;
  if (state === 'complete') { waiting.delete(delta.id); w.resolve(); }
  else if (state === 'interrupted') {
    waiting.delete(delta.id);
    w.reject(new Error((delta.error && delta.error.current) || 'interrupted'));
  }
});
function waitFor(id) {
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    chrome.downloads.search({ id }).then(([it]) => {
      if (!it) return;
      if (it.state === 'complete') { waiting.delete(id); resolve(); }
      else if (it.state === 'interrupted') { waiting.delete(id); reject(new Error(it.error || 'interrupted')); }
    });
  });
}

/* ---- helpers ---- */
const pad = (n, w = 2) => String(n).padStart(w, '0');

function nameFromUrl(url) {
  try {
    const u = new URL(url);
    let n = decodeURIComponent(u.pathname.split('/').pop() || 'image');
    if (!/\.[A-Za-z0-9]{2,5}$/.test(n)) n += '.png';
    return n;
  } catch { return 'image.png'; }
}

async function handleDownload({ meta, urls }, tabId) {
  const settings = migrate(await chrome.storage.sync.get(DEFAULTS));
  const total = urls.length;
  const d = new Date(meta.timestamp || Date.now());
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}`;
  const width = Math.max(2, String(total).length);

  let done = 0, failed = 0, firstId = null, folder = '';
  const notify = () => {
    if (tabId == null) return;
    chrome.tabs.sendMessage(tabId, { type: 'dla:progress', done: done + failed, total }).catch(() => {});
  };

  const queue = urls.map((url, i) => ({ url, index: i + 1 }));
  const worker = async () => {
    while (queue.length) {
      const it = queue.shift();
      try {
        const filename = buildFilename(settings.filenameTemplate, {
          user: meta.user || 'discord',
          messageId: meta.messageId || '',
          date, time,
          index: pad(it.index, width),
          name: nameFromUrl(it.url)
        }, settings.subfolder);
        if (!folder) folder = dirname(filename);
        const id = await chrome.downloads.download({
          url: it.url, filename, conflictAction: 'uniquify', saveAs: false
        });
        if (firstId == null) firstId = id;
        await waitFor(id);
        done++;
      } catch (e) {
        failed++;
      }
      notify();
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return { done, failed, total, firstId, folder };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;
  if (msg.type === 'dla:download') {
    handleDownload(msg, sender.tab && sender.tab.id)
      .then(sendResponse)
      .catch(() => sendResponse({ done: 0, failed: msg.urls.length, total: msg.urls.length, firstId: null, folder: '' }));
    return true;
  }
  if (msg.type === 'dla:show' && msg.id != null) chrome.downloads.show(msg.id);
});
