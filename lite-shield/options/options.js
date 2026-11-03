import { initTheme, applyTheme, tone } from '../shared/theme.js';
import { hydrateIcons, icon } from '../shared/icons.js';

initTheme();
hydrateIcons();

const $ = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);

let data; // { settings, userFilters, disabledSites, compiled }

// ---------- điều hướng ----------
const PANELS = ['protection', 'filters', 'sites', 'appearance', 'backup'];
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
addEventListener('hashchange', () => show(location.hash.slice(1)));

let snackTimer;
function snack(text) {
  const s = $('snack');
  s.textContent = text;
  s.classList.add('show');
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => s.classList.remove('show'), 2600);
}

// ---------- Bảo vệ ----------
const RULESET_META = {
  ads: { icon: 'block', title: 'Quảng cáo', desc: 'Mạng quảng cáo, máy chủ ad và selector ẩn khung quảng cáo.' },
  trackers: { icon: 'eye', title: 'Theo dõi & phân tích', desc: 'Pixel, analytics và nền tảng dữ liệu người dùng.' },
  annoyances: { icon: 'shield', title: 'Phiền toái', desc: 'Popunder, push-spam, banner cookie và popup đăng ký.' },
};

async function countRules(id) {
  try {
    const rules = await (await fetch(chrome.runtime.getURL(`rulesets/${id}.json`))).json();
    return rules.reduce((n, r) => n + (r.condition.requestDomains?.length ?? 1), 0);
  } catch {
    return 0;
  }
}

async function renderRulesets() {
  const box = $('rulesets');
  box.innerHTML = '';
  for (const id of Object.keys(RULESET_META)) {
    const m = RULESET_META[id];
    const n = await countRules(id);
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `
      <div class="lead">${icon(m.icon)}</div>
      <div class="grow"><div class="title-m">${m.title}</div><div class="body-m muted">${m.desc} <span class="count">· ${n} quy tắc</span></div></div>
      <label class="switch"><input type="checkbox" aria-label="${m.title}" ${data.settings.rulesets[id] ? 'checked' : ''}></label>`;
    row.querySelector('input').addEventListener('change', async (e) => {
      data.settings.rulesets[id] = e.target.checked;
      await send({ type: 'set-settings', settings: { rulesets: { [id]: e.target.checked } } });
      snack(`${m.title}: ${e.target.checked ? 'đã bật' : 'đã tắt'}`);
    });
    box.append(row);
  }
  $('generic-cosmetic').checked = data.settings.genericCosmetic;
  $('yt-scriptlet').checked = data.settings.scriptlets.youtube;
  $('auto-update').checked = data.settings.autoUpdate;
  renderUpdate();
}

// ---------- thống kê, cập nhật, phím tắt ----------
function countUp(el, to) {
  const from = Number(el.dataset.v ?? 0);
  el.dataset.v = to;
  if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) return (el.textContent = to.toLocaleString('vi-VN'));
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / 700);
    el.textContent = Math.round(from + (to - from) * (1 - (1 - p) ** 3)).toLocaleString('vi-VN');
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
  $('upd-title').textContent = u ? 'Danh sách đã được cập nhật' : 'Danh sách đi kèm bản cài';
  $('upd-sub').textContent = u
    ? `${new Date(u.at).toLocaleString('vi-VN')} · ${u.ads} quy tắc quảng cáo · ${u.trackers} quy tắc theo dõi · ${u.cosmetic} selector ẩn`
    : 'Chưa cập nhật lần nào.';
}
$('upd-now').addEventListener('click', async () => {
  const btn = $('upd-now');
  btn.classList.add('busy');
  btn.querySelector('span').textContent = 'Đang tải…';
  const r = await send({ type: 'update-lists' });
  btn.classList.remove('busy');
  btn.querySelector('span').textContent = 'Cập nhật ngay';
  if (r.error) return snack('Cập nhật thất bại: ' + r.error);
  data.updateInfo = r.updateInfo;
  renderUpdate();
  snack('Đã cập nhật danh sách — tải lại trang để áp dụng');
});
$('auto-update').addEventListener('change', async (e) => {
  data.settings.autoUpdate = e.target.checked;
  await send({ type: 'set-settings', settings: { autoUpdate: e.target.checked } });
  snack(e.target.checked ? 'Sẽ tự cập nhật mỗi ngày' : 'Đã tắt tự cập nhật');
});
$('yt-scriptlet').addEventListener('change', async (e) => {
  data.settings.scriptlets.youtube = e.target.checked;
  await send({ type: 'set-settings', settings: { scriptlets: { youtube: e.target.checked } } });
  snack('Đã lưu — tải lại YouTube để áp dụng');
});
$('shortcuts').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
chrome.commands?.getAll().then((cmds) => {
  const c = cmds.find((x) => x.name === 'start-picker');
  $('kbd').textContent = c?.shortcut ? c.shortcut.replace(/\+/g, ' + ') : 'Chưa gán';
});
$('generic-cosmetic').addEventListener('change', async (e) => {
  data.settings.genericCosmetic = e.target.checked;
  await send({ type: 'set-settings', settings: { genericCosmetic: e.target.checked } });
  snack('Đã lưu — tải lại trang để áp dụng');
});

