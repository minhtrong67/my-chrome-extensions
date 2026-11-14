(() => {
  const X = XD;
  const { DEFAULTS, t } = X;
  const $ = (s) => document.querySelector(s);
  const IDS = ['enabled', 'autoReveal', 'downloadThumbnail', 'shortcutEnabled'];
  const L = (k, v) => t(S.language, k, v);
  let S, unread = 0;

  const ctx = () => ({ dark: X.isDarkMode(S) });
  const toast = X.createToaster(ctx);
  X.initTooltips(ctx);

  function render() {
    document.documentElement.dataset.theme = X.isDarkMode(S) ? 'dark' : 'light';
    document.documentElement.lang = S.language;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = L(el.dataset.i18n); });
    $('#ver').textContent = 'v' + chrome.runtime.getManifest().version;
    $('#scDesc').textContent = X.fmtShortcut(S.shortcut);
    $('#tipText').textContent = L('tip.body', { key: X.fmtShortcut(S.shortcut) });
    $('#tipBar').hidden = !!S.onboarded;
    $('#errBar').hidden = unread <= 0;
    $('#errText').textContent = L('popup.errors', { n: unread });
    for (const id of IDS) $('#' + id).checked = !!S[id];
    // các tuỳ chọn phụ chỉ có tác dụng khi nút tải đang bật
    document.querySelectorAll('[data-dep]').forEach((row) => {
      row.classList.toggle('off', !S.enabled);
      row.querySelector('input').disabled = !S.enabled;
    });
  }

  const openSettings = (hash) => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html' + (hash || '')) });
    window.close();
  };

  (async () => {
    S = await chrome.storage.sync.get(DEFAULTS);
    try { unread = (await chrome.storage.local.get('unread')).unread || 0; } catch (_) { unread = 0; }
    X.hydrate();
    render();

    for (const id of IDS) {
      $('#' + id).addEventListener('change', async (e) => {
        S[id] = e.target.checked;
        render();
        try { await chrome.storage.sync.set({ [id]: S[id] }); }
        catch (_) { toast(L('err.save'), 'error'); }
      });
    }
    $('#tipOk').addEventListener('click', async () => {
      S.onboarded = true; render();
      try { await chrome.storage.sync.set({ onboarded: true }); } catch (_) { /* bỏ qua */ }
    });
    $('#errView').addEventListener('click', () => openSettings('#activity'));
    const nav = $('#openSettings');
    nav.addEventListener('click', () => openSettings());
    nav.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSettings(); } });
  })();
})();
