/* ================================================================
   QUICKNOTE — options.js
   ------------------------------------------------------------------
   Logic for the dedicated Settings page (options.html). Reads and
   writes the same chrome.storage.local keys as popup.js (via the
   shared QNSettings helper) so both surfaces always agree.

   Author: gnort67 · built with the help of Claude (Anthropic)
   ================================================================ */

const { store, TRASH_RETENTION_DAYS } = QNSettings;

let settings = { ...QNSettings.DEFAULTS };
let snackbarTimer = null;

const $ = (id) => document.getElementById(id);

async function init() {
  settings = await QNSettings.loadSettings();

  QNSettings.applyTheme(settings.theme, document);
  QNI18n.apply(settings.lang, document);
  $('aboutVersion').textContent = chrome.runtime.getManifest().version;

  reflectSettingsInUI();
  bindEvents();
  QNRipple.attach(document);

  QNSettings.watchSystemTheme(
    () => settings.theme,
    () => QNSettings.applyTheme(settings.theme, document),
  );
}

function t(key, ...args) {
  return QNI18n.t(settings.lang, key, ...args);
}

/** Persists a partial settings change and keeps local state in sync. */
function updateSetting(partial) {
  Object.assign(settings, partial);
  store.set(partial);
}

// ── REFLECT STATE → UI ───────────────────────────────────────────
function reflectSettingsInUI() {
  document.querySelectorAll('#langSegmented .segment').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === settings.lang);
  });
  document.querySelectorAll('#themeSegmented .segment').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === settings.theme);
  });
  document.querySelectorAll('#defaultColorPicker .color-dot').forEach((dot) => {
    dot.classList.toggle('active', dot.dataset.color === settings.defaultColor);
  });

  const sidebarSwitch = $('sidebarSwitch');
  sidebarSwitch.setAttribute('aria-checked', String(settings.sidebarOpen));

  $('fontSizeValue').textContent = settings.fontSize + 'px';
  $('editorPreviewBody').style.fontSize = settings.fontSize + 'px';
  $('autosaveValue').textContent = settings.autosaveDelay + 'ms';
}

// ── LANGUAGE / THEME / SIDEBAR DEFAULT ───────────────────────────
function setLanguage(lang) {
  updateSetting({ lang });
  QNI18n.apply(lang, document);
  reflectSettingsInUI();
}

function setTheme(theme) {
  updateSetting({ theme });
  QNSettings.applyTheme(theme, document);
  reflectSettingsInUI();
}

function toggleSidebarDefault() {
  updateSetting({ sidebarOpen: !settings.sidebarOpen });
  reflectSettingsInUI();
}

function setDefaultColor(color) {
  updateSetting({ defaultColor: color });
  reflectSettingsInUI();
}

// ── FONT SIZE / AUTOSAVE STEPPERS ────────────────────────────────
function stepFontSize(delta) {
  const next = Math.max(10, Math.min(26, settings.fontSize + delta));
  updateSetting({ fontSize: next });
  reflectSettingsInUI();
}

function stepAutosave(delta) {
  const next = Math.max(100, Math.min(3000, settings.autosaveDelay + delta));
  updateSetting({ autosaveDelay: next });
  reflectSettingsInUI();
}

// ── SNACKBAR ──────────────────────────────────────────────────────
function showSnackbar(message) {
  const snackbar = $('snackbar');
  $('snackbarText').textContent = message;
  snackbar.classList.add('visible');
  clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(() => snackbar.classList.remove('visible'), 2600);
}

// ── DATA: NOTES EXPORT / IMPORT ──────────────────────────────────
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportNotes() {
  const { notes = [] } = await store.get(['notes']);
  const active = notes.filter((n) => !n.deletedAt);
  const payload = JSON.stringify({ version: 3, exported: Date.now(), notes: active }, null, 2);
  downloadFile(`quicknote-backup-${new Date().toISOString().slice(0, 10)}.json`, payload, 'application/json');
  showSnackbar(t('toastNotesExported', active.length));
}

async function importNotesFile(file) {
  try {
    const data = JSON.parse(await file.text());
    const incoming = Array.isArray(data) ? data : data.notes || [];
    if (!incoming.length) throw new Error('empty');

    const { notes = [] } = await store.get(['notes']);
    const now = Date.now();
    const cleaned = incoming.map((n) => ({
      id: (n.id ? String(n.id) : '') + '-' + Math.random().toString(36).slice(2, 6),
      title: n.title || '',
      content: n.content || '',
      createdAt: n.createdAt || now,
      updatedAt: n.updatedAt || now,
      pinned: !!n.pinned,
      color: n.color || '',
      deletedAt: null,
    }));
    await store.set({ notes: [...cleaned, ...notes] });
    showSnackbar(t('toastImportDone', cleaned.length));
  } catch {
    showSnackbar(t('toastImportErr'));
  }
}

