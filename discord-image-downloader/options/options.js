(async () => {
  const { DEFAULTS, t, resolveLang, buildFilename, migrate } = DLA;
  let s = migrate(await chrome.storage.sync.get(DEFAULTS));
  const $ = (q) => document.querySelector(q);
  const ids = { language: $('#language'), theme: $('#theme'), includeEmbeds: $('#includeEmbeds'), showToast: $('#showToast'), subfolder: $('#subfolder'), template: $('#template') };

  const currentLang = () => resolveLang(s.language, navigator.language);

  function applyTheme() {
    const th = s.theme === 'system'
      ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : s.theme;
    document.documentElement.dataset.theme = th;
  }

  function applyText() {
    const lang = currentLang();
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(lang, el.dataset.i18n); });
    document.querySelectorAll('.state').forEach((el) => {
      el.textContent = t(lang, ids[el.dataset.for].checked ? 'on' : 'off');
    });
  }

  function applyPreview() {
    $('#preview').textContent = buildFilename(s.filenameTemplate, {
      user: 'NEET', date: '2026-11-15', time: '0857', index: '01', name: 'image.png', messageId: '1234567890123456789'
    }, s.subfolder);
  }

  let savedTimer;
  async function save() {
    await chrome.storage.sync.set(s);
    const el = $('#saved');
    el.textContent = t(currentLang(), 'saved');
    el.classList.add('on');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => el.classList.remove('on'), 1400);
  }

  function render() {
    ids.language.value = s.language;
    ids.theme.value = s.theme;
    ids.includeEmbeds.checked = s.includeEmbeds;
    ids.showToast.checked = s.showToast;
    ids.subfolder.value = s.subfolder;
    ids.template.value = s.filenameTemplate;
    $('#version').textContent = chrome.runtime.getManifest().version;
    applyTheme(); applyText(); applyPreview();
  }

  ids.language.addEventListener('change', () => { s.language = ids.language.value; applyText(); save(); });
  ids.theme.addEventListener('change', () => { s.theme = ids.theme.value; applyTheme(); save(); });
  ids.includeEmbeds.addEventListener('change', () => { s.includeEmbeds = ids.includeEmbeds.checked; applyText(); save(); });
  ids.showToast.addEventListener('change', () => { s.showToast = ids.showToast.checked; applyText(); save(); });
  ids.subfolder.addEventListener('input', () => {
    s.subfolder = ids.subfolder.value.trim(); // empty is valid: save straight into Downloads
    applyPreview(); save();
  });
  ids.template.addEventListener('input', () => {
    s.filenameTemplate = ids.template.value.trim() || DEFAULTS.filenameTemplate;
    applyPreview(); save();
  });

  document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => {
    const input = ids.template;
    const a = input.selectionStart ?? input.value.length;
    const b = input.selectionEnd ?? a;
    input.setRangeText(chip.dataset.token, a, b, 'end');
    input.focus();
    input.dispatchEvent(new Event('input'));
  }));

  $('#restore').addEventListener('click', async () => { s = { ...DEFAULTS }; render(); await save(); });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);

  render();
})();
