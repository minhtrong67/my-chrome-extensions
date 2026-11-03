import { initTheme } from '../shared/theme.js';
import { hydrateIcons } from '../shared/icons.js';

initTheme();
hydrateIcons();

const $ = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);

// Hình "cookie" 12 cánh — dạng đặc trưng của M3 Expressive.
(function drawCookie(n = 12, amp = 0.065, r = 90, steps = 240) {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const rr = r * (1 + amp * Math.cos(n * t));
    d += `${i ? 'L' : 'M'}${(rr * Math.cos(t)).toFixed(2)} ${(rr * Math.sin(t)).toFixed(2)}`;
  }
  $('cookie-path').setAttribute('d', d + 'Z');
})();

let tab;
let state;

function countTo(el, to) {
  const from = Number(el.dataset.v ?? 0);
  el.dataset.v = to;
  if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) return (el.textContent = to);
  const t0 = performance.now();
  const dur = 650;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    el.textContent = Math.round(from + (to - from) * (1 - (1 - p) ** 3));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

let snackTimer;
function snack(text) {
  const s = $('snack');
  s.textContent = text;
  s.classList.add('show');
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => s.classList.remove('show'), 2200);
}

function render() {
  const hero = $('hero');
  const ok = state.supported;
  hero.classList.toggle('na', !ok);
  hero.classList.toggle('off', !ok || !state.enabled);
  $('power').setAttribute('aria-pressed', String(ok && state.enabled));

  $('host').textContent = ok ? state.host : 'Trang hệ thống';
  $('avatar').textContent = ok ? state.host.replace(/^www\./, '')[0] : '·';

  if (!ok) {
    $('sub').textContent = 'Không áp dụng';
    $('status').textContent = 'Không khả dụng';
    $('hint').textContent = 'Lite Shield không chạy trên trang này.';
  } else if (state.enabled) {
    $('sub').textContent = 'Đang bảo vệ';
    $('status').textContent = 'Đã bật bảo vệ';
    $('hint').textContent = 'Nhấn nút nguồn để tắt cho trang này.';
  } else {
    $('sub').textContent = 'Đã tắt cho trang này';
    $('status').textContent = 'Đã tắt bảo vệ';
    $('hint').textContent = 'Nhấn nút nguồn để bật lại.';
  }

  countTo($('blocked'), ok && state.enabled ? state.blocked : 0);
  countTo($('hidden'), ok && state.enabled ? state.hidden : 0);

  for (const id of ['pick', 'reload', 'log-open']) $(id).disabled = !ok;
  $('pick').disabled = !ok || !state.enabled;
  $('restore').disabled = !ok || !state.hiddenByMe;
  $('restore-label').textContent = state.hiddenByMe ? `Khôi phục (${state.hiddenByMe})` : 'Khôi phục';
}

async function load() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state = await send({ type: 'get-site-state', tabId: tab?.id, url: tab?.url ?? '' });
  render();
}

$('power').addEventListener('click', async () => {
  if (!state?.supported) return;
  state.enabled = !state.enabled;
  render();
  await send({ type: 'set-site-enabled', host: state.host, enabled: state.enabled });
  snack(state.enabled ? 'Đã bật — đang tải lại trang' : 'Đã tắt cho trang này — đang tải lại');
  setTimeout(() => chrome.tabs.reload(tab.id), 450);
});

$('pick').addEventListener('click', async () => {
  await send({ type: 'start-picker', tabId: tab.id });
  window.close();
});

$('restore').addEventListener('click', async () => {
  const r = await send({ type: 'restore-site', host: state.host.replace(/^www\./, '') });
  snack(`Đã khôi phục ${r.removed} phần tử`);
  setTimeout(() => chrome.tabs.reload(tab.id), 450);
  state.hiddenByMe = 0;
  render();
});

$('reload').addEventListener('click', () => {
  chrome.tabs.reload(tab.id);
  window.close();
});

// ---------- nhật ký chặn ----------
const TYPE_VI = { script: 'script', image: 'ảnh', xmlhttprequest: 'XHR', sub_frame: 'khung', ping: 'ping', stylesheet: 'CSS', font: 'phông', media: 'media', other: 'khác', websocket: 'websocket' };

function emptyCookieSvg() {
  let d = '';
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * Math.PI * 2;
    const r = 90 * (1 + 0.065 * Math.cos(12 * t));
    d += `${i ? 'L' : 'M'}${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`;
  }
  return `<svg viewBox="-100 -100 200 200" aria-hidden="true"><path d="${d}Z"/></svg>`;
}

function rowFor(e) {
  const row = document.createElement('div');
  row.className = 'log-row';
  const types = e.types.map((t) => TYPE_VI[t] ?? t).join(', ');
  row.innerHTML = `<div class="grow"><div class="title-m"></div><div class="body-m muted ellipsis"></div></div><button class="btn tonal"></button>`;
  row.querySelector('.title-m').textContent = e.host;
  row.querySelector('.title-m').title = e.host;
  row.querySelector('.body-m').textContent = `${e.n} yêu cầu · ${types}`;
  const btn = row.querySelector('button');
  const set = (allowed) => {
    btn.textContent = allowed ? 'Đã cho phép' : 'Cho phép';
    btn.disabled = allowed;
  };
  set(e.allowed);
  btn.addEventListener('click', async () => {
    set(true);
    await send({ type: 'set-domain-allowed', domain: e.host, allowed: true });
    snack(`Đã cho phép ${e.host} — tải lại trang để áp dụng`);
  });
  return row;
}

async function openLog() {
  document.body.classList.add('sheet-open');
  $('sheet').setAttribute('aria-hidden', 'false');
  const { entries } = await send({ type: 'get-log', tabId: tab.id });
  const box = $('log-list');
  box.innerHTML = '';
  const total = entries.reduce((n, e) => n + e.n, 0);
  $('log-sub').textContent = entries.length ? `${total} yêu cầu từ ${entries.length} tên miền` : 'Các tên miền bị chặn trên trang này';
  if (!entries.length) {
    box.innerHTML = `<div class="log-empty">${emptyCookieSvg()}<div class="title-m">Chưa chặn yêu cầu nào</div><div class="body-m">Tải lại trang rồi mở lại nhật ký.</div></div>`;
    return;
  }
  for (const e of entries) box.append(rowFor(e));
}
function closeLog() {
  document.body.classList.remove('sheet-open');
  $('sheet').setAttribute('aria-hidden', 'true');
}
$('log-open').addEventListener('click', openLog);
$('log-close').addEventListener('click', closeLog);
$('scrim').addEventListener('click', closeLog);
addEventListener('keydown', (e) => e.key === 'Escape' && closeLog());

$('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

load();
