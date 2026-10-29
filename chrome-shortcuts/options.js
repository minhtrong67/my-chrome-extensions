const T = {
  en: {
    title: 'Jump to any Chrome setting in one keystroke', subtitle: 'Assign keyboard shortcuts to Chrome settings pages like Downloads, Privacy or Extensions.',
    tabPresets: 'Built-in', tabCustom: 'Custom', search: 'Search settings pages…', open: 'Open', assign: 'Set keys', notSet: 'Not set',
    behavior: 'Open pages in', newTab: 'New tab', curTab: 'Current tab', howTitle: 'How shortcuts work',
    howBody: 'Built-in pages use Chrome’s own extension shortcuts, so they work everywhere, even on chrome:// pages. Click “Set keys” on any card (or the button below) to assign or change a key.',
    manageKeys: 'Manage in Chrome', add: 'Add shortcut', customEmpty: 'No custom shortcuts yet. Add your own URL and key combo.',
    customNote: 'Custom shortcuts work on regular web pages only. Chrome blocks extensions from listening to keys on chrome:// pages and the New Tab page. A modifier (Ctrl, Alt, Shift) is required.',
    newTitle: 'New shortcut', editTitle: 'Edit shortcut', fName: 'Name', fUrl: 'Page URL', fKeys: 'Key combo', recIdle: 'Click, then press keys', recLive: 'Press your keys… (Esc to cancel)',
    cancel: 'Cancel', save: 'Save', eUrl: 'Enter a chrome://, http:// or https:// URL.', eKeys: 'Choose a combo with Ctrl, Alt or Shift.', eDup: 'This combo is already used by another custom shortcut.'
  },
  vi: {
    title: 'Vào mọi trang cài đặt Chrome chỉ với một phím tắt', subtitle: 'Gán phím tắt cho các trang cài đặt của Chrome như Tải xuống, Quyền riêng tư hay Tiện ích.',
    tabPresets: 'Có sẵn', tabCustom: 'Tùy chỉnh', search: 'Tìm trang cài đặt…', open: 'Mở', assign: 'Gán phím', notSet: 'Chưa gán',
    behavior: 'Mở trang trong', newTab: 'Tab mới', curTab: 'Tab hiện tại', howTitle: 'Cách phím tắt hoạt động',
    howBody: 'Các trang có sẵn dùng hệ thống phím tắt của Chrome nên hoạt động ở mọi nơi, kể cả trên trang chrome://. Bấm “Gán phím” ở thẻ bất kỳ (hoặc nút bên dưới) để gán hoặc đổi phím.',
    manageKeys: 'Quản lý trong Chrome', add: 'Thêm phím tắt', customEmpty: 'Chưa có phím tắt tùy chỉnh. Hãy thêm URL và tổ hợp phím của riêng bạn.',
    customNote: 'Phím tắt tùy chỉnh chỉ hoạt động trên trang web thông thường. Chrome không cho tiện ích bắt phím trên trang chrome:// và trang Tab mới. Cần có phím bổ trợ (Ctrl, Alt, Shift).',
    newTitle: 'Phím tắt mới', editTitle: 'Sửa phím tắt', fName: 'Tên', fUrl: 'URL trang', fKeys: 'Tổ hợp phím', recIdle: 'Bấm vào đây rồi nhấn phím', recLive: 'Nhấn tổ hợp phím… (Esc để hủy)',
    cancel: 'Hủy', save: 'Lưu', eUrl: 'Nhập URL dạng chrome://, http:// hoặc https://.', eKeys: 'Chọn tổ hợp có Ctrl, Alt hoặc Shift.', eDup: 'Tổ hợp này đã được dùng cho phím tắt tùy chỉnh khác.'
  }
};
const $ = (s) => document.querySelector(s);
let S = { lang: (navigator.language || '').startsWith('vi') ? 'vi' : 'en', theme: 'auto', openIn: 'new', customs: [] };
let cmds = {}, tab = 'presets', editId = null, recorded = '', recording = false;
const t = (k) => T[S.lang][k];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const save = (o) => chrome.storage.sync.set(o);

function combo(e) {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;
  const p = [];
  if (e.ctrlKey) p.push('Ctrl'); if (e.altKey) p.push('Alt'); if (e.shiftKey) p.push('Shift'); if (e.metaKey) p.push('Meta');
  let k = e.code || '';
  if (/^Key[A-Z]$/.test(k)) k = k.slice(3); else if (/^Digit\d$/.test(k)) k = k.slice(5); else k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  p.push(k);
  return p.join('+');
}
const kbds = (sc) => {
  if (!sc) return `<span class="unset">${t('notSet')}</span>`;
  return (sc.includes('+') ? sc.split('+') : [...sc]).map((p) => `<kbd>${esc(p)}</kbd>`).join('');
};
const openUrl = (url) => chrome.runtime.sendMessage({ type: 'open', url });
const openShortcutsPage = () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });

