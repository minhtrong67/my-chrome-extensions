/* Offscreen worker: assembles HLS streams, merges separate video/sound tracks (ffmpeg.wasm), makes thumbnails. DRM is rejected. */
import { FFmpeg } from './lib/ffmpeg/index.js';

const urls = new Map(), ctrls = new Map();
const send = m => chrome.runtime.sendMessage(m).catch(() => {});

chrome.runtime.onMessage.addListener((msg, _s, respond) => {
  if (msg.target !== 'offscreen') return;
  if (msg.type === 'hls-start') job(msg, s => hls(msg, s));
  else if (msg.type === 'mux-start') job(msg, s => mux(msg, s));
  else if (msg.type === 'cancel') { const c = ctrls.get(msg.jobId); if (c) c.abort(); }
  else if (msg.type === 'revoke') { const u = urls.get(msg.jobId); if (u) { URL.revokeObjectURL(u); urls.delete(msg.jobId); } }
  else if (msg.type === 'thumb') { thumb(msg.url).then(t => respond({ thumb: t }), () => respond({ thumb: '' })); return true; }
});

function job(msg, fn) {
  const c = new AbortController(); ctrls.set(msg.jobId, c);
  fn(c.signal).catch(e => { if (!c.signal.aborted) send({ type: 'job-error', jobId: msg.jobId, error: String((e && e.message) || e) }); })
    .finally(() => ctrls.delete(msg.jobId));
}
function done(jobId, blob, ext, noAudio) {
  const u = URL.createObjectURL(blob); urls.set(jobId, u);
  send({ type: 'job-done', jobId, blobUrl: u, ext, noAudio: !!noAudio });
}

/* ---------- helpers ---------- */
async function fetchOk(url, signal, init = {}) {
  let err;
  for (let i = 0; i < 2; i++) {
    try { const r = await fetch(url, { ...init, signal }); if (r.ok) return r; err = new Error('HTTP ' + r.status); }
    catch (e) { if (signal && signal.aborted) throw e; err = e; }
  }
  throw err;
}
const text = (u, s) => fetchOk(u, s).then(r => r.text());
const buf = (u, s) => fetchOk(u, s).then(r => r.arrayBuffer());
async function fetchBlob(url, signal, onP) {
  const r = await fetchOk(url, signal), len = +r.headers.get('content-length') || 0, rd = r.body.getReader(), chunks = [];
  let got = 0;
  for (;;) { const { done: d, value } = await rd.read(); if (d) break; chunks.push(value); got += value.length; if (len && onP) onP(got / len); }
  return new Blob(chunks);
}
const attrs = line => { const o = {}; line.replace(/([A-Z0-9-]+)=("[^"]*"|[^,]*)/g, (_, k, v) => { o[k] = v.replace(/^"|"$/g, ''); }); return o; };

async function ffRun(inputs, args, out) {
  const f = new FFmpeg();
  try {
    await f.load({ coreURL: chrome.runtime.getURL('lib/ffmpeg-core/ffmpeg-core.js'), wasmURL: chrome.runtime.getURL('lib/ffmpeg-core/ffmpeg-core.wasm') });
    for (const [n, b] of inputs) await f.writeFile(n, new Uint8Array(await b.arrayBuffer()));
    const code = await f.exec(args);
    if (code !== 0) throw new Error('ffmpeg ' + code);
    return new Blob([await f.readFile(out)], { type: 'video/mp4' });
  } finally { try { f.terminate(); } catch {} }
}
const MERGE = (v, a) => ['-i', v, '-i', a, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', 'out.mp4'];

/* ---------- HLS ---------- */
function parseMedia(pl, base) {
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
  return { segs, map };
}
async function grab({ segs, map }, signal, tick) {
  const keyCache = new Map();
  const getKey = u => { if (!keyCache.has(u)) keyCache.set(u, buf(u, signal).then(b => crypto.subtle.importKey('raw', b, 'AES-CBC', false, ['decrypt']))); return keyCache.get(u); };
  const ivOf = (k, n) => {
    if (k.iv) return Uint8Array.from(k.iv.replace(/^0x/i, '').padStart(32, '0').match(/../g).map(h => parseInt(h, 16)));
    const iv = new Uint8Array(16); new DataView(iv.buffer).setUint32(12, n); return iv;
  };
  const load = async s => {
    const data = await buf(s.url, signal);
    return s.key ? crypto.subtle.decrypt({ name: 'AES-CBC', iv: ivOf(s.key, s.seq) }, await getKey(s.key.uri), data) : data;
  };
  const parts = new Array(segs.length); let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < segs.length) {
      const i = next++;
      parts[i] = new Blob([await load(segs[i])]);     // kept as Blob: the browser can page it out of memory
      tick();
    }
  }));
  return new Blob(map ? [new Blob([await buf(map, signal)]), ...parts] : parts, { type: map ? 'video/mp4' : 'video/mp2t' });
}
async function hls({ jobId, url }, signal) {
  let pl = await text(url, signal), base = url, audioUrl = null;
  if (/#EXT-X-STREAM-INF/.test(pl)) {                      // master playlist -> best variant (+ its separate sound track)
    const L = pl.split(/\r?\n/); let best = null, bw = -1, group = '';
    L.forEach((l, i) => {
      if (!l.startsWith('#EXT-X-STREAM-INF:')) return;
      const a = attrs(l), next = L.slice(i + 1).find(x => x && !x.startsWith('#')), b = +(a.BANDWIDTH || 0);
      if (next && b > bw) { bw = b; best = next; group = a.AUDIO || ''; }
    });
    if (!best) throw new Error('No playable variant');
    if (group) {
      const c = L.filter(l => l.startsWith('#EXT-X-MEDIA:')).map(attrs).filter(a => a.TYPE === 'AUDIO' && a['GROUP-ID'] === group && a.URI);
      const pick = c.find(a => a.DEFAULT === 'YES') || c[0];
      if (pick) audioUrl = new URL(pick.URI, url).href;
    }
    base = new URL(best, url).href; pl = await text(base, signal);
  }
  const v = parseMedia(pl, base), a = audioUrl ? parseMedia(await text(audioUrl, signal), audioUrl) : null;
  const total = v.segs.length + (a ? a.segs.length : 0); let n = 0;
  const tick = () => send({ type: 'job-progress', jobId, pct: Math.min(99, Math.round(++n / total * 100)) });
  const vb = await grab(v, signal, tick), ab = a ? await grab(a, signal, tick) : null;
  const vx = v.map ? 'mp4' : 'ts';
  if (ab) {
    try { return done(jobId, await ffRun([['v.' + vx, vb], ['a.' + (a.map ? 'mp4' : 'ts'), ab]], MERGE('v.' + vx, 'a.' + (a.map ? 'mp4' : 'ts')), 'out.mp4'), 'mp4'); }
    catch { return done(jobId, vb, vx, true); }
  }
  if (!v.map && vb.size < 500 * 1024 * 1024) {             // remux .ts -> .mp4 so every player can open it
    try { return done(jobId, await ffRun([['v.ts', vb]], ['-i', 'v.ts', '-c', 'copy', '-movflags', '+faststart', 'out.mp4'], 'out.mp4'), 'mp4'); } catch {}
  }
  done(jobId, vb, vx);
}

