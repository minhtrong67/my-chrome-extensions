/* Shared helpers for popup + options pages */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const S = {
  lang: (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en',
  theme: 'auto',      // 'auto' (system) | 'light' | 'dark'
  openIn: 'new',      // 'new' | 'current'
  customs: []
};
const t = (k) => (T[S.lang] && T[S.lang][k]) || T.en[k] || k;

const darkMQ = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const dark = S.theme === 'dark' || (S.theme === 'auto' && darkMQ.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
darkMQ.addEventListener('change', applyTheme);

function applyI18n(root = document) {
  document.documentElement.lang = S.lang;
  $$('[data-i18n]', root).forEach((e) => (e.textContent = t(e.dataset.i18n)));
  $$('[data-i18n-ph]', root).forEach((e) => (e.placeholder = t(e.dataset.i18nPh)));
  $$('[data-i18n-title]', root).forEach((e) => { e.title = t(e.dataset.i18nTitle); e.setAttribute('aria-label', e.title); });
  document.title = t('appName');
}

function mirror() {
  try { localStorage.setItem('theme', S.theme); localStorage.setItem('lang', S.lang); } catch (e) { /* ignore */ }
}
function save(o) { Object.assign(S, o); mirror(); return chrome.storage.sync.set(o); }

async function loadSettings() {
  const stored = await chrome.storage.sync.get({ ...S });
  Object.assign(S, stored);
  mirror(); applyTheme();
}
function watchSettings(cb) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const k of Object.keys(changes)) if (k in S) S[k] = changes[k].newValue ?? S[k];
    mirror(); applyTheme(); cb(Object.keys(changes));
  });
}

function kbds(sc) {
  if (!sc) return `<span class="unset">${esc(t('notSet'))}</span>`;
  return (sc.includes('+') ? sc.split('+') : [...sc]).map((p) => `<kbd>${esc(p)}</kbd>`).join('');
}
function combo(e) {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;
  const p = [];
  if (e.ctrlKey) p.push('Ctrl'); if (e.altKey) p.push('Alt'); if (e.shiftKey) p.push('Shift'); if (e.metaKey) p.push('Meta');
  let k = e.code || '';
  if (/^Key[A-Z]$/.test(k)) k = k.slice(3); else if (/^Digit\d$/.test(k)) k = k.slice(5); else k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  p.push(k);
  return p.join('+');
}
const openUrl = (url) => chrome.runtime.sendMessage({ type: 'open', url });
const optionsUrl = (hash = '') => chrome.runtime.getURL('options.html') + hash;
const matches = (q, ...parts) => !q || parts.join(' ').toLowerCase().includes(q);
