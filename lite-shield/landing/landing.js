import { initTheme } from '../shared/theme.js';
import { hydrateIcons } from '../shared/icons.js';
import { initRipple, initScrollTop, initReveal } from '../shared/effects.js';
import { initTooltips } from '../shared/tooltip.js';

const $ = (id) => document.getElementById(id);

hydrateIcons();
initTheme((settings) => {
  for (const r of document.querySelectorAll('input[name="lang"]')) r.checked = r.value === (settings.language ?? 'vi');
});
for (const r of document.querySelectorAll('input[name="lang"]')) {
  r.addEventListener('change', () => chrome.runtime.sendMessage({ type: 'set-settings', settings: { language: r.value } }));
}

// Hình "cookie" 12 cánh trang trí.
let d = '';
for (let i = 0; i <= 240; i++) {
  const a = (i / 240) * Math.PI * 2;
  const r = 90 * (1 + 0.065 * Math.cos(12 * a));
  d += `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`;
}
for (const p of document.querySelectorAll('.cookie-path')) p.setAttribute('d', d + 'Z');

// Nút cuộn lên đầu trang (cuộn mượt, có vòng tiến độ), hiệu ứng hiện dần, ripple, tooltip.
initScrollTop($('to-top'), { threshold: 320, onScroll: (y) => $('top').classList.toggle('stuck', y > 8) });
for (const el of document.querySelectorAll('.feature, .privacy .card, .author-card, #author .card')) el.setAttribute('data-reveal', '');
initReveal();
initRipple();
initTooltips();
