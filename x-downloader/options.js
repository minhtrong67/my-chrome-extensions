(() => {
  const X = XD;
  const { DEFAULTS, t, buildFilename } = X;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const TOKENS = ['username', 'name', 'tweetId', 'index', 'date', 'time', 'text', 'type', 'filename'];
  const X_KEYS = new Set(['KeyJ', 'KeyK', 'KeyL', 'KeyR', 'KeyT', 'KeyS', 'KeyB', 'KeyU', 'KeyN', 'KeyM', 'KeyG', 'KeyO', 'KeyP', 'KeyX', 'Slash', 'Period', 'Space', 'Enter']);
  const GROUPS = ['themeMode', 'language', 'multiMode'];
  const SWITCHES = ['autoReveal', 'downloadThumbnail', 'shortcutEnabled', 'askWhere'];
  const mq = matchMedia('(prefers-color-scheme: dark)');
  let S;

  const L = (k, v) => t(S.language, k, v);
  const ctx = () => ({ dark: X.isDarkMode(S) });
  const toast = X.createToaster(ctx);
  X.initTooltips(ctx);
  const setTip = (el, text) => { el.setAttribute('data-xd-tip', text); el.setAttribute('aria-label', text); };

  // ---------- giao diện ----------
  function applyTheme() {
    document.documentElement.dataset.theme = X.isDarkMode(S) ? 'dark' : 'light';
    document.documentElement.lang = S.language;
  }

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
    document.title = 'X Downloader — ' + L('app.settings');
    $$('[data-i18n]').forEach((el) => { el.textContent = L(el.dataset.i18n); });
    $$('#tokenChips .chip').forEach((c) => setTip(c, L('tok.' + c.dataset.token)));
    setTip($('#openChromeDl'), L('path.chrome'));
    setTip($('#recordKey'), L('sc.record'));
    renderKeys();
    renderLog();
  }

  // ---------- render ----------
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
    const sm = SAMPLE();
    const base = buildFilename(S.filenameTemplate, sm);
    $('#nameDesc').textContent = L('file.desc', { name: `${base}.mp4` + (S.downloadThumbnail ? `  +  ${base}-thumb.jpg` : '') });
    const abs = X.isAbsolutePath(S.saveFolder);
    const hint = $('#pathHint');
    hint.textContent = L(abs ? 'path.abs' : 'path.desc');
    hint.classList.toggle('bad', abs);
    const parts = ['Downloads', X.buildFolder(S.saveFolder, sm), base + '.mp4'].filter(Boolean);
    $('#fullPath').textContent = parts.join('/');
  }

  function renderAll() {
    const set = (sel, v) => { const el = $(sel); if (document.activeElement !== el) el.value = v; };
    set('#filenameTemplate', S.filenameTemplate);
    set('#saveFolder', S.saveFolder);
    for (const id of SWITCHES) $('#' + id).checked = !!S[id];
    $('#recordKey').disabled = !S.shortcutEnabled;
    $('#keyRow').style.opacity = S.shortcutEnabled ? 1 : 0.5;
    renderGroups();
    applyTheme();
    applyI18n();
    renderPreview();
  }

  // ---------- nhật ký ----------
  const LVL_ICON = { error: 'circle-alert', warning: 'triangle-alert', info: 'info' };
  let logs = [];
  function renderLog() {
    const list = $('#logList');
    list.replaceChildren();
    $('#logEmpty').hidden = logs.length > 0;
    $('#copyLog').disabled = $('#clearLog').disabled = logs.length === 0;
    for (const e of logs) {
      const li = document.createElement('li'); li.className = 'log-item'; li.dataset.level = e.level;
      const ic = document.createElement('span'); ic.className = 'log-ic'; ic.innerHTML = X.icon(LVL_ICON[e.level] || 'info');
      const box = document.createElement('div');
      const msg = document.createElement('div'); msg.className = 'log-msg'; msg.textContent = L(X.logKey(e.code));
      const meta = document.createElement('div'); meta.className = 'log-meta';
      meta.textContent = [L('lvl.' + e.level), new Date(e.ts).toLocaleString(S.language === 'vi' ? 'vi-VN' : undefined), e.tweetId && `#${e.tweetId}${e.index ? ` · ${e.index}` : ''}`, e.code].filter(Boolean).join('  ·  ');
      box.append(msg, meta);
      li.append(ic, box);
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
    const els = $$('.autosave');
    els.forEach((el) => el.classList.add('flash'));
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => els.forEach((el) => el.classList.remove('flash')), 1100);
  }
  async function persist(patch) {
    try { await chrome.storage.sync.set(patch); flashSaved(); return true; }
    catch (_) { toast(L('err.save'), 'error'); return false; }
  }
  async function change(patch) {
    Object.assign(S, patch);
    renderAll();
    await persist(patch);
  }
  const debounced = (fn, ms = 350) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };

  // ---------- sao lưu ----------
  const ENUMS = { themeMode: ['light', 'dark', 'system'], language: ['en', 'vi'], multiMode: ['all', 'menu'] };
  function sanitizeImport(raw) {
    const src = raw && typeof raw === 'object' ? (raw.settings && typeof raw.settings === 'object' ? raw.settings : raw) : null;
    if (!src) return null;
    const out = {};
    for (const k in DEFAULTS) {
      if (k === 'onboarded' || !(k in src)) continue;
      const v = src[k], d = DEFAULTS[k];
      if (k in ENUMS) { if (ENUMS[k].includes(v)) out[k] = v; }
      else if (k === 'shortcut') {
        if (v && typeof v.code === 'string' && typeof v.label === 'string' && ['ctrl', 'alt', 'shift'].every((m) => typeof v[m] === 'boolean')) out[k] = { code: v.code.slice(0, 20), label: v.label.slice(0, 12), ctrl: v.ctrl, alt: v.alt, shift: v.shift };
      } else if (typeof v === typeof d) out[k] = typeof v === 'string' ? v.slice(0, 200) : v;
    }
    return Object.keys(out).length ? out : null;
  }

  // ---------- wiring ----------
  function wire() {
    // điều hướng
    const tabs = $$('.nav-item');
    const show = (id, focus) => {
      if (!['download', 'appearance', 'activity', 'about'].includes(id)) id = 'download';
      $$('.pane').forEach((p) => p.classList.toggle('active', p.id === 'pane-' + id));
      tabs.forEach((b) => { const on = b.dataset.pane === id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      history.replaceState(null, '', '#' + id);
      if (id === 'activity') { loadLog(); chrome.storage.local.set({ unread: 0 }); }
    };
    tabs.forEach((b) => b.addEventListener('click', () => show(b.dataset.pane)));
    $('.nav-list').addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const move = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (move) { e.preventDefault(); show(tabs[(i + move + tabs.length) % tabs.length].dataset.pane, true); }
      else if (e.key === 'Home') { e.preventDefault(); show(tabs[0].dataset.pane, true); }
      else if (e.key === 'End') { e.preventDefault(); show(tabs[tabs.length - 1].dataset.pane, true); }
    });
    show(location.hash.slice(1));
    window.addEventListener('hashchange', () => show(location.hash.slice(1)));
    const dot = (n) => $('#tab-activity').classList.toggle('has-dot', n > 0);
    chrome.storage.local.get('unread').then((r) => dot(r.unread || 0)).catch(() => {});
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area === 'local' && ch.unread) dot($('#pane-activity').classList.contains('active') ? 0 : (ch.unread.newValue || 0));
      if (area === 'local' && ch.log) { logs = ch.log.newValue || []; renderLog(); }
    });

    // nhóm lựa chọn + công tắc
    for (const id of GROUPS) {
      const box = $('#' + id);
      $$('button', box).forEach((b) => b.addEventListener('click', () => change({ [id]: b.dataset.value })));
      bindRadioKeys(box);
    }
    for (const id of SWITCHES) $('#' + id).addEventListener('change', (e) => change({ [id]: e.target.checked }));
    mq.addEventListener('change', () => { if (S.themeMode === 'system') applyTheme(); });

    // thư mục lưu
    const folderInput = $('#saveFolder');
    const saveFolder = debounced(() => persist({ saveFolder: S.saveFolder }));
    folderInput.addEventListener('input', () => { S.saveFolder = folderInput.value; renderPreview(); saveFolder(); });
    $('#openChromeDl').addEventListener('click', async () => {
      try { await chrome.tabs.create({ url: 'chrome://settings/downloads' }); }
      catch (_) { toast(L('warn.chromeSettings'), 'warning'); }
    });

    // mẫu tên tệp
    const input = $('#filenameTemplate');
    const saveName = debounced(() => persist({ filenameTemplate: S.filenameTemplate }));
    input.addEventListener('input', () => { S.filenameTemplate = input.value; renderPreview(); saveName(); });
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
    $('#resetTemplate').addEventListener('click', () => { input.value = DEFAULTS.filenameTemplate; change({ filenameTemplate: DEFAULTS.filenameTemplate }); });

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
      const report = { app: 'x-downloader', version: chrome.runtime.getManifest().version, ua: navigator.userAgent, entries: logs.map((e) => ({ ...e, time: new Date(e.ts).toISOString() })) };
      try { await navigator.clipboard.writeText(JSON.stringify(report, null, 2)); toast(L('toast.copied'), 'success'); }
      catch (_) { toast(L('err.save'), 'error'); }
    });

    // sao lưu / đặt lại
    $('#exportBtn').addEventListener('click', () => {
      const { onboarded, ...settings } = S;
      const blob = new Blob([JSON.stringify({ app: 'x-downloader', version: chrome.runtime.getManifest().version, settings }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'x-downloader-settings.json';
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
        renderAll();
        if (await persist(clean)) toast(L('toast.imported'), 'success');
      } catch (_) { toast(L('err.import'), 'error'); }
    });
    $('#resetAll').addEventListener('click', async () => {
      const yes = await X.confirmDialog(ctx, { title: L('dlg.resetTitle'), body: L('dlg.resetBody'), ok: L('ab.resetBtn'), cancel: L('dlg.cancel') });
      if (!yes) return;
      try {
        const keep = S.onboarded;
        await chrome.storage.sync.clear();
        await chrome.storage.sync.set({ onboarded: keep });
        S = await chrome.storage.sync.get(DEFAULTS);
        renderAll();
        toast(L('toast.reset'), 'success');
      } catch (_) { toast(L('err.save'), 'error'); }
    });

    $('#ver').textContent = chrome.runtime.getManifest().version;
  }

  (async () => {
    S = await chrome.storage.sync.get(DEFAULTS);
    X.hydrate();
    wire();
    renderAll();
    loadLog();
  })();
})();
