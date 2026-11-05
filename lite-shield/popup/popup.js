import { initTheme } from '../shared/theme.js';
import { hydrateIcons } from '../shared/icons.js';
import { t } from '../shared/i18n.js';
import { toast } from '../shared/toast.js';
import { initRipple } from '../shared/effects.js';
import { initTooltips } from '../shared/tooltip.js';

hydrateIcons();
initRipple();
initTooltips();
// Khi đổi ngôn ngữ ở trang cài đặt, vẽ lại phần chữ động.
initTheme(() => {
  if (state) render();
  if (document.body.classList.contains('sheet-open') && tab) openLog();
});

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

var tab;
var state;

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

function render() {
  const hero = $('hero');
  const ok = state.supported;
  hero.classList.toggle('na', !ok);
  hero.classList.toggle('off', !ok || !state.enabled);
  $('power').setAttribute('aria-pressed', String(ok && state.enabled));

  $('host').textContent = ok ? state.host : t('popup.systemPage');
  $('avatar').textContent = ok ? state.host.replace(/^www\./, '')[0] : '·';

  if (!ok) {
    $('sub').textContent = t('popup.na');
    $('status').textContent = t('popup.statusNa');
    $('hint').textContent = t('popup.hintNa');
  } else if (state.enabled) {
    $('sub').textContent = t('popup.protecting');
    $('status').textContent = t('popup.statusOn');
    $('hint').textContent = t('popup.hintOn');
  } else {
    $('sub').textContent = t('popup.subOff');
    $('status').textContent = t('popup.statusOff');
    $('hint').textContent = t('popup.hintOff');
  }

  countTo($('blocked'), ok && state.enabled ? state.blocked : 0);
  countTo($('hidden'), ok && state.enabled ? state.hidden : 0);

  for (const id of ['pick', 'reload', 'log-open']) $(id).disabled = !ok;
  $('pick').disabled = !ok || !state.enabled;
  $('restore').disabled = !ok || !state.hiddenByMe;
  $('restore-label').textContent = state.hiddenByMe ? t('popup.restoreN', { n: state.hiddenByMe }) : t('popup.restore');
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
  setTimeout(() => chrome.tabs.reload(tab.id), 450);
});

$('pick').addEventListener('click', async () => {
  await send({ type: 'start-picker', tabId: tab.id });
  window.close();
});

$('restore').addEventListener('click', async () => {
  const r = await send({ type: 'restore-site', host: state.host.replace(/^www\./, '') });
  setTimeout(() => chrome.tabs.reload(tab.id), 450);
  state.hiddenByMe = 0;
  render();
});

$('reload').addEventListener('click', () => {
  chrome.tabs.reload(tab.id);
  window.close();
});

// ---------- nhật ký chặn ----------
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
  const types = e.types.map((ty) => { const k = `type.${ty}`; const v = t(k); return v === k ? ty : v; }).join(', ');
  row.innerHTML = `<div class="grow"><div class="title-m"></div><div class="body-m muted ellipsis"></div></div><button class="btn tonal"></button>`;
  row.querySelector('.title-m').textContent = e.host;
  row.querySelector('.title-m').title = e.host;
  row.querySelector('.body-m').textContent = t('log.meta', { n: e.n, types });
  const btn = row.querySelector('button');
  const set = (allowed) => {
    btn.textContent = allowed ? t('log.allowed') : t('log.allow');
    btn.disabled = allowed;
  };
  set(e.allowed);
  btn.addEventListener('click', async () => {
    set(true);
    await send({ type: 'set-domain-allowed', domain: e.host, allowed: true });
    toast.success(t('log.allowedSnack', { host: e.host }), { duration: 2600 });
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
  $('log-sub').textContent = entries.length ? t('log.sub', { n: total, m: entries.length }) : t('log.subDefault');
  if (!entries.length) {
    box.innerHTML = `<div class="log-empty">${emptyCookieSvg()}<div class="title-m">${t('log.empty')}</div><div class="body-m">${t('log.emptyHint')}</div></div>`;
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
