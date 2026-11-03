let S, tabId, all = [], thumbList = [], view = 'home', showAll = false, sig = '';
const state = {};      // url -> { jobId, pct, id } | { done, id, noAudio }
const jobUrl = {};     // jobId -> url
const thumbs = {};     // url -> data URL (made by the offscreen document)
const tries = {};      // url -> thumbnail attempts
const LIMIT = 6;
const T = (k, v) => tr(S.lang, k, v);
const $app = document.getElementById('app');
const loadedFonts = new Set();

function applyAll() {
  applyTheme(document.documentElement, S);
  document.documentElement.style.fontSize = SIZE_PX[S.fontSize] + 'px';
  document.documentElement.lang = S.lang;
  const f = FONTS[S.font];
  if (f && f.gf && !loadedFonts.has(S.font)) {
    loadedFonts.add(S.font);
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?family=${f.gf}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(l);
  }
}
async function save(patch) {
  Object.assign(S, patch);
  await chrome.storage.local.set(patch);
  applyAll(); render(true);
}

/* ---------- list: remove duplicates, keep it short ---------- */
function curate(list) {
  const want = S.quality === 'sd' ? 'sd' : 'hd', seen = new Map(), out = [];
  for (const it of list) {
    if (it.meta && list.length > 1) continue;
    let k; if (it.page && it.vid) k = `p:${it.site}:${it.vid}`; else { try { k = 'u:' + new URL(it.url).pathname; } catch { k = it.url; } }
    if (seen.has(k)) {                                           // same video: keep the preferred quality
      const j = seen.get(k);
      if (it.page && it.q === want && out[j].q !== want) out[j] = it;
      continue;
    }
    seen.set(k, out.length); out.push(it);
  }
  return out;
}
const shown = () => showAll ? all : all.slice(0, LIMIT);
const thumbFor = (it, i) => {
  const hit = thumbList.find(t => (t.vid && it.vid && t.vid === it.vid) || (t.srcs || []).includes(it.url));
  return (hit && hit.thumb) || thumbs[it.url] || (i === 0 && thumbList[0] ? thumbList[0].thumb : '');
};
const labelOf = it => it.page
  ? (it.vid ? `${it.site || 'video'}-${it.vid}` : `${it.site || 'video'} · ${nameFromUrl(it.url).replace(/\.\w+$/, '').slice(-8)}`)
  : nameFromUrl(it.url);
const signature = () => JSON.stringify([shown().map(i => i.url), thumbList.map(t => (t.vid || '') + (t.srcs || [])[0]), showAll]);

async function loadItems() {
  try {
    const r = await chrome.runtime.sendMessage({ type: 'getMedia', tabId });
    all = curate(r.items || []); thumbList = r.thumbs || [];
  } catch { all = []; thumbList = []; }
}
function snack(msg, err) {
  const s = document.getElementById('snack');
  s.textContent = msg; s.className = 'snack' + (err ? ' err' : ''); s.hidden = false;
  clearTimeout(snack.t); snack.t = setTimeout(() => (s.hidden = true), 3200);
}
function setThumbEl(url, th) {                                   // update one image in place: no re-render, no flicker
  document.querySelectorAll('.thumb').forEach(el => { if (el.dataset.u === url) el.innerHTML = `<img src="${esc(th)}" alt="">`; });
}
let thumbBusy = false;
async function loadThumbs() {
  if (thumbBusy) return; thumbBusy = true;
  try {
    const need = shown().filter((it, i) => it.kind === 'file' && !thumbFor(it, i) && (tries[it.url] || 0) < 2);
    let n = 0;
    await Promise.all([0, 1].map(async () => {
      while (n < need.length) {
        const it = need[n++]; tries[it.url] = (tries[it.url] || 0) + 1;
        const r = await chrome.runtime.sendMessage({ type: 'thumb-of', url: it.url, tabId }).catch(() => null);
        if (r && r.thumb) { thumbs[it.url] = r.thumb; setThumbEl(it.url, r.thumb); }
      }
    }));
  } finally { thumbBusy = false; }
}
let refreshT = 0;
function scheduleRefresh() {                                     // storage changes come in bursts: wait, and only redraw when something really changed
  clearTimeout(refreshT);
  refreshT = setTimeout(async () => {
    await loadItems();
    if (view === 'home' && signature() !== sig) render(true);
    loadThumbs();
  }, 500);
}

