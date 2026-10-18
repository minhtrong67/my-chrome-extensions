// options.js

let t = I18N.en;
let currentSettings = {};
let currentTheme = 'system';
let currentLang  = 'system';
let currentMode  = 'ask';

async function init() {
  // Apply the last-known theme immediately (from local cache) to avoid a
  // flash of the wrong theme while chrome.storage.sync resolves.
  applyTheme(getCachedThemePrefs().theme);

  currentSettings = await getSettings();
  const lang = await getLang(currentSettings);
  t = I18N[lang];
  applyTheme(currentSettings.theme);
  applyTranslations();
  loadValues();
  bindEvents();
  updatePreview();
  document.body.classList.add('ready');
}

function applyTranslations() {
  document.getElementById('pageTitle').textContent           = t.appName;
  document.getElementById('pageDesc').textContent            = t.settings;
  document.getElementById('secQualityTitle').textContent     = t.sectionQuality;
  document.getElementById('qualityLabel').textContent        = t.quality.toUpperCase();
  document.getElementById('qualityHint').textContent         = t.qualityHint;
  document.getElementById('secLocationTitle').textContent    = t.saveLocation;
  document.getElementById('secLocationDesc').textContent     = t.saveModeLabel;
  document.getElementById('modeAskTitle').textContent        = t.saveModeAsk;
  document.getElementById('modeAskDesc').textContent         = t.saveModeAskDesc;
  document.getElementById('modeDownloadsTitle').textContent  = t.saveModeDownloads;
  document.getElementById('modeDownloadsDesc').textContent   = t.saveModeDownloadsDesc;
  document.getElementById('modeSubfolderTitle').textContent  = t.saveModeSubfolder;
  document.getElementById('modeSubfolderDesc').textContent   = t.saveModeSubfolderDesc;
  document.getElementById('subfolderLabel').textContent      = t.subfolderLabel.toUpperCase();
  document.getElementById('saveSubfolder').placeholder       = t.subfolderPlaceholder;
  document.getElementById('subfolderHint').textContent       = t.subfolderHint;
  document.getElementById('conflictLabel').textContent       = t.conflictAction.toUpperCase();
  document.getElementById('optUniquify').textContent         = t.uniquify;
  document.getElementById('optOverwrite').textContent        = t.overwrite;
  document.getElementById('optPrompt').textContent           = t.prompt;
  document.getElementById('secFilenameTitle').textContent    = t.filenameTemplate;
  document.getElementById('filenameLabel').textContent       = t.filenameTemplate.toUpperCase();
  document.getElementById('filenameHint').textContent        = t.filenameTemplateHint;
  document.getElementById('previewLabel').textContent        = t.previewLabel;
  document.getElementById('secAppearanceTitle').textContent  = t.sectionAppearance;
  document.getElementById('themeLabel').textContent          = t.theme.toUpperCase();
  document.getElementById('themeLightLabel').textContent     = t.themeLight;
  document.getElementById('themeSystemLabel').textContent    = t.themeSystem;
  document.getElementById('themeDarkLabel').textContent      = t.themeDark;
  document.getElementById('langLabel').textContent           = t.language.toUpperCase();
  document.getElementById('langSystemLabel').textContent     = t.langSystem;
  document.getElementById('langEnLabel').textContent         = t.langEn;
  document.getElementById('langViLabel').textContent         = t.langVi;
  document.getElementById('secBehaviourTitle').textContent   = t.sectionBehaviour;
  document.getElementById('notifLabel').textContent          = t.notifications;
  document.getElementById('convertWebpLabel').textContent    = t.convertWebp;
  document.getElementById('convertWebpHint').textContent     = t.convertWebpHint;
  document.getElementById('convertPngLabel').textContent     = t.convertPng;
  document.getElementById('convertPngHint').textContent      = t.convertPngHint;
  document.getElementById('excludeLogosLabel').textContent   = t.excludeLogos;
  document.getElementById('excludeLogosHint').textContent    = t.excludeLogosHint;
  document.getElementById('formatSupportNote').textContent   = t.formatSupportNote;
  document.getElementById('minSizeLabel').textContent        = t.minSize.toUpperCase();
  document.getElementById('minSizeHint').textContent         = t.minSizeHint;
  document.getElementById('savedLabel').textContent          = t.saved;
  document.getElementById('btnSaveLabel').textContent        = t.save;
  document.getElementById('aboutName').textContent           = t.appName;
}

