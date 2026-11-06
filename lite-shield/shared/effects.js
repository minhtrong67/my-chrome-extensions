// Hiệu ứng dùng chung: gợn sóng (ripple), nút cuộn lên đầu có vòng tiến độ, hiện dần khi cuộn, chuyển theme dạng vòng tròn.

const RIPPLE_SEL = '.btn, .icon-btn, .fab, .nav, .sel-trigger, .acc-head, .sel-list li, .toast-x';

export function initRipple() {
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const el = e.target.closest?.(RIPPLE_SEL);
      if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
      const host = el.matches('.nav') ? el.querySelector('.pill') : el;
      if (!host) return;
      const r = host.getBoundingClientRect();
      const z = parseFloat(document.documentElement.style.zoom) || 1;
      const size = Math.max(r.width, r.height) * 2 / z;
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${(e.clientX - r.left) / z - size / 2}px`;
      span.style.top = `${(e.clientY - r.top) / z - size / 2}px`;
      host.append(span);
      span.addEventListener('animationend', () => span.remove(), { once: true });
    },
    true,
  );
}

let rafId;
/** Cuộn mượt bằng rAF (easeInOutCubic) — không phụ thuộc scroll-behavior/cài đặt hệ thống; người dùng cuộn tay sẽ hủy. */
export function smoothScrollTo(top, duration) {
  cancelAnimationFrame(rafId);
  const root = document.scrollingElement || document.documentElement;
  const from = root.scrollTop;
  const dist = top - from;
  if (!dist) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dur = duration ?? (reduce ? 260 : Math.min(900, 380 + Math.abs(dist) * 0.25));
  const t0 = performance.now();
  const stop = () => { cancelAnimationFrame(rafId); cleanup(); };
  const cleanup = () => { for (const ev of ['wheel', 'touchstart', 'keydown', 'pointerdown']) removeEventListener(ev, stop, true); };
  for (const ev of ['wheel', 'touchstart', 'keydown', 'pointerdown']) addEventListener(ev, stop, { capture: true, passive: true });
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
    root.scrollTop = from + dist * e;
    if (p < 1) rafId = requestAnimationFrame(step);
    else cleanup();
  };
  rafId = requestAnimationFrame(step);
}

/** Nút "lên đầu trang": hiện khi cuộn xa, có vòng tiến độ cuộn, bấm để cuộn mượt. */
export function initScrollTop(btn, { threshold = 240, onScroll } = {}) {
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(100, (scrollY / max) * 100) : 0;
    btn.style.setProperty('--p', p.toFixed(1));
    btn.classList.toggle('show', scrollY > threshold);
    onScroll?.(scrollY);
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  btn.addEventListener('click', () => smoothScrollTo(0));
  update();
  return update;
}

/** Hiện dần các phần tử [data-reveal] khi vào khung nhìn. */
export function initReveal(root = document) {
  const els = [...root.querySelectorAll('[data-reveal]')];
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    },
    { threshold: 0.12 },
  );
  els.forEach((el, i) => {
    el.style.setProperty('--d', `${(i % 4) * 70}ms`);
    io.observe(el);
  });
}

/** Chạy fn() (đổi theme) kèm hiệu ứng loang tròn từ điểm bấm bằng View Transitions API. */
export function themeTransition(fn, evt) {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return fn();
  const z = parseFloat(document.documentElement.style.zoom) || 1;
  const x = (evt?.clientX ?? innerWidth / 2) / z;
  const y = (evt?.clientY ?? innerHeight / 2) / z;
  const r = Math.hypot(Math.max(x, innerWidth / z - x), Math.max(y, innerHeight / z - y));
  const root = document.documentElement;
  root.style.setProperty('--vt-x', `${x}px`);
  root.style.setProperty('--vt-y', `${y}px`);
  root.style.setProperty('--vt-r', `${r}px`);
  return document.startViewTransition(fn);
}

/** Accordion: .acc > .acc-head[aria-expanded] + .acc-body. Phần đóng bị vô hiệu (inert) để bàn phím không lọt vào. */
export function initAccordions(root = document) {
  for (const acc of root.querySelectorAll('.acc')) {
    const head = acc.querySelector('.acc-head');
    const inner = acc.querySelector('.acc-inner');
    const body = acc.querySelector('.acc-body');
    head.id ||= `${acc.id || 'acc'}-head`;
    body?.setAttribute('aria-labelledby', head.id);
    const set = (open) => {
      acc.toggleAttribute('data-open', open);
      head.setAttribute('aria-expanded', String(open));
      inner.inert = !open;
    };
    set(false);
    head.addEventListener('click', () => set(!acc.hasAttribute('data-open')));
  }
}
