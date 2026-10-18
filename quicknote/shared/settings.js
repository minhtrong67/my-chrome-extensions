/* ================================================================
   QUICKNOTE — shared/settings.js
   ------------------------------------------------------------------
   Single source of truth for QuickNote's user preferences: their
   default values, how they are read/written from chrome.storage.local
   and how a theme choice gets applied to the page. Both popup.js and
   options.js import this file so the two surfaces can never drift
   out of sync with each other.

   Author: gnort67 · built with the help of Claude (Anthropic)
   ================================================================ */

(function (global) {
  'use strict';

  // Every setting QuickNote persists, and its default value.
  // NOTE: `notes` and `activeId` are data, not "settings" — they are
  // intentionally excluded here and handled directly in popup.js.
  const DEFAULTS = {
    lang: 'vi',
    theme: 'system', // 'system' | 'light' | 'dark'
    fontSize: 14, // px, content editor only
    autosaveDelay: 600, // ms, debounce before a note is written to disk
    defaultColor: '', // '' = no colour label applied to new notes
    sidebarOpen: true,
    sortMode: 'updated', // 'updated' | 'created' | 'title'
  };

  const SETTINGS_KEYS = Object.keys(DEFAULTS);

  // Notes in Trash older than this are purged automatically on load.
  const TRASH_RETENTION_DAYS = 30;

  /** Thin promise wrapper around the callback-based storage API. */
  const store = {
    get: (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve)),
    set: (obj) => new Promise((resolve) => chrome.storage.local.set(obj, resolve)),
  };

  /** Reads every known setting, filling in defaults for anything unset. */
  async function loadSettings() {
    const saved = await store.get(SETTINGS_KEYS);
    const settings = { ...DEFAULTS };
    for (const key of SETTINGS_KEYS) {
      if (saved[key] !== undefined) settings[key] = saved[key];
    }
    return settings;
  }

  /** Persists a partial settings object (only the keys provided). */
  function saveSettings(partial) {
    return store.set(partial);
  }

  /** Resets every setting to its default value and returns it. */
  async function resetSettings() {
    await store.set(DEFAULTS);
    return { ...DEFAULTS };
  }

  /**
   * Applies a theme choice ('system' | 'light' | 'dark') to the
   * current document by setting the `data-theme` attribute that
   * shared/theme.css keys its colour tokens off of.
   */
  function applyTheme(theme, doc) {
    const d = doc || document;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
    d.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  /**
   * Registers `callback` to re-run whenever the OS/browser colour
   * scheme changes, but only while the user's chosen theme is
   * 'system' — otherwise an explicit Light/Dark choice would get
   * silently overridden.
   */
  function watchSystemTheme(getCurrentTheme, callback) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getCurrentTheme() === 'system') callback();
    });
  }

  global.QNSettings = {
    DEFAULTS,
    SETTINGS_KEYS,
    TRASH_RETENTION_DAYS,
    store,
    loadSettings,
    saveSettings,
    resetSettings,
    applyTheme,
    watchSystemTheme,
  };
})(window);
