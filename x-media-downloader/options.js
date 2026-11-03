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
    $$('#tokenChips .chip').forEach((c) => setTip(c, L('tok.' + c.dataset.token)));
    const col = COLORS.find((c) => c.hex.toLowerCase() === S.themeColor.toLowerCase());
    $('#colorName').textContent = L('color.' + (col ? col.id : 'purple'));
    $('#multiMode').setAttribute('aria-label', L('multi.title'));
    renderFonts();
    renderKeys();
    renderLog();
  }

  // ---------- render ----------
  function renderSwatches() {
    const box = $('#themeColor');
    box.replaceChildren();
    for (const c of COLORS) {
      const sc = MCU.scheme(c.hex, isDark());
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', L('color.' + c.id));
      b.setAttribute('aria-checked', String(c.hex.toLowerCase() === S.themeColor.toLowerCase()));
      setTip(b, L('color.' + c.id));
      b.style.background = sc.primaryContainer;
      b.style.color = sc.onPrimaryContainer;
      b.style.boxShadow = `inset 0 0 0 6px ${sc.primary}`;
      b.innerHTML = CHECK;
      b.addEventListener('click', () => change({ themeColor: c.hex }));
      box.append(b);
    }
    roving(box);
  }

  function renderFonts() {
    const box = $('#font');
    box.replaceChildren();
    for (const f of FONTS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(S.font === f.id));
      b.style.fontFamily = f.stack;
      const aa = document.createElement('span'); aa.className = 'aa'; aa.textContent = 'Aa';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = f.name || L('font.system');
      b.append(aa, nm);
      b.addEventListener('click', () => change({ font: f.id }));
      box.append(b);
    }
    roving(box);
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
  }

  function renderAll() {
    const input = $('#filenameTemplate');
    if (document.activeElement !== input) input.value = S.filenameTemplate;
    const kw = $('#revealKeywords');
    if (document.activeElement !== kw) kw.value = S.revealKeywords;
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
  async function persist(patch) {
    try { await chrome.storage.sync.set(patch); return true; }
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
    const show = (id) => {
      if (!['download', 'appearance', 'activity', 'about'].includes(id)) id = 'download';
      $$('.pane').forEach((p) => p.classList.toggle('active', p.id === 'pane-' + id));
      $$('.rail-item').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.pane === id)));
      history.replaceState(null, '', '#' + id);
      if (id === 'activity') loadLog();
    };
    $$('.rail-item').forEach((b) => b.addEventListener('click', () => show(b.dataset.pane)));
    show(location.hash.slice(1));

    for (const id of GROUPS) {
      const box = $('#' + id);
      $$('button', box).forEach((b) => b.addEventListener('click', () => change({ [id]: b.dataset.value })));
      bindRadioKeys(box);
    }
    bindRadioKeys($('#themeColor')); bindRadioKeys($('#font'));
    mq.addEventListener('change', () => { if (S.themeMode === 'system') { X.applyTheme(S); renderSwatches(); } });

    for (const id of ['autoReveal', 'downloadThumbnail', 'shortcutEnabled']) {
      $('#' + id).addEventListener('change', (e) => change({ [id]: e.target.checked }));
    }

    // từ khoá nhãn "Xem" bổ sung
    let tk;
    $('#revealKeywords').addEventListener('input', (e) => {
      S.revealKeywords = e.target.value;
      clearTimeout(tk);
      tk = setTimeout(() => persist({ revealKeywords: S.revealKeywords }), 350);
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
        const code = document.createElement('code'); code.textContent = `${base}.${ext}`; tryOut.append(code);
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
      if (!confirm(L('reset.confirm'))) return;
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
