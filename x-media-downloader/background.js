importScripts('src/shared.js');
const { DEFAULTS, buildFilename, slimMedia } = XMD;

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
chrome.runtime.onInstalled.addListener((d) => { if (d.reason === 'install') chrome.runtime.openOptionsPage(); });
chrome.commands.onCommand.addListener((cmd, tab) => {
  if (cmd === 'download-media' && tab && tab.id != null) chrome.tabs.sendMessage(tab.id, { type: 'trigger' }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg.type === 'fetchTweet') return sendResponse(await fetchSyndication(msg.id));
    if (msg.type === 'download') return sendResponse(await doDownload(msg.tweet, msg.only));
    sendResponse(null);
  })().catch((e) => sendResponse({ ok: false, error: String(e) }));
  return true;
});

// Dự phòng: API syndication công khai (không cần đăng nhập, không có nội dung nhạy cảm)
async function fetchSyndication(id) {
  try {
    const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
    const r = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${token}`);
    if (!r.ok) return null;
    const j = await r.json();
    const media = (j.mediaDetails || []).map(slimMedia).filter(Boolean);
    if (!media.length) return null;
    return { id, screenName: j.user?.screen_name || '', name: j.user?.name || '', text: j.text || '', createdAt: j.created_at || '', media };
  } catch (_) { return null; }
}

function photoInfo(u) {
  const m = u.match(/^(.*)\.(\w+)(?:\?.*)?$/);
  if (!m) return { url: u, ext: 'jpg', base: 'media' };
  const ext = m[2] === 'jpeg' ? 'jpg' : m[2];
  return { url: `${m[1]}?format=${ext}&name=orig`, ext, base: m[1].split('/').pop() };
}

async function dl(url, filename, fallback) {
  try {
    return await chrome.downloads.download({ url, filename, conflictAction: 'uniquify', saveAs: false });
  } catch (_) {
    return chrome.downloads.download({ url, filename: fallback, conflictAction: 'uniquify', saveAs: false });
  }
}

async function doDownload(tw, only) {
  const s = await chrome.storage.sync.get(DEFAULTS);
  let count = 0;
  for (let i = 0; i < tw.media.length; i++) {
    const index = i + 1;
    if (only && index !== only) continue;
    const m = tw.media[i];
    const isPhoto = m.type === 'photo';
    const p = isPhoto ? photoInfo(m.url) : { url: m.url, ext: 'mp4', base: (m.url.split('?')[0].split('/').pop() || 'video').replace(/\.\w+$/, '') };
    const base = buildFilename(s.filenameTemplate, {
      username: tw.screenName, name: tw.name, tweetId: tw.id, index, createdAt: tw.createdAt,
      text: tw.text, type: m.type, filename: p.base
    });
    const fb = `${tw.id}-${index}`;
    await dl(p.url, `${base}.${p.ext}`, `${fb}.${p.ext}`);
    count++;
    if (!isPhoto && s.downloadThumbnail && m.thumb) {
      const th = photoInfo(m.thumb);
      await dl(th.url, `${base}-thumb.${th.ext}`, `${fb}-thumb.${th.ext}`);
    }
  }
  return { ok: count > 0, count };
}