function loadValues() {
  const s = currentSettings;

  document.getElementById('quality').value = s.quality;
  document.getElementById('qualityBadge').textContent = s.quality;

  // Save mode
  currentMode = s.saveMode || 'ask';
  applyModeUI(currentMode);

  document.getElementById('saveSubfolder').value    = s.saveSubfolder || '';
  document.getElementById('filenameTemplate').value = s.filenameTemplate || '{original}';
  document.getElementById('conflictAction').value   = s.conflictAction || 'uniquify';

  currentTheme = s.theme   || 'system';
  currentLang  = s.language || 'system';
  setSegmentActive('themeSegment', currentTheme);
  setSegmentActive('langSegment',  currentLang);

  document.getElementById('showNotification').checked = s.showNotification;
  document.getElementById('convertWebp').checked      = s.convertWebp;
  document.getElementById('convertPng').checked       = s.convertPng;
  document.getElementById('excludeLogos').checked     = s.excludeLogos !== false;

  const minSize = Number.isFinite(s.minImageSize) ? s.minImageSize : 32;
  document.getElementById('minImageSize').value = minSize;
  document.getElementById('minSizeBadge').textContent = t.minSizePx(minSize);
}

function applyModeUI(mode) {
  // Update radio card styles
  ['ask','downloads','subfolder'].forEach(m => {
    const card = document.getElementById('modeCard' + cap(m));
    if (!card) return;
    card.classList.toggle('active', m === mode);
    card.querySelector('input[type="radio"]').checked = m === mode;
  });

  // Show/hide subfolder input
  const wrap = document.getElementById('subfolderWrap');
  if (mode === 'subfolder') {
    wrap.classList.add('visible');
  } else {
    wrap.classList.remove('visible');
  }

  // Hide conflictAction when mode=ask (ask opens native dialog)
  document.getElementById('conflictRow').style.display = mode === 'ask' ? 'none' : '';
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function setSegmentActive(id, value) {
  document.getElementById(id).querySelectorAll('.segment-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === value);
  });
}

function bindEvents() {
  // Quality
  document.getElementById('quality').addEventListener('input', e => {
    document.getElementById('qualityBadge').textContent = e.target.value;
  });

  // Minimum image size
  document.getElementById('minImageSize').addEventListener('input', e => {
    document.getElementById('minSizeBadge').textContent = t.minSizePx(e.target.value);
  });

  // Mode cards
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      currentMode = card.dataset.mode;
      applyModeUI(currentMode);
      updatePreview();
    });
  });

  // Subfolder input
  document.getElementById('saveSubfolder').addEventListener('input', () => {
    validateSubfolder();
    updatePreview();
  });
  // Stop label click from bubbling twice
  document.getElementById('saveSubfolder').addEventListener('click', e => e.stopPropagation());

  // Filename template → live preview
  document.getElementById('filenameTemplate').addEventListener('input', updatePreview);

  // Variable chips
  document.querySelectorAll('.var-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = document.getElementById('filenameTemplate');
      const v = chip.dataset.var;
      const pos = input.selectionStart;
      input.value = input.value.slice(0, pos) + v + input.value.slice(input.selectionEnd);
      input.selectionStart = input.selectionEnd = pos + v.length;
      input.focus();
      updatePreview();
    });
  });

  // Theme segment
  document.getElementById('themeSegment').querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTheme = btn.dataset.val;
      setSegmentActive('themeSegment', currentTheme);
      applyTheme(currentTheme);
    });
  });

  // Lang segment
  document.getElementById('langSegment').querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentLang = btn.dataset.val;
      setSegmentActive('langSegment', currentLang);
    });
  });

  // Save
  document.getElementById('btnSave').addEventListener('click', saveSettings);
}

