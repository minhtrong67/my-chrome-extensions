(() => {
  const X = XMD;
  const { DEFAULTS, t } = X;
  const $ = (s) => document.querySelector(s);
  const IDS = ['enabled', 'autoReveal', 'downloadThumbnail', 'shortcutEnabled'];
  let S;

  const ctx = () => { const d = X.isDarkMode(S); const f = X.FONTS.find((x) => x.id === S.font) || X.FONTS[0]; return { dark: d, tokens: X.getTokens(S, d), font: f.stack, fs: '.9375rem', fsSm: '.8125rem' }; };
  X.initTooltips(ctx);
  const toast = X.createToaster(ctx);

  function render() {
    X.applyTheme(S);
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(S.language, el.dataset.i18n); });
    const b = $('#openSettings');
    b.setAttribute('data-xmd-tip', t(S.language, 'popup.settings'));
    b.setAttribute('aria-label', t(S.language, 'popup.settings'));
    $('#ver').textContent = 'v' + chrome.runtime.getManifest().version;
    for (const id of IDS) $('#' + id).checked = !!S[id];
  }

  (async () => {
    S = await chrome.storage.sync.get(DEFAULTS);
    render();
    for (const id of IDS) {
      $('#' + id).addEventListener('change', async (e) => {
        S[id] = e.target.checked;
        try { await chrome.storage.sync.set({ [id]: S[id] }); }
        catch (_) { toast(t(S.language, 'err.save'), 'error'); }
      });
    }
    $('#openSettings').addEventListener('click', () => { chrome.runtime.openOptionsPage(); window.close(); });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.themeMode === 'system') X.applyTheme(S); });
  })();
})();
