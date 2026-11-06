(() => {
  const X = XMD;
  const { DEFAULTS, COLORS, FONTS, t, buildFilename } = X;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const TOKENS = ['username', 'name', 'tweetId', 'index', 'date', 'time', 'text', 'type', 'filename'];
  const PRESETS = ['{username}-{tweetId}-{index}', '{username}/{tweetId}-{index}', '{date}-{username}-{tweetId}-{index}', 'X/{username}/{date}_{time}-{index}', '{username}-{text}-{index}'];
  const X_KEYS = new Set(['KeyJ', 'KeyK', 'KeyL', 'KeyR', 'KeyT', 'KeyS', 'KeyB', 'KeyU', 'KeyN', 'KeyM', 'KeyG', 'KeyO', 'KeyP', 'KeyX', 'Slash', 'Period', 'Space', 'Enter']);
  const CHECK = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const GROUPS = ['themeMode', 'fontSize', 'language', 'multiMode'];
  const mq = matchMedia('(prefers-color-scheme: dark)');
  let S;

  const L = (k, v) => t(S.language, k, v);
  const isDark = () => X.isDarkMode(S);
  const fontOf = () => FONTS.find((x) => x.id === S.font) || FONTS[0];
  const ctx = () => { const d = isDark(); return { dark: d, tokens: X.getTokens(S, d), font: fontOf().stack, fs: '.9375rem', fsSm: '.8125rem' }; };
  const toast = X.createToaster(ctx);
  X.initTooltips(ctx);
  const setTip = (el, text) => el.setAttribute('data-xmd-tip', text);

  // ---------- a11y: nhóm radio dùng phím mũi tên ----------
  function roving(box) {
    const items = $$('[role="radio"]', box);
    const cur = items.find((b) => b.getAttribute('aria-checked') === 'true') || items[0];
    items.forEach((b) => { b.tabIndex = b === cur ? 0 : -1; });
  }
  function bindRadioKeys(box) {
    box.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(e.key in keys)) return;
      const items = $$('[role="radio"]', box);
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      items[(i + keys[e.key] + items.length) % items.length].click();
      setTimeout(() => { const n = $('[role="radio"][aria-checked="true"]', box); if (n) n.focus(); }, 0);
    });
  }

  // ---------- i18n ----------
  function applyI18n() {
    $$('[data-i18n]').forEach((el) => { el.textContent = L(el.dataset.i18n); });
    $$('[data-tip-i18n]').forEach((el) => setTip(el, L(el.dataset.tipI18n)));
    const okChip = $('#toastDemo [data-variant="success"]'); if (okChip) okChip.textContent = S.language === 'vi' ? 'Thành công' : 'Success';
    $$('#tokenChips .chip').forEach((c) => setTip(c, L('tok.' + c.dataset.token)));
    const col = COLORS.find((c) => c.hex.toLowerCase() === S.themeColor.toLowerCase());
    $('#colorName').textContent = col ? L('color.' + col.id) : `${L('color.custom')} · ${S.themeColor.toUpperCase()}`;
    $('#multiMode').setAttribute('aria-label', L('multi.title'));
    renderFonts();
    renderKeys();
    $('#ob3').textContent = L('ob.s3', { key: X.fmtShortcut(S.shortcut) });
    renderLog();
  }

  // ---------- render ----------
  const PICKER_ICO = '<svg class="picker-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>';
  const isPreset = (hex) => COLORS.some((c) => c.hex.toLowerCase() === hex.toLowerCase());

  function swatch(hex, label, checked) {
    const sc = MCU.scheme(hex, isDark());
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-checked', String(checked));
    setTip(b, label);
    b.style.background = sc.primaryContainer;
    b.style.color = sc.onPrimaryContainer;
    b.style.boxShadow = `inset 0 0 0 6px ${sc.primary}`;
    b.innerHTML = CHECK;
    return b;
  }

  function renderSwatches() {
    const box = $('#themeColor');
    box.replaceChildren();
    for (const c of COLORS) {
      const b = swatch(c.hex, L('color.' + c.id), c.hex.toLowerCase() === S.themeColor.toLowerCase());
      b.addEventListener('click', () => change({ themeColor: c.hex }));
      box.append(b);
    }
    // ô thứ 20: màu tuỳ chọn (làm đủ lưới 5 x 4 / 10 x 2)
    const custom = !isPreset(S.themeColor);
    const b = swatch(custom ? S.themeColor : '#6750A4', L('color.custom'), custom);
    b.classList.add('custom');
    if (!custom) {
      b.style.background = 'conic-gradient(#f44336,#ffc107,#8bc34a,#00bcd4,#3f51b5,#e91e63,#f44336)';
      b.style.color = 'var(--md-on-surface)';
      b.style.boxShadow = 'inset 0 0 0 14px var(--md-surface-container)';
    }
    b.insertAdjacentHTML('beforeend', PICKER_ICO);
    const pick = document.createElement('input');
    pick.type = 'color'; pick.tabIndex = -1; pick.setAttribute('aria-hidden', 'true');
    pick.value = /^#[0-9a-f]{6}$/i.test(S.themeColor) ? S.themeColor.toLowerCase() : '#6750a4';
    pick.addEventListener('input', () => X.applyTheme({ ...S, themeColor: pick.value }));      // xem trước trực tiếp
    pick.addEventListener('change', () => change({ themeColor: pick.value.toUpperCase() }));   // chốt khi đóng bảng chọn
    pick.addEventListener('blur', () => setTimeout(() => X.applyTheme(S), 200));              // huỷ → trả về màu đang lưu
    b.addEventListener('click', () => { try { pick.showPicker(); } catch (_) { pick.click(); } });
    b.append(pick);
    box.append(b);
    roving(box);
  }

  // ---------- dropdown font tuỳ chỉnh (listbox, không dùng <select> mặc định) ----------
  const dd = { open: false, active: -1 };
  const fdOpts = () => $$('[role="option"]', $('#fontList'));
  function fdSetActive(i) {
    const o = fdOpts();
    if (!o.length) return;
    dd.active = (i + o.length) % o.length;
    o.forEach((el, k) => el.classList.toggle('active', k === dd.active));
    $('#fontList').setAttribute('aria-activedescendant', o[dd.active].id);
    o[dd.active].scrollIntoView({ block: 'nearest' });
  }
  function fdOpen() {
    if (dd.open) return;
    dd.open = true;
    const list = $('#fontList'), btn = $('#fontBtn');
    list.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    const r = btn.getBoundingClientRect();
    const below = innerHeight - r.bottom, above = r.top;
    list.classList.toggle('up', below < 360 && above > below);
    requestAnimationFrame(() => list.classList.add('show'));
    fdSetActive(Math.max(0, FONTS.findIndex((f) => f.id === S.font)));
    list.focus({ preventScroll: true });
  }
  function fdClose(refocus) {
    if (!dd.open) return;
    dd.open = false;
    const list = $('#fontList');
    list.classList.remove('show');
    $('#fontBtn').setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (!dd.open) list.hidden = true; }, 180);
    if (refocus) $('#fontBtn').focus();
  }
  function fdChoose(id) { fdClose(true); if (id !== S.font) change({ font: id }); }
  function bindFontDropdown() {
    const btn = $('#fontBtn'), list = $('#fontList');
    btn.addEventListener('click', () => (dd.open ? fdClose(true) : fdOpen()));
    btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); fdOpen(); } });
    list.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowDown') { e.preventDefault(); fdSetActive(dd.active + 1); }
      else if (k === 'ArrowUp') { e.preventDefault(); fdSetActive(dd.active - 1); }
      else if (k === 'Home') { e.preventDefault(); fdSetActive(0); }
      else if (k === 'End') { e.preventDefault(); fdSetActive(FONTS.length - 1); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); fdChoose(FONTS[dd.active].id); }
      else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); fdClose(true); }
      else if (k === 'Tab') fdClose(false);
      else if (k.length === 1) {   // gõ chữ để nhảy tới mục bắt đầu bằng ký tự đó
        const names = FONTS.map((f) => (f.name || L('font.system')).toLowerCase());
        const n = names.length;
        for (let step = 1; step <= n; step++) { const i = (dd.active + step) % n; if (names[i].startsWith(k.toLowerCase())) { fdSetActive(i); break; } }
      }
    });
    document.addEventListener('pointerdown', (e) => { if (dd.open && !$('#fontDD').contains(e.target)) fdClose(false); }, true);
  }

  function renderFonts() {
    const cur = fontOf();
    const btn = $('#fontBtn');
    btn.style.fontFamily = cur.stack;
    $('#fontVal').textContent = cur.name || L('font.system');
    const list = $('#fontList');
    list.replaceChildren();
    FONTS.forEach((f, i) => {
      const li = document.createElement('li');
      li.id = 'fo-' + f.id;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(S.font === f.id));
      li.style.fontFamily = f.stack;
      const aa = document.createElement('span'); aa.className = 'o-aa'; aa.textContent = 'Aa';
      const nm = document.createElement('span'); nm.className = 'o-nm'; nm.textContent = f.name || L('font.system');
      li.append(aa, nm);
      li.insertAdjacentHTML('beforeend', CHECK.replace('<svg ', '<svg class="o-ck" '));
      li.addEventListener('click', () => fdChoose(f.id));
      li.addEventListener('mousemove', () => { if (dd.active !== i) fdSetActive(i); });
      list.append(li);
    });
  }

  function renderKeys(recording) {
    const box = $('#keys');
    box.classList.toggle('rec', !!recording);
    box.replaceChildren();
    const sc = S.shortcut;
    const parts = recording ? [L('sc.press')] : [sc.ctrl && 'Ctrl', sc.alt && 'Alt', sc.shift && 'Shift', sc.label].filter(Boolean);
    for (const p of parts) { const k = document.createElement('kbd'); k.className = 'key'; k.textContent = p; box.append(k); }
  }

  function renderGroups() {
    for (const id of GROUPS) {
      const box = $('#' + id);
      $$('button', box).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === S[id])));
      roving(box);
    }
  }

  const SAMPLE = () => ({ username: 'minhtrong67', name: 'Minh Trọng', tweetId: '1850012345678901234', index: 1, createdAt: new Date(), text: 'Sample post text', type: 'video', filename: 'G3xAbCdEfGh' });
  function renderPreview() {
    const base = buildFilename(S.filenameTemplate, SAMPLE());
    $('#fnPreview').textContent = `${base}.mp4` + (S.downloadThumbnail ? `  +  ${base}-thumb.jpg` : '');
    $$('#presetChips .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.tpl === S.filenameTemplate)));
    renderPath();
  }
  function renderPath() {
    const abs = X.isAbsolutePath(S.saveFolder);
    const hint = $('#folderHint');
    hint.textContent = L(abs ? 'path.abs' : 'path.hint');
    hint.classList.toggle('bad', abs);
    const sm = SAMPLE();
    const parts = ['Downloads', X.buildFolder(S.saveFolder, sm), buildFilename(S.filenameTemplate, sm) + '.mp4'].filter(Boolean);
    $('#fullPath').textContent = parts.join('/');
    $$('#folderChips .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.folder === S.saveFolder)));
  }

  function renderAll() {
    const input = $('#filenameTemplate');
    if (document.activeElement !== input) input.value = S.filenameTemplate;
    const kw = $('#revealKeywords');
    if (document.activeElement !== kw) kw.value = S.revealKeywords;
    const sf = $('#saveFolder');
    if (document.activeElement !== sf) sf.value = S.saveFolder;
    $('#askWhere').checked = S.askWhere;
    $('#onboard').hidden = !!S.onboarded;
    $('#autoReveal').checked = S.autoReveal;
    $('#downloadThumbnail').checked = S.downloadThumbnail;
    $('#shortcutEnabled').checked = S.shortcutEnabled;
    $('#recordKey').disabled = !S.shortcutEnabled;
    $('#keys').style.opacity = S.shortcutEnabled ? 1 : 0.45;
    renderGroups();
    X.applyTheme(S);
    renderSwatches();
    applyI18n();
    renderPreview();
  }

  // ---------- nhật ký ----------
  let logs = [];
  function renderLog() {
    const list = $('#logList');
    list.replaceChildren();
    $('#logEmpty').hidden = logs.length > 0;
    $('#copyLog').disabled = $('#clearLog').disabled = logs.length === 0;
    const dark = isDark(), tk = X.getTokens(S, dark);
    for (const e of logs) {
      const li = document.createElement('li'); li.className = 'log-item';
      const p = X.toastPalette ? X.toastPalette(e.level, dark, tk) : { bg: tk.primaryContainer, fg: tk.onPrimaryContainer };
      const chip = document.createElement('span'); chip.className = 'lvl';
      chip.textContent = L('lvl.' + e.level);
      chip.style.setProperty('--lc-bg', p.bg); chip.style.setProperty('--lc-fg', p.fg);
      const box = document.createElement('div');
      const msg = document.createElement('div'); msg.className = 'log-msg'; msg.textContent = L(X.logKey(e.code));
      const meta = document.createElement('div'); meta.className = 'log-meta';
      meta.textContent = [new Date(e.ts).toLocaleString(S.language === 'vi' ? 'vi-VN' : undefined), e.tweetId && `#${e.tweetId}${e.index ? ` · ${e.index}` : ''}`, e.code].filter(Boolean).join('  ·  ');
      box.append(msg, meta);
      li.append(chip, box);
      list.append(li);
    }
  }
  async function loadLog() {
    try { logs = (await chrome.storage.local.get('log')).log || []; } catch (_) { logs = []; }
    renderLog();
  }

  // ---------- lưu / thông báo ----------
  let flashTimer;
  function flashSaved() {
    const el = $('#autosave');
    el.classList.add('flash');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => el.classList.remove('flash'), 900);
  }
  async function persist(patch) {
    try { await chrome.storage.sync.set(patch); flashSaved(); return true; }
    catch (_) { toast(L('err.save'), 'error'); return false; }
  }
  async function change(patch) {
    Object.assign(S, patch);
    if ('themeColor' in patch) { S.themeCache = X.buildCache(S.themeColor); patch.themeCache = S.themeCache; }
    renderAll();
    await persist(patch);
    if (patch.font) checkFont(fontOf());
  }

  function fontAvailable(name) {
    const c = document.createElement('canvas').getContext('2d');
    const sample = 'mmmmmmmmmmlli1Ägé';
    const w = (f) => { c.font = `72px ${f}`; return c.measureText(sample).width; };
    return ['monospace', 'serif', 'sans-serif'].some((b) => w(`"${name}",${b}`) !== w(b));
  }
  async function checkFont(f) {
    if (!f.name) return;
    try { await document.fonts.load(`16px "${f.name}"`); } catch (_) { /* bỏ qua */ }
    if (!fontAvailable(f.name)) toast(L('info.font', { font: f.name }), 'info');
  }

  // ---------- sao lưu ----------
  const ENUMS = { themeMode: ['light', 'dark', 'system'], fontSize: ['small', 'medium', 'large'], language: ['en', 'vi'], multiMode: ['all', 'menu'], font: FONTS.map((f) => f.id) };
  function sanitizeImport(raw) {
    const src = raw && typeof raw === 'object' ? (raw.settings && typeof raw.settings === 'object' ? raw.settings : raw) : null;
    if (!src) return null;
    const out = {};
    for (const k in DEFAULTS) {
      if (k === 'themeCache' || !(k in src)) continue;
      const v = src[k], d = DEFAULTS[k];
      if (k in ENUMS) { if (ENUMS[k].includes(v)) out[k] = v; }
      else if (k === 'themeColor') { if (/^#[0-9a-f]{6}$/i.test(v)) out[k] = v.toUpperCase(); }
      else if (k === 'shortcut') {
        if (v && typeof v.code === 'string' && typeof v.label === 'string' && ['ctrl', 'alt', 'shift'].every((m) => typeof v[m] === 'boolean')) out[k] = { code: v.code.slice(0, 20), label: v.label.slice(0, 12), ctrl: v.ctrl, alt: v.alt, shift: v.shift };
      } else if (typeof v === typeof d) out[k] = typeof v === 'string' ? v.slice(0, 200) : v;
    }
    return Object.keys(out).length ? out : null;
  }

  // ---------- wiring ----------
  function wire() {
    const tabs = $$('.rail-item');
    const show = (id, focus) => {
      if (!['download', 'appearance', 'activity', 'about'].includes(id)) id = 'download';
      $$('.pane').forEach((p) => p.classList.toggle('active', p.id === 'pane-' + id));
      tabs.forEach((b) => { const on = b.dataset.pane === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      history.replaceState(null, '', '#' + id);
      if (id === 'activity') { loadLog(); chrome.storage.local.set({ unread: 0 }); }
    };
    tabs.forEach((b) => b.addEventListener('click', () => show(b.dataset.pane)));
    $('.rail').addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const move = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (move) { e.preventDefault(); show(tabs[(i + move + tabs.length) % tabs.length].dataset.pane, true); }
      else if (e.key === 'Home') { e.preventDefault(); show(tabs[0].dataset.pane, true); }
      else if (e.key === 'End') { e.preventDefault(); show(tabs[tabs.length - 1].dataset.pane, true); }
    });
    show(location.hash.slice(1));
    const dot = (n) => $('#tab-activity').classList.toggle('has-dot', n > 0);
    chrome.storage.local.get('unread').then((r) => dot(r.unread || 0)).catch(() => {});
    chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.unread) dot(ch.unread.newValue || 0); });

    // thẻ hướng dẫn lần đầu
    $('#obDone').addEventListener('click', () => change({ onboarded: true }));
    $('#obOpen').addEventListener('click', async () => { try { await chrome.tabs.create({ url: 'https://x.com/home' }); } catch (_) { /* bỏ qua */ } });

    // khung xem trước: nút tải mô phỏng + kiểu thông báo
    const mb = $('#mockBtn');
    let mockT;
    const mockRun = () => {
      if (mb.classList.contains('xmd-prog')) return;
      let p = 0;
      mb.classList.add('xmd-prog');
      clearInterval(mockT);
      mockT = setInterval(() => {
        p += 7;
        mb.style.setProperty('--p', Math.min(p, 100));
        if (p >= 100) {
          clearInterval(mockT);
          mb.classList.remove('xmd-prog'); mb.style.removeProperty('--p');
          mb.classList.add('xmd-ok');
          setTimeout(() => mb.classList.remove('xmd-ok'), 1200);
        }
      }, 100);
    };
    mb.addEventListener('click', mockRun);
    mb.addEventListener('pointerenter', () => setTip(mb, L('btn.download') + (S.shortcutEnabled ? ` (${X.fmtShortcut(S.shortcut)})` : '') + '\n' + L('tip.rightClick')));
    const mockMenu = X.createMenu(ctx);
    mb.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      mockMenu.open(mb, [
        { label: L('menu.all', { n: 2 }), onPick: mockRun },
        { label: L('menu.photo', { n: 1 }), onPick: mockRun },
        { label: L('menu.video', { n: 2 }), sub: L('menu.quote'), onPick: mockRun }
      ]);
    });
    $$('#toastDemo .chip').forEach((c) => c.addEventListener('click', () => toast(L('pvm.t.' + c.dataset.variant), c.dataset.variant)));

    for (const id of GROUPS) {
      const box = $('#' + id);
      $$('button', box).forEach((b) => b.addEventListener('click', () => change({ [id]: b.dataset.value })));
      bindRadioKeys(box);
    }
    bindRadioKeys($('#themeColor'));
    bindFontDropdown();
    mq.addEventListener('change', () => { if (S.themeMode === 'system') { X.applyTheme(S); renderSwatches(); } });

    for (const id of ['autoReveal', 'downloadThumbnail', 'shortcutEnabled', 'askWhere']) {
      $('#' + id).addEventListener('change', (e) => change({ [id]: e.target.checked }));
    }

    // từ khoá nhãn "Xem" bổ sung
    let tk;
    $('#revealKeywords').addEventListener('input', (e) => {
      S.revealKeywords = e.target.value;
      clearTimeout(tk);
      tk = setTimeout(() => persist({ revealKeywords: S.revealKeywords }), 350);
    });

    // đường dẫn lưu (thư mục con trong Downloads)
    const folderInput = $('#saveFolder');
    let tf;
    folderInput.addEventListener('input', () => {
      S.saveFolder = folderInput.value;
      renderPath();
      clearTimeout(tf);
      tf = setTimeout(() => persist({ saveFolder: S.saveFolder }), 350);
    });
    for (const f of ['X Media', 'X Media/{username}', 'X Media/{date}', '{username}']) {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'chip'; c.dataset.folder = f; c.textContent = f;
      c.addEventListener('click', () => { folderInput.value = f; change({ saveFolder: f }); });
      $('#folderChips').append(c);
    }
    $('#openChromeDl').addEventListener('click', async () => {
      try { await chrome.tabs.create({ url: 'chrome://settings/downloads' }); }
      catch (_) { toast(L('warn.chromeSettings'), 'warning'); }
    });

    // mẫu tên tệp
    const input = $('#filenameTemplate');
    let tm;
    input.addEventListener('input', () => {
      S.filenameTemplate = input.value;
      renderPreview();
      clearTimeout(tm);
      tm = setTimeout(() => persist({ filenameTemplate: input.value }), 350);
    });
    for (const k of TOKENS) {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'chip'; c.dataset.token = k; c.textContent = `{${k}}`;
      c.addEventListener('click', () => {
        const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
        input.setRangeText(`{${k}}`, a, b, 'end');
        input.focus();
        input.dispatchEvent(new Event('input'));
      });
      $('#tokenChips').append(c);
    }
    for (const tpl of PRESETS) {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'chip'; c.dataset.tpl = tpl; c.textContent = tpl;
      c.addEventListener('click', () => { input.value = tpl; change({ filenameTemplate: tpl }); });
      $('#presetChips').append(c);
    }
    $('#resetTemplate').addEventListener('click', () => { input.value = DEFAULTS.filenameTemplate; change({ filenameTemplate: DEFAULTS.filenameTemplate }); });

    // xem thử với liên kết thật
    const tryOut = $('#tryOut');
    const say = (msg, bad) => { tryOut.replaceChildren(); const s = document.createElement('span'); if (bad) s.className = 'bad'; s.textContent = msg; tryOut.append(s); };
    async function tryLink() {
      const id = ($('#tryLink').value.match(/status\/(\d+)/) || [])[1];
      if (!id) return say(L('file.tryBad'), true);
      say(L('file.tryBusy'));
      let tw = null;
      try { tw = await chrome.runtime.sendMessage({ type: 'fetchTweet', id }); } catch (_) { /* bỏ qua */ }
      const groups = [];
      if (tw && tw.media && tw.media.length) groups.push(tw);
      if (tw && tw.quoted && tw.quoted.media && tw.quoted.media.length) groups.push(tw.quoted);
      if (!groups.length) return say(L('file.tryNone'), true);
      tryOut.replaceChildren();
      for (const g of groups) g.media.forEach((m, i) => {
        const ext = m.type === 'photo' ? ((m.url.match(/\.(\w+)(?:\?.*)?$/) || [])[1] || 'jpg') : 'mp4';
        const base = buildFilename(S.filenameTemplate, { username: g.screenName, name: g.name, tweetId: g.id || id, index: i + 1, createdAt: g.createdAt, text: g.text, type: m.type, filename: (m.url.split('?')[0].split('/').pop() || '').replace(/\.\w+$/, '') });
        const folder = X.buildFolder(S.saveFolder, { username: g.screenName, name: g.name, tweetId: g.id || id, index: i + 1, createdAt: g.createdAt, text: g.text, type: m.type });
        const code = document.createElement('code'); code.textContent = `${folder ? folder + '/' : ''}${base}.${ext}`; tryOut.append(code);
      });
    }
    $('#tryBtn').addEventListener('click', tryLink);
    $('#tryLink').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLink(); });

    // phím tắt
    $('#openShortcuts').addEventListener('click', async () => {
      try { await chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }); }
      catch (_) { toast(L('warn.shortcutPage'), 'warning'); }
    });
    $('#recordKey').addEventListener('click', () => {
      renderKeys(true);
      const stop = () => { document.removeEventListener('keydown', onKey, true); renderKeys(); };
      const onKey = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (e.key === 'Escape') return stop();
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key) || e.metaKey) return;
        const label = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        stop();
        change({ shortcut: { code: e.code, label, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey } });
        if (!e.ctrlKey && !e.altKey && !e.shiftKey && X_KEYS.has(e.code)) toast(L('warn.xkey', { key: label }), 'warning');
      };
      document.addEventListener('keydown', onKey, true);
    });

    // nhật ký
    $('#clearLog').addEventListener('click', async () => { await chrome.storage.local.set({ log: [] }); logs = []; renderLog(); });
    $('#copyLog').addEventListener('click', async () => {
      const report = { app: 'X Media Downloader', version: chrome.runtime.getManifest().version, ua: navigator.userAgent, entries: logs.map((e) => ({ ...e, time: new Date(e.ts).toISOString() })) };
      try { await navigator.clipboard.writeText(JSON.stringify(report, null, 2)); toast(L('toast.copied'), 'success'); }
      catch (_) { toast(L('err.save'), 'error'); }
    });
    chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.log) { logs = ch.log.newValue || []; renderLog(); } });

    // sao lưu / đặt lại
    $('#exportBtn').addEventListener('click', () => {
      const { themeCache, ...settings } = S;
      const blob = new Blob([JSON.stringify({ app: 'x-media-downloader', version: chrome.runtime.getManifest().version, settings }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'x-media-downloader-settings.json';
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('#importBtn').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const clean = sanitizeImport(JSON.parse(await file.text()));
        if (!clean) throw new Error('invalid');
        Object.assign(S, clean);
        S.themeCache = X.buildCache(S.themeColor);
        renderAll();
        if (await persist({ ...clean, themeCache: S.themeCache })) toast(L('toast.imported'), 'success');
      } catch (_) { toast(L('err.import'), 'error'); }
    });
    $('#resetAll').addEventListener('click', async () => {
      const yes = await X.confirmDialog(ctx, { title: L('dlg.resetTitle'), body: L('dlg.resetBody'), ok: L('ab.resetBtn'), cancel: L('dlg.cancel') });
      if (!yes) return;
      try {
        await chrome.storage.sync.clear();
        S = await chrome.storage.sync.get(DEFAULTS);
        S.themeCache = X.buildCache(S.themeColor);
        await chrome.storage.sync.set({ themeCache: S.themeCache });
        renderAll();
        toast(L('toast.reset'), 'success');
      } catch (_) { toast(L('err.save'), 'error'); }
    });

    $('#ver').textContent = chrome.runtime.getManifest().version;
  }

  (async () => {
    S = await chrome.storage.sync.get(DEFAULTS);
    if (!X.hasFullCache(S)) { S.themeCache = X.buildCache(S.themeColor); persist({ themeCache: S.themeCache }); }
    wire();
    renderAll();
    loadLog();
  })();
})();
