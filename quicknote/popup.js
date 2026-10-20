/* ================================================================
   QUICKNOTE — popup.js
   Notes list, editor, trash, import/export and the in-popup Settings
   panel. Preferences (colour / theme / language) live in shared/settings.js.

   Note model: { id, title, content, createdAt, updatedAt, pinned, color, deletedAt }
   Author: minhtrong67 · AI support: Claude (Anthropic)
   ================================================================ */
(() => {
  'use strict';

  const { store, TRASH_RETENTION_DAYS } = QNSettings;
  const DAY = 86400000;
  const AUTOSAVE_MS = 300;
  const $ = (id) => document.getElementById(id);

  const state = {
    notes: [], activeId: null, view: 'active', sortMode: 'updated', query: '', sidebarOpen: true,
    settings: { ...QNSettings.DEFAULTS }, lang: 'en',
  };

  const el = {
    app: $('app'), sidebar: $('sidebar'), list: $('notesList'), search: $('searchInput'), sort: $('sortSelect'),
    title: $('titleInput'), content: $('contentInput'), count: $('wordCount'), saved: $('saveIndicator'),
    editor: $('editorBody'), empty: $('emptyState'), trash: $('trashPreview'), actions: $('noteActions'),
    colorMenu: $('colorMenu'), ieMenu: $('ieMenu'), panel: $('settingsPanel'), scrim: $('dialogScrim'),
  };

  const t = (key, ...a) => QNI18n.t(state.lang, key, ...a);

  /* ───────────────────────── helpers ───────────────────────── */
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const findNote = (id) => state.notes.find((n) => n.id === id);
  const activeNote = () => { const n = findNote(state.activeId); return n && !n.deletedAt ? n : null; };
  const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const daysLeft = (ts) => Math.max(0, Math.ceil((ts + TRASH_RETENTION_DAYS * DAY - Date.now()) / DAY));

  function plainText(html) {                      // migrate very old rich-text notes
    if (!html || !/[<>]/.test(html)) return html || '';
    const d = document.createElement('div');
    d.innerHTML = html;
    d.querySelectorAll('br').forEach((n) => n.replaceWith('\n'));
    d.querySelectorAll('p,div,li').forEach((n) => n.insertAdjacentText('afterend', '\n'));
    return (d.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  }

  function normalize(n) {
    const now = Date.now();
    return {
      id: n.id || genId(), title: String(n.title || ''), content: plainText(String(n.content || '')),
      createdAt: Number(n.createdAt) || Number(n.updatedAt) || now, updatedAt: Number(n.updatedAt) || now,
      pinned: !!n.pinned, color: ['red', 'orange', 'yellow', 'green', 'blue', 'purple'].includes(n.color) ? n.color : '',
      deletedAt: n.deletedAt ? Number(n.deletedAt) : null,
    };
  }

  function formatDate(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return t('justNow');
    if (diff < 3600000) return t('minAgo', Math.floor(diff / 60000));
    if (diff < DAY) return t('hourAgo', Math.floor(diff / 3600000));
    const sameYear = new Date(ts).getFullYear() === new Date().getFullYear();
    return new Intl.DateTimeFormat(state.lang === 'vi' ? 'vi-VN' : 'en-GB',
      sameYear ? { day: '2-digit', month: 'short' } : { day: '2-digit', month: 'short', year: 'numeric' }).format(ts);
  }

  let persistFailed = false;
  function persist() {
    return store.set({ notes: state.notes }).then(() => { persistFailed = false; }, () => {
      if (!persistFailed) snackbar(t('toastSaveErr'));
      persistFailed = true;
    });
  }

  /* ───────────────────────── init ───────────────────────── */
  async function init() {
    const [settings, data] = await Promise.all([
      QNSettings.load(), store.get(['notes', 'activeId', 'sortMode', 'sidebarOpen']),
    ]);
    state.settings = settings;
    state.sortMode = ['updated', 'created', 'title'].includes(data.sortMode) ? data.sortMode : 'updated';
    state.sidebarOpen = data.sidebarOpen !== false;
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * DAY;
    const raw = Array.isArray(data.notes) ? data.notes : [];
    state.notes = raw.filter((n) => n && typeof n === 'object').map(normalize).filter((n) => !n.deletedAt || n.deletedAt > cutoff);
    if (state.notes.length !== raw.length) persist();
    const first = state.notes.find((n) => !n.deletedAt);
    state.activeId = (state.notes.find((n) => n.id === data.activeId && !n.deletedAt) || first || {}).id || null;

    QNIcons.mount(document);
    applyPrefs(false);
    el.sort.value = state.sortMode;
    setSidebar(state.sidebarOpen, false);
    bind();
    QNRipple.attach(document);
    renderAll(true);
    document.documentElement.dataset.ready = '1';

    QNSettings.watchSystem(() => state.settings.theme, () => QNSettings.applyAppearance(state.settings, document, true));
    chrome.storage.onChanged.addListener((changes, area) => {   // settings changed elsewhere (e.g. options page)
      if (area !== 'local') return;
      let touched = false;
      QNSettings.KEYS.forEach((k) => { if (changes[k] && changes[k].newValue !== state.settings[k]) { state.settings[k] = changes[k].newValue; touched = true; } });
      if (touched) { applyPrefs(true); settingsUI && settingsUI.refresh(); renderAll(false); }
    });
  }

  function applyPrefs(animate) {
    state.lang = QNSettings.resolveLang(state.settings.lang);
    QNSettings.applyAppearance(state.settings, document, animate);
    QNI18n.apply(state.lang, document);
  }

  /* ───────────────────────── rendering ───────────────────────── */
  function visibleNotes() {
    const q = fold(state.query.trim());
    let list = state.notes.filter((n) => {
      if (state.view === 'trash') return !!n.deletedAt;
      if (n.deletedAt) return false;
      return state.view === 'pinned' ? n.pinned : true;
    });
    if (q) list = list.filter((n) => fold(n.title).includes(q) || fold(n.content).includes(q));
    const by = {
      updated: (a, b) => b.updatedAt - a.updatedAt,
      created: (a, b) => b.createdAt - a.createdAt,
      title: (a, b) => (a.title || '\uffff').localeCompare(b.title || '\uffff', state.lang),
    }[state.sortMode];
    if (state.view === 'trash') return list.sort((a, b) => b.deletedAt - a.deletedAt);
    list.sort(by);
    return state.view === 'active' ? [...list.filter((n) => n.pinned), ...list.filter((n) => !n.pinned)] : list;
  }

  function renderAll(animate) { renderList(animate); renderMain(); }

  function renderList(animate) {
    const list = visibleNotes();
    const frag = document.createDocumentFragment();
    el.list.classList.toggle('animate', !!animate);
    if (!list.length) {
      const d = document.createElement('div');
      d.className = 'list-empty';
      d.textContent = state.query.trim() ? t('noResults') : state.view === 'trash' ? t('trashEmptyTitle') : state.view === 'pinned' ? t('noPinnedTitle') : t('noNotesTitle');
      frag.append(d);
    }
    list.forEach((n, i) => {
      const card = document.createElement('div');
      card.className = 'note-card md-ripple-host' + (n.id === state.activeId ? ' active' : '');
      card.dataset.id = n.id;
      card.setAttribute('role', 'listitem');
      card.tabIndex = 0;
      if (animate) card.style.animationDelay = Math.min(i, 12) * 22 + 'ms';

      const bar = document.createElement('span');
      bar.className = 'note-color';
      if (n.color) bar.style.background = `var(--md-tag-${n.color})`;

      const main = document.createElement('div');
      main.className = 'note-main';
      const row = document.createElement('div');
      row.className = 'note-title-row';
      const title = document.createElement('span');
      title.className = 'note-title' + (n.title ? '' : ' untitled');
      title.textContent = n.title || t('untitled');
      row.append(title);
      if (n.pinned && state.view !== 'trash') {
        const pin = document.createElement('span');
        pin.className = 'note-pin';
        pin.innerHTML = QNIcons.svg('pin', 14, 2.25);
        row.append(pin);
      }
      const meta = document.createElement('div');
      meta.className = 'note-meta';
      const when = state.view === 'trash' ? t('daysLeft', daysLeft(n.deletedAt)) : formatDate(n.updatedAt);
      const preview = n.content.replace(/\s+/g, ' ').trim().slice(0, 60);
      meta.textContent = preview ? `${when} · ${preview}` : when;
      main.append(row, meta);
      card.append(bar, main);
      frag.append(card);
    });
    el.list.replaceChildren(frag);
    QNRipple.attach(el.list);
  }

  function renderMain() {
    const inTrash = state.view === 'trash';
    const n = findNote(state.activeId);
    el.editor.hidden = el.empty.hidden = el.trash.hidden = true;

    if (inTrash && n && n.deletedAt) {
      el.trash.hidden = false;
      $('trashTitle').textContent = n.title || t('untitled');
      $('trashDays').textContent = t('daysLeft', daysLeft(n.deletedAt));
      $('trashBody').textContent = n.content;
    } else if (!inTrash && n && !n.deletedAt) {
      el.editor.hidden = false;
      el.title.value = n.title;
      el.content.value = n.content;
      updateCount();
    } else {
      el.empty.hidden = false;
      $('emptyTitle').textContent = inTrash ? t('trashEmptyTitle') : state.view === 'pinned' ? t('noPinnedTitle') : t('noNotesTitle');
      $('emptyDesc').textContent = inTrash ? t('trashEmptyDesc') : state.view === 'pinned' ? t('noPinnedDesc') : t('noNotesDesc');
    }
    const editable = !inTrash && !!activeNote();
    el.actions.hidden = !editable;
    if (editable) updatePinButton();
    $('btnEmptyTrash').hidden = !(inTrash && state.notes.some((x) => x.deletedAt));
  }

  function updatePinButton() {
    const n = activeNote();
    const pinned = !!(n && n.pinned);
    const b = $('btnPin');
    b.classList.toggle('toggled', pinned);
    b.setAttribute('aria-pressed', String(pinned));
    b.title = t(pinned ? 'unpin' : 'pin');
    b.setAttribute('aria-label', b.title);
  }

  function updateCount() {
    const v = el.content.value;
    const words = v.trim() ? v.trim().split(/\s+/).length : 0;
    el.count.textContent = t('wordCount', words, v.length);
  }

  /* ───────────────────────── saving ───────────────────────── */
  let saveTimer = null, dirty = false, savedTimer = null;

  function onEdit() {
    dirty = true;
    updateCount();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, AUTOSAVE_MS);
  }

  /** Writes the editor fields into the active note immediately. Safe to call anytime. */
  function flushSave() {
    clearTimeout(saveTimer);
    if (!dirty) return;
    dirty = false;
    const n = activeNote();
    if (!n) return;
    n.title = el.title.value.trim();
    n.content = el.content.value;
    n.updatedAt = Date.now();
    persist().then(() => {
      el.saved.classList.add('visible');
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => el.saved.classList.remove('visible'), 1600);
    });
    renderList(false);
  }

  /* ───────────────────────── note actions ───────────────────────── */
  function selectNote(id) {
    if (id === state.activeId) return;
    flushSave();
    state.activeId = id;
    store.set({ activeId: id });
    renderList(false);
    renderMain();
    document.querySelector('.note-card.active')?.scrollIntoView({ block: 'nearest' });
  }

  function setView(view) {
    flushSave();
    state.view = view;
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.view === view));
    const first = visibleNotes()[0];
    state.activeId = first ? first.id : null;
    renderAll(true);
  }

  function createNote() {
    flushSave();
    if (state.view !== 'active' || state.query) {
      state.view = 'active'; state.query = ''; el.search.value = '';
      document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.view === 'active'));
    }
    const now = Date.now();
    const n = { id: genId(), title: '', content: '', createdAt: now, updatedAt: now, pinned: false, color: '', deletedAt: null };
    state.notes.unshift(n);
    state.activeId = n.id;
    store.set({ activeId: n.id });
    persist();
    renderAll(false);
    el.title.focus();
  }

  function togglePin() {
    const n = activeNote(); if (!n) return;
    flushSave();
    n.pinned = !n.pinned;
    persist(); renderList(false); updatePinButton();
    snackbar(t(n.pinned ? 'toastPinned' : 'toastUnpinned'));
  }

  function setColor(color) {
    const n = activeNote(); if (!n) return;
    n.color = color;
    persist(); renderList(false); closeMenus();
  }

  function duplicateNote() {
    const n = activeNote(); if (!n) return;
    flushSave();
    const now = Date.now();
    const copy = { ...n, id: genId(), title: n.title ? `${n.title} (${t('copySuffix')})` : '', createdAt: now, updatedAt: now, pinned: false };
    state.notes.unshift(copy);
    state.activeId = copy.id;
    store.set({ activeId: copy.id });
    persist(); renderAll(false);
    snackbar(t('toastDuplicated'));
  }

  async function copyContent() {
    const n = activeNote(); if (!n) return;
    flushSave();
    const text = el.content.value;
    if (!text.trim()) return snackbar(t('toastCopyEmpty'));
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.append(ta); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (!ok) return snackbar(t('toastCopyFail'));
    }
    snackbar(t('toastCopied'));
  }

  async function moveToTrash() {
    const n = activeNote(); if (!n) return;
    const r = await openDialog({ icon: 'trash-2', danger: true, title: t('deleteTitle'), desc: t('deleteDesc'), ok: t('delete') });
    if (!r.ok) return;
    flushSave();
    n.deletedAt = Date.now(); n.pinned = false;
    const next = visibleNotes()[0];
    state.activeId = next ? next.id : null;
    store.set({ activeId: state.activeId });
    persist(); renderAll(false);
    snackbar(t('toastDeleted'), t('undo'), () => {
      n.deletedAt = null;
      state.view = 'active';
      document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.view === 'active'));
      state.activeId = n.id;
      persist(); renderAll(false);
    });
  }

  function restoreNote() {
    const n = findNote(state.activeId); if (!n) return;
    n.deletedAt = null;
    persist();
    setView('active');
    selectNote(n.id);
    snackbar(t('toastRestored'));
  }

  async function deleteForever() {
    const n = findNote(state.activeId); if (!n) return;
    const r = await openDialog({ icon: 'trash-2', danger: true, title: t('deleteForeverTitle'), desc: t('deleteForeverDesc'), ok: t('deleteForever') });
    if (!r.ok) return;
    state.notes = state.notes.filter((x) => x.id !== n.id);
    const next = visibleNotes()[0];
    state.activeId = next ? next.id : null;
    persist(); renderAll(false);
    snackbar(t('toastDeletedForever'));
  }

  async function emptyTrash() {
    const r = await openDialog({ icon: 'trash-2', danger: true, title: t('clearTrashTitle'), desc: t('clearTrashDesc'), ok: t('emptyTrash') });
    if (!r.ok) return;
    state.notes = state.notes.filter((x) => !x.deletedAt);
    state.activeId = null;
    persist(); renderAll(false);
    snackbar(t('toastTrashEmptied'));
  }

  /* ───────────────────────── export ───────────────────────── */
  function download(name, content, mime) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);   // revoking immediately can cancel the download
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  const safeName = (s) => (s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().slice(0, 50) || 'note');
  const exportable = () => { flushSave(); return state.notes.filter((n) => !n.deletedAt); };

  function exportJson() {
    const notes = exportable(); if (!notes.length) return snackbar(t('toastNoNote'));
    download(`quicknote-${stamp()}.json`, JSON.stringify({ app: 'QuickNote', version: 3, exported: Date.now(), notes }, null, 2), 'application/json');
    snackbar(t('toastExport', notes.length));
  }

  const csvField = (v) => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  function exportCsv() {
    const notes = exportable(); if (!notes.length) return snackbar(t('toastNoNote'));
    const rows = notes.map((n) => [n.title, n.content, n.pinned, n.color, n.updatedAt].map(csvField).join(','));
    download(`quicknote-${stamp()}.csv`, '\uFEFF' + ['title,content,pinned,color,updatedAt', ...rows].join('\r\n'), 'text/csv');
    snackbar(t('toastExport', notes.length));
  }

  function exportOne(ext, mime, build) {
    const n = activeNote(); if (!n) return snackbar(t('toastNoNote'));
    flushSave();
    const title = n.title || t('untitled');
    const name = safeName(title) + ext;
    download(name, build(title, n.content), mime);
    snackbar(t('toastExportFile', name));
  }
  const exportMd = () => exportOne('.md', 'text/markdown', (ti, c) => `# ${ti}\n\n${c}\n`);
  const exportTxt = () => exportOne('.txt', 'text/plain', (ti, c) => `${ti}\n${'─'.repeat(Math.min(ti.length, 40))}\n\n${c}\n`);

  /* ───────────────────────── import ───────────────────────── */
  function parseCsv(text) {
    const rows = []; let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((f) => f !== ''));
  }

  function notesFromCsv(text) {
    const rows = parseCsv(text.replace(/^\uFEFF/, '')); if (!rows.length) return [];
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const has = head.includes('title') || head.includes('content');
    const col = (name, fallback) => (has ? head.indexOf(name) : fallback);
    const [ti, co, pi, cl] = [col('title', 0), col('content', 1), col('pinned', -1), col('color', -1)];
    return (has ? rows.slice(1) : rows).map((r) => normalize({
      id: genId(), title: (r[ti] || '').trim(), content: r[co] || '', pinned: pi >= 0 && r[pi] === 'true', color: cl >= 0 ? r[cl] : '',
    })).filter((n) => n.title || n.content);
  }

  function notesFromJson(text) {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : data.notes || [];
    return arr.filter((n) => n && typeof n === 'object').map((n) => normalize({ ...n, id: genId(), deletedAt: null })).filter((n) => n.title || n.content);
  }

  function notesFromText(text, filename) {
    const fallback = filename.replace(/\.(txt|md)$/i, '').slice(0, 120);
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    let title = fallback, body = text;
    if (/^#\s+/.test(lines[0] || '')) { title = lines[0].replace(/^#+\s*/, '').trim() || fallback; body = lines.slice(1).join('\n').trim(); }
    return [normalize({ id: genId(), title, content: body })];
  }

  async function runImport(files, parser) {
    try {
      const lists = await Promise.all(Array.from(files).map(async (f) => parser(await f.text(), f.name)));
      const notes = lists.flat();
      if (!notes.length) return snackbar(t('toastImportErr'));
      const r = await openDialog({ icon: 'arrow-up-from-line', title: t('importTitle'), desc: t('importDesc', notes.length), ok: t('importBtn'), extra: true });
      if (!r.ok) return;
      flushSave();
      state.notes = r.mode === 'replace' ? [...notes, ...state.notes.filter((n) => n.deletedAt)] : [...notes, ...state.notes];
      state.view = 'active';
      document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.view === 'active'));
      state.activeId = notes[0].id;
      persist(); renderAll(true);
      snackbar(t('toastImportDone', notes.length));
    } catch { snackbar(t('toastImportErr')); }
  }

  /* ───────────────────────── dialog / menus / snackbar ───────────────────────── */
  let dlgResolve = null;
  function openDialog({ icon, danger, title, desc, ok, extra }) {
    return new Promise((resolve) => {
      closeMenus();
      dlgResolve = resolve;
      $('dlgIcon').innerHTML = QNIcons.svg(icon, 32, 1.75);
      $('dlgIcon').className = 'dialog-icon' + (danger ? ' danger' : '');
      $('dlgTitle').textContent = title;
      $('dlgDesc').textContent = desc;
      $('dlgExtra').hidden = !extra;
      const okBtn = $('dlgOk');
      okBtn.textContent = ok;
      okBtn.className = 'filled-btn md-ripple-host' + (danger ? ' danger' : '');
      document.querySelector('input[name="importMode"][value="merge"]').checked = true;
      el.scrim.hidden = false;
      okBtn.focus();
    });
  }
  function closeDialog(ok) {
    if (!dlgResolve) return;
    const mode = document.querySelector('input[name="importMode"]:checked').value;
    el.scrim.hidden = true;
    const r = dlgResolve; dlgResolve = null;
    r({ ok, mode });
  }

  function closeMenus() { el.colorMenu.classList.remove('open'); el.ieMenu.classList.remove('open'); }
  function toggleMenu(menu) {
    const open = !menu.classList.contains('open');
    closeMenus();
    if (open) {
      if (menu === el.colorMenu) {
        const cur = (activeNote() || {}).color || '';
        menu.querySelectorAll('.menu-item').forEach((b) => b.classList.toggle('selected', b.dataset.color === cur));
      }
      menu.classList.add('open');
    }
  }

  let snackTimer = null;
  function snackbar(message, actionLabel, action) {
    const bar = $('snackbar'), btn = $('snackbarAction');
    $('snackbarText').textContent = message;
    btn.hidden = !(actionLabel && action);
    btn.textContent = actionLabel || '';
    btn.onclick = action ? () => { clearTimeout(snackTimer); bar.classList.remove('visible'); action(); } : null;
    bar.classList.add('visible');
    clearTimeout(snackTimer);
    snackTimer = setTimeout(() => bar.classList.remove('visible'), action ? 5500 : 2400);
  }

  /* ───────────────────────── settings panel ───────────────────────── */
  let settingsUI = null;
  function updateSetting(partial) {
    Object.assign(state.settings, partial);
    store.set(partial);
    applyPrefs(true);
    renderAll(false);
  }
  function openSettings() {
    flushSave(); closeMenus();
    if (!settingsUI) {
      settingsUI = QNSettingsUI.mount($('settingsRoot'), {
        getSettings: () => state.settings, getLang: () => state.lang, update: updateSetting,
      });
    } else settingsUI.refresh();
    el.panel.classList.add('open');
    el.panel.setAttribute('aria-hidden', 'false');
    $('settingsBack').focus({ preventScroll: true });
  }
  function closeSettings() {
    el.panel.classList.remove('open');
    el.panel.setAttribute('aria-hidden', 'true');
    $('btnSettings').focus({ preventScroll: true });
  }

  function setSidebar(open, persistIt = true) {
    state.sidebarOpen = open;
    el.sidebar.classList.toggle('collapsed', !open);
    $('sidebarOpen').hidden = open;
    el.app.classList.toggle('no-sidebar', !open);
    if (persistIt) store.set({ sidebarOpen: open });
  }

  /* ───────────────────────── events ───────────────────────── */
  function bind() {
    $('sidebarOpen').onclick = () => setSidebar(true);
    $('sidebarClose').onclick = () => setSidebar(false);
    $('btnNewNote').onclick = createNote;

    let st = null;
    el.search.addEventListener('input', () => {
      clearTimeout(st);
      st = setTimeout(() => { state.query = el.search.value; renderList(false); }, 120);
    });
    document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => setView(c.dataset.view)));
    el.sort.addEventListener('change', () => { state.sortMode = el.sort.value; store.set({ sortMode: state.sortMode }); renderList(false); });

    el.list.addEventListener('click', (e) => { const c = e.target.closest('.note-card'); if (c) selectNote(c.dataset.id); });
    el.list.addEventListener('keydown', (e) => {
      const c = e.target.closest('.note-card');
      if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectNote(c.dataset.id); }
      if (c && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        (e.key === 'ArrowDown' ? c.nextElementSibling : c.previousElementSibling)?.focus();
      }
    });

    el.title.addEventListener('input', onEdit);
    el.content.addEventListener('input', onEdit);
    el.title.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.content.focus(); } });

    $('btnPin').onclick = togglePin;
    $('btnDuplicate').onclick = duplicateNote;
    $('btnCopy').onclick = copyContent;
    $('btnDelete').onclick = moveToTrash;
    $('btnRestore').onclick = restoreNote;
    $('btnForever').onclick = deleteForever;
    $('btnEmptyTrash').onclick = emptyTrash;

    $('btnColor').onclick = (e) => { e.stopPropagation(); toggleMenu(el.colorMenu); };
    el.colorMenu.addEventListener('click', (e) => { const b = e.target.closest('.menu-item'); if (b) setColor(b.dataset.color); });
    $('btnImportExport').onclick = (e) => { e.stopPropagation(); toggleMenu(el.ieMenu); };

    const pick = (id, input) => { $(id).onclick = () => { closeMenus(); $(input).value = ''; $(input).click(); }; };
    pick('ieImportJson', 'fileJson'); pick('ieImportCsv', 'fileCsv'); pick('ieImportTxt', 'fileTxt');
    $('fileJson').onchange = (e) => runImport(e.target.files, notesFromJson);
    $('fileCsv').onchange = (e) => runImport(e.target.files, notesFromCsv);
    $('fileTxt').onchange = (e) => runImport(e.target.files, notesFromText);
    $('ieExportJson').onclick = () => { closeMenus(); exportJson(); };
    $('ieExportCsv').onclick = () => { closeMenus(); exportCsv(); };
    $('ieExportMd').onclick = () => { closeMenus(); exportMd(); };
    $('ieExportTxt').onclick = () => { closeMenus(); exportTxt(); };

    $('btnSettings').onclick = openSettings;
    $('settingsBack').onclick = closeSettings;

    $('dlgOk').onclick = () => closeDialog(true);
    $('dlgCancel').onclick = () => closeDialog(false);
    el.scrim.addEventListener('click', (e) => { if (e.target === el.scrim) closeDialog(false); });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.menu')) closeMenus();
    });

    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') {
        if (dlgResolve) return closeDialog(false);
        if (el.colorMenu.classList.contains('open') || el.ieMenu.classList.contains('open')) return closeMenus();
        if (el.panel.classList.contains('open')) return closeSettings();
      }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); flushSave(); }
      if (e.altKey && !mod) {                 // Alt-based shortcuts never collide with browser shortcuts
        const k = e.key.toLowerCase();
        if (k === 'n') { e.preventDefault(); createNote(); }
        if (k === 'f') { e.preventDefault(); setSidebar(true); el.search.focus(); }
        if (k === 'p') { e.preventDefault(); togglePin(); }
      }
    });

    // The popup can close at any moment — never lose the last keystrokes.
    window.addEventListener('pagehide', flushSave);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
    window.addEventListener('blur', flushSave);
  }

  init();
})();