/* ---------- separate video + sound files ---------- */
async function mux({ jobId, videoUrl, audioUrls }, signal) {
  const vb = await fetchBlob(videoUrl, signal, p => send({ type: 'job-progress', jobId, pct: Math.round(p * 50) }));
  let ab = null;
  for (const u of audioUrls) {
    try { ab = await fetchBlob(u, signal, p => send({ type: 'job-progress', jobId, pct: 50 + Math.round(p * 45) })); break; }
    catch (e) { if (signal.aborted) throw e; }
  }
  if (!ab) return done(jobId, vb, 'mp4', true);
  try { done(jobId, await ffRun([['v.mp4', vb], ['a.mp4', ab]], MERGE('v.mp4', 'a.mp4'), 'out.mp4'), 'mp4'); }
  catch { done(jobId, vb, 'mp4', true); }
}

/* ---------- thumbnails ---------- */
function frameOf(v) {
  const w = 192, h = Math.max(1, Math.round(w * (v.videoHeight || 9) / (v.videoWidth || 16)));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(v, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.6);                       // throws if the canvas is tainted
}
async function grabFrame(v) {
  await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('bad')); setTimeout(() => rej(new Error('timeout')), 6000); });
  v.currentTime = Math.min(1, (v.duration || 2) / 2);
  await new Promise(res => { v.onseeked = res; setTimeout(res, 1500); });
  return frameOf(v);
}
async function thumbFromBytes(url, max) {                       // first bytes only, played from a local blob (never taints the canvas)
  const r = await fetch(url, { headers: { Range: `bytes=0-${max - 1}` } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const rd = r.body.getReader(), chunks = []; let got = 0;
  while (got < max) { const { done: d, value } = await rd.read(); if (d) break; chunks.push(value); got += value.length; }
  rd.cancel().catch(() => {});
  const u = URL.createObjectURL(new Blob(chunks)), v = document.createElement('video');
  v.muted = true; v.preload = 'auto'; v.src = u;
  try { return await grabFrame(v); } finally { URL.revokeObjectURL(u); v.removeAttribute('src'); }
}
async function thumbDirect(url) {                               // let the video element load it (works when the CDN allows CORS)
  const v = document.createElement('video');
  v.muted = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = url;
  try { return await grabFrame(v); } finally { v.removeAttribute('src'); v.load(); }
}
async function thumb(url) {
  try { return await thumbFromBytes(url, 3 * 1024 * 1024); } catch {}
  try { return await thumbFromBytes(url, 8 * 1024 * 1024); } catch {}
  return thumbDirect(url);
}
