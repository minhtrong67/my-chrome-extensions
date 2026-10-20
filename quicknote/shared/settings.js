/* ================================================================
   QUICKNOTE — shared/settings.js
   Single source of truth for user preferences (colour, theme, language)
   and for applying them to a page. Used by popup, options and settings UI.
   Author: minhtrong67 · AI support: Claude (Anthropic)
   ================================================================ */
(function (global) {
  'use strict';

  const DEFAULTS = {
    lang: 'auto',     // 'auto' | 'vi' | 'en'
    theme: 'system',  // 'system' | 'light' | 'dark'
    color: 'cyan',    // key of QNPalettes.seeds
  };
  const KEYS = Object.keys(DEFAULTS);
  const TRASH_RETENTION_DAYS = 30;

  const store = {
    get: (keys) => chrome.storage.local.get(keys),
    set: (obj) => chrome.storage.local.set(obj),
  };

  /** Reads preferences, falling back to defaults and discarding invalid values. */
  async function load() {
    const saved = await store.get(KEYS);
    const s = { ...DEFAULTS };
    if (['auto', 'vi', 'en'].includes(saved.lang)) s.lang = saved.lang;
    if (['system', 'light', 'dark'].includes(saved.theme)) s.theme = saved.theme;
    if (QNPalettes.seeds[saved.color]) s.color = saved.color;
    return s;
  }

  /** 'auto' → detect from the browser UI language; Vietnamese or English only. */
  function resolveLang(pref) {
    if (pref === 'vi' || pref === 'en') return pref;
    const ui = (chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : navigator.language) || 'en';
    return /^vi\b/i.test(ui) ? 'vi' : 'en';
  }

  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const isDark = (theme) => theme === 'dark' || (theme === 'system' && darkQuery.matches);

  /** Applies theme + palette to a document by writing Material 3 tokens as CSS variables. */
  function applyAppearance(s, doc, animate) {
    const d = doc || document;
    const root = d.documentElement;
    const dark = isDark(s.theme);
    if (animate) {
      root.classList.add('themed-transition');
      clearTimeout(applyAppearance._t);
      applyAppearance._t = setTimeout(() => root.classList.remove('themed-transition'), 400);
    }
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    const seed = QNPalettes.seeds[s.color] || QNPalettes.seeds.cyan;
    const values = dark ? seed.dark : seed.light;
    QNPalettes.tokens.forEach((t, i) => root.style.setProperty('--md-' + t, '#' + values[i]));
  }

  /** Re-applies when the OS colour scheme flips, only while theme = system. */
  function watchSystem(getTheme, cb) {
    darkQuery.addEventListener('change', () => { if (getTheme() === 'system') cb(); });
  }

  global.QNSettings = { DEFAULTS, KEYS, TRASH_RETENTION_DAYS, store, load, resolveLang, applyAppearance, watchSystem };
})(window);
