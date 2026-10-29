const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let lang = (navigator.language || '').startsWith('vi') ? 'vi' : 'en', cmds = {};
const L = { en: ['Search settings pages…', 'Manage shortcuts'], vi: ['Tìm trang cài đặt…', 'Quản lý phím tắt'] };

function theme(m) {
  const dark = m === 'dark' || (m !== 'light' && matchMedia('(prefers-color-scheme:dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
function render() {
  const q = $('#q').value.trim().toLowerCase();
  $('#list').innerHTML = PRESETS.filter((p) => !q || (p.en + p.vi + p.url).toLowerCase().includes(q)).map((p) => {
    const sc = cmds['open_' + p.id];
    const keys = sc ? (sc.includes('+') ? sc.split('+') : [...sc]).map((k) => `<kbd>${esc(k)}</kbd>`).join('') : '';
    return `<article class="card" data-url="${esc(p.url)}"><div class="shape">${p.emoji}</div><div class="info"><h3>${esc(p[lang])}</h3><code>${esc(p.url)}</code><div class="keys">${keys}</div></div></article>`;
  }).join('');
}
$('#list').addEventListener('click', (e) => {
  const c = e.target.closest('.card'); if (!c) return;
  chrome.runtime.sendMessage({ type: 'open', url: c.dataset.url }); window.close();
});
$('#q').addEventListener('input', render);
$('#manage').onclick = () => { chrome.runtime.openOptionsPage(); window.close(); };
(async () => {
  const s = await chrome.storage.sync.get({ lang, theme: 'auto' });
  lang = s.lang; theme(s.theme);
  $('#q').placeholder = L[lang][0]; $('#manage').textContent = L[lang][1];
  cmds = Object.fromEntries((await chrome.commands.getAll()).map((c) => [c.name, c.shortcut]));
  render();
})();
