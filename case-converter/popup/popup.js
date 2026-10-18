(async () => {
  const inputEl = document.getElementById('inputText');
  const outputEl = document.getElementById('outputText');
  const inputCount = document.getElementById('inputCount');
  const outputCount = document.getElementById('outputCount');
  const toolGrid = document.getElementById('toolGrid');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const useAsInputBtn = document.getElementById('useAsInputBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const mainView = document.querySelector('.cc-main');
  const footer = document.querySelector('.cc-footer');
  const settingsView = document.getElementById('settingsView');
  const app = document.querySelector('.cc-app');
  const backBtn = document.getElementById('backBtn');
  const popupLandingBtn = document.getElementById('popupLandingBtn');
  const popupThemeSegmented = document.getElementById('popupThemeSegmented');
  const popupLanguageSegmented = document.getElementById('popupLanguageSegmented');
  const popupFontSegmented = document.getElementById('popupFontSegmented');
  const popupColorSegmented = document.getElementById('popupColorSegmented');

  let settings = await SettingsStore.load();
  let lastTransform = 'capitalize';

  function render() {
    applyThemeClass(settings.theme);
    applyFontClass(settings.font);
    document.documentElement.setAttribute('data-color', settings.color || 'purple');
    I18N.apply(settings.language);
    renderTools();
    renderPopupSettings();
    updateCounts();
  }

  function renderPopupSettings() {
    [
      [popupThemeSegmented, settings.theme],
      [popupLanguageSegmented, settings.language],
      [popupFontSegmented, settings.font],
      [popupColorSegmented, settings.color || 'purple'],
    ].forEach(([container, value]) => Array.from(container.children).forEach((button) => button.classList.toggle('is-active', button.dataset.value === value)));
  }
  function showSettings(open) {
    app.classList.toggle('cc-app--settings', open);
    mainView.hidden = open;
    footer.hidden = open;
    settingsView.hidden = !open;
    mainView.style.display = open ? 'none' : '';
    footer.style.display = open ? 'none' : '';
    settingsView.style.display = open ? 'block' : 'none';
    if (open) backBtn.focus(); else inputEl.focus();
  }

  function updateCounts() {
    const wc = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
    inputCount.innerHTML = `${inputEl.value.length} <span data-i18n="charCount">${I18N.get(settings.language, 'charCount')}</span> · ${wc(inputEl.value)} ${I18N.get(settings.language, 'wordCount')}`;
    outputCount.innerHTML = `${outputEl.value.length} <span data-i18n="charCount">${I18N.get(settings.language, 'charCount')}</span> · ${wc(outputEl.value)} ${I18N.get(settings.language, 'wordCount')}`;
  }

  function renderTools() {
    toolGrid.innerHTML = '';
    CaseUtils.ORDER.forEach((id) => {
      const btn = document.createElement('button');
      btn.className = 'cc-chip';
      btn.type = 'button';

      const label = document.createElement('span');
      label.textContent = I18N.get(settings.language, id);
      btn.appendChild(label);

      const scEntry = settings.shortcuts[id];
      if (scEntry) {
        const sc = document.createElement('span');
        sc.className = 'cc-chip__shortcut';
        sc.textContent = SettingsStore.formatShortcut(scEntry);
        btn.appendChild(sc);
      }

      btn.addEventListener('click', () => runTransform(id));
      toolGrid.appendChild(btn);
    });
  }

  function runTransform(id) {
    lastTransform = id;
    outputEl.value = CaseUtils.apply(id, inputEl.value);
    updateCounts();
  }

  inputEl.addEventListener('input', () => {
    updateCounts();
    if (outputEl.value) runTransform(lastTransform);
  });

  clearBtn.addEventListener('click', () => {
    inputEl.value = '';
    outputEl.value = '';
    updateCounts();
    inputEl.focus();
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      inputEl.value = text;
      updateCounts();
      if (outputEl.value) runTransform(lastTransform);
    } catch (e) {
      inputEl.focus();
    }
  });

  useAsInputBtn.addEventListener('click', () => {
    inputEl.value = outputEl.value;
    outputEl.value = '';
    updateCounts();
  });

  copyBtn.addEventListener('click', async () => {
    if (!outputEl.value) return;
    try {
      await navigator.clipboard.writeText(outputEl.value);
      const original = copyBtn.textContent;
      copyBtn.textContent = I18N.get(settings.language, 'copied');
      copyBtn.classList.add('cc-filled-btn--success');
      setTimeout(() => {
        copyBtn.textContent = I18N.get(settings.language, 'copy');
        copyBtn.classList.remove('cc-filled-btn--success');
      }, 1200);
    } catch (e) {
      /* clipboard permission denied — ignore silently */
    }
  });

  settingsBtn.addEventListener('click', () => showSettings(true));
  backBtn.addEventListener('click', () => showSettings(false));
  [
    [popupThemeSegmented, 'theme'],
    [popupLanguageSegmented, 'language'],
    [popupFontSegmented, 'font'],
    [popupColorSegmented, 'color'],
  ].forEach(([container, key]) => container.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    settings = await SettingsStore.save({ [key]: button.dataset.value });
    render();
  }));
  popupLandingBtn.addEventListener('click', () => {
    const theme = settings.theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : settings.theme;
    const params = new URLSearchParams({ lang: settings.language, theme, color: settings.color || 'purple' });
    chrome.tabs.create({ url: `${chrome.runtime.getURL('index.html')}?${params.toString()}` });
  });

  SettingsStore.onChange((next) => {
    settings = next;
    render();
  });

  render();
  inputEl.focus();
})();
