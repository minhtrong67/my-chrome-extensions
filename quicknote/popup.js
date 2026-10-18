/* ================================================================
   QUICKNOTE — popup.js
   ------------------------------------------------------------------
   Drives the popup UI: the notes list (sidebar), the editor, and all
   quick actions (pin, colour label, duplicate, trash, import/export).
   Language/theme/font-size/autosave preferences live in options.js —
   this file only *reads* them and reacts if they change elsewhere.

   Data model for a note:
     {
       id:        string   unique id
       title:     string
       content:   string   plain text
       createdAt: number   epoch ms
       updatedAt: number   epoch ms
       pinned:    boolean
       color:     string   '' | 'red' | 'orange' | 'yellow' | 'green'
                            | 'blue' | 'purple'
       deletedAt: number|null  set when the note is in Trash
     }

   Author: gnort67 · built with the help of Claude (Anthropic)
   ================================================================ */

const { store, TRASH_RETENTION_DAYS } = QNSettings;

// ── APPLICATION STATE ────────────────────────────────────────────
let state = {
  notes: [],
  activeId: null,
  lang: 'vi',
  theme: 'system',
  fontSize: 14,
  autosaveDelay: 600,
  defaultColor: '',
  sidebarOpen: true,
  sortMode: 'updated',
  view: 'active', // 'active' | 'pinned' | 'trash'
  searchQuery: '',
};

let saveTimer = null;
let saveIndicatorTimer = null;
let snackbarTimer = null;
let pendingImportNotes = [];
let pendingUndoNote = null; // holds the note object while an Undo snackbar is showing

// ── DOM REFS ──────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const sidebar = $('sidebar');
const notesList = $('notesList');
const searchInput = $('searchInput');
const noteEditor = $('noteEditor');
const noteTitleInput = $('noteTitleInput');
const saveIndicator = $('saveIndicator');
const wordCount = $('wordCount');
const emptyState = $('emptyState');
const trashEmptyState = $('trashEmptyState');
const trashPreview = $('trashPreview');
const editorBody = document.querySelector('.editor-body');
const deleteModal = $('deleteModal');
const foreverModal = $('foreverModal');
const emptyTrashModal = $('emptyTrashModal');
const colorPopover = $('colorPopover');
const iePanel = $('iePanel');
const sortSelect = $('sortSelect');

const ITEM_ACTION_BUTTONS = ['btnPin', 'btnColor', 'btnDuplicate', 'btnCopyContent', 'btnDelete'].map($);

// ── MIGRATION: old notes stored rich-text HTML → plain text ─────
function htmlToPlainText(html) {
  if (!html) return '';
  if (!/[<>]/.test(html)) return html;
  const d = document.createElement('div');
  d.innerHTML = html;
  d.querySelectorAll('br').forEach((el) => el.replaceWith('\n'));
  d.querySelectorAll('p, div, li').forEach((el) => el.insertAdjacentText('afterend', '\n'));
  const text = d.textContent || d.innerText || '';
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/** Fills in any field a note might be missing (from older versions). */
function migrateNote(n) {
  const now = Date.now();
  return {
    id: n.id || genId(),
    title: n.title || '',
    content: htmlToPlainText(n.content || ''),
    createdAt: n.createdAt || n.updatedAt || now,
    updatedAt: n.updatedAt || now,
    pinned: !!n.pinned,
    color: n.color || '',
    deletedAt: n.deletedAt || null,
  };
}

/** Permanently removes notes that have sat in Trash past the retention window. */
function purgeExpiredTrash(notes) {
  const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return notes.filter((n) => !n.deletedAt || n.deletedAt > cutoff);
}

// ── INIT ──────────────────────────────────────────────────────────
async function init() {
  const settings = await QNSettings.loadSettings();
  const saved = await store.get(['notes', 'activeId']);

  Object.assign(state, settings);
  state.notes = purgeExpiredTrash((saved.notes || []).map(migrateNote));
  state.activeId = saved.activeId || null;

  QNSettings.applyTheme(state.theme, document);
  QNI18n.apply(state.lang, document);
  applyFontSize(state.fontSize);
  applySidebar(state.sidebarOpen);
  sortSelect.value = state.sortMode;

  saveAll(); // persist migrated/purged notes back to storage

  const firstActive = state.notes.find((n) => !n.deletedAt);
  state.activeId = (state.notes.find((n) => n.id === state.activeId && !n.deletedAt) || firstActive || {}).id || null;

  renderNotesList();
  updateMainView();
  updateWordCount();

  bindEvents();
  QNRipple.attach(document);

  // Keep the popup in sync if settings change elsewhere (e.g. the
  // Options page open in another tab at the same time).
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let themeChanged = false;
    let langChanged = false;
    for (const key of QNSettings.SETTINGS_KEYS) {
      if (changes[key]) {
        state[key] = changes[key].newValue;
        if (key === 'theme') themeChanged = true;
        if (key === 'lang') langChanged = true;
        if (key === 'fontSize') applyFontSize(state.fontSize);
      }
    }
    if (themeChanged) QNSettings.applyTheme(state.theme, document);
    if (langChanged) {
      QNI18n.apply(state.lang, document);
      renderNotesList();
      updateMainView();
      updateWordCount();
    }
  });

  QNSettings.watchSystemTheme(
    () => state.theme,
    () => QNSettings.applyTheme(state.theme, document),
  );
}

