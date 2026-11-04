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

  const DEF_SETTINGS = { theme: 'system', seed: '#3F5BF6', lang: 'auto', font: 'roboto-flex', fontSize: 'md', hideScroll: true, spoofUA: true, bypass: true, sync: true, copyShot: false };
  const DEF_STATE = { mode: 'single', deviceId: 'iphone-16', resp: { w: 390, h: 844, dpr: 2 }, landscape: false, zoom: 'fit', compare: ['iphone-16', 'pixel-9', 'ipad-air-11'], touch: true, frame: true, filter: 'all', lw: 300, rw: 340 };

  let settings, state, custom = [], isOpen = false, cleanup = [];
  let dprSel = null, typeSel = null, osSel = null, settingsTop = null, animNext = false;
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

  function insetsFor(dev, land) {
    let t = 0, b = 0, l = 0, r = 0;
    if (dev.type === 'phone' || dev.type === 'foldable') {
      if (dev.os === 'ios') {
        if (dev.cutout === 'island' || dev.cutout === 'notch') { if (!land) { t = dev.cutout === 'island' ? (dev.r >= 58 ? 62 : 54) : (dev.r >= 47 ? 47 : 44); b = 34; } else { l = 47; r = 47; b = 21; } }
        else if (dev.cutout === 'home') t = land ? 0 : 20;
      } else if (!land) { t = dev.type === 'foldable' && dev.w > 600 ? 28 : 32; b = 20; } else t = 24;
    } else if (dev.type === 'tablet') { t = 24; b = dev.os === 'ios' ? 20 : 0; }
    return { t, r, b, l };
  }
  /* ---------------- device skins (frame look per device family) ---------------- */
  const METAL = {
    titanium: 'linear-gradient(135deg,#dcd7cc 0%,#9d988d 22%,#d1ccc2 48%,#8e897f 74%,#bbb6ab 100%)',
    midnight: 'linear-gradient(135deg,#5d626e 0%,#2c2f38 30%,#4d525e 55%,#272931 100%)',
    graphite: 'linear-gradient(135deg,#6d7078 0%,#35373c 30%,#5d6067 55%,#2d2e32 100%)',
    silver: 'linear-gradient(135deg,#eef0f3 0%,#b9bcc3 28%,#e5e7eb 52%,#a6a9b0 100%)',
    sgray: 'linear-gradient(135deg,#8f9299 0%,#5d5f65 30%,#868990 55%,#575960 100%)',
    obsidian: 'linear-gradient(135deg,#4c4e55 0%,#27282c 35%,#3f4147 60%,#222327 100%)',
    black: 'linear-gradient(135deg,#34353a,#111113)',
    imac: 'linear-gradient(135deg,#d3deee,#aebfd6)'
  };
  const U = (v) => ({ t: v, r: v, b: v, l: v });
  function skinOf(dev, land) {
    const n = dev.name || '', os = dev.os, type = dev.type, pro = /Pro|Ultra/.test(n);
    const sk = { kind: 'generic', band: METAL.graphite, bandW: 3, bz: U(10), rIn: dev.r, glass: '#050507', buttons: [], btnW: 3, extraH: 0 };
    if (type === 'watch') {
      Object.assign(sk, { kind: 'watch', band: /Ultra/.test(n) ? METAL.titanium : METAL.graphite, bz: { t: 15, b: 15, l: 13, r: 13 }, strap: true, buttons: [{ side: 'r', pos: 0.26, len: 30, w: 6 }, { side: 'r', pos: 0.6, len: 22 }] });
    } else if (type === 'desktop') {
      if (/MacBook/.test(n)) Object.assign(sk, { kind: 'laptop', band: METAL.silver, bandW: 2, bz: { t: 13, r: 10, b: 15, l: 10 }, rIn: 8, glass: '#030304', notch: 'mbnotch', deck: true, extraH: 15 });
      else if (/Laptop/.test(n)) Object.assign(sk, { kind: 'laptop', band: METAL.sgray, bandW: 2, bz: { t: 15, r: 12, b: 17, l: 12 }, rIn: 6, cam: true, deck: true, extraH: 15 });
      else if (/iMac/.test(n)) Object.assign(sk, { kind: 'imac', band: METAL.imac, bandW: 3, bz: { t: 18, r: 18, b: 74, l: 18 }, inner: { t: 3, r: 3, b: 74, l: 3 }, rIn: 4, glass: '#f4f4f6', stand: true, extraH: 52, neck: 'linear-gradient(90deg,#b6c4d9,#e2eaf5 45%,#b6c4d9)', foot: 'linear-gradient(#d3deee,#a3b3cb)' });
      else Object.assign(sk, { kind: 'monitor', band: METAL.black, bandW: 2, bz: { t: 16, r: 16, b: 40, l: 16 }, rIn: 3, glass: '#060607', stand: true, extraH: 52, neck: 'linear-gradient(90deg,#26272b,#4b4d55 45%,#26272b)', foot: 'linear-gradient(#4b4d55,#202125)' });
    } else if (type === 'tablet' && os === 'ios') {
      const home = dev.cutout === 'home';
      Object.assign(sk, { kind: 'ipad', band: /Pro/.test(n) ? METAL.graphite : /mini/.test(n) ? METAL.sgray : METAL.silver, bz: home ? (land ? { t: 20, b: 20, l: 72, r: 72 } : { t: 72, b: 72, l: 20, r: 20 }) : U(/Pro/.test(n) ? 13 : 15), rIn: home ? 6 : dev.r, cam: !home, buttons: [{ side: 't', pos: 0.86, len: 30 }, { side: 'r', pos: 0.09, len: 38 }, { side: 'r', pos: 0.16, len: 38 }] });
    } else if (type === 'tablet') {
      Object.assign(sk, { kind: 'tablet', band: os === 'android' ? METAL.graphite : METAL.sgray, bandW: 2.5, bz: U(15), rIn: Math.min(dev.r, 16), cam: true, buttons: [{ side: 'r', pos: 0.2, len: 34 }, { side: 'r', pos: 0.3, len: 60 }] });
    } else if (type === 'foldable') {
      Object.assign(sk, { kind: 'foldable', band: METAL.silver, bz: U(10), crease: dev.w > 600, buttons: [{ side: 'r', pos: 0.2, len: 70 }, { side: 'r', pos: 0.36, len: 36 }] });
    } else if (os === 'ios') {
      if (dev.cutout === 'home') {
        Object.assign(sk, { kind: 'iphone-home', band: /SE \(3|8/.test(n) ? METAL.silver : METAL.sgray, bz: land ? { t: 16, b: 16, l: 60, r: 60 } : { t: 60, b: 60, l: 16, r: 16 }, rIn: 4, rOut: 36, buttons: [{ side: 'l', pos: 0.12, len: 16 }, { side: 'l', pos: 0.2, len: 32 }, { side: 'l', pos: 0.29, len: 32 }, { side: 'r', pos: 0.2, len: 50 }] });
      } else {
        const glassW = dev.cutout === 'island' ? 6 : 8, old = /iPhone X|iPhone 11$|11 Pro/.test(n) || /iPhone X/.test(n);
        const b = [{ side: 'l', pos: 0.13, len: 20 }, { side: 'l', pos: 0.21, len: 36 }, { side: 'l', pos: 0.3, len: 36 }, { side: 'r', pos: 0.26, len: 62 }];
        if (/iPhone 1[67]\b|iPhone 1[67] /.test(n) && !/16e/.test(n)) b.push({ side: 'r', pos: 0.58, len: 42 });
        Object.assign(sk, { kind: 'iphone', band: pro ? METAL.titanium : /Air/.test(n) ? METAL.silver : old ? METAL.graphite : METAL.midnight, bz: U(3 + glassW), buttons: b });
      }
    } else if (/^Pixel/.test(n)) {
      Object.assign(sk, { kind: 'pixel', band: METAL.obsidian, bz: U(10), buttons: [{ side: 'r', pos: 0.2, len: 42, color: '#e6c8b4' }, { side: 'r', pos: 0.31, len: 76 }] });
    } else if (/Galaxy/.test(n)) {
      Object.assign(sk, { kind: 'samsung', band: /Ultra|S2[45]/.test(n) ? METAL.sgray : METAL.graphite, bandW: 2.5, bz: U(9), rIn: /Ultra/.test(n) ? Math.min(dev.r, 24) : dev.r, buttons: [{ side: 'r', pos: 0.2, len: 54 }, { side: 'r', pos: 0.33, len: 34 }] });
      if (dev.cutout === 'home') Object.assign(sk, { bz: land ? { t: 14, b: 14, l: 54, r: 54 } : { t: 54, b: 54, l: 14, r: 14 }, rIn: 4, rOut: 30, kind: 'samsung-home' });
    } else {
      Object.assign(sk, { kind: 'android', band: METAL.graphite, bandW: 2.5, bz: U(10), buttons: [{ side: 'r', pos: 0.22, len: 40 }, { side: 'r', pos: 0.33, len: 66 }] });
    }
    sk.inner = sk.inner || U(sk.bandW);
    sk.rOut = sk.rOut != null ? sk.rOut : sk.rIn + Math.min(sk.bz.t, sk.bz.l);
    return sk;
  }
  function metrics(dev) {
    const land = state.landscape && dev.type !== 'responsive';
    if (dev.type === 'responsive') return { bz: ZERO, rIn: 8, rOut: 8, bare: true, inset: ZERO, extraH: 0 };
    if (!state.frame) { const r = Math.min(dev.r, 28); return { bz: ZERO, rIn: r, rOut: r, bare: true, inset: ZERO, extraH: 0 }; }
    const sk = skinOf(dev, land);
    return { bz: sk.bz, rIn: sk.rIn, rOut: sk.rOut, bare: false, inset: insetsFor(dev, land), skin: sk, extraH: sk.extraH };
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
      if (res && !res.ok) toast(t('rulesFail') + ': ' + res.error, 'error');
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
    st.setProperty('--rt-success-bg', dark ? '#1d4a2b' : '#d7f3dc'); st.setProperty('--rt-success-fg', dark ? '#c5f2d0' : '#0b3d1a');
    st.setProperty('--rt-warning-bg', dark ? '#4d3a00' : '#ffecc2'); st.setProperty('--rt-warning-fg', dark ? '#ffe39a' : '#4a3500');
  }
  /* typography: font family + text size */
  const FONTS = {
    'system': { stack: 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif' },
    'arial': { stack: 'Arial,Helvetica,sans-serif' },
    'google-sans-flex': { name: 'RT Google Sans Flex', files: [['GoogleSansFlex-latin.woff2', 'L', '100 1000'], ['GoogleSansFlex-vi.woff2', 'V', '100 1000']] },
    'roboto-flex': { name: 'Roboto Flex', files: [['RobotoFlex-latin.woff2', 'L', '100 1000', '25% 151%'], ['RobotoFlex-vi.woff2', 'V', '100 1000', '25% 151%']] },
    'roboto': { name: 'RT Roboto', files: [400, 500, 600, 700].flatMap((w) => [['Roboto-latin-' + w + '.woff2', 'L', String(w)], ['Roboto-vi-' + w + '.woff2', 'V', String(w)]]) },
    'inter': { name: 'RT Inter', files: [['Inter-latin.woff2', 'L', '100 900'], ['Inter-vi.woff2', 'V', '100 900']] },
    'be-vietnam-pro': { name: 'RT Be Vietnam Pro', files: [400, 500, 600, 700].flatMap((w) => [['BeVietnamPro-latin-' + w + '.woff2', 'L', String(w)], ['BeVietnamPro-vi-' + w + '.woff2', 'V', String(w)]]) }
  };
  const FONT_LABEL = { 'system': 'System', 'google-sans-flex': 'Google Sans Flex', 'roboto-flex': 'Roboto Flex', 'roboto': 'Roboto', 'arial': 'Arial', 'inter': 'Inter', 'be-vietnam-pro': 'Be Vietnam Pro' };
  const UR = { L: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2212', V: 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB' };
  const fontReady = {};
  async function ensureFont(key) {
    const f = FONTS[key]; if (!f || !f.name || fontReady[key]) return; fontReady[key] = true;
    try {
      await Promise.all(f.files.map(async ([file, ur, weight, stretch]) => {
        const buf = await (await fetch(chrome.runtime.getURL('fonts/' + file))).arrayBuffer();
        const d = { weight, unicodeRange: UR[ur] }; if (stretch) d.stretch = stretch;
        const face = new FontFace(f.name, buf, d); document.fonts.add(await face.load());
      }));
    } catch (e) { fontReady[key] = false; }
  }
  function applyTypography() {
    const key = FONTS[settings.font] ? settings.font : 'roboto-flex', f = FONTS[key];
    ensureFont(key);
    host.style.setProperty('--font', (f.name ? '"' + f.name + '",' : '') + (f.stack || 'system-ui,-apple-system,"Segoe UI",sans-serif'));
    host.style.setProperty('--ui-zoom', { sm: 0.92, md: 1, lg: 1.12 }[settings.fontSize] || 1);
  }
  mqDark.addEventListener('change', () => isOpen && settings.theme === 'system' && applyTheme());
  function lang() { return settings.lang === 'auto' ? RT_I18N.detect() : settings.lang; }
  function hydrate(r = root) {
    $$('[data-icon]', r).forEach((el) => { if (!el.firstChild) el.innerHTML = ic(el.dataset.icon); });
    $$('[data-i18n]', r).forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-title]', r).forEach((el) => { const s = t(el.dataset.i18nTitle); el.dataset.tip = s; el.setAttribute('aria-label', s); });
    $$('[data-i18n-ph]', r).forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  }

  /* ---------------- custom select (theme aware, scrollable) ---------------- */
  const openMenus = [];
  const uiZoom = () => ({ sm: 0.92, md: 1, lg: 1.12 }[settings.fontSize] || 1);
  function closeMenus() { openMenus.slice().forEach((f) => f()); }
  function makeSelect(hostEl, o) {
    let options = o.options || [], value = o.value, menu = null, hl = -1, disabled = false;
    hostEl.classList.add('select'); hostEl.innerHTML = '';
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'sel-btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    if (o.label) btn.setAttribute('aria-label', o.label);
    btn.innerHTML = '<span class="sel-val"></span>' + ic('keyboard_arrow_down');
    hostEl.appendChild(btn);
    const labelOf = (v) => { const f = options.find((x) => String(x.v) === String(v)); return f ? f.label : String(v == null ? '' : v); };
    const paint = () => { $('.sel-val', btn).textContent = labelOf(value); };
    function close() {
      if (!menu) return;
      menu.remove(); menu = null; hostEl.classList.remove('open'); btn.setAttribute('aria-expanded', 'false');
      const i = openMenus.indexOf(close); if (i >= 0) openMenus.splice(i, 1);
      root.removeEventListener('pointerdown', outside, true);
    }
    function outside(e) { if (menu && !menu.contains(e.target) && !hostEl.contains(e.target)) close(); }
    function place() {
      const z = uiZoom(), r = btn.getBoundingClientRect(), inDlg = menu.parentNode.tagName === 'DIALOG';
      menu.style.zoom = inDlg ? '' : String(z);
      menu.style.minWidth = Math.max(r.width / z, 140) + 'px';
      menu.style.maxHeight = '';
      const below = innerHeight - r.bottom - 14, above = r.top - 14;
      let h = menu.getBoundingClientRect().height;
      const up = h > below && above > below;
      const room = Math.max(120, up ? above : below);
      menu.style.maxHeight = Math.min(260 * z, room) / z + 'px';
      h = menu.getBoundingClientRect().height;
      const w = menu.getBoundingClientRect().width;
      menu.classList.toggle('up', up);
      menu.style.left = clamp(r.left, 8, Math.max(8, innerWidth - w - 8)) / z + 'px';
      menu.style.top = (up ? r.top - h - 6 : r.bottom + 6) / z + 'px';
    }
    function setHl(i, scroll = true) {
      const items = $$('.sel-opt', menu); hl = clamp(i, 0, items.length - 1);
      items.forEach((n, k) => n.classList.toggle('hl', k === hl));
      if (scroll && items[hl] && items[hl].scrollIntoView) items[hl].scrollIntoView({ block: 'nearest' });
    }
    function pick(v) { value = v; paint(); close(); btn.focus(); if (o.onChange) o.onChange(String(v)); }
    function open() {
      if (menu || disabled) return;
      closeMenus();
      menu = document.createElement('div'); menu.className = 'sel-menu'; menu.setAttribute('role', 'listbox');
      options.forEach((op, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'sel-opt'; b.setAttribute('role', 'option');
        b.setAttribute('aria-selected', String(op.v) === String(value));
        b.innerHTML = '<span></span>' + ic('check'); $('span', b).textContent = op.label;
        b.onclick = () => pick(op.v); b.onpointermove = () => { if (hl !== i) setHl(i, false); };
        menu.appendChild(b);
      });
      (btn.closest('dialog') || app).appendChild(menu);
      hostEl.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
      place();
      const si = Math.max(0, options.findIndex((x) => String(x.v) === String(value)));
      setHl(si);
      openMenus.push(close);
      root.addEventListener('pointerdown', outside, true);
    }
    btn.addEventListener('click', () => (menu ? close() : open()));
    btn.addEventListener('keydown', (e) => {
      const k = e.key;
      if (!menu) { if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); open(); } return; }
      if (k === 'ArrowDown') { e.preventDefault(); setHl(hl + 1); }
      else if (k === 'ArrowUp') { e.preventDefault(); setHl(hl - 1); }
      else if (k === 'Home') { e.preventDefault(); setHl(0); }
      else if (k === 'End') { e.preventDefault(); setHl(options.length - 1); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (options[hl]) pick(options[hl].v); }
      else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (k === 'Tab') close();
    });
    paint();
    return {
      get value() { return value == null ? '' : String(value); },
      setValue(v) { value = v; paint(); },
      setOptions(op) { options = op; paint(); },
      ensure(v, label) { if (!options.some((x) => String(x.v) === String(v))) { options = options.concat([{ v: String(v), label: label || String(v) }]); } },
      setDisabled(d) { disabled = !!d; btn.disabled = disabled; hostEl.classList.toggle('disabled', disabled); if (d) close(); },
      close
    };
  }

  /* ---------------- ripple, scroll-to-top, pulse ---------------- */
  const RIPPLE_SEL = '.icon-btn,.btn-icon,.tbtn,.chip,.chip-btn,.dev,.btn,.seg>button,.go-btn,.menu button,.sel-btn,.sel-opt,.acc-h,.tobtn';
  function bindRipple() {
    root.addEventListener('pointerdown', (e) => {
      const el = e.target.closest && e.target.closest(RIPPLE_SEL);
      if (!el || el.disabled || e.button > 0) return;
      const r = el.getBoundingClientRect(), zx = el.offsetWidth ? r.width / el.offsetWidth : 1;
      const size = Math.max(el.offsetWidth, el.offsetHeight) * 2.4;
      const sp = document.createElement('span'); sp.className = 'ripple';
      sp.style.cssText = `width:${size}px;height:${size}px;left:${(e.clientX - r.left) / zx - size / 2}px;top:${(e.clientY - r.top) / zx - size / 2}px`;
      el.appendChild(sp); setTimeout(() => sp.remove(), 620);
    }, true);
  }
  function attachToTop(scroller, parent, sticky) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tobtn' + (sticky ? ' sticky' : '');
    b.innerHTML = ic('keyboard_arrow_down'); b.dataset.tip = t('toTop'); b.setAttribute('aria-label', t('toTop'));
    parent.appendChild(b);
    const upd = () => b.classList.toggle('show', scroller.scrollTop > 240);
    scroller.addEventListener('scroll', upd, { passive: true });
    b.onclick = () => scroller.scrollTo({ top: 0, behavior: 'smooth' });
    upd(); return b;
  }
  function pulse(s) { s.el.classList.remove('swap'); void s.el.offsetWidth; s.el.classList.add('swap'); setTimeout(() => s.el.classList.remove('swap'), 560); }

  /* ---------------- toast (info / success / warning / error) ---------------- */
  const TOAST_ICON = { info: 'info', success: 'check_circle', warning: 'warning', error: 'error' };
  function toast(msg, a, b) {
    if (!root) return;
    const type = typeof a === 'string' ? a : 'info', opt = (typeof a === 'string' ? b : a) || {};
    const box = $('#toasts');
    const dup = [...box.children].find((n) => n.dataset.msg === msg);
    if (dup) { dup.remove(); }
    while (box.children.length >= 3) box.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast ' + type; el.dataset.msg = msg; el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = '<span class="t-ic">' + ic(TOAST_ICON[type] || 'info') + '</span><span class="t-msg"></span>';
    $('.t-msg', el).textContent = msg;
    let timer = 0;
    const kill = () => { clearTimeout(timer); el.classList.add('out'); setTimeout(() => el.remove(), 240); };
    if (opt.action) { const b2 = document.createElement('button'); b2.textContent = opt.label || ''; b2.onclick = () => { opt.action(); kill(); }; el.appendChild(b2); }
    const x = document.createElement('button'); x.className = 't-x'; x.innerHTML = ic('close'); x.setAttribute('aria-label', t('close')); x.onclick = kill; el.appendChild(x);
    box.appendChild(el);
    timer = setTimeout(kill, opt.duration || (type === 'error' || type === 'warning' ? 6000 : 3500));
  }

  /* ---------------- tooltip ---------------- */
  function bindTooltip() {
    const tip = $('#tip'); let timer = 0, cur = null;
    const hide = () => { clearTimeout(timer); tip.classList.remove('show'); cur = null; };
    const show = (el) => {
      tip.innerHTML = ''; const sp = document.createElement('span'); sp.textContent = el.dataset.tip; tip.appendChild(sp);
      if (el.dataset.key) { const k = document.createElement('kbd'); k.textContent = el.dataset.key; tip.appendChild(k); }
      const r = el.getBoundingClientRect(), tr = tip.getBoundingClientRect();
      let x = r.left + r.width / 2 - tr.width / 2, y = r.bottom + 8;
      if (y + tr.height > innerHeight - 8) y = r.top - tr.height - 8;
      x = clamp(x, 8, innerWidth - tr.width - 8);
      tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('show');
    };
    root.addEventListener('pointerover', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el === cur) return;
      hide(); if (!el) return; cur = el;
      timer = setTimeout(() => show(el), 380);
    });
    root.addEventListener('pointerdown', hide, true);
    root.addEventListener('scroll', hide, true);
    root.addEventListener('pointerleave', hide);
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
    send(s, { type: 'config', cfg });
    return (cfg.ua || '') + '|' + cfg.touch;
  }
  function makeSlot(devId) {
    const el = document.createElement('div');
    el.className = 'slot';
    el.innerHTML = '<div class="cap"><span class="nm"></span><span class="sz"></span><button class="rm" type="button"></button></div>' +
      '<div class="devwrap"><div class="device"><div class="screen"><div class="loader"><i></i></div></div></div></div>';
    // The frame name must exist when the iframe is created: Chrome does not apply later changes.
    const iframe = document.createElement('iframe');
    const dev0 = getDev(devId);
    iframe.name = '__rt:' + JSON.stringify(frameCfg(dev0, dimsOf(dev0)));
    iframe.setAttribute('allow', 'clipboard-write; fullscreen; geolocation; autoplay; camera; microphone');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-pointer-lock allow-presentation');
    $('.screen', el).insertBefore(iframe, $('.loader', el));
    const s = { el, cap: $('.cap', el), nm: $('.nm', el), sz: $('.sz', el), rm: $('.rm', el), wrap: $('.devwrap', el), device: $('.device', el), screen: $('.screen', el), iframe, loader: $('.loader', el), devId, sig: '', alive: false, href: '', key: '' };
    s.rm.innerHTML = ic('close'); s.rm.dataset.tip = t('remove');
    s.rm.onclick = () => toggleCompare(s.devId);
    iframe.addEventListener('load', () => {
      s.loader.classList.add('done');
      clearTimeout(s.hintTimer);
      if (iframe.getAttribute('src')) s.hintTimer = setTimeout(() => { if (isOpen && !s.alive && !s.hinted) { s.hinted = true; toast(t('blockedHint'), 'warning'); } }, 5000);
    });
    canvas.appendChild(el);
    return s;
  }
  function syncSlots() {
    const ids = curIds();
    while (slots.length > ids.length) slots.pop().el.remove();
    while (slots.length < ids.length) slots.push(makeSlot(ids[slots.length]));
    ids.forEach((id, i) => { if (slots[i].devId !== id && slots[i].sig) pulse(slots[i]); slots[i].devId = id; });
  }
  const SVG_SIG = '<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>';
  const SVG_WIFI = '<svg viewBox="0 0 16 12"><path d="M8 11.4 5.6 8.9a3.4 3.4 0 0 1 4.8 0L8 11.4Zm-4.2-4.3 1.2 1.2a4.6 4.6 0 0 1 6 0l1.2-1.2a6.3 6.3 0 0 0-8.4 0ZM.9 4.2 2 5.4a8.7 8.7 0 0 1 12 0l1.1-1.2a10.3 10.3 0 0 0-14.2 0Z"/></svg>';
  const SVG_BATT = '<svg viewBox="0 0 26 12"><rect x=".5" y=".5" width="22" height="11" rx="3.2" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="19" height="8" rx="2"/><rect x="23.6" y="4" width="2" height="4" rx="1" opacity=".5"/></svg>';
  function addButtons(s, sk, land) {
    const w = sk.btnW;
    (sk.buttons || []).forEach((bt) => {
      const d = document.createElement('div'); d.className = 'hw sbtn'; d.style.background = bt.color || sk.band;
      const bw = bt.w || w, p = bt.pos * 100;
      let css;
      if (!land) css = bt.side === 'l' ? `left:${-bw + 0.5}px;width:${bw}px;top:${p}%;height:${bt.len}px;` : bt.side === 'r' ? `right:${-bw + 0.5}px;width:${bw}px;top:${p}%;height:${bt.len}px;` : `top:${-bw + 0.5}px;height:${bw}px;left:${p}%;width:${bt.len}px;`;
      else css = bt.side === 'l' ? `top:${-bw + 0.5}px;height:${bw}px;right:${p}%;width:${bt.len}px;` : bt.side === 'r' ? `bottom:${-bw + 0.5}px;height:${bw}px;right:${p}%;width:${bt.len}px;` : `right:${-bw + 0.5}px;width:${bw}px;top:${p}%;height:${bt.len}px;`;
      d.style.cssText += css; s.device.appendChild(d);
    });
  }
  function decorate(s, dev, m) {
    const sig = [dev.id, dev.cutout, dev.type, dev.os, state.landscape, state.frame, m.inset.t, m.inset.b, m.inset.l, m.skin && m.skin.kind].join('|');
    if (sig === s.sig) return;
    s.sig = sig;
    $$('.cut,.sysbar,.hw,.handle,.deck,.stand-neck,.stand-foot,.strap,.crease', s.el).forEach((n) => n.remove());
    const add = (parent, cls, html) => { const d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; parent.appendChild(d); return d; };
    const land = state.landscape && dev.type !== 'responsive';
    s.device.classList.toggle('land', land);
    s.device.classList.toggle('bare', m.bare);
    const st = s.device.style;
    if (m.bare) { st.background = ''; ['--it', '--ir', '--ib', '--il', '--rb', '--glass', '--deck', '--neck', '--foot'].forEach((k) => st.removeProperty(k)); }
    else {
      const sk = m.skin;
      st.background = sk.band;
      st.setProperty('--it', sk.inner.t + 'px'); st.setProperty('--ir', sk.inner.r + 'px'); st.setProperty('--ib', sk.inner.b + 'px'); st.setProperty('--il', sk.inner.l + 'px');
      st.setProperty('--rb', Math.max(0, m.rOut - sk.bandW) + 'px'); st.setProperty('--glass', sk.glass);
      if (sk.neck) st.setProperty('--neck', sk.neck); else st.removeProperty('--neck');
      if (sk.foot) st.setProperty('--foot', sk.foot); else st.removeProperty('--foot');
      if (sk.kind === 'imac') st.setProperty('--deck', sk.foot); else st.removeProperty('--deck');
      if (['island', 'notch', 'punch'].includes(dev.cutout) && !sk.notch) add(s.screen, 'cut ' + dev.cutout);
      if (sk.notch) add(s.screen, 'cut ' + sk.notch);
      const and = dev.os === 'android' ? ' android' : '';
      if (m.inset.t) add(s.screen, 'sysbar top' + and, '<span class="tm">9:41</span><span class="ico">' + SVG_SIG + SVG_WIFI + SVG_BATT + '</span>').style.height = m.inset.t + 'px';
      if (m.inset.b) add(s.screen, 'sysbar bottom' + and, '<span class="homebar"></span>').style.height = m.inset.b + 'px';
      if (dev.cutout === 'home') { add(s.device, 'hw speaker'); add(s.device, 'hw hbtn'); }
      addButtons(s, sk, land);
      if (sk.cam) { const c = add(s.device, 'hw cam'); if (!land) { c.style.left = '50%'; c.style.top = sk.bz.t / 2 + 'px'; } else { c.style.left = sk.bz.l / 2 + 'px'; c.style.top = '50%'; } }
      if (sk.deck) add(s.device, 'deck');
      if (sk.stand) { add(s.device, 'stand-neck'); add(s.device, 'stand-foot'); }
      if (sk.strap) { add(s.device, 'strap top'); add(s.device, 'strap bot'); }
      if (sk.crease) add(s.screen, 'crease');
    }
    if (dev.type === 'responsive') ['e', 's', 'se'].forEach((k) => { const h = add(s.device, 'handle ' + k); h.addEventListener('pointerdown', (e) => startResize(e, k)); });
  }
  function fitZoom(infos) {
    const n = infos.length, sumW = infos.reduce((a, i) => a + i.ow, 0), maxH = Math.max(...infos.map((i) => i.oh + (i.m.extraH || 0)));
    const extra = infos[0].dev.type === 'responsive' ? 32 : 0;
    const aw = stage.clientWidth - 24 - (n - 1) * 24 - extra, ah = stage.clientHeight - 24 - (state.mode === 'compare' ? 42 : 0) - extra;
    return clamp(Math.min(1.5, aw / sumW, ah / maxH), 0.05, 1.5);
  }
  function layout() {
    if (!slots.length) return;
    const infos = slots.map((s) => { const dev = getDev(s.devId), dm = dimsOf(dev), m = metrics(dev); return { s, dev, dm, m, ow: dm.w + m.bz.l + m.bz.r, oh: dm.h + m.bz.t + m.bz.b }; });
    const z = zoomOverride || (state.zoom === 'fit' ? fitZoom(infos) : state.zoom);
    curZoom = z;
    app.classList.toggle('is-compare', state.mode === 'compare');
    infos.forEach(({ s, dev, dm, m, ow, oh }) => {
      decorate(s, dev, m);
      s.wrap.style.width = ow * z + 'px'; s.wrap.style.height = (oh + (m.extraH || 0)) * z + 'px'; s.extraH = m.extraH || 0;
      Object.assign(s.device.style, { width: ow + 'px', height: oh + 'px', borderRadius: m.rOut + 'px', transform: `scale(${z})` });
      Object.assign(s.screen.style, { left: m.bz.l + 'px', top: m.bz.t + 'px', width: dm.w + 'px', height: dm.h + 'px', borderRadius: m.rIn + 'px' });
      Object.assign(s.iframe.style, { left: m.inset.l + 'px', top: m.inset.t + 'px', width: Math.max(1, dm.w - m.inset.l - m.inset.r) + 'px', height: Math.max(1, dm.h - m.inset.t - m.inset.b) + 'px' });
      s.nm.textContent = dev.name; s.sz.textContent = `${dm.w}×${dm.h}`;
      s.rm.style.display = state.mode === 'compare' ? '' : 'none';
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
      const want = String(dev.dpr);
      dprSel.ensure(want, want + 'x'); dprSel.setValue(want); dprSel.setDisabled(dev.type !== 'responsive');
    }
    $('#zoomLabel').textContent = (state.zoom === 'fit' ? t('fit') + ' · ' : '') + Math.round(curZoom * 100) + '%';
    $('#btnFit').setAttribute('aria-pressed', state.zoom === 'fit');
    $('#btnTouch').setAttribute('aria-pressed', !!state.touch);
    $('#btnFrame').setAttribute('aria-pressed', !!state.frame);
    $('#btnScroll').setAttribute('aria-pressed', !settings.hideScroll);
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
    clearTimeout(s.loadTimer); clearTimeout(s.slowTimer);
    s.loadTimer = setTimeout(() => s.loader.classList.add('done'), 3000);
    s.slowTimer = setTimeout(() => { if (isOpen && !s.alive && !s.hinted) { s.hinted = true; toast(t('slowHint'), 'warning'); } }, 12000);
    s.screen.style.removeProperty('--bar-bg'); s.screen.style.removeProperty('--bar-fg');
    s.key = pushConfig(s);
    s.iframe.src = url;
  }
  async function go(raw) {
    const url = normalize(raw);
    if (!url) { toast(t('needUrl'), 'warning'); return; }
    if (/^(chrome|chrome-extension|edge|about|brave|devtools|view-source):/i.test(url)) { toast(t('cantEmbed'), 'error'); return; }
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
    if (d.type === 'hello') { s.alive = true; s.loader.classList.add('done'); pushConfig(s); }
    else if (d.type === 'theme' && typeof d.bg === 'string') applyBars(s, d.bg);
    else if (d.type === 'nav' && typeof d.href === 'string') {
      s.alive = true; s.href = d.href; s.loader.classList.add('done');
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
    if (i >= 0) { if (state.compare.length <= 1) return toast(t('minCompare'), 'warning'); state.compare.splice(i, 1); }
    else { if (state.compare.length >= MAX_COMPARE) return toast(t('maxCompare'), 'warning'); state.compare.push(id); }
    const before = slots.length;
    applyDevices().then(() => { if (state.url) slots.slice(before).forEach((s) => loadSlot(s, state.url)); });
  }
  async function setMode(m) {
    if (m === state.mode) return;
    state.mode = m; animNext = true;
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
    slots.forEach(pulse);
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
  function renderDevices(anim = animNext) {
    animNext = false;
    const list = $('#devList'); list.innerHTML = ''; list.classList.toggle('anim', !!anim);
    const q = query.trim().toLowerCase(), f = state.filter, single = state.mode === 'single';
    const selected = (id) => (single ? state.deviceId === id : state.compare.includes(id));
    let idx = 0;
    const item = (dev, isCustom) => {
      const b = document.createElement('div'); b.className = 'dev'; b.setAttribute('role', 'option'); b.tabIndex = 0; b.style.setProperty('--i', Math.min(idx++, 22));
      b.setAttribute('aria-selected', selected(dev.id));
      const sel = selected(dev.id);
      const lead = `<div class="lead">${ic(!single && sel ? 'check' : TYPE_ICON[dev.type] || 'mobile')}</div>`;
      const size = dev.type === 'responsive' ? t('responsiveSub') : `${dev.w} × ${dev.h} · ${dev.dpr}x`;
      b.innerHTML = lead + '<div class="meta"><div class="nm"></div><div class="sz"></div></div>';
      $('.nm', b).textContent = dev.name; $('.sz', b).textContent = size;
      if (isCustom) { const eb = document.createElement('button'); eb.className = 'edit'; eb.innerHTML = ic('edit'); eb.dataset.tip = t('editDevice'); eb.onclick = (ev) => { ev.stopPropagation(); openDeviceDialog(dev); }; b.appendChild(eb); }
      const act = () => { if (single) { if (dev.id === 'responsive') { toResponsive(); applyDevices(); } else setDevice(dev.id); if (innerWidth <= 900) app.classList.add('rc'); } else toggleCompare(dev.id); };
      b.onclick = act; b.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); act(); } };
      return b;
    };
    if (single && (f === 'all') && (!q || 'responsive'.includes(q))) list.appendChild(item(getDev('responsive'), false));
    const groups = new Map();
    allDevices().forEach((d) => {
      const isC = !!d.custom;
      const hit = f === 'all' || (f === 'custom' ? isC : f === 'ios' ? d.type === 'phone' && d.os === 'ios' : f === 'android' ? d.type === 'phone' && d.os === 'android' : d.type === f);
      if (!hit) return;
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
    [['all', 'all'], ['ios', 'ios'], ['android', 'android'], ['tablet', 'tablets'], ['foldable', 'foldables'], ['watch', 'watches'], ['desktop', 'desktops'], ['custom', 'custom']].forEach(([v, k]) => {
      const b = document.createElement('button'); b.className = 'chip'; b.textContent = t(k); b.setAttribute('aria-pressed', state.filter === v);
      b.onclick = () => { state.filter = v; renderChips(); renderDevices(true); saveState(); }; fc.appendChild(b);
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
    typeSel.setValue(editing ? editing.type : 'phone'); osSel.setValue(editing ? editing.os : 'android');
    $('#dDelete').style.display = editing ? '' : 'none';
    $('#dlgDevice').showModal();
  }
  function bindDeviceForm() {
  $('#deviceForm').addEventListener('submit', () => {
    const o = { name: $('#dName').value.trim(), w: +$('#dW').value, h: +$('#dH').value, dpr: +$('#dDpr').value, type: typeSel.value, os: osSel.value };
    const isPhone = o.type === 'phone';
    const rec = Object.assign({ group: 'Custom', cutout: isPhone ? 'punch' : 'none', r: isPhone ? 30 : o.type === 'tablet' ? 18 : o.type === 'watch' ? 44 : 6, custom: true }, o);
    if (editing) { Object.assign(editing, rec); }
    else { rec.id = 'custom-' + Date.now(); custom.push(rec); editing = rec; }
    saveCustom();
    if (state.mode === 'single') state.deviceId = editing.id; else if (!state.compare.includes(editing.id) && state.compare.length < MAX_COMPARE) state.compare.push(editing.id);
    applyDevices(); editing = null;
  });
  $('#dDelete').onclick = () => {
    if (!editing) return;
    const id = editing.id; custom = custom.filter((d) => d.id !== id); saveCustom();
    if (state.deviceId === id) state.deviceId = 'iphone-16';
    state.compare = state.compare.filter((x) => x !== id); if (!state.compare.length) state.compare = ['iphone-16'];
    $('#dlgDevice').close(); editing = null; applyDevices();
  };
  }

  /* ---------------- settings dialog ---------------- */
  const PALETTE = [
    ['red', '#F44336'], ['pink', '#E91E63'], ['purple', '#9C27B0'], ['deepPurple', '#673AB7'], ['indigo', '#3F51B5'], ['blue', '#2196F3'],
    ['lightBlue', '#03A9F4'], ['cyan', '#00BCD4'], ['teal', '#009688'], ['green', '#4CAF50'], ['lightGreen', '#8BC34A'], ['lime', '#CDDC39'],
    ['yellow', '#FFEB3B'], ['amber', '#FFC107'], ['orange', '#FF9800'], ['deepOrange', '#FF5722'], ['brown', '#795548'], ['grey', '#9E9E9E'], ['blueGrey', '#607D8B']
  ];
  const accOpen = { color: false, type: false, sim: true, keys: false };
  const lumOf = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };

  function renderSettings() {
    closeMenus();
    const body = $('#settingsBody'), keep = body.scrollTop;
    body.innerHTML = '';
    const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
    const txt = (e, v) => { e.textContent = v; return e; };
    const sec = (k) => body.appendChild(txt(el('div', 'set-sec'), t(k)));
    const seg = (parent, opts, cur, on) => {
      const g = el('div', 'btn-group seg');
      opts.forEach(([v, label, icon]) => {
        const b = el('button', null, (icon ? ic(icon) : '') + '<span></span>'); b.type = 'button'; b.dataset.v = v; txt($('span', b), label);
        b.setAttribute('aria-pressed', String(cur === v));
        b.onclick = () => { $$('button', g).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); on(v); };
        g.appendChild(b);
      });
      parent.appendChild(g); return g;
    };
    const sw = (parent, key, title, hint, after) => {
      const r = el('div', 'set-row', '<div class="tx"><b></b><small></small></div><button type="button" class="switch" role="switch"></button>');
      txt($('b', r), t(title)); txt($('small', r), t(hint));
      const b = $('.switch', r); b.setAttribute('aria-checked', String(!!settings[key])); b.setAttribute('aria-label', t(title));
      b.onclick = async () => { settings[key] = !settings[key]; saveSettings(); b.setAttribute('aria-checked', String(settings[key])); if (after) await after(); };
      parent.appendChild(r);
    };
    const acc = (id, titleKey, fill) => {
      const a2 = el('div', 'acc' + (accOpen[id] ? ' open' : ''));
      const h = el('button', 'acc-h', '<b></b><span class="sum"></span>' + ic('keyboard_arrow_down')); h.type = 'button'; h.setAttribute('aria-expanded', String(!!accOpen[id]));
      txt($('b', h), t(titleKey));
      const pad = el('div', 'acc-pad'), inn = el('div', 'acc-in'), pnl = el('div', 'acc-p');
      inn.appendChild(pad); pnl.appendChild(inn); a2.append(h, pnl);
      h.onclick = () => { accOpen[id] = !accOpen[id]; a2.classList.toggle('open', accOpen[id]); h.setAttribute('aria-expanded', String(accOpen[id])); };
      fill(pad, $('.sum', h)); body.appendChild(a2);
    };

    /* appearance */
    sec('appearance');
    seg(body, [['system', t('system'), 'brightness_auto'], ['light', t('light'), 'light_mode'], ['dark', t('dark'), 'dark_mode']], settings.theme, (v) => { settings.theme = v; saveSettings(); applyTheme(); });

    /* theme colour (accordion) */
    acc('color', 'colorTheme', (pad, sum) => {
      const grid = el('div', 'pal');
      const norm = (h) => h.toLowerCase();
      const paintSum = () => {
        const p = PALETTE.find((x) => norm(x[1]) === norm(settings.seed));
        sum.innerHTML = '<i></i><span></span>'; $('i', sum).style.background = settings.seed; txt($('span', sum), p ? t('c_' + p[0]) : t('custom'));
        $$('.pal-i', grid).forEach((n) => n.setAttribute('aria-pressed', String(!n.classList.contains('pick') && norm(n.dataset.hex) === norm(settings.seed) || (n.classList.contains('pick') && !p))));
      };
      PALETTE.forEach(([k, hex]) => {
        const b = el('button', 'pal-i', '<span class="dot">' + ic('check') + '</span><span></span>'); b.type = 'button'; b.dataset.hex = hex;
        $('.dot', b).style.background = hex; $('.dot', b).style.color = lumOf(hex) > 0.62 ? '#1b1b1b' : '#fff';
        txt($$('span', b)[1], t('c_' + k));
        b.onclick = () => { settings.seed = hex; saveSettings(); applyTheme(); paintSum(); };
        grid.appendChild(b);
      });
      const pk = el('label', 'pal-i pick', '<span class="dot">' + ic('palette') + '</span><span></span><input type="color">'); pk.dataset.hex = '';
      $('.dot', pk).style.color = '#fff'; txt($$('span', pk)[1], t('custom'));
      const ci = $('input', pk); ci.value = /^#[0-9a-f]{6}$/i.test(settings.seed) ? settings.seed : '#3f51b5';
      ci.oninput = () => { settings.seed = ci.value; saveSettings(); applyTheme(); paintSum(); };
      grid.appendChild(pk); pad.appendChild(grid); paintSum();
    });

    /* font + text size (accordion) */
    acc('type', 'typography', (pad, sum) => {
      const sizeLabel = () => t({ sm: 'small', md: 'medium', lg: 'large' }[settings.fontSize] || 'medium');
      const paintSum = () => txt(sum, (FONT_LABEL[settings.font] || 'Roboto Flex') + ' · ' + sizeLabel());
      pad.appendChild(txt(el('div', 'lbl-s'), t('fontFamily')));
      const host2 = el('div'); pad.appendChild(host2);
      makeSelect(host2, { options: Object.keys(FONT_LABEL).map((k) => ({ v: k, label: FONT_LABEL[k] })), value: settings.font, label: t('fontFamily'), onChange: (v) => { settings.font = v; saveSettings(); applyTypography(); paintSum(); } });
      pad.appendChild(txt(el('div', 'lbl-s'), t('textSize')));
      seg(pad, [['sm', t('small')], ['md', t('medium')], ['lg', t('large')]], settings.fontSize, (v) => { settings.fontSize = v; saveSettings(); applyTypography(); paintSum(); });
      paintSum();
    });

    /* language */
    sec('language');
    seg(body, [['en', 'English'], ['vi', 'Tiếng Việt']], lang(), (v) => { settings.lang = v; saveSettings(); RT_I18N.set(v); hydrate(); refreshSelectLabels(); renderAll(); renderSettings(); txt($('#dlgSettings h2'), t('settings')); });

    /* simulation (accordion) */
    acc('sim', 'simulation', (pad) => {
      sw(pad, 'hideScroll', 'hideScroll', 'hideScrollHint', () => { slots.forEach(pushConfig); layout(); });
      sw(pad, 'spoofUA', 'spoofUA', 'spoofUAHint', async () => { await updateRules(); slots.forEach(pushConfig); if (state.url) reload(); });
      sw(pad, 'bypass', 'bypass', 'bypassHint', async () => { await updateRules(); if (state.url) reload(); });
      sw(pad, 'sync', 'syncScroll', 'syncScrollHint');
      sw(pad, 'copyShot', 'copyShot', 'copyShotHint');
    });

    /* shortcuts (accordion) */
    acc('keys', 'shortcuts', (pad) => {
      const kb = el('div', 'kbd-grid');
      [['R', 'kbRotate'], ['F', 'kbFit'], ['C', 'kbCompare'], ['S', 'kbShot'], ['P', 'kbPanel'], ['L', 'kbTools'], ['/', 'kbUrl'], ['+ / −', 'kbZoom'], ['Esc', 'kbClose']].forEach(([k, l]) => { const d = el('div', null, '<span></span><kbd></kbd>'); txt($('span', d), t(l)); txt($('kbd', d), k); kb.appendChild(d); });
      pad.appendChild(kb);
    });

    /* about */
    sec('about');
    const au = el('div', 'author', '<div class="av">M</div><div><div class="sub"></div><div class="nm"><a href="https://github.com/minhtrong67" target="_blank" rel="noopener noreferrer">minhtrong67</a></div><span class="ai">' + ic('star-fill') + '<span></span></span></div>');
    txt($('.sub', au), t('authorBy')); txt($('.ai span', au), t('aiHelp')); body.appendChild(au);
    const ab = el('div', 'about', '<p></p><p></p>'); txt($$('p', ab)[0], t('aboutBody')); txt($$('p', ab)[1], t('limits')); body.appendChild(ab);
    body.appendChild(settingsTop);
    body.scrollTop = keep;
  }

  /* ---------------- capture ---------------- */
  const nextFrames = (n = 2) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const stamp = () => new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  const slugOf = (s) => (getDev(s.devId).name || 'device').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  async function screenshot() {
    if (!state.url) return toast(t('needUrl'), 'warning');
    const jobs = slots.slice();
    app.classList.add('capturing');
    try {
      for (const s of jobs) {
        const target = state.frame && !s.device.classList.contains('bare') ? s.device : s.screen;
        target.scrollIntoView({ block: 'center', inline: 'center' });
        await nextFrames(3);
        const r0 = target.getBoundingClientRect(), sr = stage.getBoundingClientRect();
        const ex = target === s.device ? (s.extraH || 0) * curZoom : 0;
        const r = { left: r0.left, top: r0.top, right: r0.right, bottom: r0.bottom + ex, width: r0.width, height: r0.height + ex };
        if (r.left < sr.left - 1 || r.top < sr.top - 1 || r.right > sr.right + 1 || r.bottom > sr.bottom + 1) { toast(t('shotCrop'), 'warning'); continue; }
        const cap = await chrome.runtime.sendMessage({ type: 'capture' });
        if (!cap || !cap.ok) throw new Error(cap && cap.error);
        const url = cap.url;
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
        const k = img.naturalWidth / innerWidth;
        const c = document.createElement('canvas'); c.width = Math.round(r.width * k); c.height = Math.round(r.height * k);
        const x = c.getContext('2d');
        const rad = ex ? 0 : parseFloat(getComputedStyle(target).borderTopLeftRadius) * curZoom * k || 0;
        x.beginPath(); x.roundRect(0, 0, c.width, c.height, rad); x.clip();
        x.drawImage(img, r.left * k, r.top * k, r.width * k, r.height * k, 0, 0, c.width, c.height);
        const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
        const dm = dimsOf(getDev(s.devId));
        download(blob, `${slugOf(s)}_${dm.w}x${dm.h}_${stamp()}.png`);
        if (settings.copyShot && jobs.length === 1) { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); } catch (e) {} }
        if (jobs.length === 1) toast(t('shotSaved'), 'success', { label: t('copy'), action: async () => { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); toast(t('shotCopied'), 'success'); } catch (e) {} } });
      }
      if (jobs.length > 1) toast(t('shotSaved'), 'success');
    } catch (e) { console.warn(e); toast(t('shotFail'), 'error'); }
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
    if (!state.url) return toast(t('needUrl'), 'warning');
    let stream;
    try { stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' }); }
    catch (e) { return toast(t('recFail'), 'error'); }
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
      rec.finish = async () => { toast(t('encoding'), 'info', { duration: 1800 }); await nextFrames(2); download(gif.finish(), name + '.gif'); };
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
    const upd = () => { const s = Math.floor((Date.now() - rec.t0) / 1000); btn.innerHTML = ic('stop') + `<span>${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}</span>`; if (s >= 60) { toast(t('recAutoStop'), 'info'); stopRecording(); } };
    upd(); rec.timer = setInterval(upd, 500);
  }
  async function stopRecording() {
    if (!rec || rec.stopped) return;
    const r = rec; r.stopped = true; clearInterval(r.timer); clearInterval(r.tick);
    r.stream.getTracks().forEach((x) => x.stop());
    const btn = $('#btnRec'); btn.classList.remove('on'); btn.innerHTML = ic('videocam') + '<span class="lbl">' + t('record') + '</span>';
    try { await r.finish(); toast(t('recSaved'), 'success'); } catch (e) { toast(t('recFail'), 'error'); }
    rec = null;
  }

  /* ---------------- panels (left tools / right devices) ---------------- */
  function setPanel(side, open) {
    app.classList.toggle(side === 'l' ? 'lc' : 'rc', !open);
    if (open && innerWidth <= 900) app.classList.add(side === 'l' ? 'rc' : 'lc');
  }
  const togglePanel = (side) => setPanel(side, app.classList.contains(side === 'l' ? 'lc' : 'rc'));
  function applyWidths() { app.style.setProperty('--lw', state.lw + 'px'); app.style.setProperty('--rw', state.rw + 'px'); }
  function bindResizers() {
    $$('.rz').forEach((h) => h.addEventListener('pointerdown', (e) => {
      e.preventDefault(); h.setPointerCapture(e.pointerId);
      app.classList.add('dragging', 'resizing');
      const side = h.dataset.side, sx = e.clientX, w0 = side === 'l' ? state.lw : state.rw;
      const mv = (ev) => {
        const dx = ev.clientX - sx, w = clamp(Math.round(side === 'l' ? w0 + dx : w0 - dx), 260, Math.max(300, Math.min(560, innerWidth * 0.45)));
        if (side === 'l') state.lw = w; else state.rw = w;
        applyWidths();
      };
      const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); app.classList.remove('dragging', 'resizing'); saveState(); layout(); };
      h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
    }));
  }
  function applyBars(s, bg) {
    try {
      if (!CSS.supports('color', bg)) return;
      const c = document.createElement('canvas'); c.width = c.height = 1;
      const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#ffffff'; x.fillStyle = bg; x.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = x.getImageData(0, 0, 1, 1).data; if (a < 200) return;
      s.screen.style.setProperty('--bar-bg', `rgb(${r},${g},${b})`);
      s.screen.style.setProperty('--bar-fg', (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.55 ? '#fff' : '#111');
    } catch (e) {}
  }

  /* ---------------- wiring ---------------- */
  const selOptions = () => ({
    type: ['phone', 'tablet', 'desktop', 'watch'].map((v) => ({ v, label: t(v) })),
    os: ['android', 'ios', 'other'].map((v) => ({ v, label: t(v) }))
  });
  function initSelects() {
    const o = selOptions();
    dprSel = makeSelect($('#selDpr'), { options: [1, 1.5, 2, 2.5, 3, 3.5, 4].map((v) => ({ v: String(v), label: v + 'x' })), value: '2', label: 'Pixel ratio', onChange: (v) => { state.resp.dpr = +v; slots.forEach(pushConfig); saveState(); } });
    typeSel = makeSelect($('#dType'), { options: o.type, value: 'phone', label: t('type') });
    osSel = makeSelect($('#dOs'), { options: o.os, value: 'android', label: t('os') });
  }
  function refreshSelectLabels() { const o = selOptions(); typeSel.setOptions(o.type); osSel.setOptions(o.os); }
  function renderAll() { renderChips(); renderDevices(); layout(); }
  function bind() {
    bindDeviceForm();
    $('#btnPanel').onclick = () => setPanel('l', false);
    $('#btnPanelR').onclick = () => setPanel('r', false);
    $('#btnReopenL').onclick = () => setPanel('l', true);
    $('#btnReopenR').onclick = () => setPanel('r', true);
    $('#panelScrim').onclick = () => app.classList.add('lc', 'rc');
    $('#btnScroll').onclick = () => { settings.hideScroll = !settings.hideScroll; saveSettings(); slots.forEach(pushConfig); layout(); };
    bindResizers(); bindTooltip(); bindRipple();
    attachToTop($('#devList'), $('.list-wrap'), false);
    attachToTop($('#panelL'), $('#panelL'), true);
    settingsTop = attachToTop($('#settingsBody'), $('#settingsBody'), true);
    $('#btnBack').onclick = () => cmd('back');
    $('#btnFwd').onclick = () => cmd('forward');
    $('#btnReload').onclick = reload;
    $('#btnGo').onclick = () => go($('#urlInput').value);
    $('#urlInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(e.target.value); if (e.key === 'Escape') e.target.blur(); });
    $('#urlInput').addEventListener('focus', (e) => e.target.select());
    $('#btnClose').onclick = close;
    $('#btnSettings').onclick = () => { renderSettings(); $('#dlgSettings').showModal(); };
    $('#btnAddDevice').onclick = () => openDeviceDialog(null);
    $('#devSearch').oninput = (e) => { query = e.target.value; renderDevices(true); };
    $$('#modeSeg button').forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
    $('#btnRotate').onclick = rotate;
    $('#btnZoomIn').onclick = () => setZoom(curZoom * 1.15);
    $('#btnZoomOut').onclick = () => setZoom(curZoom / 1.15);
    $('#btnFit').onclick = () => setZoom('fit');
    $('#btnTouch').onclick = () => { state.touch = !state.touch; slots.forEach(pushConfig); layout(); saveState(); };
    $('#btnFrame').onclick = () => { state.frame = !state.frame; layout(); saveState(); };
    $('#btnShot').onclick = screenshot;
    $('#btnRec').onclick = (e) => { e.stopPropagation(); if (rec) stopRecording(); else { const m = $('#recMenu'); m.hidden = !m.hidden; if (!m.hidden) { const q = e.currentTarget.getBoundingClientRect(); m.style.bottom = (innerHeight - q.top + 10) + 'px'; m.style.left = Math.max(8, Math.min(q.left, innerWidth - 196)) + 'px'; } } };
    $$('#recMenu button').forEach((b) => (b.onclick = () => { $('#recMenu').hidden = true; startRecording(b.dataset.fmt); }));
    root.addEventListener('click', (e) => { if (!e.target.closest('.rec-wrap')) $('#recMenu').hidden = true; });
    const dimChange = () => { toResponsive(+$('#inW').value, +$('#inH').value); applyDevices(false); };
    $('#inW').onchange = dimChange; $('#inH').onchange = dimChange;
    [$('#inW'), $('#inH')].forEach((i) => i.addEventListener('keydown', (e) => e.key === 'Enter' && i.blur()));
    initSelects();
    $$('dialog').forEach((d) => { d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); $$('[data-close]', d).forEach((b) => (b.onclick = () => d.close())); });
    const ro = new ResizeObserver(() => layout()); ro.observe(stage); cleanup.push(() => ro.disconnect());
    stage.addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); setZoom(curZoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
    ['keydown', 'keyup', 'keypress'].forEach((n) => host.addEventListener(n, (e) => e.stopPropagation()));
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !root.querySelector('dialog[open]') && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) { close(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || root.querySelector('dialog[open]')) return;
      const k = e.key.toLowerCase();
      if (k === 'r') rotate(); else if (k === 'f') setZoom('fit'); else if (k === 'c') setMode(state.mode === 'single' ? 'compare' : 'single');
      else if (k === 's') screenshot(); else if (k === 'p') togglePanel('r'); else if (k === 'l') togglePanel('l');
      else if (k === '+' || k === '=') setZoom(curZoom * 1.15); else if (k === '-') setZoom(curZoom / 1.15);
      else if (k === '/') { e.preventDefault(); $('#urlInput').focus(); } else return;
      if (k !== '/') e.preventDefault();
    });
  }

  /* ---------------- overlay lifecycle ---------------- */
  const RES = (p) => chrome.runtime.getURL(p);
  let cssSheet = null;
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
    applyTheme(); applyTypography(); hydrate(); applyWidths();
    if (innerWidth <= 900) app.classList.add('lc', 'rc');
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
