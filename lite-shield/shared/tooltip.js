// Tooltip tùy biến (kiểu M3 "plain tooltip") cho nút biểu tượng. Dùng ủy quyền sự kiện:
//   • phần tử có data-tip="..." (tuỳ chọn data-tip-kbd="Alt+Shift+X")
//   • phần tử có title="..." → được chuyển thành data-tip để không hiện tooltip mặc định của trình duyệt
//   • .icon-btn / .fab chỉ có aria-label → dùng aria-label
const SELECTOR = '[data-tip], [title], .icon-btn[aria-label], .fab[aria-label]';
const DELAY = 380;
let tip;
let timer;
let current;

function ensure() {
  if (tip?.isConnected) return tip;
  tip = document.createElement('div');
  tip.className = 'tip';
  tip.setAttribute('role', 'tooltip');
  tip.id = 'ls-tooltip';
  tip.innerHTML = '<span class="tip-text"></span><kbd class="tip-kbd"></kbd><span class="tip-arrow"></span>';
  document.body.append(tip);
  return tip;
}

function textOf(el) {
  const title = el.getAttribute('title');
  if (title) {
    el.dataset.tip = title; // chuyển title → data-tip, tránh tooltip mặc định
    el.removeAttribute('title');
    if (!el.hasAttribute('aria-label') && !el.textContent.trim()) el.setAttribute('aria-label', title);
  }
  return el.dataset.tip || el.getAttribute('aria-label') || '';
}

function place(el) {
  const tp = ensure();
  const z = parseFloat(document.documentElement.style.zoom) || 1;
  const r = el.getBoundingClientRect();
  // Toạ độ trong không gian đã phóng (html có thể bị zoom theo cỡ chữ).
  const vw = innerWidth / z;
  const vh = innerHeight / z;
  const rect = { left: r.left / z, right: r.right / z, top: r.top / z, bottom: r.bottom / z, width: r.width / z };
  tp.style.left = '0px';
  tp.style.top = '0px';
  const w = tp.offsetWidth;
  const h = tp.offsetHeight;
  const gap = 10;
  let below = rect.top - h - gap < 8;
  let top = below ? rect.bottom + gap : rect.top - h - gap;
  if (below && top + h > vh - 8) {
    below = false;
    top = Math.max(8, rect.top - h - gap);
  }
  let left = rect.left + rect.width / 2 - w / 2;
  left = Math.max(8, Math.min(vw - w - 8, left));
  tp.style.left = `${Math.round(left)}px`;
  tp.style.top = `${Math.round(top)}px`;
  tp.dataset.side = below ? 'bottom' : 'top';
  const arrow = rect.left + rect.width / 2 - left;
  tp.style.setProperty('--arrow-x', `${Math.max(12, Math.min(w - 12, arrow))}px`);
}

function show(el) {
  const text = textOf(el);
  if (!text) return;
  current = el;
  const tp = ensure();
  tp.querySelector('.tip-text').textContent = text;
  const kbd = tp.querySelector('.tip-kbd');
  kbd.textContent = el.dataset.tipKbd || '';
  kbd.hidden = !el.dataset.tipKbd;
  tp.classList.remove('show');
  place(el);
  requestAnimationFrame(() => tp.classList.add('show'));
  el.setAttribute('aria-describedby', 'ls-tooltip');
}

export function hideTip() {
  clearTimeout(timer);
  tip?.classList.remove('show');
  current?.removeAttribute('aria-describedby');
  current = null;
}

export function initTooltips() {
  document.addEventListener(
    'pointerover',
    (e) => {
      if (e.pointerType === 'touch') return;
      const el = e.target.closest?.(SELECTOR);
      if (!el || el === current) return;
      hideTip();
      timer = setTimeout(() => show(el), DELAY);
    },
    true,
  );
  document.addEventListener('pointerout', (e) => {
    const el = e.target.closest?.(SELECTOR);
    if (el && !el.contains(e.relatedTarget)) hideTip();
  }, true);
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest?.(SELECTOR);
    if (el && el.matches(':focus-visible')) show(el);
  });
  document.addEventListener('focusout', hideTip);
  document.addEventListener('pointerdown', hideTip, true);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && hideTip());
  addEventListener('scroll', hideTip, { passive: true, capture: true });
}