function validateSubfolder() {
  const val = document.getElementById('saveSubfolder').value.trim();
  const err = document.getElementById('subfolderError');
  // Free-form naming is allowed (Vietnamese, spaces, symbols…) — only the
  // characters that Windows itself forbids in a folder name are blocked.
  if (val && INVALID_FOLDER_CHARS.test(val)) {
    err.textContent = t.errorInvalidFolder;
    err.classList.add('show');
    return false;
  }
  err.classList.remove('show');
  return true;
}

function updatePreview() {
  const template = document.getElementById('filenameTemplate').value || '{original}';
  const subfolder = document.getElementById('saveSubfolder').value.trim();
  const mode = currentMode;

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  let name = template
    .replace('{original}', 'photo_sunset')
    .replace('{date}',     date)
    .replace('{time}',     time)
    .replace('{datetime}', `${date}_${time}`)
    .replace(/[<>:"/\\|?*]/g, '_') || 'image';

  let preview = '';
  if (mode === 'ask') {
    preview = `[Save As dialog] → ${name}.jpg`;
  } else if (mode === 'subfolder' && subfolder) {
    const folder = sanitizeFolderPath(subfolder);
    preview = folder ? `Downloads/${folder}/${name}.jpg` : `Downloads/${name}.jpg`;
  } else {
    preview = `Downloads/${name}.jpg`;
  }

  document.getElementById('previewValue').textContent = preview;
}

async function saveSettings() {
  if (currentMode === 'subfolder' && !validateSubfolder()) return;

  const btn = document.getElementById('btnSave');
  const lbl = document.getElementById('btnSaveLabel');
  btn.disabled = true;
  lbl.textContent = t.saving;

  const newSettings = {
    quality:          parseInt(document.getElementById('quality').value, 10),
    saveMode:         currentMode,
    saveSubfolder:    document.getElementById('saveSubfolder').value.trim(),
    filenameTemplate: document.getElementById('filenameTemplate').value.trim() || '{original}',
    conflictAction:   document.getElementById('conflictAction').value,
    theme:            currentTheme,
    language:         currentLang,
    showNotification: document.getElementById('showNotification').checked,
    convertWebp:      document.getElementById('convertWebp').checked,
    convertPng:       document.getElementById('convertPng').checked,
    excludeLogos:     document.getElementById('excludeLogos').checked,
    minImageSize:     parseInt(document.getElementById('minImageSize').value, 10),
  };

  await chrome.storage.sync.set(newSettings);
  currentSettings = newSettings;

  // Re-apply translations if language changed
  const lang = currentLang === 'system'
    ? (navigator.language.startsWith('vi') ? 'vi' : 'en')
    : currentLang;
  t = I18N[lang];
  applyTranslations();

  btn.disabled = false;
  lbl.textContent = t.save;

  const status = document.getElementById('saveStatus');
  status.classList.add('show');
  setTimeout(() => status.classList.remove('show'), 2400);

  showSnackbar(t.saved, 'check_circle', false);
}

let _sbTimer;
function showSnackbar(msg, icon='check', isError=false) {
  const sb = document.getElementById('snackbar');
  document.getElementById('snackbarMsg').textContent  = msg;
  document.getElementById('snackbarIcon').textContent = icon;
  sb.style.color = isError ? 'var(--md-error)' : '';
  clearTimeout(_sbTimer);
  sb.classList.add('show');
  _sbTimer = setTimeout(() => sb.classList.remove('show'), 2500);
}

init();