// ── i18n SHORTHAND ───────────────────────────────────────────────
function t(key, ...args) {
  return QNI18n.t(state.lang, key, ...args);
}

// ── FONT SIZE / SIDEBAR ──────────────────────────────────────────
function applyFontSize(size) {
  noteEditor.style.fontSize = size + 'px';
}

function applySidebar(open) {
  state.sidebarOpen = open;
  sidebar.classList.toggle('collapsed', !open);
  $('sidebarOpen').style.display = open ? 'none' : 'flex';
}

// ── NOTE HELPERS ──────────────────────────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function findNote(id) {
  return state.notes.find((n) => n.id === id);
}

/** The note currently open for editing, or null if none / it's deleted. */
function getActiveEditableNote() {
  const n = findNote(state.activeId);
  return n && !n.deletedAt ? n : null;
}

function createNote() {
  state.view = 'active';
  updateViewChips();

  const now = Date.now();
  const note = {
    id: genId(),
    title: '',
    content: '',
    createdAt: now,
    updatedAt: now,
    pinned: false,
    color: state.defaultColor || '',
    deletedAt: null,
  };
  state.notes.unshift(note);
  state.activeId = note.id;
  store.set({ activeId: note.id });

  renderNotesList();
  updateMainView();
  saveAll();
  noteTitleInput.focus();
}

function selectNote(id) {
  state.activeId = id;
  store.set({ activeId: id });
  renderNotesList();
  updateMainView();
}

function saveCurrentNote() {
  const note = getActiveEditableNote();
  if (!note) return;

  note.title = noteTitleInput.value.trim();
  note.content = noteEditor.value;
  note.updatedAt = Date.now();

  renderNotesList();
  saveAll();
  showSaveIndicator();
}

function saveAll() {
  store.set({ notes: state.notes });
}

function showSaveIndicator() {
  saveIndicator.classList.add('visible');
  clearTimeout(saveIndicatorTimer);
  saveIndicatorTimer = setTimeout(() => saveIndicator.classList.remove('visible'), 1800);
}

function triggerSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveCurrentNote, state.autosaveDelay);
}

// ── PIN / COLOUR / DUPLICATE ─────────────────────────────────────
function togglePin(id) {
  const note = findNote(id);
  if (!note) return;
  note.pinned = !note.pinned;
  saveAll();
  renderNotesList();
  updatePinButtonState();
  showSnackbar(note.pinned ? t('toastPinned') : t('toastUnpinned'));
}

function setNoteColor(id, color) {
  const note = findNote(id);
  if (!note) return;
  note.color = color;
  saveAll();
  renderNotesList();
  colorPopover.classList.remove('visible');
}