/* ---------- views ---------- */
function header() {
  const home = view === 'home';
  return `<header class="top">
    ${home ? '' : `<button class="icon-btn" data-act="back" aria-label="${esc(T('back'))}">${icon('arrowLeft', 22)}</button>`}
    <div class="brand">${home ? `<span class="logo">${icon('download', 22, 2.4)}</span>` : ''}<h1>${esc(home ? T('appName') : T('settings'))}</h1></div>
    ${home ? `<button class="icon-btn" data-act="settings" aria-label="${esc(T('settings'))}" title="${esc(T('settings'))}">${icon('settings', 22)}</button>` : ''}
  </header>`;
}
function actBtn(it, i) {
  const st = state[it.url];
  if (st && st.done) return `<button class="dl ok" data-show="${st.id ?? ''}" aria-label="${esc(T('showInFolder'))}" title="${esc(T('showInFolder'))}">${icon('folderOpen', 22)}</button>`;
  if (st) return `<button class="dl run" data-cancel="${i}" aria-label="${esc(T('cancel'))}" title="${esc(T('cancel'))}"><span class="p">${st.pct >= 0 ? st.pct + '%' : '…'}</span><span class="x">${icon('x', 22, 2.4)}</span></button>`;
  return `<button class="dl" data-dl="${i}" aria-label="${esc(T('download'))}" title="${esc(T('download'))}">${icon('download', 22)}</button>`;
}
function refreshActs() {                                         // progress updates only touch the buttons
  const list = shown();
  document.querySelectorAll('.media').forEach(el => {
    const i = list.findIndex(it => it.url === el.dataset.u);
    if (i >= 0) el.querySelector('.act').innerHTML = actBtn(list[i], i);
  });
}
function homeView() {
  const list = shown().map((it, i) => {
    const meta = [it.kind === 'hls' ? 'HLS' : extOf(it).toUpperCase(), it.page && it.q ? it.q.toUpperCase() : '', fmtSize(it.size), hostOf(it.url)].filter(Boolean).join(' · ');
    const th = thumbFor(it, i);
    return `<div class="media" data-u="${esc(it.url)}"><div class="thumb" data-u="${esc(it.url)}">${th ? `<img src="${esc(th)}" alt="">` : icon('film', 24)}</div>
      <div class="meta"><div class="name">${esc(labelOf(it))}</div><div class="sub">${esc(meta)}</div></div>
      <span class="act">${actBtn(it, i)}</span></div>`;
  }).join('');
  const more = all.length > LIMIT
    ? `<button class="tonal more" data-act="more">${esc(showAll ? T('showLess') : T('showMore', { n: all.length - LIMIT }))}</button>` : '';
  return `<main class="view">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 .4rem">
      <div class="sec-title" style="padding:0">${esc(T('videosOnPage'))}</div>${all.length ? `<span class="count">${esc(T('found', { n: all.length }))}</span>` : ''}</div>
    ${all.length ? `<div class="list">${list}</div>${more}` :
      `<div class="empty"><div class="blob">${icon('film', 36)}</div><h2>${esc(T('emptyTitle'))}</h2><p>${esc(T('emptyDesc'))}</p></div>`}
  </main>`;
}
const seg = (name, opts, cur) => `<div class="seg" role="group">${opts.map(o =>
  `<button data-set="${name}" data-val="${o.v}" aria-pressed="${cur === o.v}">${o.i ? icon(o.i, 18) : ''}${esc(o.l)}</button>`).join('')}</div>`;
