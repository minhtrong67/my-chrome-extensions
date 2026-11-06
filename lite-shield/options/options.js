import { initTheme, applyTheme, applyTypography, FONTS, COLORS, colorOf, schemeFor, DEFAULT_LOOK } from '../shared/theme.js';
import { hydrateIcons, icon } from '../shared/icons.js';
import { t } from '../shared/i18n.js';
import { toast } from '../shared/toast.js';
import { createSelect } from '../shared/select.js';
import { initRipple, initScrollTop, initAccordions, themeTransition } from '../shared/effects.js';
import { initTooltips } from '../shared/tooltip.js';

const $ = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);

let data; // { settings, userFilters, disabledSites, allowedDomains, compiled, updateInfo }

hydrateIcons();
// Mỗi khi cài đặt đổi (kể cả ngôn ngữ), vẽ lại các phần chữ động.
const ready = initTheme((settings) => {
  if (!data) return;
  data.settings = { ...data.settings, ...settings };
  rerender();
});

// ---------- điều hướng ----------
const PANELS = ['protection', 'filters', 'sites', 'appearance', 'backup', 'about'];
function show(name) {
  if (!PANELS.includes(name)) name = 'protection';
  for (const p of PANELS) $(`p-${p}`).classList.toggle('active', p === name);
  for (const a of document.querySelectorAll('.nav')) {
    const on = a.dataset.panel === name;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}
addEventListener('hashchange', () => {
  show(location.hash.slice(1));
  scrollTo({ top: 0, behavior: 'instant' });
});

// Toast chỉ dành cho kết quả quan trọng (lưu bộ lọc, cập nhật, sao lưu, lỗi).
// Lỗi nhập liệu hiện ngay tại ô nhập; công tắc và danh sách tự phản hồi bằng giao diện.
function hint(form, input, msg) {
  let el = form.nextElementSibling;
  if (!el?.classList.contains('field-hint')) {
    el = document.createElement('div');
    el.className = 'field-hint';
    el.setAttribute('role', 'alert');
    form.after(el);
  }
  el.textContent = msg ?? '';
  if (msg) {
    input.setAttribute('aria-invalid', 'true');
    form.classList.remove('shake');
    void form.offsetWidth;
    form.classList.add('shake');
  } else input.removeAttribute('aria-invalid');
}
for (const [formId, inputId] of [['add-site', 'site-input'], ['add-domain', 'domain-input']]) {
  $(inputId).addEventListener('input', () => hint($(formId), $(inputId), ''));
}

initScrollTop($('to-top'));
initRipple();
initTooltips();
initAccordions();

// ---------- Bảo vệ ----------
const RULESET_ICONS = { ads: 'block', trackers: 'eye', vn: 'globe', ubo: 'shield-check', adguard: 'layout', annoyances: 'shield' };
const ruleCounts = {};

let meta;
async function countRules(id) {
  if (ruleCounts[id] != null) return ruleCounts[id];
  try {
    meta ??= await (await fetch(chrome.runtime.getURL('rulesets/meta.json'))).json();
    return (ruleCounts[id] = meta[id]?.units ?? 0);
  } catch {
    return (ruleCounts[id] = 0);
  }
}

async function renderRulesets() {
  const box = $('rulesets');
  const rows = [];
  for (const id of Object.keys(RULESET_ICONS)) {
    const title = t(`rs.${id}.title`);
    const n = await countRules(id);
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `
      <div class="lead">${icon(RULESET_ICONS[id])}</div>
      <div class="grow"><div class="title-m"></div><div class="body-m muted"><span class="d"></span> <span class="count"></span></div></div>
      <label class="switch"><input type="checkbox" ${data.settings.rulesets[id] ? 'checked' : ''}></label>`;
    row.querySelector('.title-m').textContent = title;
    row.querySelector('.d').textContent = t(`rs.${id}.desc`);
    row.querySelector('.count').textContent = t('rs.count', { n });
    row.querySelector('input').setAttribute('aria-label', title);
    row.querySelector('input').addEventListener('change', async (e) => {
      const want = e.target.checked;
      const r = await send({ type: 'set-settings', settings: { rulesets: { [id]: want } } });
      if (r?.error) {
        e.target.checked = !want;
        toast.error(t(r.error === 'ruleset-limit' ? 'rs.limit' : 'upd.fail', { msg: r.error }));
        return;
      }
      data.settings.rulesets[id] = want;
    });
    rows.push(row);
  }
  box.replaceChildren(...rows);
  $('generic-cosmetic').checked = data.settings.genericCosmetic;
  $('yt-scriptlet').checked = data.settings.scriptlets.youtube;
  $('list-scriptlets').checked = data.settings.scriptlets.lists !== false;
  $('auto-update').checked = data.settings.autoUpdate;
}
$('generic-cosmetic').addEventListener('change', async (e) => {
  data.settings.genericCosmetic = e.target.checked;
  await send({ type: 'set-settings', settings: { genericCosmetic: e.target.checked } });
});

// ---------- thống kê, cập nhật, phím tắt ----------
function countUp(el, to) {
  const from = Number(el.dataset.v ?? 0);
  el.dataset.v = to;
  if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) return (el.textContent = to.toLocaleString());
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / 700);
    el.textContent = Math.round(from + (to - from) * (1 - (1 - p) ** 3)).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
