let cmds = {}, tab = 'presets', editId = null, recorded = '', recording = false, toastTimer = null;

/* ---------- views / routing ---------- */
const currentView = () => (location.hash === '#settings' ? 'settings' : 'shortcuts');
function renderView() {
  const v = currentView();
  $('#viewShortcuts').hidden = v !== 'shortcuts';
  $('#viewSettings').hidden = v !== 'settings';
  $$('.nav-item').forEach((b) => (b.dataset.nav === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
}

/* ---------- shortcuts lists ---------- */
function actionBtn(attr, ic, label, extra = '') {
  return `<button class="btn subtle sq ${extra}" ${attr} title="${esc(label)}" aria-label="${esc(label)}">${icon(ic, 16)}</button>`;
}
function renderPresets() {
  const q = $('#q').value.trim().toLowerCase();
  const list = PRESETS.filter((p) => matches(q, p.en, p.vi, p.url));
  $('#presetGrid').innerHTML = list.map((p, i) => `
    <article class="card" style="animation-delay:${Math.min(i, 12) * 25}ms">
      <div class="card-top"><div class="tile">${icon(p.icon, 20)}</div><div class="info"><h3>${esc(p[S.lang])}</h3><code>${esc(p.url)}</code></div></div>
      <div class="card-bottom">
        <div class="keys">${kbds(cmds['open_' + p.id])}</div>
        <div class="card-actions">
          ${actionBtn(`data-open="${esc(p.url)}"`, 'arrow-up-right', t('open'))}
          <button class="btn subtle" data-assign>${icon('keyboard', 16)}<span>${esc(t('assign'))}</span></button>
        </div>
      </div>
    </article>`).join('');
  return list.length;
}
function renderCustoms() {
  const q = $('#q').value.trim().toLowerCase();
  const list = S.customs.filter((c) => matches(q, c.label, c.url));
  $('#customGrid').innerHTML = list.map((c) => `
    <article class="card">
      <div class="card-top"><div class="tile">${icon('star', 20)}</div><div class="info"><h3>${esc(c.label)}</h3><code>${esc(c.url)}</code></div></div>
      <div class="card-bottom">
        <div class="keys">${kbds(c.combo)}</div>
        <div class="card-actions">
          ${actionBtn(`data-open="${esc(c.url)}"`, 'arrow-up-right', t('open'))}
          ${actionBtn(`data-edit="${esc(c.id)}"`, 'pencil', t('edit'))}
          ${actionBtn(`data-del="${esc(c.id)}"`, 'trash-2', t('del'), 'danger')}
        </div>
      </div>
    </article>`).join('');
  return list.length;
}
function renderEmpty(count) {
  const box = $('#empty');
  const noCustoms = tab === 'custom' && !S.customs.length;
  box.hidden = count > 0 && !noCustoms ? true : false;
  if (box.hidden) return;
  box.innerHTML = noCustoms
    ? `<div class="tile">${icon('star', 28)}</div><b>${esc(t('customEmptyTitle'))}</b><span>${esc(t('customEmpty'))}</span><button class="btn primary" data-add style="margin-top:8px">${icon('plus', 16)}<span>${esc(t('add'))}</span></button>`
    : `<div class="tile">${icon('search-x', 28)}</div><b>${esc(t('noResults'))}</b><span>${esc(t('noResultsHint'))}</span>`;
}
function renderLists() {
  const n = tab === 'presets' ? renderPresets() : renderCustoms();
  if (tab === 'presets') renderCustoms(); else renderPresets();
  renderEmpty(n);
}
function renderTabs() {
  $$('#tabs .tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  $('#panelPresets').hidden = tab !== 'presets';
  $('#panelCustom').hidden = tab !== 'custom';
  $('#addBtn').hidden = tab !== 'custom' || !S.customs.length;
  $('#customGrid').hidden = !S.customs.length;
}

/* ---------- settings ---------- */
function renderSettings() {
  $('#langSel').value = S.lang;
  $('#openInSel').value = S.openIn;
  $$('#themes .theme-opt').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.themeV === S.theme)));
}
function renderAll() {
  applyTheme(); applyI18n(); renderView(); renderTabs(); renderLists(); renderSettings(); renderRec();
}

/* ---------- toast ---------- */
function toast(msg, actionLabel, onAction) {
  clearTimeout(toastTimer);
  const host = $('#toastHost');
  host.innerHTML = `<div class="toast" role="status"><span>${esc(msg)}</span>${actionLabel ? `<button class="btn link" id="toastAct">${esc(actionLabel)}</button>` : ''}</div>`;
  if (actionLabel) $('#toastAct').onclick = () => { host.innerHTML = ''; onAction(); };
  toastTimer = setTimeout(() => (host.innerHTML = ''), 5000);
}