const rowHead = (ic, title) => `<div class="row-head"><span class="lead">${icon(ic, 20)}</span><span class="row-title">${esc(title)}</span></div>`;
const toggle = (ic, title, name, on) => `<div class="row"><div class="row-head inline"><span class="lead">${icon(ic, 20)}</span><span class="row-title">${esc(title)}</span>
  <button class="sw" role="switch" aria-checked="${on}" aria-label="${esc(title)}" data-toggle="${name}"></button></div></div>`;

function settingsView() {
  const modes = [{ v: 'light', l: T('light'), i: 'sun' }, { v: 'dark', l: T('dark'), i: 'moon' }, { v: 'system', l: T('system'), i: 'monitor' }];
  const sizes = ['small', 'medium', 'large'].map(v => ({ v, l: T(v) }));
  const names = I18N[S.lang].colors;
  return `<main class="view">
  <section><div class="sec-title">${esc(T('appearance'))}</div><div class="group">
    <div class="row">${rowHead('sun', T('mode'))}${seg('theme', modes, S.theme)}</div>
    <div class="row">${rowHead('palette', T('themeColor'))}<div class="swatches">${SEEDS.map(c =>
      `<button class="swatch" data-seed="${c}" style="background:${buildScheme(c, false).primary}" aria-pressed="${S.seed === c}" title="${esc(names[c])}" aria-label="${esc(names[c])}">${icon('check', 18, 3)}</button>`).join('')}</div></div>
  </div></section>

  <section><div class="sec-title">${esc(T('text'))}</div><div class="group">
    <div class="row">${rowHead('type', T('fontSize'))}${seg('fontSize', sizes, S.fontSize)}</div>
    <div class="row">${rowHead('caseSensitive', T('font'))}<label class="field">
      <select id="font">${Object.entries(FONTS).map(([id, f]) =>
        `<option value="${id}" ${S.font === id ? 'selected' : ''}>${esc(id === 'system' ? T('fontSystem') : f.name)}</option>`).join('')}</select>${icon('chevronDown', 20)}</label></div>
  </div></section>

  <section><div class="sec-title">${esc(T('downloads'))}</div><div class="group">
    <div class="row">${rowHead('folder', T('saveFolder'))}<label class="field">${icon('folder', 18)}
      <input id="folder" type="text" value="${esc(S.folder)}" placeholder="Videos/Web" spellcheck="false"></label>
      <div class="hint">${esc(T('saveFolderHint'))}</div>
      <div class="hint path">${esc(T('saveTo'))}: <b>Downloads/${esc(S.folder.replace(/^[\\/]+|[\\/]+$/g, ''))}</b></div>
      <button class="tonal" data-act="chromedl">${icon('settings', 18)}${esc(T('openChromeDl'))}</button></div>
    ${toggle('folder', T('siteFolder'), 'siteFolder', S.siteFolder)}
    <div class="row">${rowHead('fileText', T('nameTpl'))}<label class="field">${icon('fileText', 18)}
      <input id="nameTpl" type="text" value="${esc(S.nameTpl)}" placeholder="{title}" spellcheck="false"></label>
      <div class="hint">${esc(T('nameTplHint'))}</div></div>
    <div class="row">${rowHead('film', T('quality'))}${seg('quality', [{ v: 'hd', l: 'HD' }, { v: 'sd', l: 'SD' }], S.quality)}</div>
    ${toggle('download', T('askWhere'), 'askWhere', S.askWhere)}
    ${toggle('film', T('showButton'), 'showButton', S.showButton)}
    <div class="row">${rowHead('monitor', T('btnShow'))}${seg('btnShow', [{ v: 'hover', l: T('hoverOnly') }, { v: 'always', l: T('always') }], S.btnShow)}</div>
    <div class="row">${rowHead('arrowUpRight', T('btnPos'))}${seg('btnPos', [{ v: 'left', l: T('left') }, { v: 'right', l: T('right') }], S.btnPos)}</div>
  </div></section>

  <section><div class="sec-title">${esc(T('language'))}</div><div class="group">
    <div class="row">${rowHead('languages', T('language'))}${seg('lang', [{ v: 'en', l: 'English' }, { v: 'vi', l: 'Tiếng Việt' }], S.lang)}</div>
    <div class="row"><button class="tonal" style="margin:0" data-act="reset">${icon('rotateCcw', 18)}${esc(T('reset'))}</button></div>
  </div></section>

  <section class="author">
    <div class="badge">${icon('sparkles', 26)}</div>
    <div><small>${esc(T('author'))}</small><strong>minhtrong67</strong>
    <span class="by">${icon('sparkles', 14)}${esc(T('poweredBy'))}</span></div>
  </section>
  </main>`;
}
function render(keepScroll) {
  const y = document.body.scrollTop || document.documentElement.scrollTop;
  $app.innerHTML = header() + (view === 'home' ? homeView() : settingsView());
  if (view === 'home') sig = signature();
  if (keepScroll) { document.body.scrollTop = y; document.documentElement.scrollTop = y; }
}

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.act === 'settings') { view = 'settings'; render(); }
  else if (t.dataset.act === 'back') { view = 'home'; render(); loadThumbs(); }
  else if (t.dataset.act === 'more') { showAll = !showAll; render(true); loadThumbs(); }
  else if (t.dataset.act === 'reset') { await chrome.storage.local.clear(); S = await getSettings(); applyAll(); await loadItems(); render(true); }
  else if (t.dataset.act === 'chromedl') chrome.tabs.create({ url: 'chrome://settings/downloads' });
  else if (t.dataset.set) save({ [t.dataset.set]: t.dataset.val });
  else if (t.dataset.seed) save({ seed: t.dataset.seed });
  else if (t.dataset.toggle) save({ [t.dataset.toggle]: t.getAttribute('aria-checked') !== 'true' });
  else if (t.dataset.show) chrome.downloads.show(+t.dataset.show);
  else if (t.dataset.cancel != null) { const it = shown()[+t.dataset.cancel], st = it && state[it.url]; if (st) chrome.runtime.sendMessage({ type: 'cancel', jobId: st.jobId }); }
  else if (t.dataset.dl != null) {
    const it = shown()[+t.dataset.dl];
    const r = await chrome.runtime.sendMessage({ type: 'download', item: it, tabId });
    if (!r || !r.ok) return snack(T('failed'), true);
    jobUrl[r.jobId] = it.url; state[it.url] = { jobId: r.jobId, pct: 0 };
    refreshActs();
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'font') save({ font: e.target.value });
  if (e.target.id === 'folder') save({ folder: e.target.value.trim() });
  if (e.target.id === 'nameTpl') save({ nameTpl: e.target.value.trim() });
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.target.id === 'folder' || e.target.id === 'nameTpl')) e.target.blur(); });