async function renderTotals() {
  const s = await send({ type: 'get-stats' });
  countUp($('stat-today'), s.today);
  countUp($('stat-total'), s.total);
}

function renderUpdate() {
  const u = data.updateInfo;
  $('upd-title').textContent = t(u ? 'upd.titleDone' : 'upd.titleDefault');
  $('upd-sub').textContent = u
    ? t('upd.info', { date: new Date(u.at).toLocaleString(), ads: u.ads, trackers: u.trackers, cosmetic: u.cosmetic })
    : t('upd.never');
}
const updateError = (e) => (e === 'busy' ? t('upd.running') : e === 'invalid-list' ? t('upd.invalid') : e);
$('upd-now').addEventListener('click', async () => {
  const btn = $('upd-now');
  const label = btn.querySelector('span');
  btn.classList.add('busy');
  label.textContent = t('upd.busy');
  const r = await send({ type: 'update-lists' });
  btn.classList.remove('busy');
  label.textContent = t('upd.now');
  if (r.error) return toast.error(t('upd.fail', { msg: updateError(r.error) }));
  data.updateInfo = r.updateInfo;
  renderUpdate();
  toast.success(t('upd.done'));
});
$('auto-update').addEventListener('change', async (e) => {
  data.settings.autoUpdate = e.target.checked;
  await send({ type: 'set-settings', settings: { autoUpdate: e.target.checked } });
});
$('yt-scriptlet').addEventListener('change', async (e) => {
  data.settings.scriptlets.youtube = e.target.checked;
  await send({ type: 'set-settings', settings: { scriptlets: { youtube: e.target.checked } } });
});
$('list-scriptlets').addEventListener('change', async (e) => {
  data.settings.scriptlets.lists = e.target.checked;
  await send({ type: 'set-settings', settings: { scriptlets: { lists: e.target.checked } } });
});

// Nhật ký chặn: quyền webRequest tuỳ chọn.
async function renderLogPerm() {
  const { granted } = await send({ type: 'log-status' });
  $('log-perm-sub').textContent = t(granted ? 'prot.log.enabled' : 'prot.log.disabled');
  $('log-perm-btn').querySelector('span').textContent = t(granted ? 'prot.log.off' : 'prot.log.on');
  $('log-perm-btn').dataset.on = granted ? '1' : '';
}
$('log-perm-btn').addEventListener('click', async () => {
  if ($('log-perm-btn').dataset.on) await chrome.permissions.remove({ permissions: ['webRequest'] });
  else if (!(await chrome.permissions.request({ permissions: ['webRequest'] }))) toast.warning(t('prot.log.denied'));
  await renderLogPerm();
});
$('shortcuts').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
async function renderShortcut() {
  const cmds = await chrome.commands?.getAll();
  const c = cmds?.find((x) => x.name === 'start-picker');
  $('kbd').textContent = c?.shortcut ? c.shortcut.replace(/\+/g, ' + ') : t('prot.pick.unset');
}

// ---------- Bộ lọc của tôi ----------
function renderStats(compiled) {
  const c = compiled?.counts ?? { network: 0, exceptions: 0, cosmetic: 0 };
  const errs = compiled?.errors ?? [];
  $('stats').innerHTML = `
    <span class="chip primary">${t('flt.chip.block', { n: c.network })}</span>
    <span class="chip">${t('flt.chip.exceptions', { n: c.exceptions })}</span>
    <span class="chip tertiary">${t('flt.chip.cosmetic', { n: c.cosmetic })}</span>
    ${errs.length ? `<span class="chip error">${t('flt.chip.errors', { n: errs.length })}</span>` : ''}`;
  const box = $('errors');
  box.hidden = !errs.length;
  if (errs.length) {
    box.innerHTML = `<div class="title-m">${t('flt.errors.title')}</div><ul class="body-m"></ul>`;
    const ul = box.querySelector('ul');
    for (const e of errs.slice(0, 50)) {
      const li = document.createElement('li');
      const msg = e.key ? t(e.key, e.args) : e.msg;
      li.textContent = t('flt.errors.line', { line: e.line, msg });
      if (e.text) {
        const code = document.createElement('code');
        code.textContent = e.text.slice(0, 90);
        li.append(' — ', code);
      }
      ul.append(li);
    }
  }
}