/* ---------- dialog ---------- */
function renderRec() {
  const r = $('#rec');
  r.classList.toggle('live', recording);
  r.innerHTML = recording ? esc(t('recLive')) : recorded ? kbds(recorded) : esc(t('recIdle'));
}
function openDlg(item) {
  editId = item ? item.id : null;
  $('#dlgTitle').textContent = t(item ? 'editTitle' : 'newTitle');
  $('#fLabel').value = item ? item.label : '';
  $('#fUrl').value = item ? item.url : '';
  recorded = item ? item.combo : ''; recording = false; $('#err').textContent = '';
  renderRec(); $('#dlg').showModal(); $('#fLabel').focus();
}
function submitDlg() {
  const url = $('#fUrl').value.trim();
  const label = $('#fLabel').value.trim() || url;
  const fail = (k) => { $('#err').textContent = t(k); };
  if (!/^(chrome|https?):\/\/\S+/i.test(url)) return fail('eUrl');
  if (!/^(Ctrl|Alt|Shift|Meta)\+/.test(recorded)) return fail('eKeys');
  if (S.customs.some((c) => c.combo === recorded && c.id !== editId)) return fail('eDup');
  const item = { id: editId || 'c' + Date.now(), label, url, combo: recorded };
  const wasEdit = !!editId;
  save({ customs: wasEdit ? S.customs.map((c) => (c.id === editId ? item : c)) : [...S.customs, item] });
  $('#dlg').close(); renderTabs(); renderLists();
  toast(t(wasEdit ? 'toastSaved' : 'toastAdded'));
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
$('#dlg').addEventListener('cancel', (e) => { if (recording) e.preventDefault(); });
$('#dlg').addEventListener('click', (e) => { if (e.target === $('#dlg')) $('#dlg').close(); });
['#fLabel', '#fUrl'].forEach((s) => $(s).addEventListener('keydown', (e) => { if (e.key === 'Enter') submitDlg(); }));
$('#cancel').onclick = () => $('#dlg').close();
$('#save').onclick = submitDlg;

/* ---------- events ---------- */
const openChromeShortcuts = () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
document.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (d.open) openUrl(d.open);
  else if ('assign' in d || b.id === 'openShortcuts' || b.id === 'openShortcuts2') openChromeShortcuts();
  else if (d.edit) openDlg(S.customs.find((c) => c.id === d.edit));
  else if (d.del) {
    const idx = S.customs.findIndex((c) => c.id === d.del);
    const item = S.customs[idx];
    save({ customs: S.customs.filter((c) => c.id !== d.del) }); renderTabs(); renderLists();
    toast(t('toastDeleted'), t('undo'), () => {
      const next = [...S.customs]; next.splice(Math.min(idx, next.length), 0, item);
      save({ customs: next }); renderTabs(); renderLists();
    });
  }
  else if ('add' in d || b.id === 'addBtn') openDlg(null);
  else if (d.tab) { tab = d.tab; renderTabs(); renderLists(); }
  else if (d.nav) { location.hash = d.nav === 'settings' ? '#settings' : '#shortcuts'; }
  else if (d.themeV) { save({ theme: d.themeV }); applyTheme(); renderSettings(); }
});
window.addEventListener('hashchange', renderView);
$('#q').addEventListener('input', renderLists);
$('#q').addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#q').value) { $('#q').value = ''; renderLists(); e.stopPropagation(); } });
document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
  if (((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) && currentView() === 'shortcuts' && !$('#dlg').open) {
    e.preventDefault(); $('#q').focus(); $('#q').select();
  }
});
$('#langSel').addEventListener('change', (e) => { save({ lang: e.target.value }); renderAll(); });
$('#openInSel').addEventListener('change', (e) => save({ openIn: e.target.value }));

async function refreshCmds() {
  cmds = Object.fromEntries((await chrome.commands.getAll()).map((c) => [c.name, c.shortcut]));
  renderLists();
}
window.addEventListener('focus', refreshCmds);
watchSettings(() => renderAll());

(async () => {
  hydrateIcons();
  $('#ver').textContent = chrome.runtime.getManifest().version;
  await loadSettings();
  cmds = Object.fromEntries((await chrome.commands.getAll()).map((c) => [c.name, c.shortcut]));
  renderAll();
})();
