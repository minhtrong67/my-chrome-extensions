let cmds = {}, active = 0;

function items() {
  const q = $('#q').value.trim().toLowerCase();
  const built = PRESETS.filter((p) => matches(q, p.en, p.vi, p.url))
    .map((p) => ({ title: p[S.lang], url: p.url, icon: p.icon, keys: cmds['open_' + p.id] }));
  const custom = S.customs.filter((c) => matches(q, c.label, c.url))
    .map((c) => ({ title: c.label, url: c.url, icon: 'star', keys: c.combo }));
  return { built, custom };
}
function rowHtml(it, idx) {
  return `<button class="row" role="option" data-i="${idx}" data-url="${esc(it.url)}">
    <div class="tile">${icon(it.icon, 18)}</div>
    <div class="info"><b>${esc(it.title)}</b><small>${esc(it.url)}</small></div>
    <div class="keys">${it.keys ? kbds(it.keys) : ''}</div></button>`;
}
let flat = [];
function render() {
  const { built, custom } = items();
  flat = [...built, ...custom];
  let i = 0, html = '';
  if (built.length) html += `<div class="pop-sec">${esc(t('tabPresets'))}</div>` + built.map((it) => rowHtml(it, i++)).join('');
  if (custom.length) html += `<div class="pop-sec">${esc(t('tabCustom'))}</div>` + custom.map((it) => rowHtml(it, i++)).join('');
  if (!flat.length) html = `<div class="empty"><div class="tile">${icon('search-x', 24)}</div><b>${esc(t('noResults'))}</b><span>${esc(t('noResultsHint'))}</span></div>`;
  $('#list').innerHTML = html;
  active = Math.min(active, Math.max(flat.length - 1, 0));
  mark(false);
}
function mark(scroll = true) {
  $$('.row').forEach((r) => r.classList.toggle('active', +r.dataset.i === active));
  const a = $('.row.active'); if (a && scroll) a.scrollIntoView({ block: 'nearest' });
}
const go = (url) => { openUrl(url); window.close(); };

$('#list').addEventListener('click', (e) => { const r = e.target.closest('.row'); if (r) go(r.dataset.url); });
$('#list').addEventListener('mousemove', (e) => { const r = e.target.closest('.row'); if (r && +r.dataset.i !== active) { active = +r.dataset.i; mark(false); } });
$('#q').addEventListener('input', () => { active = 0; render(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, flat.length - 1); mark(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); mark(); }
  else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); go(flat[active].url); }
});
$('#manage').onclick = () => { chrome.tabs.create({ url: optionsUrl('#shortcuts') }); window.close(); };
$('#gear').onclick = () => { chrome.tabs.create({ url: optionsUrl('#settings') }); window.close(); };
watchSettings(() => { applyI18n(); render(); });

(async () => {
  hydrateIcons();
  await loadSettings();
  applyI18n();
  cmds = Object.fromEntries((await chrome.commands.getAll()).map((c) => [c.name, c.shortcut]));
  render();
  $('#q').focus();
})();
