/* ================================================================
   QUICKNOTE — landing.js
   ------------------------------------------------------------------
   Lightweight behaviour for the landing page: applies the user's
   saved theme/language (read from the same storage popup.js and
   options.js use), lets them toggle language right here, and wires
   up the call-to-action buttons.

   Author: gnort67 · built with the help of Claude (Anthropic)
   ================================================================ */

const { store } = QNSettings;
let lang = 'vi';
let snackbarTimer = null;

const $ = (id) => document.getElementById(id);

async function init() {
  const settings = await QNSettings.loadSettings();
  lang = settings.lang;

  QNSettings.applyTheme(settings.theme, document);
  QNI18n.apply(lang, document);

  bindEvents();
  QNRipple.attach(document);

  QNSettings.watchSystemTheme(
    () => settings.theme,
    () => QNSettings.applyTheme(settings.theme, document),
  );
}

function t(key, ...args) {
  return QNI18n.t(lang, key, ...args);
}

function showSnackbar(message) {
  const snackbar = $('snackbar');
  $('snackbarText').textContent = message;
  snackbar.classList.add('visible');
  clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(() => snackbar.classList.remove('visible'), 3200);
}

/** Tries to pop open the QuickNote popup directly; not every Chromium
 *  version allows this from a regular tab, so we fall back to a
 *  friendly hint pointing at the toolbar icon. */
function openApp() {
  try {
    if (chrome.action && chrome.action.openPopup) {
      chrome.action.openPopup().catch(() => {
        showSnackbar(lang === 'vi' ? 'Hãy nhấn biểu tượng QuickNote trên thanh công cụ trình duyệt.' : 'Click the QuickNote icon in your browser toolbar.');
      });
      return;
    }
  } catch {
    /* fall through to hint */
  }
  showSnackbar(lang === 'vi' ? 'Hãy nhấn biểu tượng QuickNote trên thanh công cụ trình duyệt.' : 'Click the QuickNote icon in your browser toolbar.');
}

function bindEvents() {
  $('btnOpenApp').addEventListener('click', openApp);
  $('btnHeroPrimary').addEventListener('click', openApp);
  $('btnHeroSecondary').addEventListener('click', () => {
    document.getElementById('install').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('langToggle').addEventListener('click', () => {
    lang = lang === 'vi' ? 'en' : 'vi';
    QNI18n.apply(lang, document);
    store.set({ lang });
  });

  document.querySelectorAll('.nav-links a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

init();