$('save-filters').addEventListener('click', async () => {
  const btn = $('save-filters');
  btn.disabled = true;
  const res = await send({ type: 'save-user-filters', text: $('filters').value });
  data.userFilters = $('filters').value;
  data.compiled = res;
  renderStats(res);
  btn.disabled = false;
  if (res.errors?.length) toast.warning(t('flt.savedSkipped', { n: res.errors.length }));
  else toast.success(t('flt.saved'));
});
$('filters').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    $('save-filters').click();
  }
});

// ---------- Trang web ----------
function drawEmptyCookie() {
  let d = '';
  for (let i = 0; i <= 240; i++) {
    const a = (i / 240) * Math.PI * 2;
    const r = 90 * (1 + 0.065 * Math.cos(12 * a));
    d += `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`;
  }
  $('empty-cookie').setAttribute('d', d + 'Z');
}

function renderSites() {
  const list = $('sites-list');
  list.innerHTML = '';
  for (const site of data.disabledSites) {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.style.minHeight = '64px';
    row.innerHTML = `<div class="lead">${icon('globe')}</div><div class="grow title-m"></div>
      <button class="icon-btn">${icon('trash')}</button>`;
    row.querySelector('.grow').textContent = site;
    const btn = row.querySelector('button');
    btn.setAttribute('aria-label', t('sites.restoreAria', { site }));
    btn.dataset.tip = t('sites.restoreTitle');
    btn.addEventListener('click', async () => {
      data.disabledSites = data.disabledSites.filter((s) => s !== site);
      await send({ type: 'set-disabled-sites', sites: data.disabledSites });
      renderSites();
    });
    list.append(row);
  }
  $('sites-empty').classList.toggle('show', !data.disabledSites.length);
}

$('add-site').addEventListener('submit', async (e) => {
  e.preventDefault();
  let v = $('site-input').value.trim().toLowerCase();
  try {
    if (/^[a-z]+:\/\//.test(v)) v = new URL(v).hostname;
  } catch {
    /* giữ nguyên */
  }
  v = v.replace(/^www\./, '').replace(/\/.*$/, '');
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(v) || (!v.includes('.') && v !== 'localhost')) return hint($('add-site'), $('site-input'), t('sites.invalid'));
  if (data.disabledSites.includes(v)) return hint($('add-site'), $('site-input'), t('sites.dup'));
  hint($('add-site'), $('site-input'), '');
  data.disabledSites = [...data.disabledSites, v];
  await send({ type: 'set-disabled-sites', sites: data.disabledSites });
  $('site-input').value = '';
  renderSites();
});

// ---------- Tên miền được cho phép ----------
function renderDomains() {
  const list = $('domains-list');
  list.innerHTML = '';
  for (const d of data.allowedDomains) {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.style.minHeight = '64px';
    row.innerHTML = `<div class="lead">${icon('check')}</div><div class="grow title-m"></div>
      <button class="icon-btn">${icon('trash')}</button>`;
    row.querySelector('.grow').textContent = d;
    const btn = row.querySelector('button');
    btn.setAttribute('aria-label', t('dom.blockAria', { d }));
    btn.dataset.tip = t('dom.blockTitle');
    btn.addEventListener('click', async () => {
      data.allowedDomains = data.allowedDomains.filter((x) => x !== d);
      await send({ type: 'set-allowed-domains', domains: data.allowedDomains });
      renderDomains();
    });
    list.append(row);
  }
  $('domains-empty').hidden = !!data.allowedDomains.length;
}
$('add-domain').addEventListener('submit', async (e) => {
  e.preventDefault();
  let v = $('domain-input').value.trim().toLowerCase();
  try {
    if (/^[a-z]+:\/\//.test(v)) v = new URL(v).hostname;
  } catch {
    /* giữ nguyên */
  }
  v = v.replace(/\/.*$/, '');
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(v) || !v.includes('.')) return hint($('add-domain'), $('domain-input'), t('sites.invalid'));
  if (data.allowedDomains.includes(v)) return hint($('add-domain'), $('domain-input'), t('dom.dup'));
  hint($('add-domain'), $('domain-input'), '');
  data.allowedDomains = [...data.allowedDomains, v];
  await send({ type: 'set-allowed-domains', domains: data.allowedDomains });
  $('domain-input').value = '';
  renderDomains();
});

// ---------- Giao diện ----------
const look = () => ({ ...DEFAULT_LOOK, ...data.settings });
let saveTimer;
let fontSelect;

