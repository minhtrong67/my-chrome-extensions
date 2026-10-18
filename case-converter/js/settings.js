/**
 * Case Converter — shared settings schema + storage helpers
 */

const DEFAULT_SHORTCUTS = {
  uppercase:        { alt: true, ctrl: false, shift: false, meta: false, key: 'U' },
  lowercase:        { alt: true, ctrl: false, shift: false, meta: false, key: 'L' },
  capitalize:       { alt: true, ctrl: false, shift: false, meta: false, key: 'C' },
  sentenceCase:     { alt: true, ctrl: false, shift: false, meta: false, key: 'S' },
  titleCase:        { alt: true, ctrl: false, shift: false, meta: false, key: 'T' },
  alternatingCase:  { alt: true, ctrl: false, shift: false, meta: false, key: 'X' },
};

const DEFAULT_SETTINGS = {
  theme: 'system',        // 'light' | 'dark' | 'system'
  language: 'auto',       // 'auto' | 'en' | 'vi' (auto detects browser locale)
  font: 'roboto',          // 'roboto' | 'inter' | 'beVietnamPro'
  color: 'purple',          // Material palette: purple | blue | green | orange | pink | teal
  shortcutsEnabled: true,
  shortcuts: DEFAULT_SHORTCUTS,
  excludedSites: [],
};

const SETTINGS_KEY = 'caseConverterSettings';

const SettingsStore = {
  async load() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(SETTINGS_KEY, (res) => {
        const stored = res[SETTINGS_KEY] || {};
        resolve({
          ...DEFAULT_SETTINGS,
          ...stored,
          language: ['en', 'vi'].includes(stored.language) ? stored.language : SettingsStore.detectLocale(),
          color: ['purple', 'blue', 'green', 'orange', 'pink', 'teal'].includes(stored.color) ? stored.color : DEFAULT_SETTINGS.color,
          shortcuts: { ...DEFAULT_SHORTCUTS, ...(stored.shortcuts || {}) },
        });
      });
    });
  },

  async save(partial) {
    const current = await SettingsStore.load();
    const next = { ...current, ...partial };
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [SETTINGS_KEY]: next }, () => resolve(next));
    });
  },

  onChange(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[SETTINGS_KEY]) {
        callback(changes[SETTINGS_KEY].newValue);
      }
    });
  },

  detectLocale() {
    const uiLang = (navigator.language || 'en').toLowerCase();
    return uiLang.startsWith('vi') ? 'vi' : 'en';
  },

  formatShortcut(sc) {
    if (!sc) return '';
    const parts = [];
    if (sc.ctrl) parts.push('Ctrl');
    if (sc.alt) parts.push('Alt');
    if (sc.shift) parts.push('Shift');
    if (sc.meta) parts.push(navigator.platform.includes('Mac') ? 'Cmd' : 'Win');
    parts.push((sc.key || '').toUpperCase());
    return parts.join(' + ');
  },
};

function applyThemeClass(theme) {
  const root = document.documentElement;
  const resolved =
    theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
  root.setAttribute('data-theme', resolved);
}

function applyFontClass(font) {
  document.documentElement.setAttribute('data-font', ['inter', 'beVietnamPro', 'roboto'].includes(font) ? font : 'roboto');
}

if (typeof module !== 'undefined') {
  module.exports = { DEFAULT_SETTINGS, DEFAULT_SHORTCUTS, SettingsStore };
}
