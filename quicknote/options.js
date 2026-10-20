/* QUICKNOTE — options.js · Settings embedded in chrome://extensions (same component as the popup panel).
   Author: minhtrong67 · AI support: Claude (Anthropic) */
(async () => {
  'use strict';
  let settings = await QNSettings.load();
  let lang = QNSettings.resolveLang(settings.lang);

  const apply = (animate) => {
    lang = QNSettings.resolveLang(settings.lang);
    QNSettings.applyAppearance(settings, document, animate);
    QNI18n.apply(lang, document);
  };
  apply(false);

  const ui = QNSettingsUI.mount(document.getElementById('root'), {
    getSettings: () => settings,
    getLang: () => lang,
    update: (partial) => { Object.assign(settings, partial); QNSettings.store.set(partial); apply(true); },
  });
  QNSettings.watchSystem(() => settings.theme, () => apply(true));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    let touched = false;
    QNSettings.KEYS.forEach((k) => { if (changes[k] && changes[k].newValue !== settings[k]) { settings[k] = changes[k].newValue; touched = true; } });
    if (touched) { apply(true); ui.refresh(); }
  });
  document.documentElement.dataset.ready = '1';
})();