function duplicateNote(id) {
  const note = findNote(id);
  if (!note) return;
  const now = Date.now();
  const copy = {
    ...note,
    id: genId(),
    title: note.title ? `${note.title} (copy)` : '',
    createdAt: now,
    updatedAt: now,
    pinned: false,
    deletedAt: null,
  };
  state.notes.unshift(copy);
  selectNote(copy.id);
  saveAll();
  showSnackbar(t('toastDuplicated'));
}

function updatePinButtonState() {
  const note = getActiveEditableNote();
  const btnPin = $('btnPin');
  const pinned = !!(note && note.pinned);
  btnPin.classList.toggle('active', pinned);
  btnPin.title = t(pinned ? 'unpinTooltip' : 'pinTooltip');
}

// ── TRASH (soft-delete, restore, purge) ──────────────────────────
function moveToTrash(id) {
  const note = findNote(id);
  if (!note) return;
  note.deletedAt = Date.now();
  note.pinned = false;

  const nextActive = state.notes.find((n) => !n.deletedAt);
  state.activeId = nextActive ? nextActive.id : null;
  store.set({ activeId: state.activeId });

  saveAll();
  renderNotesList();
  updateMainView();

  pendingUndoNote = note;
  showSnackbar(t('toastDeleted'), t('undo'), () => {
    if (pendingUndoNote) {
      pendingUndoNote.deletedAt = null;
      saveAll();
      selectNote(pendingUndoNote.id);
      pendingUndoNote = null;
    }
  });
}

function restoreNote(id) {
  const note = findNote(id);
  if (!note) return;
  note.deletedAt = null;
  saveAll();
  state.view = 'active';
  updateViewChips();
  selectNote(id);
  showSnackbar(t('toastRestored'));
}

function deleteForever(id) {
  state.notes = state.notes.filter((n) => n.id !== id);
  if (state.activeId === id) state.activeId = null;
  saveAll();
  renderNotesList();
  updateMainView();
  showSnackbar(t('toastDeletedForever'));
}

function emptyTrash() {
  state.notes = state.notes.filter((n) => !n.deletedAt);
  state.activeId = null;
  saveAll();
  renderNotesList();
  updateMainView();
  showSnackbar(t('toastTrashEmptied'));
}

function daysLeft(deletedAt) {
  const purgeAt = deletedAt + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / 86400000));
}

// ── VIEW / SORT / FILTER ─────────────────────────────────────────
function updateViewChips() {
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.view === state.view);
  });
  $('btnEmptyTrash').style.display = state.view === 'trash' ? 'flex' : 'none';
}

function setView(view) {
  state.view = view;
  updateViewChips();

  const list = getVisibleNotes();
  state.activeId = list.length ? list[0].id : null;

  renderNotesList();
  updateMainView();
}

function getVisibleNotes() {
  const query = state.searchQuery.toLowerCase().trim();
  let list = state.notes.filter((n) => {
    if (state.view === 'trash') return !!n.deletedAt;
    if (n.deletedAt) return false;
    if (state.view === 'pinned') return n.pinned;
    return true;
  });

  if (query) {
    list = list.filter(
      (n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query),
    );
  }

  const sorters = {
    updated: (a, b) => b.updatedAt - a.updatedAt,
    created: (a, b) => b.createdAt - a.createdAt,
    title: (a, b) => (a.title || t('untitled')).localeCompare(b.title || t('untitled')),
  };

  if (state.view === 'trash') {
    list.sort((a, b) => b.deletedAt - a.deletedAt);
  } else if (state.view === 'active') {
    // Pinned notes always float to the top, each group sorted by the chosen mode.
    const pinned = list.filter((n) => n.pinned).sort(sorters[state.sortMode]);
    const rest = list.filter((n) => !n.pinned).sort(sorters[state.sortMode]);
    list = [...pinned, ...rest];
  } else {
    list.sort(sorters[state.sortMode]);
  }

  return list;
}