function applyTheme() {
  const dark = S.theme === 'dark' || (S.theme === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('#themeBtn').textContent = S.theme === 'auto' ? '◐' : dark ? '🌙' : '☀️';
}
function applyI18n() {
  document.documentElement.lang = S.lang;
  document.querySelectorAll('[data-i18n]').forEach((e) => (e.textContent = t(e.dataset.i18n)));
  document.querySelectorAll('[data-i18n-ph]').forEach((e) => (e.placeholder = t(e.dataset.i18nPh)));
  $('#langBtn').textContent = S.lang === 'vi' ? 'EN' : 'VI';
  $('#rec').textContent = recorded ? '' : t('recIdle');
  renderRec();
}

function renderPresets() {
  const q = $('#q').value.trim().toLowerCase();
  const list = PRESETS.filter((p) => !q || (p.en + p.vi + p.url).toLowerCase().includes(q));
  $('#presetGrid').innerHTML = list.map((p, i) => `
    <article class="card" style="animation-delay:${Math.min(i, 12) * 30}ms">
      <div class="shape">${p.emoji}</div>
      <div class="info"><h3>${esc(p[S.lang])}</h3><code>${esc(p.url)}</code><div class="keys">${kbds(cmds['open_' + p.id])}</div></div>
      <div class="card-actions">
        <button class="btn tonal" data-open="${esc(p.url)}">${t('open')}</button>
        <button class="btn text" data-assign>${t('assign')}</button>
      </div>
    </article>`).join('');
}
function renderCustoms() {
  const q = $('#q').value.trim().toLowerCase();
  const list = S.customs.filter((c) => !q || (c.label + c.url).toLowerCase().includes(q));
  $('#customEmpty').hidden = S.customs.length > 0;
  $('#customGrid').innerHTML = list.map((c) => `
    <article class="card">
      <div class="shape">⭐</div>
      <div class="info"><h3>${esc(c.label)}</h3><code>${esc(c.url)}</code><div class="keys">${kbds(c.combo)}</div></div>
      <div class="card-actions"><div class="row-icons">
        <button class="btn tonal" data-open="${esc(c.url)}" title="${t('open')}">↗</button>
        <button class="btn tonal" data-edit="${c.id}">✏️</button>
        <button class="btn danger" data-del="${c.id}">🗑</button>
      </div></div>
    </article>`).join('');
}
function renderTabs() {
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('#openIn button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.openIn));
  $('#viewPresets').hidden = tab !== 'presets';
  $('#viewCustom').hidden = tab !== 'custom';
  $('#fab').hidden = tab !== 'custom';
}
function renderAll() { applyTheme(); applyI18n(); renderTabs(); renderPresets(); renderCustoms(); }

/* ---------- dialog ---------- */
function renderRec() {
  const r = $('#rec');
  r.classList.toggle('live', recording);
  r.innerHTML = recording ? t('recLive') : recorded ? kbds(recorded) : t('recIdle');
}
function openDlg(item) {
  editId = item ? item.id : null;
  $('#dlgTitle').textContent = t(item ? 'editTitle' : 'newTitle');
  $('#fLabel').value = item ? item.label : '';
  $('#fUrl').value = item ? item.url : '';
  recorded = item ? item.combo : ''; recording = false; $('#err').textContent = '';
  renderRec(); $('#dlg').showModal();
}
$('#rec').addEventListener('click', () => { recording = true; renderRec(); $('#rec').focus(); });
$('#rec').addEventListener('blur', () => { recording = false; renderRec(); });
$('#rec').addEventListener('keydown', (e) => {
  if (!recording) return;
  e.preventDefault(); e.stopPropagation();
  if (e.key === 'Escape') { recording = false; renderRec(); return; }
  const c = combo(e);
  if (c) { recorded = c; recording = false; renderRec(); }
});
$('#cancel').onclick = () => $('#dlg').close();
$('#save').onclick = () => {
  const url = $('#fUrl').value.trim();
  const label = $('#fLabel').value.trim() || url;
  const err = (k) => ($('#err').textContent = t(k));
  if (!/^(chrome|https?):\/\/\S+/i.test(url)) return err('eUrl');
  if (!/^(Ctrl|Alt|Shift|Meta)\+/.test(recorded)) return err('eKeys');
  if (S.customs.some((c) => c.combo === recorded && c.id !== editId)) return err('eDup');
  const item = { id: editId || 'c' + Date.now(), label, url, combo: recorded };
  S.customs = editId ? S.customs.map((c) => (c.id === editId ? item : c)) : [...S.customs, item];
  save({ customs: S.customs }); $('#dlg').close(); renderCustoms();
};

/* ---------- events ---------- */
document.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.open) openUrl(b.dataset.open);
  if ('assign' in b.dataset || b.id === 'openShortcuts') openShortcutsPage();
  if (b.dataset.edit) openDlg(S.customs.find((c) => c.id === b.dataset.edit));
  if (b.dataset.del) { S.customs = S.customs.filter((c) => c.id !== b.dataset.del); save({ customs: S.customs }); renderCustoms(); }
  if (b.dataset.tab) { tab = b.dataset.tab; renderTabs(); }
  if (b.dataset.v) { S.openIn = b.dataset.v; save({ openIn: S.openIn }); renderTabs(); }
});
$('#fab').onclick = () => openDlg(null);
$('#q').addEventListener('input', () => { renderPresets(); renderCustoms(); });
$('#langBtn').onclick = () => { S.lang = S.lang === 'vi' ? 'en' : 'vi'; save({ lang: S.lang }); renderAll(); };
$('#themeBtn').onclick = () => { S.theme = { auto: 'light', light: 'dark', dark: 'auto' }[S.theme]; save({ theme: S.theme }); applyTheme(); };
matchMedia('(prefers-color-scheme:dark)').addEventListener('change', applyTheme);

async function refreshCmds() {
  cmds = Object.fromEntries((await chrome.commands.getAll()).map((c) => [c.name, c.shortcut]));
  renderPresets();
}
window.addEventListener('focus', refreshCmds);
(async () => {
  Object.assign(S, await chrome.storage.sync.get(S));
  await refreshCmds(); renderAll();
})();
