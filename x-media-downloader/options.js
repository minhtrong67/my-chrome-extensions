(() => {
  const { DEFAULTS, COLORS, FONTS, SIZES, t, buildFilename } = XMD;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const TOKENS = ['username', 'name', 'tweetId', 'index', 'date', 'time', 'text', 'type', 'filename'];
  const CACHE_KEYS = ['primary', 'inverseSurface', 'inverseOnSurface', 'inversePrimary'];
  const CHECK = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
  const mq = matchMedia('(prefers-color-scheme: dark)');
  let S;

  const isDark = () => S.themeMode === 'dark' || (S.themeMode === 'system' && mq.matches);
  const L = (k, v) => t(S.language, k, v);

  function pick(scheme) {
    const o = {};
    for (const k of CACHE_KEYS) o[k] = scheme[k];
    return o;
  }
  function buildCache() {
    return { light: pick(MCU.scheme(S.themeColor, false)), dark: pick(MCU.scheme(S.themeColor, true)) };
  }

  // ---------- theme ----------
  function applyTheme() {
    const root = document.documentElement;
    const dark = isDark();
    const vars = MCU.scheme(S.themeColor, dark);
    for (const k in vars) root.style.setProperty('--md-' + kebab(k), vars[k]);
    root.style.colorScheme = dark ? 'dark' : 'light';
    const f = FONTS.find((x) => x.id === S.font) || FONTS[0];
    root.style.setProperty('--font', f.stack);
    root.style.setProperty('--fs', SIZES[S.fontSize] || SIZES.medium);
    root.lang = S.language;
    renderSwatches();
  }

  // ---------- i18n ----------
  function applyI18n() {
    $$('[data-i18n]').forEach((el) => { el.textContent = L(el.dataset.i18n); });
    document.title = 'X Media Downloader';
    $('#colorName').textContent = L('color.' + (COLORS.find((c) => c.hex.toLowerCase() === S.themeColor.toLowerCase())?.id || 'purple'));
    $$('#tokenChips .chip').forEach((c) => { c.title = L('tok.' + c.dataset.token); });
    renderFonts();
    renderKeys();
  }

  // ---------- render ----------
  function renderSwatches() {
    const box = $('#themeColor');
    box.replaceChildren();
    for (const c of COLORS) {
      const sc = MCU.scheme(c.hex, isDark());
      const b = document.createElement('button');
      b.className = 'swatch';
      b.setAttribute('role', 'radio');
      b.dataset.value = c.hex;
      b.title = L('color.' + c.id);
      b.setAttribute('aria-label', b.title);
      b.setAttribute('aria-checked', String(c.hex.toLowerCase() === S.themeColor.toLowerCase()));
      b.style.background = sc.primaryContainer;
      b.style.color = sc.onPrimaryContainer;
      b.style.boxShadow = `inset 0 0 0 6px ${sc.primary}`;
      b.innerHTML = CHECK;
      b.addEventListener('click', () => change({ themeColor: c.hex }));
      box.append(b);
    }
  }

  function renderFonts() {
    const box = $('#font');
    box.replaceChildren();
    for (const f of FONTS) {
      const b = document.createElement('button');
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(S.font === f.id));
      b.style.fontFamily = f.stack;
      const aa = document.createElement('span'); aa.className = 'aa'; aa.textContent = 'Aa';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = f.name || L('font.system');
      b.append(aa, nm);
      b.addEventListener('click', () => change({ font: f.id }));
      box.append(b);
    }
  }

  function renderKeys(recording) {
    const box = $('#keys');
    box.classList.toggle('rec', !!recording);
    box.replaceChildren();
    const sc = S.shortcut;
    const parts = recording ? [L('sc.press')] : [sc.ctrl && 'Ctrl', sc.alt && 'Alt', sc.shift && 'Shift', sc.label].filter(Boolean);
    for (const p of parts) { const k = document.createElement('kbd'); k.className = 'key'; k.textContent = p; box.append(k); }
    $('#recordKey').textContent = L('sc.change');
  }

  function renderGroups() {
    for (const id of ['themeMode', 'fontSize', 'language']) {
      $$('button', $('#' + id)).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === S[id])));
    }
  }

  function renderPreview() {
    const sample = { username: 'minhtrong67', name: 'Minh Trọng', tweetId: '1850012345678901234', index: 1, createdAt: new Date(), text: 'Sample post text', type: 'video', filename: 'G3xAbCdEfGh' };
    const base = buildFilename(S.filenameTemplate, sample);
    $('#fnPreview').textContent = `${base}.mp4` + (S.downloadThumbnail ? `  +  ${base}-thumb.jpg` : '');
  }

  function renderAll() {
    $('#filenameTemplate').value = S.filenameTemplate;
    $('#autoReveal').checked = S.autoReveal;
    $('#downloadThumbnail').checked = S.downloadThumbnail;
    $('#shortcutEnabled').checked = S.shortcutEnabled;
    $('#recordKey').disabled = !S.shortcutEnabled;
    $('#keys').style.opacity = S.shortcutEnabled ? 1 : .45;
    renderGroups();
    applyTheme();
    applyI18n();
    renderPreview();
  }

  // ---------- lưu ----------
  let snackTimer;
  function snack() {
    const el = $('#snack');
    el.textContent = L('saved');
    el.classList.add('show');
    clearTimeout(snackTimer);
    snackTimer = setTimeout(() => el.classList.remove('show'), 1500);
  }
  async function change(patch, quiet) {
    Object.assign(S, patch);
    if ('themeColor' in patch) { S.themeCache = buildCache(); patch.themeCache = S.themeCache; }
    renderAll();
    await chrome.storage.sync.set(patch);
    if (!quiet) snack();
  }

  // ---------- wiring ----------
  function wire() {
    // điều hướng
    const show = (id) => {
      if (!['download', 'appearance', 'about'].includes(id)) id = 'download';
      $$('.pane').forEach((p) => p.classList.toggle('active', p.id === 'pane-' + id));
      $$('.rail-item').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.pane === id)));
      history.replaceState(null, '', '#' + id);
    };
    $$('.rail-item').forEach((b) => b.addEventListener('click', () => show(b.dataset.pane)));
    show(location.hash.slice(1));

    // nhóm nút
    for (const id of ['themeMode', 'fontSize', 'language']) {
      $$('button', $('#' + id)).forEach((b) => b.addEventListener('click', () => change({ [id]: b.dataset.value })));
    }
    mq.addEventListener('change', () => { if (S.themeMode === 'system') applyTheme(); });

    // switch
    for (const id of ['autoReveal', 'downloadThumbnail', 'shortcutEnabled']) {
      $('#' + id).addEventListener('change', (e) => change({ [id]: e.target.checked }));
    }

    // filename template
    const input = $('#filenameTemplate');
    let tm;
    input.addEventListener('input', () => {
      S.filenameTemplate = input.value;
      renderPreview();
      clearTimeout(tm);
      tm = setTimeout(() => { chrome.storage.sync.set({ filenameTemplate: input.value }); snack(); }, 400);
    });
    const chips = $('#tokenChips');
    for (const k of TOKENS) {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'chip'; c.dataset.token = k; c.textContent = `{${k}}`;
      c.addEventListener('click', () => {
        const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
        input.setRangeText(`{${k}}`, a, b, 'end');
        input.focus();
        input.dispatchEvent(new Event('input'));
      });
      chips.append(c);
    }
    $('#resetTemplate').addEventListener('click', () => change({ filenameTemplate: DEFAULTS.filenameTemplate }));

    // phím tắt
    $('#openShortcuts').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
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
      };
      document.addEventListener('keydown', onKey, true);
    });

    $('#ver').textContent = chrome.runtime.getManifest().version;
  }

  (async () => {
    S = await chrome.storage.sync.get(DEFAULTS);
    if (!S.themeCache) { S.themeCache = buildCache(); chrome.storage.sync.set({ themeCache: S.themeCache }); }
    wire();
    renderAll();
  })();
})();
