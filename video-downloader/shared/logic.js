/* Pure helpers shared by the background worker, the content script and the tests */
const sanitize = s => String(s).replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '');
function cleanFolder(f) { return String(f || '').split(/[\\/]+/).map(sanitize).filter(p => p && p !== '..').join('/'); }

// Facebook/Instagram CDN serve one file as many byte-range requests: strip them to get one full-file URL
function normUrl(u) {
  try {
    const x = new URL(u);
    if (x.searchParams.has('bytestart') || x.searchParams.has('byteend')) {
      x.searchParams.delete('bytestart'); x.searchParams.delete('byteend'); return x.href;
    }
  } catch {}
  return u;
}
function efgTag(u) {
  try {
    const e = new URL(u).searchParams.get('efg'); if (!e) return '';
    const j = atob(e.replace(/-/g, '+').replace(/_/g, '/'));
    return (j.match(/"vencode_tag":"([^"]*)"/) || [])[1] || '';
  } catch { return ''; }
}
const isAudioOnly = u => /audio/i.test(efgTag(u)) || /\/DASH_audio|\/DASH_AUDIO/.test(u);
const isVideoOnly = u => { const t = efgTag(u); return (!!t && /dash/i.test(t) && !/audio/i.test(t)) || /\/DASH_\d+\.mp4/.test(u); };

function vidFromUrl(u) {
  return ((u || '').match(/(?:reel\/|reels\/|videos\/|\/p\/|\/tv\/|\/post\/|\/status\/|\/video\/|[?&]v=)([A-Za-z0-9_-]{5,})/) || [])[1]
    || ((u || '').match(/vimeo\.com\/(?:[\w-]+\/)*(\d{6,})/) || [])[1] || '';
}
function siteOf(tabUrl) {
  const p = hostOf(tabUrl).split('.');
  if (p.length >= 3 && p[p.length - 2].length <= 3) return p[p.length - 3];
  return (p.length > 1 ? p[p.length - 2] : p[0]) || 'video';
}

// the best source for the video the user means
function choose(list, srcs, tabUrl, hint, pref) {
  list = (list || []).filter(i => !i.audio);
  const set = new Set((srcs || []).map(normUrl));
  const own = list.find(i => set.has(i.url));
  if (own) return own;
  const page = list.filter(i => i.page);
  if (page.length) {                                   // links read from the page data (video + sound in one file)
    const vid = hint || vidFromUrl(tabUrl);
    let grp = vid ? page.filter(i => i.vid === vid) : [];
    if (!grp.length) { const newest = Math.max(...page.map(i => i.ts)); grp = page.filter(i => newest - i.ts < 3000); }
    const want = pref === 'sd' ? 'sd' : 'hd';
    return grp.slice().sort((a, b) => ((b.q === want) - (a.q === want)) || ((b.b || 0) - (a.b || 0)))[0];
  }
  return list.find(i => !i.meta) || list[0];
}

function buildName(S, item, title, tabUrl) {
  const v = { title: sanitize(title || '').slice(0, 80), site: item.site || siteOf(tabUrl), id: item.vid || '', date: new Date().toISOString().slice(0, 10), quality: (item.q || '').toUpperCase() };
  const tpl = (S.nameTpl || '').trim() || (item.page ? '{site}-{id}' : '{title}');
  let n = tpl.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  n = n.replace(/(\s*[-_·|]\s*){2,}/g, ' - ').replace(/^[\s\-_·|]+|[\s\-_·|]+$/g, '');
  return sanitize(n).slice(0, 120) || 'video';
}
