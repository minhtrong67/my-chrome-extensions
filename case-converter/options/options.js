(async () => {
  const themeSegmented = document.getElementById('themeSegmented');
  const languageSegmented = document.getElementById('languageSegmented');
  const fontSegmented = document.getElementById('fontSegmented');
  const colorSegmented = document.getElementById('colorSegmented');
  const landingBtn = document.getElementById('landingBtn');
  const landingDialog = document.getElementById('landingDialog');
  const closeLandingBtn = document.getElementById('closeLandingBtn');
  const shortcutsEnabledToggle = document.getElementById('shortcutsEnabledToggle');
  const shortcutList = document.getElementById('shortcutList');
  const excludedSitesEl = document.getElementById('excludedSites');
  const saveSitesBtn = document.getElementById('saveSitesBtn');
  const resetAllBtn = document.getElementById('resetAllBtn');
  const snackbar = document.getElementById('snackbar');
  const navLinks = Array.from(document.querySelectorAll('.cc-nav__link'));

  let settings = await SettingsStore.load();
  let recordingId = null;

  function showSnackbar(text) {
    snackbar.textContent = text;
    snackbar.classList.add('cc-snackbar--visible');
    clearTimeout(showSnackbar._t);
    showSnackbar._t = setTimeout(() => snackbar.classList.remove('cc-snackbar--visible'), 1600);
  }

  function render() {
    applyThemeClass(settings.theme);
    applyFontClass(settings.font);
    document.documentElement.setAttribute('data-color', settings.color || 'purple');
    I18N.apply(settings.language);
    renderSegmented(themeSegmented, settings.theme);
    renderSegmented(languageSegmented, settings.language);
    renderSegmented(fontSegmented, settings.font);
    renderSegmented(colorSegmented, settings.color || 'purple');
    shortcutsEnabledToggle.checked = !!settings.shortcutsEnabled;
    excludedSitesEl.value = (settings.excludedSites || []).join('\n');
    renderShortcuts();
  }

  function renderSegmented(container, activeValue) {
    Array.from(container.children).forEach((btn) => {
      btn.classList.toggle('cc-segmented__btn--active', btn.dataset.value === activeValue);
    });
  }

  [
    [themeSegmented, 'theme'],
    [languageSegmented, 'language'],
    [fontSegmented, 'font'],
    [colorSegmented, 'color'],
  ].forEach(([container, key]) => {
    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      settings = await SettingsStore.save({ [key]: btn.dataset.value });
      render();
      showSnackbar(I18N.get(settings.language, 'saved'));
    });
  });

  shortcutsEnabledToggle.addEventListener('change', async () => {
    settings = await SettingsStore.save({ shortcutsEnabled: shortcutsEnabledToggle.checked });
    showSnackbar(I18N.get(settings.language, 'saved'));
  });

  function renderShortcuts() {
    shortcutList.innerHTML = '';
    CaseUtils.ORDER.filter((id) => settings.shortcuts[id]).forEach((id) => {
      const row = document.createElement('div');
      row.className = 'cc-shortcut-row';

      const label = document.createElement('span');
      label.className = 'cc-shortcut-row__label';
      label.textContent = I18N.get(settings.language, id);

      const actions = document.createElement('div');
      actions.className = 'cc-shortcut-row__actions';

      const keyBtn = document.createElement('button');
      keyBtn.className = 'cc-key-btn';
      keyBtn.textContent =
        recordingId === id
          ? I18N.get(settings.language, 'shortcutRecording')
          : SettingsStore.formatShortcut(settings.shortcuts[id]);
      if (recordingId === id) keyBtn.classList.add('cc-key-btn--recording');
      keyBtn.addEventListener('click', () => startRecording(id, keyBtn));

      const resetBtn = document.createElement('button');
      resetBtn.className = 'cc-icon-reset';
      resetBtn.title = I18N.get(settings.language, 'shortcutReset');
      resetBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 5V2L7 7l5 5V8a6 6 0 1 1-6 6H4a8 8 0 1 0 8-9Z"/></svg>';
      resetBtn.addEventListener('click', async () => {
        const next = { ...settings.shortcuts, [id]: DEFAULT_SHORTCUTS[id] };
        settings = await SettingsStore.save({ shortcuts: next });
        render();
      });

      actions.appendChild(keyBtn);
      actions.appendChild(resetBtn);
      row.appendChild(label);
      row.appendChild(actions);
      shortcutList.appendChild(row);
    });
  }

  function startRecording(id, btnEl) {
    if (recordingId) return;
    recordingId = id;
    renderShortcuts();

    function onKeydown(e) {
      e.preventDefault();
      e.stopPropagation();
      if (['Alt', 'Control', 'Shift', 'Meta'].includes(e.key)) return;

      const candidate = {
        alt: e.altKey,
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        meta: e.metaKey,
        key: e.key.length === 1 ? e.key.toUpperCase() : e.key,
      };
      const hasModifier = candidate.alt || candidate.ctrl || candidate.meta;

      cleanup();

      if (!hasModifier) {
        // require at least one modifier to avoid hijacking normal typing
        renderShortcuts();
        return;
      }

      const conflictId = Object.entries(settings.shortcuts).find(
        ([otherId, sc]) =>
          otherId !== id &&
          sc.alt === candidate.alt &&
          sc.ctrl === candidate.ctrl &&
          sc.shift === candidate.shift &&
          sc.meta === candidate.meta &&
          sc.key === candidate.key
      );

      (async () => {
        const next = { ...settings.shortcuts, [id]: candidate };
        settings = await SettingsStore.save({ shortcuts: next });
        render();
        if (conflictId) showSnackbar(I18N.get(settings.language, 'conflictWarning'));
        else showSnackbar(I18N.get(settings.language, 'saved'));
      })();
    }

    function cleanup() {
      document.removeEventListener('keydown', onKeydown, true);
      recordingId = null;
    }

    document.addEventListener('keydown', onKeydown, true);
  }

  function setLandingDialog(open) {
    landingDialog.hidden = !open;
    document.body.classList.toggle('cc-modal-open', open);
    if (open) closeLandingBtn.focus();
  }
  landingBtn.addEventListener('click', () => {
    const theme = settings.theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : settings.theme;
    const params = new URLSearchParams({ lang: settings.language, theme, color: settings.color || 'purple' });
    chrome.tabs.create({ url: `${chrome.runtime.getURL('index.html')}?${params.toString()}` });
  });
  closeLandingBtn.addEventListener('click', () => setLandingDialog(false));
  landingDialog.addEventListener('click', (event) => {
    if (event.target.hasAttribute('data-close-landing')) setLandingDialog(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !landingDialog.hidden) setLandingDialog(false);
  });
  saveSitesBtn.addEventListener('click', async () => {
    const sites = excludedSitesEl.value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    settings = await SettingsStore.save({ excludedSites: sites });
    showSnackbar(I18N.get(settings.language, 'saved'));
  });

  resetAllBtn.addEventListener('click', async () => {
    settings = await SettingsStore.save({ ...DEFAULT_SETTINGS });
    render();
    showSnackbar(I18N.get(settings.language, 'saved'));
  });

  // scroll-spy for nav highlighting
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href')));
  window.addEventListener('scroll', () => {
    let currentIdx = 0;
    sections.forEach((sec, i) => {
      if (sec && sec.getBoundingClientRect().top - 100 <= 0) currentIdx = i;
    });
    navLinks.forEach((a, i) => a.classList.toggle('cc-nav__link--active', i === currentIdx));
  });

  render();
})();