// ── DATA: SETTINGS EXPORT / IMPORT ───────────────────────────────
function exportSettingsFile() {
  const payload = JSON.stringify({ type: 'quicknote-settings', version: 1, settings }, null, 2);
  downloadFile('quicknote-settings.json', payload, 'application/json');
  showSnackbar(t('toastSettingsExported'));
}

async function importSettingsFile(file) {
  try {
    const data = JSON.parse(await file.text());
    const incoming = data.settings || data;
    const clean = {};
    for (const key of QNSettings.SETTINGS_KEYS) {
      if (incoming[key] !== undefined) clean[key] = incoming[key];
    }
    if (Object.keys(clean).length === 0) throw new Error('empty');

    updateSetting(clean);
    QNSettings.applyTheme(settings.theme, document);
    QNI18n.apply(settings.lang, document);
    reflectSettingsInUI();
    showSnackbar(t('toastSettingsImported'));
  } catch {
    showSnackbar(t('toastSettingsImportErr'));
  }
}

async function resetAllSettings() {
  settings = await QNSettings.resetSettings();
  QNSettings.applyTheme(settings.theme, document);
  QNI18n.apply(settings.lang, document);
  reflectSettingsInUI();
  showSnackbar(t('toastSettingsReset'));
}

// ── DANGER ZONE ───────────────────────────────────────────────────
async function clearTrash() {
  const { notes = [] } = await store.get(['notes']);
  await store.set({ notes: notes.filter((n) => !n.deletedAt) });
  showSnackbar(t('toastTrashCleared'));
}

async function clearAllNotes() {
  const { notes = [] } = await store.get(['notes']);
  const now = Date.now();
  await store.set({ notes: notes.map((n) => ({ ...n, deletedAt: n.deletedAt || now })) });
  showSnackbar(t('toastAllCleared'));
}

// ── EVENTS ────────────────────────────────────────────────────────
function bindEvents() {
  $('btnBackToApp').addEventListener('click', () => window.close());

  document.querySelectorAll('#langSegmented .segment').forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.value));
  });
  document.querySelectorAll('#themeSegmented .segment').forEach((btn) => {
    btn.addEventListener('click', () => setTheme(btn.dataset.value));
  });
  document.querySelectorAll('#defaultColorPicker .color-dot').forEach((dot) => {
    dot.addEventListener('click', () => setDefaultColor(dot.dataset.color));
  });

  $('sidebarSwitch').addEventListener('click', toggleSidebarDefault);

  $('btnFontDown').addEventListener('click', () => stepFontSize(-1));
  $('btnFontUp').addEventListener('click', () => stepFontSize(1));
  $('btnAutosaveDown').addEventListener('click', () => stepAutosave(-100));
  $('btnAutosaveUp').addEventListener('click', () => stepAutosave(100));

  $('btnExportNotes').addEventListener('click', exportNotes);
  $('btnImportNotes').addEventListener('click', () => { $('fileImportNotes').value = ''; $('fileImportNotes').click(); });
  $('fileImportNotes').addEventListener('change', (e) => {
    if (e.target.files[0]) importNotesFile(e.target.files[0]);
  });

  $('btnExportSettings').addEventListener('click', exportSettingsFile);
  $('btnImportSettings').addEventListener('click', () => { $('fileImportSettings').value = ''; $('fileImportSettings').click(); });
  $('fileImportSettings').addEventListener('change', (e) => {
    if (e.target.files[0]) importSettingsFile(e.target.files[0]);
  });

  // Reset settings (confirm modal)
  $('btnResetSettings').addEventListener('click', () => $('resetModal').classList.add('visible'));
  $('btnCancelReset').addEventListener('click', () => $('resetModal').classList.remove('visible'));
  $('btnConfirmReset').addEventListener('click', () => {
    $('resetModal').classList.remove('visible');
    resetAllSettings();
  });

  // Clear trash (confirm modal)
  $('btnClearTrash').addEventListener('click', () => $('clearTrashModal').classList.add('visible'));
  $('btnCancelClearTrash').addEventListener('click', () => $('clearTrashModal').classList.remove('visible'));
  $('btnConfirmClearTrash').addEventListener('click', () => {
    $('clearTrashModal').classList.remove('visible');
    clearTrash();
  });

  // Clear all notes (confirm modal)
  $('btnClearAll').addEventListener('click', () => $('clearAllModal').classList.add('visible'));
  $('btnCancelClearAll').addEventListener('click', () => $('clearAllModal').classList.remove('visible'));
  $('btnConfirmClearAll').addEventListener('click', () => {
    $('clearAllModal').classList.remove('visible');
    clearAllNotes();
  });

  // Close modals by clicking the scrim
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('visible');
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach((o) => o.classList.remove('visible'));
    }
  });

  $('btnViewLanding').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('landing.html') });
  });

  // Side-nav: smooth scroll + active-state highlighting
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById(item.dataset.target).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const sections = document.querySelectorAll('.card');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navItems.forEach((item) => item.classList.toggle('active', item.dataset.target === entry.target.id));
        }
      });
    },
    { rootMargin: '-20% 0px -70% 0px' },
  );
  sections.forEach((s) => observer.observe(s));
}

init();