chrome.runtime.onMessage.addListener(m => {
  if (m.type !== 'job') return;
  const url = jobUrl[m.jobId]; if (!url) return;
  if (m.state === 'prepare' || m.state === 'save') state[url] = { jobId: m.jobId, pct: m.pct, id: m.downloadId };
  else if (m.state === 'saved') { state[url] = { done: true, id: m.downloadId, noAudio: m.noAudio }; snack(T(m.noAudio ? 'savedNoAudio' : 'saved')); }
  else { delete state[url]; if (m.error !== 'USER_CANCELED') snack(/DRM/.test(m.error || '') ? T('drm') : T('failed'), true); }
  if (view === 'home') refreshActs();
});
chrome.storage.onChanged.addListener((c, area) => {
  if (area === 'session' && (c['m' + tabId] || c['t' + tabId] || c['a' + tabId]) && view === 'home') scheduleRefresh();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => S && applyAll());

(async function init() {
  S = await getSettings();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab && tab.id;
  applyAll(); await loadItems();
  try {                                                   // downloads still running from an earlier popup session
    for (const j of (await chrome.runtime.sendMessage({ type: 'jobs', tabId })) || []) { jobUrl[j.jobId] = j.url; state[j.url] = { jobId: j.jobId, pct: j.pct ?? 0, id: j.downloadId }; }
  } catch {}
  render(); loadThumbs();
})();
