let S, tabId, items = [], thumb = '', view = 'home';
const state = {};      // url -> { pct } | { ok:true }
const jobUrl = {};     // jobId -> url
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
async function loadItems() {
  try { const r = await chrome.runtime.sendMessage({ type: 'getMedia', tabId }); items = (r.items || []).slice(0, 1); thumb = r.thumb || ''; } catch { items = []; thumb = ''; }
}
function snack(msg, err) {
  const s = document.getElementById('snack');
  s.textContent = msg; s.className = 'snack' + (err ? ' err' : ''); s.hidden = false;
  clearTimeout(snack.t); snack.t = setTimeout(() => (s.hidden = true), 3200);
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
function homeView() {
  const list = items.map((it, i) => {
    const st = state[it.url], busy = st && st.pct != null && !st.ok;
    const meta = [it.kind === 'hls' ? 'HLS' : extOf(it).toUpperCase(), fmtSize(it.size), hostOf(it.url)].filter(Boolean).join(' · ');
    return `<div class="media"><div class="thumb">${thumb ? `<img src="${esc(thumb)}" alt="">` : icon('film', 24)}</div>
      <div class="meta"><div class="name">${esc(nameFromUrl(it.url))}</div><div class="sub">${esc(meta)}</div></div>
      <button class="dl ${st && st.ok ? 'ok' : ''}" data-dl="${i}" ${busy ? 'disabled' : ''} aria-label="${esc(T('download'))}">
        ${st && st.ok ? icon('check', 22, 2.6) : busy ? st.pct + '%' : icon('download', 22)}</button></div>`;
  }).join('');
  return `<main class="view">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 .4rem">
      <div class="sec-title" style="padding:0">${esc(T('videosOnPage'))}</div>
</div>
    ${items.length ? `<div class="list">${list}</div>` :
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
    ${toggle('download', T('askWhere'), 'askWhere', S.askWhere)}
    ${toggle('film', T('showButton'), 'showButton', S.showButton)}
    <div class="row">${rowHead('monitor', T('btnShow'))}${seg('btnShow', [{ v: 'hover', l: T('hoverOnly') }, { v: 'always', l: T('always') }], S.btnShow)}</div>
    <div class="row">${rowHead('arrowUpRight', T('btnPos'))}${seg('btnPos', [{ v: 'left', l: T('left') }, { v: 'right', l: T('right') }], S.btnPos)}</div>
  </div></section>

  <section><div class="sec-title">${esc(T('language'))}</div><div class="group">
    <div class="row">${rowHead('languages', T('language'))}${seg('lang', [{ v: 'en', l: 'English' }, { v: 'vi', l: 'Tiếng Việt' }], S.lang)}</div>
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
  if (keepScroll) { document.body.scrollTop = y; document.documentElement.scrollTop = y; }
}

/* ---------- events ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.act === 'settings') { view = 'settings'; render(); }
  else if (t.dataset.act === 'back') { view = 'home'; render(); }
  else if (t.dataset.act === 'chromedl') chrome.tabs.create({ url: 'chrome://settings/downloads' });
  else if (t.dataset.set) save({ [t.dataset.set]: t.dataset.val });
  else if (t.dataset.seed) save({ seed: t.dataset.seed });
  else if (t.dataset.toggle) save({ [t.dataset.toggle]: t.getAttribute('aria-checked') !== 'true' });
  else if (t.dataset.dl != null) {
    const it = items[+t.dataset.dl];
    const r = await chrome.runtime.sendMessage({ type: 'download', item: it, tabId });
    if (!r || !r.ok) return snack(T('failed'), true);
    if (r.hls) { jobUrl[r.jobId] = it.url; state[it.url] = { pct: 0 }; }
    else { state[it.url] = { ok: true }; snack(T('started')); }
    render(true);
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'font') save({ font: e.target.value });
  if (e.target.id === 'folder') save({ folder: e.target.value.trim() });
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'folder') e.target.blur(); });

chrome.runtime.onMessage.addListener(m => {
  const url = jobUrl[m.jobId]; if (!url) return;
  if (m.type === 'hls-progress') state[url] = { pct: m.pct };
  else if (m.type === 'hls-done') { state[url] = { ok: true }; snack(T('started')); }
  else if (m.type === 'hls-error') { delete state[url]; snack(/DRM/.test(m.error || '') ? T('drm') : T('failed'), true); }
  else return;
  if (view === 'home') render(true);
});
chrome.storage.onChanged.addListener(async (c, area) => {
  if (area === 'session' && (c['m' + tabId] || c['t' + tabId]) && view === 'home') { await loadItems(); render(true); }
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => S && applyAll());

(async function init() {
  S = await getSettings();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab && tab.id;
  applyAll(); await loadItems(); render();
})();
