/* Assembles HLS (.m3u8) streams into a single file. Supports AES-128; DRM is rejected. */
const urls = new Map();
const send = m => chrome.runtime.sendMessage(m).catch(() => {});

chrome.runtime.onMessage.addListener(msg => {
  if (msg.target !== 'offscreen') return;
  if (msg.type === 'hls-start') run(msg).catch(e => send({ type: 'hls-error', jobId: msg.jobId, error: String(e.message || e) }));
  if (msg.type === 'revoke' && urls.has(msg.jobId)) { URL.revokeObjectURL(urls.get(msg.jobId)); urls.delete(msg.jobId); }
});

async function fetchOk(url) {
  let err;
  for (let i = 0; i < 2; i++) {
    try { const r = await fetch(url); if (r.ok) return r; err = new Error('HTTP ' + r.status); } catch (e) { err = e; }
  }
  throw err;
}
const text = async u => (await fetchOk(u)).text();
const buf = async u => (await fetchOk(u)).arrayBuffer();
const attrs = line => {
  const o = {}; line.replace(/([A-Z0-9-]+)=("[^"]*"|[^,]*)/g, (_, k, v) => { o[k] = v.replace(/^"|"$/g, ''); });
  return o;
};

async function run({ jobId, url }) {
  let base = url, pl = await text(url);
  if (/#EXT-X-STREAM-INF/.test(pl)) {                       // master playlist -> best variant
    const L = pl.split(/\r?\n/); let best = null, bw = -1;
    L.forEach((l, i) => {
      const m = l.match(/^#EXT-X-STREAM-INF:.*?BANDWIDTH=(\d+)/);
      if (!m) return;
      const next = L.slice(i + 1).find(x => x && !x.startsWith('#'));
      if (next && +m[1] > bw) { bw = +m[1]; best = next; }
    });
    if (!best) throw new Error('No playable variant');
    base = new URL(best, url).href; pl = await text(base);
  }
  let seq = +((pl.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/) || [])[1] || 0), key = null, map = null;
  const segs = [];
  for (const l of pl.split(/\r?\n/)) {
    if (l.startsWith('#EXT-X-KEY:')) {
      const a = attrs(l);
      if (a.METHOD === 'NONE') key = null;
      else if (a.METHOD === 'AES-128') key = { uri: new URL(a.URI, base).href, iv: a.IV };
      else throw new Error('DRM');
    } else if (l.startsWith('#EXT-X-MAP:')) map = new URL(attrs(l).URI, base).href;
    else if (l && !l.startsWith('#')) segs.push({ url: new URL(l, base).href, seq: seq++, key });
  }
  if (!segs.length) throw new Error('Empty playlist');

  const keyCache = new Map();
  const getKey = u => { if (!keyCache.has(u)) keyCache.set(u, buf(u).then(b => crypto.subtle.importKey('raw', b, 'AES-CBC', false, ['decrypt']))); return keyCache.get(u); };
  const ivOf = (k, n) => {
    if (k.iv) return Uint8Array.from(k.iv.replace(/^0x/i, '').padStart(32, '0').match(/../g).map(h => parseInt(h, 16)));
    const iv = new Uint8Array(16); new DataView(iv.buffer).setUint32(12, n); return iv;
  };
  const load = async s => {
    const data = await buf(s.url);
    return s.key ? crypto.subtle.decrypt({ name: 'AES-CBC', iv: ivOf(s.key, s.seq) }, await getKey(s.key.uri), data) : data;
  };

  const parts = new Array(segs.length); let next = 0, done = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < segs.length) {
      const i = next++;
      parts[i] = await load(segs[i]);
      send({ type: 'hls-progress', jobId, pct: Math.round(++done / segs.length * 100) });
    }
  }));
  const blob = new Blob(map ? [await buf(map), ...parts] : parts, { type: map ? 'video/mp4' : 'video/mp2t' });
  const blobUrl = URL.createObjectURL(blob);
  urls.set(jobId, blobUrl);
  send({ type: 'hls-done', jobId, blobUrl, ext: map ? 'mp4' : 'ts' });
}