// ── RENDER: NOTES LIST ────────────────────────────────────────────
function renderNotesList() {
  const list = getVisibleNotes();
  notesList.innerHTML = '';

  if (list.length === 0) {
    const query = state.searchQuery.trim();
    const msg = query ? t('noResults') : state.view === 'trash' ? t('trashEmptyTitle') : t('noNotesTitle');
    notesList.innerHTML = `<div class="no-notes-msg">${escHtml(msg)}</div>`;
    return;
  }

  list.forEach((note) => {
    const card = document.createElement('div');
    card.className = 'note-card' + (note.id === state.activeId ? ' active' : '');
    card.dataset.id = note.id;

    const displayTitle = note.title || t('untitled');
    const preview = note.content.replace(/\s+/g, ' ').trim().slice(0, 56);
    const dateStr = state.view === 'trash' ? t('daysLeft', daysLeft(note.deletedAt)) : formatDate(note.updatedAt);
    const colorStyle = note.color ? `background:var(--md-tag-${note.color})` : '';
    const pinIcon =
      note.pinned && state.view !== 'trash'
        ? '<span class="note-card-pin"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg></span>'
        : '';

    card.innerHTML = `
      <span class="note-card-color-bar" style="${colorStyle}"></span>
      <div class="note-card-body">
        <div class="note-card-title-row">
          <span class="note-card-title">${escHtml(displayTitle)}</span>
          ${pinIcon}
        </div>
        <div class="note-card-meta">${dateStr}${preview ? ' · ' + escHtml(preview) : ''}</div>
      </div>
    `;

    card.addEventListener('click', () => selectNote(note.id));
    notesList.appendChild(card);
  });
}

// ── RENDER: MAIN PANEL (editor / empty states / trash preview) ──
function updateMainView() {
  const inTrash = state.view === 'trash';
  const note = findNote(state.activeId);

  editorBody.style.display = 'none';
  emptyState.style.display = 'none';
  trashEmptyState.style.display = 'none';
  trashPreview.style.display = 'none';

  if (inTrash) {
    if (note && note.deletedAt) {
      trashPreview.style.display = 'flex';
      $('trashPreviewTitle').textContent = note.title || t('untitled');
      $('trashPreviewDays').textContent = t('daysLeft', daysLeft(note.deletedAt));
      $('trashPreviewBody').textContent = note.content;
      $('btnRestoreNote').onclick = () => restoreNote(note.id);
      $('btnDeleteForever').onclick = () => foreverModal.classList.add('visible');
    } else {
      trashEmptyState.style.display = 'flex';
    }
  } else if (note && !note.deletedAt) {
    editorBody.style.display = 'flex';
    noteTitleInput.value = note.title;
    noteEditor.value = note.content;
    updateWordCount();
  } else {
    emptyState.style.display = 'flex';
  }

  updateItemActionButtons();
}

function updateItemActionButtons() {
  const show = state.view !== 'trash' && !!getActiveEditableNote();
  ITEM_ACTION_BUTTONS.forEach((btn) => {
    btn.style.display = show ? 'flex' : 'none';
  });
  if (show) updatePinButtonState();
}

// ── WORD COUNT ────────────────────────────────────────────────────
function updateWordCount() {
  const text = noteEditor.value.trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const chars = noteEditor.value.length;
  wordCount.textContent = t('wordCount', words, chars);
}

// ── COPY CONTENT ──────────────────────────────────────────────────
function copyContent() {
  const note = getActiveEditableNote();
  const text = note ? note.content : '';
  if (!text.trim()) {
    showSnackbar(t('toastCopyEmpty'));
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    const btn = $('btnCopyContent');
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1500);
    showSnackbar(t('toastCopied'));
  });
}