// ---------- Bộ lọc của tôi ----------
function renderStats(compiled) {
  const c = compiled?.counts ?? { network: 0, exceptions: 0, cosmetic: 0 };
  const errs = compiled?.errors ?? [];
  $('stats').innerHTML = `
    <span class="chip primary">${c.network} chặn</span>
    <span class="chip">${c.exceptions} ngoại lệ</span>
    <span class="chip tertiary">${c.cosmetic} ẩn phần tử</span>
    ${errs.length ? `<span class="chip error">${errs.length} lỗi</span>` : ''}`;
  const box = $('errors');
  box.hidden = !errs.length;
  if (errs.length) {
    box.innerHTML = '<div class="title-m">Một số dòng bị bỏ qua</div><ul class="body-m"></ul>';
    const ul = box.querySelector('ul');
    for (const e of errs.slice(0, 50)) {
      const li = document.createElement('li');
      li.innerHTML = `Dòng ${e.line}: ${e.msg}${e.text ? ' — <code></code>' : ''}`;
      if (e.text) li.querySelector('code').textContent = e.text.slice(0, 90);
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
  snack(res.errors?.length ? `Đã lưu — ${res.errors.length} dòng bị bỏ qua` : 'Đã lưu bộ lọc');
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
    const t = (i / 240) * Math.PI * 2;
    const r = 90 * (1 + 0.065 * Math.cos(12 * t));
    d += `${i ? 'L' : 'M'}${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`;
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
      <button class="icon-btn" aria-label="Bật lại bảo vệ cho ${site}" title="Bật lại">${icon('trash')}</button>`;
    row.querySelector('.grow').textContent = site;
    row.querySelector('button').addEventListener('click', async () => {
      data.disabledSites = data.disabledSites.filter((s) => s !== site);
      await send({ type: 'set-disabled-sites', sites: data.disabledSites });
      renderSites();
      snack(`Đã bật lại bảo vệ cho ${site}`);
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
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(v) || (!v.includes('.') && v !== 'localhost')) return snack('Tên miền không hợp lệ');
  if (data.disabledSites.includes(v)) return snack('Trang này đã có trong danh sách');
  data.disabledSites = [...data.disabledSites, v];
  await send({ type: 'set-disabled-sites', sites: data.disabledSites });
  $('site-input').value = '';
  renderSites();
  snack(`Đã tắt bảo vệ cho ${v}`);
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
      <button class="icon-btn" aria-label="Chặn lại ${d}" title="Chặn lại">${icon('trash')}</button>`;
    row.querySelector('.grow').textContent = d;
    row.querySelector('button').addEventListener('click', async () => {
      data.allowedDomains = data.allowedDomains.filter((x) => x !== d);
      await send({ type: 'set-allowed-domains', domains: data.allowedDomains });
      renderDomains();
      snack(`Đã chặn lại ${d}`);
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
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(v) || !v.includes('.')) return snack('Tên miền không hợp lệ');
  if (data.allowedDomains.includes(v)) return snack('Tên miền này đã được cho phép');
  data.allowedDomains = [...data.allowedDomains, v];
  await send({ type: 'set-allowed-domains', domains: data.allowedDomains });
  $('domain-input').value = '';
  renderDomains();
  snack(`Đã cho phép ${v}`);
});

// ---------- Giao diện ----------
const SWATCHES = [
  { hue: 295, name: 'Tím' }, { hue: 265, name: 'Chàm' }, { hue: 245, name: 'Xanh dương' }, { hue: 200, name: 'Xanh ngọc' },
  { hue: 150, name: 'Xanh lá' }, { hue: 105, name: 'Vàng chanh' }, { hue: 60, name: 'Cam' }, { hue: 25, name: 'Đỏ' }, { hue: 350, name: 'Hồng' },
];

let themeTimer;
function saveTheme(patch) {
  data.settings.theme = { ...data.settings.theme, ...patch };
  applyTheme(data.settings.theme);
  syncAppearance();
  clearTimeout(themeTimer);
  themeTimer = setTimeout(() => send({ type: 'set-settings', settings: { theme: data.settings.theme } }), 150);
}

function syncAppearance() {
  const { hue, mode } = data.settings.theme;
  $('hue').value = hue;
  for (const r of document.querySelectorAll('input[name="mode"]')) r.checked = r.value === mode;
  const near = SWATCHES.reduce((a, b) => (Math.abs(b.hue - hue) < Math.abs(a.hue - hue) ? b : a));
  for (const s of document.querySelectorAll('.swatch')) s.setAttribute('aria-checked', String(s.dataset.hue === String(hue) && near.hue === hue));
}

function buildAppearance() {
  const box = $('swatches');
  box.setAttribute('role', 'radiogroup');
  for (const s of SWATCHES) {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.dataset.hue = s.hue;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', s.name);
    b.title = s.name;
    b.style.background = tone(s.hue, 0.17, 50);
    b.innerHTML = icon('check');
    b.addEventListener('click', () => saveTheme({ hue: s.hue }));
    box.append(b);
  }
  $('hue').addEventListener('input', (e) => saveTheme({ hue: Number(e.target.value) }));
  for (const r of document.querySelectorAll('input[name="mode"]')) r.addEventListener('change', () => saveTheme({ mode: r.value }));
}

// ---------- Sao lưu ----------
$('export').addEventListener('click', async () => {
  const d = await send({ type: 'get-options' });
  const blob = new Blob([JSON.stringify({ app: 'lite-shield', version: 1, settings: d.settings, userFilters: d.userFilters, disabledSites: d.disabledSites, allowedDomains: d.allowedDomains }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lite-shield-backup.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  snack('Đã xuất tệp sao lưu');
});
$('import').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const j = JSON.parse(await file.text());
    if (j.app !== 'lite-shield') throw new Error('Không phải tệp sao lưu Lite Shield');
    await send({ type: 'set-settings', settings: j.settings ?? {} });
    await send({ type: 'set-disabled-sites', sites: Array.isArray(j.disabledSites) ? j.disabledSites : [] });
    await send({ type: 'set-allowed-domains', domains: Array.isArray(j.allowedDomains) ? j.allowedDomains : [] });
    await send({ type: 'save-user-filters', text: j.userFilters ?? '' });
    await load();
    snack('Đã nhập cài đặt');
  } catch (err) {
    snack('Nhập thất bại: ' + err.message);
  }
  e.target.value = '';
});

// ---------- khởi động ----------
async function load() {
  data = await send({ type: 'get-options' });
  $('filters').value = data.userFilters;
  await renderRulesets();
  renderStats(data.compiled);
  renderSites();
  renderDomains();
  renderTotals();
  syncAppearance();
}

drawEmptyCookie();
buildAppearance();
show(location.hash.slice(1));
load();