function saveSettings(patch, evt) {
  const apply = () => {
    data.settings = { ...data.settings, ...patch, theme: { ...data.settings.theme, ...patch.theme } };
    applyTheme(data.settings.theme);
    applyTypography(look());
    syncAppearance();
  };
  if (patch.theme) themeTransition(apply, evt);
  else apply();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => send({ type: 'set-settings', settings: patch }), 120);
}

function syncAppearance() {
  const { mode } = data.settings.theme;
  const key = colorOf(data.settings.theme).key;
  const { language, fontSize, fontFamily } = look();
  for (const r of document.querySelectorAll('input[name="mode"]')) r.checked = r.value === mode;
  for (const r of document.querySelectorAll('input[name="lang"]')) r.checked = r.value === language;
  for (const r of document.querySelectorAll('input[name="fsize"]')) r.checked = r.value === fontSize;
  for (const s of document.querySelectorAll('.swatch')) s.setAttribute('aria-checked', String(s.dataset.key === key));
  $('color-name').textContent = t(`color.${key}`);
  $('color-dot').style.background = schemeFor(data.settings.theme, false).primary;
  fontSelect?.setValue(fontFamily);
  $('font-sample').style.fontFamily = FONTS[fontFamily]?.stack ?? '';
}

function fontOptions() {
  return Object.entries(FONTS).map(([value, f]) => ({ value, label: f.label ?? t('font.system'), fontFamily: f.stack }));
}

function buildAppearance() {
  const box = $('swatches');
  for (const c of COLORS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.key = c.key;
    b.setAttribute('role', 'radio');
    b.style.background = c.hex;
    const n = parseInt(c.hex.slice(1), 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    b.style.color = lum > 0.62 ? '#1b1b1b' : '#fff';
    b.innerHTML = icon('check');
    b.addEventListener('click', (e) => saveSettings({ theme: { color: c.key } }, e));
    box.append(b);
  }
  for (const r of document.querySelectorAll('input[name="mode"]')) r.addEventListener('click', (e) => saveSettings({ theme: { mode: r.value } }, e));
  for (const r of document.querySelectorAll('input[name="lang"]')) r.addEventListener('change', () => saveSettings({ language: r.value }));
  for (const r of document.querySelectorAll('input[name="fsize"]')) r.addEventListener('change', () => saveSettings({ fontSize: r.value }));
  fontSelect = createSelect($('font-select'), { label: t('app.fontPick'), options: fontOptions(), value: 'system', onChange: (v) => saveSettings({ fontFamily: v }) });
}

function labelAppearance() {
  for (const s of document.querySelectorAll('.swatch')) {
    const name = t(`color.${s.dataset.key}`);
    s.setAttribute('aria-label', name);
    s.dataset.tip = name;
  }
  fontSelect?.setLabel(t('app.fontPick'));
  fontSelect?.setOptions(fontOptions());
  $('font-sample').textContent = t('font.sample');
}

// ---------- Giới thiệu ----------
function renderAbout() {
  $('ab-version').textContent = t('ab.version', { v: chrome.runtime.getManifest().version });
}

// ---------- Sao lưu ----------
$('export').addEventListener('click', async () => {
  const d = await send({ type: 'get-options' });
  const blob = new Blob(
    [JSON.stringify({ app: 'lite-shield', version: 1, settings: d.settings, userFilters: d.userFilters, disabledSites: d.disabledSites, allowedDomains: d.allowedDomains }, null, 2)],
    { type: 'application/json' },
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lite-shield-backup.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast.success(t('bk.exported'));
});
$('import').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const j = JSON.parse(await file.text());
    if (j.app !== 'lite-shield') throw new Error(t('bk.notBackup'));
    await send({ type: 'set-settings', settings: j.settings ?? {} });
    await send({ type: 'set-disabled-sites', sites: Array.isArray(j.disabledSites) ? j.disabledSites : [] });
    await send({ type: 'set-allowed-domains', domains: Array.isArray(j.allowedDomains) ? j.allowedDomains : [] });
    await send({ type: 'save-user-filters', text: j.userFilters ?? '' });
    await load();
    toast.success(t('bk.imported'));
  } catch (err) {
    toast.error(t('bk.importFail', { msg: err.message }));
  }
  e.target.value = '';
});

// ---------- khởi động ----------
function rerender() {
  renderRulesets();
  renderStats(data.compiled);
  renderSites();
  renderDomains();
  renderUpdate();
  renderShortcut();
  renderLogPerm();
  renderAbout();
  labelAppearance();
  syncAppearance();
}

async function load() {
  data = await send({ type: 'get-options' });
  data.settings = { ...DEFAULT_LOOK, ...data.settings };
  $('filters').value = data.userFilters;
  await renderRulesets();
  rerender();
  renderTotals();
}

drawEmptyCookie();
buildAppearance();
show(location.hash.slice(1));
ready.then(load);
