(async () => {
  const $ = (id) => document.getElementById(id);
  let S = await DD.getSettings();
  let t = DD.makeT(S.lang);

  const state = {
    tab: null, host: false, origin: '', items: [], byId: new Map(), cls: new Map(), selected: new Set(), nodes: new Map(),
    showFiltered: false, scanning: false, port: null, unavailable: 0, lastIdx: -1, wasRunning: false, scanned: false
  };

  /* ---------- theme / i18n ---------- */
  const paint = () => {
    DD.applyTheme(S);
    document.documentElement.lang = S.lang;
    t = DD.makeT(S.lang);
    DD.applyI18n(t);
    $('grid').style.setProperty('--cols', S.gridCols);
    $('grid').classList.toggle('blur', !!S.blurExplicit);
    renderStatic();
    updateUI();
  };
  DD.watchTheme(() => S);

  function renderStatic() {
    $('btnSettings').innerHTML = DD.svg('settings');
    $('pgMinus').innerHTML = DD.svg('remove');
    $('pgPlus').innerHTML = DD.svg('add');
    $('logo').innerHTML = `<svg viewBox="0 0 100 100"><path d="${DD.scallop(8, 0.08)}" fill="var(--primary)"/><g transform="translate(26 26) scale(2)" fill="var(--on-primary)"><path d="${DD.ICONS.download}"/></g></svg>`;
    $('hero').innerHTML = `<svg viewBox="0 0 100 100"><path d="${DD.scallop(9, 0.1)}" fill="var(--primary-container)"/><g transform="translate(29 29) scale(1.75)" fill="var(--on-primary-container)"><path d="${DD.ICONS.search}"/></g></svg>`;
    $('btnOpenBooru').insertAdjacentHTML('afterbegin', $('btnOpenBooru').querySelector('svg') ? '' : DD.svg('open'));
    $('btnDownload').innerHTML = DD.svg('download') + `<span>${t('popup.download', { n: downloadable().length })}</span>`;
    const scanning = state.scanning;
    $('btnScan').innerHTML = DD.svg(scanning ? 'stop' : 'search') + `<span>${t(scanning ? 'popup.stop' : 'popup.scan')}</span>`;
    $('btnScan').classList.toggle('stopping', scanning);
    $('chipLogo').innerHTML = DD.svg('check') + `<span>${t('popup.filterLogos')}</span>`;
    $('chipLogo').setAttribute('aria-pressed', String(!!S.logoFilter));
    const nf = filteredCount();
    $('chipFiltered').hidden = nf === 0;
    $('chipFiltered').innerHTML = DD.svg('check') + `<span>${t('popup.showFiltered', { n: nf })}</span>`;
    $('chipFiltered').setAttribute('aria-pressed', String(state.showFiltered));
  }

  /* ---------- helpers ---------- */
  const isVisible = (id) => state.showFiltered || !state.cls.get(id);
  const visibleItems = () => state.items.filter((it) => isVisible(it.id));
  const downloadable = () => visibleItems().filter((it) => state.selected.has(it.id));
  const filteredCount = () => state.items.filter((it) => state.cls.get(it.id)).length;

  const isBooru = (url) => { try { return /(^|\.)donmai\.us$/.test(new URL(url).hostname); } catch { return false; } };

  function labelOf(url) {
    const u = new URL(url), p = u.pathname;
    let m;
    if ((m = p.match(/^\/pools\/(\d+)/))) return 'pool_' + m[1];
    if ((m = p.match(/^\/posts\/(\d+)/))) return 'post_' + m[1];
    if ((m = p.match(/^\/post_sets\/(\d+)/))) return 'set_' + m[1];
    if (/^\/favorites/.test(p)) return 'favorites' + (u.searchParams.get('user_id') ? '_' + u.searchParams.get('user_id') : '');
    const tags = (u.searchParams.get('tags') || '').trim().split(/\s+/).filter(Boolean).join('+');
    return tags || 'posts';
  }

  const toast = (msg) => {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 2600);
  };

  const notice = (msg, err) => {
    const n = $('notice');
    n.hidden = !msg;
    n.textContent = msg || '';
    n.classList.toggle('err', !!err);
  };

  /* ---------- grid ---------- */
  function makeNode(it) {
    const b = document.createElement('button');
    b.className = 'cell';
    b.dataset.id = it.id;
    b.dataset.rating = it.rating;
    b.setAttribute('role', 'checkbox');
    b.innerHTML = `<img loading="lazy" referrerpolicy="no-referrer" alt=""><span class="tick">${DD.svg('check')}</span><span class="tag" hidden></span><span class="meta"></span>`;
    b.querySelector('img').src = it.thumb || it.large || it.file;
    b.querySelector('.meta').textContent = `${it.w || '?'}×${it.h || '?'} · ${(it.ext || '').toUpperCase()}${it.score ? ' · ★' + it.score : ''}`;
    return b;
  }

  function updateUI() {
    const grid = $('grid');
    let vis = 0, sel = 0;
    for (const it of state.items) {
      let n = state.nodes.get(it.id);
      if (!n) { n = makeNode(it); state.nodes.set(it.id, n); grid.appendChild(n); }
      const reason = state.cls.get(it.id) || '';
      const show = state.showFiltered || !reason;
      n.hidden = !show;
      n.setAttribute('aria-checked', String(state.selected.has(it.id)));
      const tag = n.querySelector('.tag');
      tag.hidden = !reason;
      if (reason) tag.textContent = t('reason.' + reason);
      if (show) { vis++; if (state.selected.has(it.id)) sel++; }
    }
    $('summary').textContent = state.items.length ? t('popup.summary', { s: sel, n: vis }) : '';
    $('btnDownload').disabled = sel === 0;
    $('btnDownload').querySelector('span') && ($('btnDownload').querySelector('span').textContent = t('popup.download', { n: sel }));
    $('btnScan').innerHTML = DD.svg(state.scanning ? 'stop' : 'search') + `<span>${t(state.scanning ? 'popup.stop' : 'popup.scan')}</span>`;
    $('btnScan').classList.toggle('stopping', state.scanning);
    $('chipLogo').setAttribute('aria-pressed', String(!!S.logoFilter));
    const nf = filteredCount();
    $('chipFiltered').hidden = nf === 0;
    $('chipFiltered').querySelector('span') && ($('chipFiltered').querySelector('span').textContent = t('popup.showFiltered', { n: nf }));
    $('chipFiltered').setAttribute('aria-pressed', String(state.showFiltered));
    $('placeholder').textContent = vis ? '' : state.scanning ? '' : state.scanned ? t('popup.noResults') : t('popup.empty');
    $('pgVal').textContent = S.scanPages;
    $('pgMinus').disabled = S.scanPages <= 1;
    $('pgPlus').disabled = S.scanPages >= 50;
    saveCache();
  }

  function reclassify(initial) {
    for (const it of state.items) {
      const prev = state.cls.get(it.id);
      const now = DD.classify(it, S);
      state.cls.set(it.id, now);
      if (initial && prev === undefined) { if (!now) state.selected.add(it.id); }
      else if (prev !== undefined && prev !== now) { if (now) state.selected.delete(it.id); else if (prev) state.selected.add(it.id); }
    }
  }

  /* ---------- cache (so reopening the popup keeps the scan) ---------- */
  let cacheTimer;
  function saveCache() {
    if (!state.tab || !state.items.length) return;
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(() => {
      chrome.storage.session.set({ ['scan:' + state.tab.id]: { url: state.tab.url, items: state.items, selected: [...state.selected], showFiltered: state.showFiltered, unavailable: state.unavailable } }).catch(() => {});
    }, 250);
  }
  async function loadCache() {
    try {
      const k = 'scan:' + state.tab.id;
      const c = (await chrome.storage.session.get(k))[k];
      if (!c || c.url !== state.tab.url || !c.items.length) return false;
      state.items = c.items;
      state.items.forEach((it) => state.byId.set(it.id, it));
      reclassify(true);
      state.selected = new Set(c.selected.filter((id) => state.byId.has(id)));
      state.showFiltered = !!c.showFiltered;
      state.unavailable = c.unavailable || 0;
      state.scanned = true;
      return true;
    } catch { return false; }
  }

  /* ---------- scanning ---------- */
  async function ping(tabId) {
    try { return await chrome.tabs.sendMessage(tabId, { type: 'dd-ping' }); } catch { return null; }
  }
  async function ensureContent(tabId) {
    let r = await ping(tabId);
    if (r) return r;
    try { await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); } catch { return null; }
    return ping(tabId);
  }

  function resetResults() {
    state.items = []; state.byId.clear(); state.cls.clear(); state.selected.clear();
    state.nodes.forEach((n) => n.remove()); state.nodes.clear();
    state.unavailable = 0; state.lastIdx = -1; state.scanned = false;
    notice('');
  }

  function startScan() {
    if (state.scanning) { try { state.port.postMessage({ type: 'cancel' }); } catch {} return; }
    resetResults();
    state.scanning = true;
    const port = chrome.tabs.connect(state.tab.id, { name: 'dd-scan' });
    state.port = port;
    port.onMessage.addListener(onScan);
    port.onDisconnect.addListener(() => {
      void chrome.runtime.lastError;
      if (state.scanning) { state.scanning = false; state.scanned = true; if (!state.items.length) notice(t('popup.scanError'), true); updateUI(); }
    });
    port.postMessage({ type: 'start', opts: { pages: S.scanPages, delay: S.scanDelay } });
    updateUI();
  }

  function onScan(m) {
    if (m.type === 'items') {
      let added = 0;
      for (const it of m.items) {
        if (state.byId.has(it.id)) continue;
        state.byId.set(it.id, it); state.items.push(it); added++;
      }
      state.unavailable += m.unavailable || 0;
      if (added) reclassify(true);
      if (state.unavailable) notice(t('popup.unavailable', { n: state.unavailable }));
      $('pageSub').textContent = `${t('popup.postsFound', { n: state.items.length })} · ${t('popup.page', { p: m.page })}`;
      updateUI();
    } else if (m.type === 'error') {
      notice(t('popup.scanError') + ' (' + m.message + ')', true);
    } else if (m.type === 'done') {
      state.scanning = false; state.scanned = true;
      $('pageSub').textContent = t('popup.postsFound', { n: state.items.length });
      try { state.port.disconnect(); } catch {}
      updateUI();
    }
  }

  /* ---------- selection ---------- */
  $('grid').addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const id = cell.dataset.id;
    const vis = visibleItems();
    const idx = vis.findIndex((x) => x.id === id);
    if (e.shiftKey && state.lastIdx >= 0 && state.lastIdx < vis.length) {
      const [a, b] = [Math.min(idx, state.lastIdx), Math.max(idx, state.lastIdx)];
      const on = !state.selected.has(id);
      for (let i = a; i <= b; i++) on ? state.selected.add(vis[i].id) : state.selected.delete(vis[i].id);
    } else {
      state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
    }
    state.lastIdx = idx;
    updateUI();
  });
  $('selAll').onclick = () => { visibleItems().forEach((it) => state.selected.add(it.id)); updateUI(); };
  $('selNone').onclick = () => { visibleItems().forEach((it) => state.selected.delete(it.id)); updateUI(); };
  $('selInv').onclick = () => { visibleItems().forEach((it) => (state.selected.has(it.id) ? state.selected.delete(it.id) : state.selected.add(it.id))); updateUI(); };

  $('chipLogo').onclick = async () => {
    S.logoFilter = !S.logoFilter;
    await DD.setSettings({ logoFilter: S.logoFilter });
    reclassify(false);
    updateUI();
  };
  $('chipFiltered').onclick = () => { state.showFiltered = !state.showFiltered; updateUI(); };

  const setPages = async (n) => { S.scanPages = Math.min(50, Math.max(1, n)); await DD.setSettings({ scanPages: S.scanPages }); updateUI(); };
  $('pgMinus').onclick = () => setPages(S.scanPages - 1);
  $('pgPlus').onclick = () => setPages(S.scanPages + 1);
  $('btnScan').onclick = startScan;
  $('btnSettings').onclick = () => chrome.runtime.openOptionsPage();
  $('btnOpenBooru').onclick = () => chrome.tabs.create({ url: 'https://danbooru.donmai.us/posts' });

  /* ---------- download ---------- */
  $('btnDownload').onclick = async () => {
    const list = downloadable();
    if (!list.length) return;
    const items = list.map((it) => {
      const url = S.quality === 'sample' && it.large ? it.large : it.file;
      let ext = it.ext;
      try { ext = new URL(url).pathname.split('.').pop().toLowerCase() || it.ext; } catch {}
      return { id: it.id, url, ext, md5: it.md5, w: it.w, h: it.h, rating: it.rating, score: it.score, origin: state.origin };
    });
    const site = new URL(state.tab.url).hostname.split('.')[0];
    await chrome.runtime.sendMessage({ type: 'dd-download', items, ctx: { query: labelOf(state.tab.url), site } });
    toast(t('popup.queued', { n: items.length }));
  };
  $('btnCancel').onclick = () => chrome.runtime.sendMessage({ type: 'dd-cancel' });

  function showProgress(p) {
    const busy = !!p.running;
    $('dockIdle').hidden = busy;
    $('dockBusy').hidden = !busy;
    if (busy) {
      const d = p.done + p.failed;
      $('wavy').style.setProperty('--p', p.total ? d / p.total : 0);
      $('busyText').textContent = t('popup.downloading', { d, t: p.total });
    } else if (state.wasRunning) {
      toast(p.cancelled ? t('popup.cancelled') : t('popup.done', { ok: p.done, fail: p.failed }));
    }
    state.wasRunning = busy;
  }
  chrome.runtime.onMessage.addListener((m) => { if (m && m.type === 'dd-progress') showProgress(m); });

  /* ---------- init ---------- */
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.tab = tab;
  state.host = !!(tab && tab.url && isBooru(tab.url));
  paint();
  document.body.classList.add('ready');

  chrome.runtime.sendMessage({ type: 'dd-status' }).then((p) => p && showProgress(p)).catch(() => {});

  $('viewEmpty').hidden = state.host;
  $('viewMain').hidden = !state.host;
  document.querySelector('.dock').hidden = !state.host;
  if (!state.host) { $('subtitle').textContent = ''; return; }

  const u = new URL(tab.url);
  state.origin = u.origin;
  $('subtitle').textContent = u.hostname;
  $('pageLabel').textContent = labelOf(tab.url);
  $('pageSub').textContent = u.searchParams.get('page') ? t('popup.page', { p: u.searchParams.get('page') }) : '';

  const info = await ensureContent(tab.id);
  if (info) {
    $('pageSub').textContent = info.count ? t('popup.detected', { n: info.count }) : t('popup.detected0');
  }

  if (await loadCache()) { $('pageSub').textContent = t('popup.postsFound', { n: state.items.length }); updateUI(); }
  else if (S.autoScan && info && info.count) startScan();
})();
