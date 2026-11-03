'use strict';
(() => {
  if (window.__rtToggle) { window.__rtToggle(); return; }
  let root = null, host = null, app = null, stage = null, canvas = null;
  const $ = (s, r = root) => r.querySelector(s);
  const $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const DEVICES = window.RT_DEVICES;
  const MAX_COMPARE = 6;
  const SEEDS = ['#3F5BF6', '#6750A4', '#00897B', '#E4308C', '#F4511E', '#2E7D32', '#0288D1', '#9C6B00'];
  const ZERO = { t: 0, r: 0, b: 0, l: 0 };
  const ALL_TYPES = ['sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'media', 'websocket', 'other'];
  const TYPE_ICON = { phone: 'mobile', tablet: 'tablet_mac', foldable: 'devices_fold', watch: 'watch', desktop: 'laptop_mac', responsive: 'responsive_layout' };

  const DEF_SETTINGS = { theme: 'system', seed: '#3F5BF6', lang: 'auto', hideScroll: true, spoofUA: true, bypass: true, sync: true, copyShot: false };
  const DEF_STATE = { mode: 'single', deviceId: 'iphone-16', resp: { w: 390, h: 844, dpr: 2 }, landscape: false, zoom: 'fit', compare: ['iphone-16', 'pixel-9', 'ipad-air-11'], touch: true, frame: true, filter: 'all' };

  let settings, state, custom = [], isOpen = false, cleanup = [];
  let slots = [], curZoom = 1, zoomOverride = 0, syncLock = 0, query = '', prevOverflow = '';
  const TOKEN = Math.random().toString(36).slice(2) + Date.now().toString(36);

  /* ---------------- storage ---------------- */
  const sGet = async (k) => (await chrome.storage.local.get(k))[k];
  let saveTimer = 0;
  const saveState = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => chrome.storage.local.set({ rt_state: state }), 200); };
  const saveSettings = () => chrome.storage.local.set({ settings });
  const saveCustom = () => chrome.storage.local.set({ rt_custom: custom });

  /* ---------------- helpers ---------------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const allDevices = () => DEVICES.concat(custom);
  function getDev(id) {
    if (id === 'responsive') return { id, name: t('responsive'), type: 'responsive', os: state.resp.os || 'none', w: state.resp.w, h: state.resp.h, dpr: state.resp.dpr, cutout: 'none', r: 0 };
    return allDevices().find((d) => d.id === id) || DEVICES[0];
  }
  const curIds = () => (state.mode === 'single' ? [state.deviceId] : state.compare);
  const dimsOf = (dev) => (dev.type === 'responsive' || !state.landscape ? { w: dev.w, h: dev.h } : { w: dev.h, h: dev.w });

  function metrics(dev) {
    const land = state.landscape && dev.type !== 'responsive';
    if (dev.type === 'responsive') return { bz: ZERO, rIn: 8, rOut: 8, bare: true };
    if (!state.frame) { const r = Math.min(dev.r, 28); return { bz: ZERO, rIn: r, rOut: r, bare: true }; }
    let bz, rIn = dev.r;
    if (dev.cutout === 'home') {
      bz = land ? { t: 16, b: 16, l: 60, r: 60 } : { t: 60, b: 60, l: 16, r: 16 };
      rIn = 4;
    } else {
      const b = { phone: 11, foldable: 10, tablet: 16, watch: 14, desktop: 10 }[dev.type] || 10;
      bz = { t: b, r: b, b, l: b };
    }
    return { bz, rIn, rOut: rIn + Math.min(bz.t, bz.l), bare: false };
  }

  /* ---------------- UA profile / rules ---------------- */
  const CHROME = (navigator.userAgent.match(/Chrome\/(\d+)/) || [])[1] || '130';
  function uaProfile(dev) {
    if (dev.os === 'ios') {
      const ipad = dev.type === 'tablet';
      return { os: 'ios', mobile: true, vendor: 'Apple Computer, Inc.', platform: ipad ? 'iPad' : 'iPhone',
        ua: `Mozilla/5.0 (${ipad ? 'iPad; CPU OS' : 'iPhone; CPU iPhone OS'} 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1` };
    }
    if (dev.os === 'android') {
      const mobile = dev.type !== 'tablet' && dev.type !== 'desktop';
      return { os: 'android', mobile, vendor: 'Google Inc.', platform: 'Linux armv81', uaPlatform: 'Android',
        ua: `Mozilla/5.0 (Linux; Android 15; ${(dev.name || 'Android').replace(/[^\w .+-]/g, '')}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME}.0.0.0 ${mobile ? 'Mobile ' : ''}Safari/537.36` };
    }
    return null;
  }
  async function updateRules() {
    const first = getDev(curIds()[0]);
    const prof = settings.spoofUA ? uaProfile(first) : null;
    try {
      const res = await chrome.runtime.sendMessage({ type: 'rules', prof: prof && { ua: prof.ua, os: prof.os, mobile: prof.mobile }, bypass: !!settings.bypass });
      if (res && !res.ok) toast(t('rulesFail') + ': ' + res.error, { duration: 6000 });
    } catch (e) { console.warn(e); }
  }

  /* ---------------- theme / i18n ---------------- */
  const mqDark = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && mqDark.matches);
    const vars = window.RT_THEME.build(settings.seed, dark);
    const st = host.style;
    Object.keys(vars).forEach((k) => st.setProperty(k, vars[k]));
    st.colorScheme = dark ? 'dark' : 'light';
  }
  mqDark.addEventListener('change', () => isOpen && settings.theme === 'system' && applyTheme());
  function lang() { return settings.lang === 'auto' ? RT_I18N.detect() : settings.lang; }
  function hydrate(r = root) {
    $$('[data-icon]', r).forEach((el) => { if (!el.firstChild) el.innerHTML = ic(el.dataset.icon); });
    $$('[data-i18n]', r).forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-title]', r).forEach((el) => { const s = t(el.dataset.i18nTitle); el.title = s; el.setAttribute('aria-label', s); });
    $$('[data-i18n-ph]', r).forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  }

  /* ---------------- toast ---------------- */
  function toast(msg, opt = {}) {
    const el = document.createElement('div');
    el.className = 'toast';
    const sp = document.createElement('span'); sp.textContent = msg; el.appendChild(sp);
    if (opt.action) {
      const b = document.createElement('button'); b.textContent = opt.label || '';
      b.onclick = () => { opt.action(); kill(); }; el.appendChild(b);
    }
    $('#toasts').appendChild(el);
    const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
    setTimeout(kill, opt.duration || 3800);
  }

  /* ---------------- slots ---------------- */
  function frameCfg(dev, dm) {
    const prof = settings.spoofUA ? uaProfile(dev) : null;
    return {
      ua: prof && prof.ua, os: prof && prof.os, mobile: prof ? prof.mobile : undefined, vendor: prof && prof.vendor, platform: prof && prof.platform, uaPlatform: prof && prof.uaPlatform,
      tok: TOKEN, dpr: dev.dpr, sw: dm.w, sh: dm.h, touch: !!state.touch && dev.type !== 'desktop', hideScroll: !!settings.hideScroll
    };
  }
  function send(s, msg) { try { msg.__rt = 1; msg.tok = TOKEN; s.iframe.contentWindow.postMessage(msg, '*'); } catch (e) {} }
  function pushConfig(s) {
    const dev = getDev(s.devId), cfg = frameCfg(dev, dimsOf(dev));
    s.iframe.name = '__rt:' + JSON.stringify(cfg);
    send(s, { type: 'config', cfg });
    return (cfg.ua || '') + '|' + cfg.touch;
  }
  function makeSlot() {
    const el = document.createElement('div');
    el.className = 'slot';
    el.innerHTML = '<div class="cap"><span class="nm"></span><span class="sz"></span><button class="rm" type="button"></button></div>' +
      '<div class="devwrap"><div class="device"><div class="screen"><iframe allow="clipboard-write; fullscreen; geolocation; autoplay; camera; microphone"></iframe><div class="loader"><i></i></div></div></div></div>';
    const s = { el, cap: $('.cap', el), nm: $('.nm', el), sz: $('.sz', el), rm: $('.rm', el), wrap: $('.devwrap', el), device: $('.device', el), screen: $('.screen', el), iframe: $('iframe', el), loader: $('.loader', el), devId: null, sig: '', alive: false, href: '', key: '' };
    s.rm.innerHTML = ic('close'); s.rm.title = t('remove');
    s.rm.onclick = () => toggleCompare(s.devId);
    s.iframe.addEventListener('load', () => {
      s.loader.classList.add('done');
      try { s.iframe.name = s.iframe.name; } catch (e) {}
      clearTimeout(s.hintTimer);
      if (s.iframe.getAttribute('src')) s.hintTimer = setTimeout(() => { if (isOpen && !s.alive && !s.hinted) { s.hinted = true; toast(t('blockedHint'), { duration: 8000 }); } }, 3500);
    });
    canvas.appendChild(el);
    return s;
  }
  function syncSlots() {
    const ids = curIds();
    while (slots.length > ids.length) slots.pop().el.remove();
    while (slots.length < ids.length) slots.push(makeSlot());
    ids.forEach((id, i) => { slots[i].devId = id; });
  }
  function decorate(s, dev, m) {
    const sig = [dev.id, dev.cutout, dev.type, state.landscape, state.frame].join('|');
    if (sig === s.sig) return;
    s.sig = sig;
    $$('.cut,.homebar,.hw,.handle', s.el).forEach((n) => n.remove());
    const add = (parent, cls) => { const d = document.createElement('div'); d.className = cls; parent.appendChild(d); return d; };
    s.device.classList.toggle('land', state.landscape && dev.type !== 'responsive');
    s.device.classList.toggle('bare', m.bare);
    if (!m.bare) {
      if (['island', 'notch', 'punch'].includes(dev.cutout)) add(s.screen, 'cut ' + dev.cutout);
      if (['island', 'notch'].includes(dev.cutout) || (dev.os === 'ios' && dev.type === 'phone' && dev.cutout !== 'home')) add(s.screen, 'homebar');
      if (dev.cutout === 'home') { add(s.device, 'hw speaker'); add(s.device, 'hw hbtn'); }
      if (dev.type === 'watch') add(s.device, 'hw crown');
    }
    if (dev.type === 'responsive') ['e', 's', 'se'].forEach((k) => { const h = add(s.device, 'handle ' + k); h.addEventListener('pointerdown', (e) => startResize(e, k)); });
  }
  function fitZoom(infos) {
    const n = infos.length, sumW = infos.reduce((a, i) => a + i.ow, 0), maxH = Math.max(...infos.map((i) => i.oh));
    const extra = infos[0].dev.type === 'responsive' ? 32 : 0;
    const aw = stage.clientWidth - 64 - (n - 1) * 32 - extra, ah = stage.clientHeight - 28 - 124 - 40 - extra;
    return clamp(Math.min(1, aw / sumW, ah / maxH), 0.05, 1);
  }
  function layout() {
    if (!slots.length) return;
    const infos = slots.map((s) => { const dev = getDev(s.devId), dm = dimsOf(dev), m = metrics(dev); return { s, dev, dm, m, ow: dm.w + m.bz.l + m.bz.r, oh: dm.h + m.bz.t + m.bz.b }; });
    const z = zoomOverride || (state.zoom === 'fit' ? fitZoom(infos) : state.zoom);
    curZoom = z;
    infos.forEach(({ s, dev, dm, m, ow, oh }) => {
      decorate(s, dev, m);
      s.wrap.style.width = ow * z + 'px'; s.wrap.style.height = oh * z + 'px';
      Object.assign(s.device.style, { width: ow + 'px', height: oh + 'px', borderRadius: m.rOut + 'px', transform: `scale(${z})` });
      Object.assign(s.screen.style, { left: m.bz.l + 'px', top: m.bz.t + 'px', width: dm.w + 'px', height: dm.h + 'px', borderRadius: m.rIn + 'px' });
      s.nm.textContent = dev.name; s.sz.textContent = `${dm.w}×${dm.h}`;
      s.rm.style.display = state.mode === 'compare' ? '' : 'none';
      s.cap.style.paddingRight = state.mode === 'compare' ? '6px' : '14px';
    });
    updateToolbar(infos[0]);
  }

  /* ---------------- toolbar ---------------- */
  function updateToolbar(first) {
    const single = state.mode === 'single', dev = first.dev;
    $('#chipName').textContent = single ? dev.name : `${slots.length} ${t('devices').toLowerCase()}`;
    $('#chipIcon').innerHTML = ic(single ? TYPE_ICON[dev.type] || 'mobile' : 'compare');
    $('.dim').style.display = single ? '' : 'none';
    $('#selDpr').style.display = single ? '' : 'none';
    if (single) {
      if (root.activeElement !== $('#inW')) $('#inW').value = first.dm.w;
      if (root.activeElement !== $('#inH')) $('#inH').value = first.dm.h;
      const sel = $('#selDpr'), want = String(dev.dpr);
      if (![...sel.options].some((o) => o.value === want)) sel.add(new Option(want + 'x', want));
      sel.value = want; sel.disabled = dev.type !== 'responsive';
    }
    $('#zoomLabel').textContent = (state.zoom === 'fit' ? t('fit') + ' · ' : '') + Math.round(curZoom * 100) + '%';
    $('#btnFit').setAttribute('aria-pressed', state.zoom === 'fit');
    $('#btnTouch').setAttribute('aria-pressed', !!state.touch);
    $('#btnFrame').setAttribute('aria-pressed', !!state.frame);
    $$('#modeSeg button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === state.mode));
  }
  function setZoom(z) { state.zoom = z === 'fit' ? 'fit' : clamp(Math.round(z * 100) / 100, 0.1, 3); layout(); saveState(); }

  /* ---------------- navigation ---------------- */
  function normalize(u) {
    u = u.trim();
    if (!u) return '';
    if (/^(https?|file):\/\//i.test(u)) return u;
    if (/^(chrome|chrome-extension|edge|about|brave|devtools|view-source):/i.test(u)) return u;
    if (/^(localhost|127\.|10\.|192\.168\.|\[::1\])/i.test(u)) return 'http://' + u;
    return 'https://' + u;
  }
  function loadSlot(s, url) {
    s.loader.classList.remove('done'); s.alive = false; s.hinted = false; s.href = url;
    s.key = pushConfig(s);
    s.iframe.src = url;
  }
  async function go(raw) {
    const url = normalize(raw);
    if (!url) { toast(t('needUrl')); return; }
    if (/^(chrome|chrome-extension|edge|about|brave|devtools|view-source):/i.test(url)) { toast(t('cantEmbed')); return; }
    state.url = url; $('#urlInput').value = url;
    app.classList.remove('has-empty');
    await updateRules();
    syncLock = Date.now() + 2000;
    slots.forEach((s) => loadSlot(s, url));
    layout();
  }
  function reload() {
    syncLock = Date.now() + 2000;
    slots.forEach((s) => { if (s.alive) send(s, { type: 'reload' }); else if (s.href) { s.loader.classList.remove('done'); s.iframe.src = s.href; } });
  }
  const cmd = (type) => { syncLock = Date.now() + 2000; slots.forEach((s) => send(s, { type })); };

  function onMessage(e) {
    if (!isOpen) return;
    const d = e.data;
    if (!d || d.__rt !== 1) return;
    const s = slots.find((x) => x.iframe.contentWindow === e.source);
    if (!s) return;
    if (d.type === 'hello') { s.alive = true; pushConfig(s); }
    else if (d.type === 'nav' && typeof d.href === 'string') {
      s.alive = true; s.href = d.href;
      if (s === slots[0]) {
        state.url = d.href;
        if (root.activeElement !== $('#urlInput')) $('#urlInput').value = d.href;
      }
      if (state.mode === 'compare' && settings.sync && Date.now() > syncLock) {
        syncLock = Date.now() + 1500;
        slots.forEach((o) => { if (o !== s && o.href !== d.href) { o.loader.classList.remove('done'); o.href = d.href; o.iframe.src = d.href; } });
      }
    } else if (d.type === 'scroll' && typeof d.ry === 'number' && state.mode === 'compare' && settings.sync) {
      slots.forEach((o) => { if (o !== s && o.alive) send(o, { type: 'scrollTo', ry: d.ry }); });
    }
  }

  /* ---------------- device actions ---------------- */
  async function applyDevices(reloadIfChanged = true) {
    syncSlots();
    await updateRules();
    slots.forEach((s) => {
      const old = s.key, k = pushConfig(s);
      if (reloadIfChanged && state.url && old && old !== k) { syncLock = Date.now() + 2000; loadSlot(s, s.href || state.url); }
      s.key = k;
    });
    layout(); renderDevices(); saveState();
  }
  function setDevice(id) { state.deviceId = id; applyDevices(); }
  function toggleCompare(id) {
    const i = state.compare.indexOf(id);
    if (i >= 0) { if (state.compare.length <= 1) return toast(t('minCompare')); state.compare.splice(i, 1); }
    else { if (state.compare.length >= MAX_COMPARE) return toast(t('maxCompare')); state.compare.push(id); }
    const before = slots.length;
    applyDevices().then(() => { if (state.url) slots.slice(before).forEach((s) => loadSlot(s, state.url)); });
  }
  async function setMode(m) {
    if (m === state.mode) return;
    state.mode = m;
    if (m === 'compare') {
      state.compare = state.compare.filter((id) => id !== 'responsive');
      if (state.deviceId !== 'responsive' && !state.compare.includes(state.deviceId)) state.compare.unshift(state.deviceId);
      state.compare = state.compare.slice(0, MAX_COMPARE);
    }
    const had = slots.length;
    await applyDevices(false);
    if (state.url) slots.forEach((s, i) => { if (i >= had || m === 'compare' || true) loadSlot(s, state.url); });
  }
  function toResponsive(w, h) {
    const cur = getDev(state.deviceId);
    if (state.deviceId !== 'responsive') { const dm = dimsOf(cur); state.resp = { w: dm.w, h: dm.h, dpr: cur.dpr, os: cur.os, ftype: cur.type }; state.deviceId = 'responsive'; state.landscape = false; }
    if (w) state.resp.w = clamp(Math.round(w), 100, 5000);
    if (h) state.resp.h = clamp(Math.round(h), 100, 5000);
  }
  function rotate() {
    if (state.mode === 'single' && state.deviceId === 'responsive') { const r = state.resp; [r.w, r.h] = [r.h, r.w]; }
    else state.landscape = !state.landscape;
    applyDevices(false);
  }
  function startResize(e, k) {
    e.preventDefault();
    const el = e.currentTarget; el.setPointerCapture(e.pointerId);
    app.classList.add('resizing');
    const z = curZoom, sx = e.clientX, sy = e.clientY, w0 = state.resp.w, h0 = state.resp.h;
    zoomOverride = z;
    const mv = (ev) => {
      if (k.includes('e')) state.resp.w = clamp(Math.round(w0 + (ev.clientX - sx) / z), 100, 5000);
      if (k.includes('s')) state.resp.h = clamp(Math.round(h0 + (ev.clientY - sy) / z), 100, 5000);
      layout();
    };
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); app.classList.remove('resizing'); zoomOverride = 0; applyDevices(false); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
  }

  /* ---------------- device panel ---------------- */
  function renderDevices() {
    const list = $('#devList'); list.innerHTML = '';
    const q = query.trim().toLowerCase(), f = state.filter, single = state.mode === 'single';
    const selected = (id) => (single ? state.deviceId === id : state.compare.includes(id));
    const item = (dev, isCustom) => {
      const b = document.createElement('div'); b.className = 'dev'; b.setAttribute('role', 'option'); b.tabIndex = 0;
      b.setAttribute('aria-selected', selected(dev.id));
      const sel = selected(dev.id);
      const lead = `<div class="lead">${ic(!single && sel ? 'check' : TYPE_ICON[dev.type] || 'mobile')}</div>`;
      const size = dev.type === 'responsive' ? t('responsiveSub') : `${dev.w} × ${dev.h} · ${dev.dpr}x`;
      b.innerHTML = lead + '<div class="meta"><div class="nm"></div><div class="sz"></div></div>';
      $('.nm', b).textContent = dev.name; $('.sz', b).textContent = size;
      if (isCustom) { const eb = document.createElement('button'); eb.className = 'edit'; eb.innerHTML = ic('edit'); eb.title = t('editDevice'); eb.onclick = (ev) => { ev.stopPropagation(); openDeviceDialog(dev); }; b.appendChild(eb); }
      const act = () => { if (single) { if (dev.id === 'responsive') { toResponsive(); applyDevices(); } else setDevice(dev.id); if (innerWidth <= 900) app.classList.add('panel-collapsed'); } else toggleCompare(dev.id); };
      b.onclick = act; b.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); act(); } };
      return b;
    };
    if (single && (f === 'all') && (!q || 'responsive'.includes(q))) list.appendChild(item(getDev('responsive'), false));
    const groups = new Map();
    allDevices().forEach((d) => {
      const isC = !!d.custom;
      if (f === 'custom' ? !isC : (f !== 'all' && d.type !== f)) return;
      if (q && !d.name.toLowerCase().includes(q) && !d.group.toLowerCase().includes(q)) return;
      const g = isC ? t('custom') : d.group;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(d);
    });
    const order = [...groups.keys()].sort((a, b) => (a === t('custom') ? -1 : b === t('custom') ? 1 : 0));
    order.forEach((g) => {
      const h = document.createElement('div'); h.className = 'group-title'; h.textContent = g; list.appendChild(h);
      groups.get(g).forEach((d) => list.appendChild(item(d, !!d.custom)));
    });
    if (!list.children.length) { const n = document.createElement('div'); n.className = 'empty-list'; n.textContent = t('noResults'); list.appendChild(n); }
  }
  function renderChips() {
    const fc = $('#filterChips'); fc.innerHTML = '';
    [['all', 'all'], ['phone', 'phones'], ['tablet', 'tablets'], ['foldable', 'foldables'], ['watch', 'watches'], ['desktop', 'desktops'], ['custom', 'custom']].forEach(([v, k]) => {
      const b = document.createElement('button'); b.className = 'chip'; b.textContent = t(k); b.setAttribute('aria-pressed', state.filter === v);
      b.onclick = () => { state.filter = v; renderChips(); renderDevices(); saveState(); }; fc.appendChild(b);
    });
    const bc = $('#bpChips'); bc.innerHTML = '';
    RT_BREAKPOINTS.forEach((w) => {
      const b = document.createElement('button'); b.className = 'chip'; b.textContent = w;
      b.onclick = async () => { state.mode = 'single'; toResponsive(w); await applyDevices(true); };
      bc.appendChild(b);
    });
  }

  /* ---------------- custom device dialog ---------------- */
  let editing = null;
  function openDeviceDialog(dev) {
    editing = dev && dev.custom ? dev : null;
    $('#deviceTitle').textContent = editing ? t('editDevice') : t('newDevice');
    $('#dName').value = editing ? editing.name : '';
    $('#dW').value = editing ? editing.w : 390; $('#dH').value = editing ? editing.h : 844;
    $('#dDpr').value = editing ? editing.dpr : 2;
    $('#dType').value = editing ? editing.type : 'phone'; $('#dOs').value = editing ? editing.os : 'android';
    $('#dDelete').style.display = editing ? '' : 'none';
    $('#dlgDevice').showModal();
  }
  function bindDeviceForm() {
  $('#deviceForm').addEventListener('submit', () => {
    const o = { name: $('#dName').value.trim(), w: +$('#dW').value, h: +$('#dH').value, dpr: +$('#dDpr').value, type: $('#dType').value, os: $('#dOs').value };
    const isPhone = o.type === 'phone';
    const rec = Object.assign({ group: 'Custom', cutout: isPhone ? 'punch' : 'none', r: isPhone ? 30 : o.type === 'tablet' ? 18 : o.type === 'watch' ? 44 : 6, custom: true }, o);
    if (editing) { Object.assign(editing, rec); }
    else { rec.id = 'custom-' + Date.now(); custom.push(rec); editing = rec; }
    saveCustom(); toast(t('deviceSaved'));
    if (state.mode === 'single') state.deviceId = editing.id; else if (!state.compare.includes(editing.id) && state.compare.length < MAX_COMPARE) state.compare.push(editing.id);
    applyDevices(); editing = null;
  });
  $('#dDelete').onclick = () => {
    if (!editing) return;
    const id = editing.id; custom = custom.filter((d) => d.id !== id); saveCustom();
    if (state.deviceId === id) state.deviceId = 'iphone-16';
    state.compare = state.compare.filter((x) => x !== id); if (!state.compare.length) state.compare = ['iphone-16'];
    $('#dlgDevice').close(); toast(t('deviceDeleted')); editing = null; applyDevices();
  };
  }

  /* ---------------- settings dialog ---------------- */
  function renderSettings() {
    const body = $('#settingsBody'); body.innerHTML = '';
    const sec = (k) => { const d = document.createElement('div'); d.className = 'set-sec'; d.textContent = t(k); body.appendChild(d); };
    const seg = (opts, cur, on) => {
      const g = document.createElement('div'); g.className = 'btn-group seg';
      opts.forEach(([v, label]) => { const b = document.createElement('button'); b.textContent = label; b.setAttribute('aria-pressed', cur === v); b.onclick = () => on(v); g.appendChild(b); });
      body.appendChild(g);
    };
    const sw = (key, title, hint, after) => {
      const r = document.createElement('div'); r.className = 'set-row';
      r.innerHTML = '<div class="tx"><b></b><small></small></div><button class="switch" role="switch"></button>';
      $('b', r).textContent = t(title); $('small', r).textContent = t(hint);
      const b = $('.switch', r); b.setAttribute('aria-checked', !!settings[key]); b.setAttribute('aria-label', t(title));
      b.onclick = async () => { settings[key] = !settings[key]; saveSettings(); b.setAttribute('aria-checked', settings[key]); if (after) await after(); };
      body.appendChild(r);
    };
    sec('appearance');
    seg([['system', t('system')], ['light', t('light')], ['dark', t('dark')]], settings.theme, (v) => { settings.theme = v; saveSettings(); applyTheme(); renderSettings(); });
    const sws = document.createElement('div'); sws.className = 'swatches';
    SEEDS.forEach((c) => { const b = document.createElement('button'); b.className = 'sw'; b.style.background = c; b.setAttribute('aria-label', c); b.setAttribute('aria-pressed', settings.seed.toLowerCase() === c.toLowerCase()); b.onclick = () => { settings.seed = c; saveSettings(); applyTheme(); renderSettings(); }; sws.appendChild(b); });
    const pick = document.createElement('label'); pick.className = 'sw pick'; pick.innerHTML = ic('palette') + '<input type="color">';
    const ci = $('input', pick); ci.value = settings.seed; ci.oninput = () => { settings.seed = ci.value; saveSettings(); applyTheme(); }; ci.onchange = () => renderSettings();
    sws.appendChild(pick); body.appendChild(sws);
    sec('language');
    seg([['auto', 'Auto'], ['en', 'English'], ['vi', 'Tiếng Việt']], settings.lang, (v) => { settings.lang = v; saveSettings(); RT_I18N.set(lang()); hydrate(); renderAll(); renderSettings(); $('#dlgSettings h2').textContent = t('settings'); });
    sec('simulation');
    sw('hideScroll', 'hideScroll', 'hideScrollHint', () => slots.forEach(pushConfig));
    sw('spoofUA', 'spoofUA', 'spoofUAHint', async () => { await updateRules(); slots.forEach(pushConfig); if (state.url) reload(); });
    sw('bypass', 'bypass', 'bypassHint', async () => { await updateRules(); if (state.url) reload(); });
    sw('sync', 'syncScroll', 'syncScrollHint');
    sec('capture');
    sw('copyShot', 'copyShot', 'copyShotHint');
    sec('shortcuts');
    const kb = document.createElement('div'); kb.className = 'kbd-grid';
    [['R', 'kbRotate'], ['F', 'kbFit'], ['C', 'kbCompare'], ['S', 'kbShot'], ['P', 'kbPanel'], ['/', 'kbUrl'], ['+ / −', 'kbZoom']].forEach(([k, l]) => { const d = document.createElement('div'); d.innerHTML = '<span></span><kbd></kbd>'; $('span', d).textContent = t(l); $('kbd', d).textContent = k; kb.appendChild(d); });
    body.appendChild(kb);
    sec('about');
    const ab = document.createElement('div'); ab.className = 'about'; ab.innerHTML = '<p></p><p></p>'; $$('p', ab)[0].textContent = t('aboutBody'); $$('p', ab)[1].textContent = t('limits'); body.appendChild(ab);
  }

  /* ---------------- capture ---------------- */
  const nextFrames = (n = 2) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const stamp = () => new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  const slugOf = (s) => (getDev(s.devId).name || 'device').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  async function screenshot() {
    if (!state.url) return toast(t('needUrl'));
    const jobs = slots.slice();
    app.classList.add('capturing');
    try {
      for (const s of jobs) {
        const target = state.frame && !s.device.classList.contains('bare') ? s.device : s.screen;
        target.scrollIntoView({ block: 'center', inline: 'center' });
        await nextFrames(3);
        const r = target.getBoundingClientRect(), sr = stage.getBoundingClientRect();
        if (r.left < sr.left - 1 || r.top < sr.top - 1 || r.right > sr.right + 1 || r.bottom > sr.bottom + 1) { toast(t('shotCrop')); continue; }
        const cap = await chrome.runtime.sendMessage({ type: 'capture' });
        if (!cap || !cap.ok) throw new Error(cap && cap.error);
        const url = cap.url;
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
        const k = img.naturalWidth / innerWidth;
        const c = document.createElement('canvas'); c.width = Math.round(r.width * k); c.height = Math.round(r.height * k);
        const x = c.getContext('2d');
        const rad = parseFloat(getComputedStyle(target).borderTopLeftRadius) * curZoom * k || 0;
        x.beginPath(); x.roundRect(0, 0, c.width, c.height, rad); x.clip();
        x.drawImage(img, r.left * k, r.top * k, r.width * k, r.height * k, 0, 0, c.width, c.height);
        const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
        const dm = dimsOf(getDev(s.devId));
        download(blob, `${slugOf(s)}_${dm.w}x${dm.h}_${stamp()}.png`);
        if (settings.copyShot && jobs.length === 1) { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); } catch (e) {} }
        if (jobs.length === 1) toast(t('shotSaved'), { label: t('copy'), action: async () => { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast(t('shotCopied')); } catch (e) {} } });
      }
      if (jobs.length > 1) toast(t('shotSaved'));
    } catch (e) { console.warn(e); toast(t('shotFail')); }
    finally { app.classList.remove('capturing'); }
  }

  let rec = null;
  function recRect() {
    let l = 1e9, tp = 1e9, r = -1e9, b = -1e9;
    slots.forEach((s) => {
      const el = state.mode === 'single' ? (state.frame && !s.device.classList.contains('bare') ? s.device : s.screen) : s.wrap;
      const q = el.getBoundingClientRect(); l = Math.min(l, q.left); tp = Math.min(tp, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
    });
    const sr = stage.getBoundingClientRect();
    l = Math.max(l, sr.left); tp = Math.max(tp, sr.top); r = Math.min(r, sr.right); b = Math.min(b, sr.bottom);
    return { x: l, y: tp, w: Math.max(2, r - l), h: Math.max(2, b - tp) };
  }
  async function startRecording(fmt) {
    if (!state.url) return toast(t('needUrl'));
    let stream;
    try { stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' }); }
    catch (e) { return toast(t('recFail')); }
    const v = document.createElement('video'); v.srcObject = stream; v.muted = true; await v.play();
    await nextFrames(4);
    let rc = recRect(); rc = { x: Math.floor(rc.x), y: Math.floor(rc.y), w: Math.floor(rc.w) & ~1, h: Math.floor(rc.h) & ~1 };
    const k = v.videoWidth / innerWidth;
    let scale = k;
    if (fmt === 'gif') scale = Math.min(1, 640 / Math.max(rc.w, rc.h));
    else { const m = Math.max(rc.w * k, rc.h * k); if (m > 1920) scale = k * 1920 / m; }
    const ow = Math.max(2, Math.round(rc.w * scale) & ~1), oh = Math.max(2, Math.round(rc.h * scale) & ~1);
    const cv = document.createElement('canvas'); cv.width = ow; cv.height = oh;
    const cx = cv.getContext('2d', { willReadFrequently: fmt === 'gif' });
    const draw = () => { const q = recRect(); cx.drawImage(v, q.x * k, q.y * k, q.w * k, q.h * k, 0, 0, ow, oh); };
    rec = { fmt, stream, t0: Date.now(), timer: 0, tick: 0, stopped: false };
    const name = `${state.mode === 'single' ? slugOf(slots[0]) : 'compare'}_${stamp()}`;

    if (fmt === 'gif') {
      const gif = new RTGif(ow, oh); let last = performance.now(), busy = false;
      rec.tick = setInterval(() => {
        if (busy) return; busy = true;
        try { draw(); const now = performance.now(); gif.addFrame(cx.getImageData(0, 0, ow, oh).data, Math.min(500, now - last)); last = now; } catch (e) {}
        busy = false;
      }, 100);
      rec.finish = async () => { toast(t('encoding'), { duration: 1500 }); await nextFrames(2); download(gif.finish(), name + '.gif'); };
    } else {
      const types = fmt === 'mp4' ? ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'] : ['video/webm;codecs=vp9', 'video/webm'];
      const mime = types.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const mr = new MediaRecorder(cv.captureStream(30), { mimeType: mime, videoBitsPerSecond: 8e6 });
      const chunks = []; mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.tick = setInterval(draw, 1000 / 30);
      mr.start(500);
      rec.finish = () => new Promise((res) => { mr.onstop = () => { download(new Blob(chunks, { type: mime.split(';')[0] }), name + (mime.includes('mp4') ? '.mp4' : '.webm')); res(); }; mr.stop(); });
    }
    stream.getVideoTracks()[0].addEventListener('ended', stopRecording);
    const btn = $('#btnRec'); btn.classList.add('on');
    const upd = () => { const s = Math.floor((Date.now() - rec.t0) / 1000); btn.innerHTML = ic('stop') + `<span>${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}</span>`; if (s >= 60) { toast(t('recAutoStop')); stopRecording(); } };
    upd(); rec.timer = setInterval(upd, 500);
    toast(t('recStarted'), { duration: 1800 });
  }
  async function stopRecording() {
    if (!rec || rec.stopped) return;
    const r = rec; r.stopped = true; clearInterval(r.timer); clearInterval(r.tick);
    r.stream.getTracks().forEach((x) => x.stop());
    const btn = $('#btnRec'); btn.classList.remove('on'); btn.innerHTML = ic('videocam');
    try { await r.finish(); toast(t('recSaved')); } catch (e) { toast(t('recFail')); }
    rec = null;
  }

  /* ---------------- wiring ---------------- */
  function renderAll() { renderChips(); renderDevices(); layout(); }
  function bind() {
    bindDeviceForm();
    $('#btnPanel').onclick = () => app.classList.toggle('panel-collapsed');
    $('#panelScrim').onclick = () => app.classList.add('panel-collapsed');
    $('#btnDeviceChip').onclick = () => app.classList.remove('panel-collapsed');
    $('#btnBack').onclick = () => cmd('back');
    $('#btnFwd').onclick = () => cmd('forward');
    $('#btnReload').onclick = reload;
    $('#btnGo').onclick = () => go($('#urlInput').value);
    $('#urlInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(e.target.value); if (e.key === 'Escape') e.target.blur(); });
    $('#urlInput').addEventListener('focus', (e) => e.target.select());
    $('#btnClose').onclick = close;
    $('#btnSettings').onclick = () => { renderSettings(); $('#dlgSettings').showModal(); };
    $('#btnAddDevice').onclick = () => openDeviceDialog(null);
    $('#devSearch').oninput = (e) => { query = e.target.value; renderDevices(); };
    $$('#modeSeg button').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
    $('#btnRotate').onclick = rotate;
    $('#btnZoomIn').onclick = () => setZoom(curZoom * 1.15);
    $('#btnZoomOut').onclick = () => setZoom(curZoom / 1.15);
    $('#btnFit').onclick = () => setZoom('fit');
    $('#btnTouch').onclick = () => { state.touch = !state.touch; slots.forEach(pushConfig); layout(); saveState(); };
    $('#btnFrame').onclick = () => { state.frame = !state.frame; layout(); saveState(); };
    $('#btnShot').onclick = screenshot;
    $('#btnRec').onclick = (e) => { e.stopPropagation(); if (rec) stopRecording(); else { const m = $('#recMenu'); m.hidden = !m.hidden; if (!m.hidden) { const q = e.currentTarget.getBoundingClientRect(); m.style.bottom = (innerHeight - q.top + 10) + 'px'; m.style.left = Math.max(8, q.right - 180) + 'px'; } } };
    $$('#recMenu button').forEach((b) => (b.onclick = () => { $('#recMenu').hidden = true; startRecording(b.dataset.fmt); }));
    root.addEventListener('click', (e) => { if (!e.target.closest('.rec-wrap')) $('#recMenu').hidden = true; });
    const dimChange = () => { toResponsive(+$('#inW').value, +$('#inH').value); applyDevices(false); };
    $('#inW').onchange = dimChange; $('#inH').onchange = dimChange;
    [$('#inW'), $('#inH')].forEach((i) => i.addEventListener('keydown', (e) => e.key === 'Enter' && i.blur()));
    const dp = $('#selDpr'); [1, 1.5, 2, 2.5, 3, 3.5, 4].forEach((v) => dp.add(new Option(v + 'x', v)));
    dp.onchange = () => { state.resp.dpr = +dp.value; slots.forEach(pushConfig); saveState(); };
    $$('dialog').forEach((d) => { d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); $$('[data-close]', d).forEach((b) => (b.onclick = () => d.close())); });
    const ro = new ResizeObserver(() => layout()); ro.observe(stage); cleanup.push(() => ro.disconnect());
    stage.addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); setZoom(curZoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
    ['keydown', 'keyup', 'keypress'].forEach((n) => host.addEventListener(n, (e) => e.stopPropagation()));
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !root.querySelector('dialog[open]') && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) { close(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || root.querySelector('dialog[open]')) return;
      const k = e.key.toLowerCase();
      if (k === 'r') rotate(); else if (k === 'f') setZoom('fit'); else if (k === 'c') setMode(state.mode === 'single' ? 'compare' : 'single');
      else if (k === 's') screenshot(); else if (k === 'p') app.classList.toggle('panel-collapsed');
      else if (k === '+' || k === '=') setZoom(curZoom * 1.15); else if (k === '-') setZoom(curZoom / 1.15);
      else if (k === '/') { e.preventDefault(); $('#urlInput').focus(); } else return;
      if (k !== '/') e.preventDefault();
    });
  }

  /* ---------------- overlay lifecycle ---------------- */
  const RES = (p) => chrome.runtime.getURL(p);
  let fontsLoaded = false, cssSheet = null;
  async function loadFonts() {
    if (fontsLoaded) return; fontsLoaded = true;
    try {
      for (const f of ['RobotoFlex-latin.woff2', 'RobotoFlex-vi.woff2']) {
        const buf = await (await fetch(RES('fonts/' + f))).arrayBuffer();
        const face = new FontFace('Roboto Flex', buf, { weight: '100 1000', stretch: '25% 151%', unicodeRange: f.includes('vi') ? 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB' : 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212' });
        document.fonts.add(await face.load());
      }
    } catch (e) { /* falls back to system-ui */ }
  }
  async function loadCss() {
    if (cssSheet) return cssSheet;
    cssSheet = await (await fetch(RES('css/app.css'))).text();
    return cssSheet;
  }

  async function open() {
    if (isOpen) return;
    isOpen = true;
    settings = Object.assign({}, DEF_SETTINGS, (await chrome.storage.local.get('settings')).settings);
    const st = (await chrome.storage.local.get('rt_state')).rt_state || {};
    state = Object.assign({}, DEF_STATE, st, { resp: Object.assign({}, DEF_STATE.resp, st.resp) });
    custom = (await chrome.storage.local.get('rt_custom')).rt_custom || [];
    if (state.deviceId !== 'responsive' && !allDevices().some((d) => d.id === state.deviceId)) state.deviceId = 'iphone-16';
    state.compare = (state.compare || []).filter((id) => allDevices().some((d) => d.id === id));
    if (!state.compare.length) state.compare = DEF_STATE.compare.slice();
    state.landscape = !!state.landscape;
    const startUrl = location.href;

    // media on the host page keeps playing underneath otherwise
    document.querySelectorAll('video,audio').forEach((m) => { try { m.pause(); } catch (e) {} });
    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    host = document.createElement('div');
    host.id = 'responsive-tester-root';
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;display:block;';
    root = host.attachShadow({ mode: 'closed' });
    const css = await loadCss();
    if (window.CSSStyleSheet && root.adoptedStyleSheets !== undefined) { const sh = new CSSStyleSheet(); sh.replaceSync(css); root.adoptedStyleSheets = [sh]; }
    else { const el = document.createElement('style'); el.textContent = css; root.appendChild(el); }
    const wrap = document.createElement('div'); wrap.innerHTML = window.RT_TEMPLATE;
    root.appendChild(wrap.firstElementChild);
    document.documentElement.appendChild(host);
    app = $('#app'); stage = $('#stage'); canvas = $('#canvas');
    app.tabIndex = -1;

    RT_I18N.set(lang());
    loadFonts();
    applyTheme(); hydrate();
    if (innerWidth <= 900) app.classList.add('panel-collapsed');
    slots = []; zoomOverride = 0; syncLock = 0; query = '';
    bind();
    window.addEventListener('message', onMessage); cleanup.push(() => window.removeEventListener('message', onMessage));
    syncSlots(); renderAll();
    await updateRules();
    $('#urlInput').value = startUrl;
    go(startUrl);
    app.focus();
  }

  async function close() {
    if (!isOpen) return;
    isOpen = false;
    if (rec) await stopRecording();
    cleanup.forEach((f) => { try { f(); } catch (e) {} }); cleanup = [];
    slots.forEach((s) => { clearTimeout(s.hintTimer); s.iframe.src = 'about:blank'; });
    slots = [];
    chrome.storage.local.set({ rt_state: state });
    chrome.runtime.sendMessage({ type: 'clearRules' }).catch(() => {});
    host.remove(); host = root = app = stage = canvas = null;
    document.documentElement.style.overflow = prevOverflow;
  }

  window.__rtToggle = () => (isOpen ? close() : open());
  chrome.runtime.onMessage.addListener((m, sender, respond) => { if (m && m.type === 'rt-toggle') { window.__rtToggle(); respond({ ok: true }); } });
  open();
})();