// ── HELPERS ───────────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return state.lang === 'vi' ? 'Vừa xong' : 'Just now';
  if (diff < 3600000) {
    const m = Math.floor(diff / 60000);
    return state.lang === 'vi' ? `${m} phút trước` : `${m}m ago`;
  }
  if (diff < 86400000) {
    const h = Math.floor(diff / 3600000);
    return state.lang === 'vi' ? `${h} giờ trước` : `${h}h ago`;
  }
  return new Date(ts).toLocaleDateString(state.lang === 'vi' ? 'vi-VN' : 'en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

// ── SNACKBAR (replaces the old plain toast) ──────────────────────
function showSnackbar(message, actionLabel, actionFn, duration) {
  const snackbar = $('snackbar');
  const actionBtn = $('snackbarAction');

  $('snackbarText').textContent = message;
  if (actionLabel && actionFn) {
    actionBtn.textContent = actionLabel;
    actionBtn.classList.add('visible');
    actionBtn.onclick = () => {
      actionFn();
      snackbar.classList.remove('visible');
      clearTimeout(snackbarTimer);
    };
  } else {
    actionBtn.classList.remove('visible');
    actionBtn.onclick = null;
  }

  snackbar.classList.add('visible');
  clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(() => {
    snackbar.classList.remove('visible');
    pendingUndoNote = null;
  }, duration || (actionLabel ? 5000 : 2400));
}

// ── EXPORT ────────────────────────────────────────────────────────
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function activeNotesOnly() {
  return state.notes.filter((n) => !n.deletedAt);
}

function exportAllJson() {
  const notes = activeNotesOnly();
  if (notes.length === 0) return showSnackbar(t('toastNoNote'));
  const payload = JSON.stringify({ version: 3, exported: Date.now(), notes }, null, 2);
  downloadFile(`quicknote-backup-${new Date().toISOString().slice(0, 10)}.json`, payload, 'application/json');
  showSnackbar(t('toastExportJson', notes.length));
}

function csvField(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function exportAllCsv() {
  const notes = activeNotesOnly();
  if (notes.length === 0) return showSnackbar(t('toastNoNote'));
  const header = 'title,content,updatedAt,pinned,color';
  const rows = notes.map((n) =>
    [csvField(n.title), csvField(n.content), csvField(n.updatedAt), csvField(n.pinned), csvField(n.color)].join(','),
  );
  const csv = '\uFEFF' + [header, ...rows].join('\r\n');
  downloadFile(`quicknote-backup-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
  showSnackbar(t('toastExportJson', notes.length));
}

function safeFilename(title) {
  return (title.slice(0, 40).replace(/[^a-zA-Z0-9À-ỹ \-_]/g, '') || 'note').trim();
}

function exportCurrentMd() {
  const note = getActiveEditableNote();
  if (!note) return showSnackbar(t('toastNoNote'));
  const title = note.title || t('untitled');
  const md = `# ${title}\n\n${note.content}`;
  const filename = safeFilename(title) + '.md';
  downloadFile(filename, md, 'text/markdown');
  showSnackbar(t('toastExportFile', filename));
}

function exportCurrentTxt() {
  const note = getActiveEditableNote();
  if (!note) return showSnackbar(t('toastNoNote'));
  const title = note.title || t('untitled');
  const content = title ? `${title}\n${'─'.repeat(Math.min(title.length, 40))}\n\n${note.content}` : note.content;
  const filename = safeFilename(title) + '.txt';
  downloadFile(filename, content, 'text/plain');
  showSnackbar(t('toastExportFile', filename));
}

// ── IMPORT ────────────────────────────────────────────────────────
// Minimal RFC4180-style CSV parser (handles quotes, commas, newlines).
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // no-op — \n handles the line break
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseCsvFile(text) {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, '')).filter((r) => r.some((f) => f !== ''));
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const hasHeader = header.includes('title') || header.includes('content');
  const titleIdx = hasHeader ? header.indexOf('title') : 0;
  const contentIdx = hasHeader ? header.indexOf('content') : 1;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows
    .map((r) => makeImportedNote(String(r[titleIdx] ?? '').trim(), String(r[contentIdx] ?? '')))
    .filter((n) => n.title || n.content);
}

function parseJsonFile(text) {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data.notes || [];
  return arr.filter((n) => n && typeof n === 'object').map((n) => migrateNote({ ...n, id: undefined }));
}

function parseTxtFile(text, filename) {
  const fallbackTitle = filename.replace(/\.(txt|md)$/i, '').slice(0, 80);
  const lines = text.split('\n');
  let title = fallbackTitle;
  let body = text;
  if (lines[0] && lines[0].startsWith('#')) {
    title = lines[0].replace(/^#+\s*/, '').trim() || fallbackTitle;
    body = lines.slice(1).join('\n').trim();
  }
  return [makeImportedNote(title, body)];
}

function makeImportedNote(title, content) {
  const now = Date.now();
  return { id: genId(), title, content, createdAt: now, updatedAt: now, pinned: false, color: '', deletedAt: null };
}

function openImportConfirm(notes) {
  pendingImportNotes = notes;
  $('importCount').textContent = notes.length;
  $('importModalDesc').innerHTML = t('importModalDesc', notes.length).replace(/^<strong>\d+<\/strong>\s*/, '');
  document.querySelector('input[name="importMode"][value="merge"]').checked = true;
  $('importModal').classList.add('visible');
}

function doImport() {
  const mode = document.querySelector('input[name="importMode"]:checked').value;
  state.notes = mode === 'replace' ? [...pendingImportNotes] : [...pendingImportNotes, ...state.notes];
  state.view = 'active';
  updateViewChips();

  if (state.notes.length > 0) state.activeId = state.notes[0].id;
  renderNotesList();
  updateMainView();
  saveAll();
  showSnackbar(t('toastImportDone', pendingImportNotes.length));
  pendingImportNotes = [];
}

// ── EVENTS ────────────────────────────────────────────────────────
function bindEvents() {
  $('sidebarOpen').addEventListener('click', () => applySidebar(true));
  $('sidebarClose').addEventListener('click', () => applySidebar(false));

  $('btnNewNote').addEventListener('click', createNote);

  searchInput.addEventListener('input', () => {
    state.searchQuery = searchInput.value;
    renderNotesList();
  });

  // View chips (All / Pinned / Trash)
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => setView(chip.dataset.view));
  });

  sortSelect.addEventListener('change', () => {
    state.sortMode = sortSelect.value;
    store.set({ sortMode: state.sortMode });
    renderNotesList();
  });

  noteTitleInput.addEventListener('input', triggerSave);
  noteEditor.addEventListener('input', () => {
    updateWordCount();
    triggerSave();
  });

  $('btnCopyContent').addEventListener('click', copyContent);

  $('btnPin').addEventListener('click', () => {
    if (state.activeId) togglePin(state.activeId);
  });

  $('btnDuplicate').addEventListener('click', () => {
    if (state.activeId) duplicateNote(state.activeId);
  });

  // Colour popover
  $('btnColor').addEventListener('click', (e) => {
    e.stopPropagation();
    iePanel.classList.remove('visible');
    colorPopover.classList.toggle('visible');
  });
  document.querySelectorAll('.swatch').forEach((sw) => {
    sw.addEventListener('click', () => {
      if (state.activeId) setNoteColor(state.activeId, sw.dataset.color);
    });
  });

  // Delete (move to trash)
  $('btnDelete').addEventListener('click', () => {
    if (state.activeId) deleteModal.classList.add('visible');
  });
  $('btnCancelDelete').addEventListener('click', () => deleteModal.classList.remove('visible'));
  $('btnConfirmDelete').addEventListener('click', () => {
    deleteModal.classList.remove('visible');
    if (state.activeId) moveToTrash(state.activeId);
  });
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) deleteModal.classList.remove('visible');
  });

  // Permanent delete (from Trash)
  $('btnCancelForever').addEventListener('click', () => foreverModal.classList.remove('visible'));
  $('btnConfirmForever').addEventListener('click', () => {
    foreverModal.classList.remove('visible');
    if (state.activeId) deleteForever(state.activeId);
  });
  foreverModal.addEventListener('click', (e) => {
    if (e.target === foreverModal) foreverModal.classList.remove('visible');
  });

  // Empty trash
  $('btnEmptyTrash').addEventListener('click', () => emptyTrashModal.classList.add('visible'));
  $('btnCancelEmptyTrash').addEventListener('click', () => emptyTrashModal.classList.remove('visible'));
  $('btnConfirmEmptyTrash').addEventListener('click', () => {
    emptyTrashModal.classList.remove('visible');
    emptyTrash();
  });
  emptyTrashModal.addEventListener('click', (e) => {
    if (e.target === emptyTrashModal) emptyTrashModal.classList.remove('visible');
  });

  // Settings page + landing page (both are separate extension pages)
  $('btnSettings').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('btnLanding').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('landing.html') });
  });

  // Import / export popover
  const btnIE = $('btnImportExport');
  btnIE.addEventListener('click', (e) => {
    e.stopPropagation();
    colorPopover.classList.remove('visible');
    iePanel.classList.toggle('visible');
  });

  $('ieExportJson').addEventListener('click', () => { iePanel.classList.remove('visible'); exportAllJson(); });
  $('ieExportCsv').addEventListener('click', () => { iePanel.classList.remove('visible'); exportAllCsv(); });
  $('ieExportMd').addEventListener('click', () => { iePanel.classList.remove('visible'); exportCurrentMd(); });
  $('ieExportTxt').addEventListener('click', () => { iePanel.classList.remove('visible'); exportCurrentTxt(); });

  $('ieImportJson').addEventListener('click', () => { iePanel.classList.remove('visible'); $('fileInputJson').value = ''; $('fileInputJson').click(); });
  $('fileInputJson').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const notes = parseJsonFile(await file.text());
      notes.length ? openImportConfirm(notes) : showSnackbar(t('toastImportErr'));
    } catch {
      showSnackbar(t('toastImportErr'));
    }
  });

  $('ieImportCsv').addEventListener('click', () => { iePanel.classList.remove('visible'); $('fileInputCsv').value = ''; $('fileInputCsv').click(); });
  $('fileInputCsv').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const notes = parseCsvFile(await file.text());
      notes.length ? openImportConfirm(notes) : showSnackbar(t('toastImportErr'));
    } catch {
      showSnackbar(t('toastImportErr'));
    }
  });

  $('ieImportTxt').addEventListener('click', () => { iePanel.classList.remove('visible'); $('fileInputTxt').value = ''; $('fileInputTxt').click(); });
  $('fileInputTxt').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    try {
      const results = await Promise.all(files.map(async (f) => parseTxtFile(await f.text(), f.name)));
      const notes = results.flat();
      notes.length ? openImportConfirm(notes) : showSnackbar(t('toastImportErr'));
    } catch {
      showSnackbar(t('toastImportErr'));
    }
  });

  $('btnCancelImport').addEventListener('click', () => {
    $('importModal').classList.remove('visible');
    pendingImportNotes = [];
  });
  $('btnConfirmImport').addEventListener('click', () => {
    $('importModal').classList.remove('visible');
    doImport();
  });
  $('importModal').addEventListener('click', (e) => {
    if (e.target === $('importModal')) {
      $('importModal').classList.remove('visible');
      pendingImportNotes = [];
    }
  });

  // Close popovers on outside click
  document.addEventListener('click', (e) => {
    if (!colorPopover.contains(e.target) && e.target !== $('btnColor')) colorPopover.classList.remove('visible');
    if (!iePanel.contains(e.target) && e.target !== btnIE) iePanel.classList.remove('visible');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); createNote(); }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); copyContent(); }
      if (e.key.toLowerCase() === 'f') { e.preventDefault(); searchInput.focus(); }
      if (e.key.toLowerCase() === 'p' && getActiveEditableNote()) { e.preventDefault(); togglePin(state.activeId); }
    }
    if (e.key === 'Escape') {
      [deleteModal, foreverModal, emptyTrashModal, $('importModal')].forEach((m) => m.classList.remove('visible'));
      colorPopover.classList.remove('visible');
      iePanel.classList.remove('visible');
    }
  });
}

// ── START ─────────────────────────────────────────────────────────
init();
