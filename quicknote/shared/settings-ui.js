/* ================================================================
   QUICKNOTE — shared/settings-ui.js
   Renders the Settings screen (colour · appearance · language · about).
   The same component is mounted inside the popup (slide-over panel,
   no new tab needed) and on options.html (embedded in chrome://extensions).
   Author: minhtrong67 · AI support: Claude (Anthropic)
   ================================================================ */
(function (global) {
  'use strict';

  const THEMES = [['system', 'monitor', 'themeSystem'], ['light', 'sun', 'themeLight'], ['dark', 'moon', 'themeDark']];
  const LANGS = [['auto', 'sparkles', 'langAuto'], ['vi', 'languages', 'langVi'], ['en', 'languages', 'langEn']];

  function segmented(id, items) {
    return `<div class="segmented" id="${id}" role="group">${items.map(([v, icon, key]) =>
      `<button class="segment md-ripple-host" data-value="${v}" aria-pressed="false">
         <span class="tick"><i data-icon="check" data-size="18"></i></span>
         <i data-icon="${icon}" data-size="18"></i><span data-i18n="${key}"></span>
       </button>`).join('')}</div>`;
  }

  function head(icon, titleKey, descKey) {
    return `<header class="s-head"><span class="s-ico"><i data-icon="${icon}" data-size="20"></i></span>
      <div><h3 data-i18n="${titleKey}"></h3><p data-i18n="${descKey}"></p></div></header>`;
  }

  /**
   * ctx = { getSettings(): {lang,theme,color}, update(partial), getLang(): 'vi'|'en' }
   * Returns { refresh() } — call after settings or language change to sync the UI.
   */
  function mount(container, ctx) {
    const swatches = Object.entries(QNPalettes.seeds).map(([id, s]) =>
      `<button class="swatch" role="radio" data-color="${id}" style="--sw:${s.hex}" aria-checked="false">
         <i data-icon="check" data-size="20" data-stroke="3"></i></button>`).join('');
    const version = chrome.runtime.getManifest().version;

    container.innerHTML = `
      <div class="settings">
        <section class="s-card colour">${head('palette', 'secColor', 'secColorDesc')}
          <div class="swatches" id="swatches" role="radiogroup">${swatches}</div>
          <p class="s-hint" id="colorName"></p>
        </section>

        <section class="s-card">${head('sun', 'secTheme', 'secThemeDesc')}${segmented('themeSeg', THEMES)}</section>

        <section class="s-card">${head('languages', 'secLang', 'secLangDesc')}${segmented('langSeg', LANGS)}</section>

        <section class="s-card about">
          <div class="about-top">
            <img src="icons/icon128.png" width="56" height="56" alt="" />
            <div><h3>QuickNote</h3><p><span data-i18n="version"></span> ${version}</p></div>
          </div>
          <dl class="about-list">
            <div><dt><i data-icon="user" data-size="18"></i><span data-i18n="author"></span></dt><dd>minhtrong67</dd></div>
            <div><dt><i data-icon="sparkles" data-size="18"></i><span data-i18n="aiSupport"></span></dt><dd>Claude · Anthropic</dd></div>
          </dl>
          <p class="s-hint" data-i18n="aboutNote"></p>
          <button class="filled-btn has-icon md-ripple-host" id="btnLanding">
            <i data-icon="external-link" data-size="18"></i><span data-i18n="openLanding"></span>
          </button>
        </section>
      </div>`;

    QNIcons.mount(container);
    QNRipple.attach(container);

    const $ = (sel) => container.querySelector(sel);

    $('#swatches').addEventListener('click', (e) => {
      const b = e.target.closest('.swatch');
      if (b) { ctx.update({ color: b.dataset.color }); refresh(); }
    });
    $('#themeSeg').addEventListener('click', (e) => {
      const b = e.target.closest('.segment');
      if (b) { ctx.update({ theme: b.dataset.value }); refresh(); }
    });
    $('#langSeg').addEventListener('click', (e) => {
      const b = e.target.closest('.segment');
      if (b) { ctx.update({ lang: b.dataset.value }); refresh(); }
    });
    $('#btnLanding').addEventListener('click', () => {
      const s = ctx.getSettings();
      const hash = `#theme=${s.theme}&lang=${ctx.getLang()}`;
      chrome.tabs.create({ url: chrome.runtime.getURL('landing.html') + hash });
    });

    function refresh() {
      const s = ctx.getSettings();
      const lang = ctx.getLang();
      QNI18n.apply(lang, container);
      container.querySelectorAll('.swatch').forEach((b) => {
        const on = b.dataset.color === s.color;
        const name = QNI18n.colorName(lang, b.dataset.color);
        b.setAttribute('aria-checked', String(on));
        b.title = name;
        b.setAttribute('aria-label', name);
      });
      $('#colorName').textContent = QNI18n.colorName(lang, s.color);
      $('#themeSeg').querySelectorAll('.segment').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === s.theme)));
      $('#langSeg').querySelectorAll('.segment').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === s.lang)));
    }

    refresh();
    return { refresh };
  }

  global.QNSettingsUI = { mount };
})(window);
