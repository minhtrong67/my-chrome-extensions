// Toast 4 biến thể (info / success / warning / error), hỗ trợ sáng–tối, tự đóng, dừng khi rê chuột.
// Chỉ dùng cho kết quả thật sự cần báo (lưu, nhập, cập nhật, lỗi) — không dùng cho thao tác bật/tắt thông thường.
import { icon } from './icons.js';
import { t } from './i18n.js';

const ICONS = { info: 'info', success: 'ok', warning: 'warn', error: 'err' };
const DURATION = { info: 4000, success: 3500, warning: 6000, error: 7000 };
const MAX = 3;
let box;

function container() {
  if (box?.isConnected) return box;
  box = document.createElement('div');
  box.className = 'toasts';
  box.setAttribute('role', 'region');
  box.setAttribute('aria-live', 'polite');
  document.body.append(box);
  return box;
}

function dismiss(el) {
  if (el.dataset.leaving) return;
  el.dataset.leaving = '1';
  el.classList.add('leaving');
  setTimeout(() => el.remove(), 260);
}

/**
 * toast('Đã lưu', { variant: 'success' })
 * @param {string} message
 * @param {{variant?: 'info'|'success'|'warning'|'error', duration?: number}} [opts]
 */
export function toast(message, { variant = 'info', duration } = {}) {
  const root = container();
  // Thông báo trùng đang hiển thị → chỉ làm nổi bật lại, không chồng thêm.
  const dup = [...root.children].find((c) => c.dataset.msg === message && c.dataset.variant === variant && !c.dataset.leaving);
  if (dup) {
    dup.classList.remove('bump');
    void dup.offsetWidth;
    dup.classList.add('bump');
    return dup;
  }
  while (root.children.length >= MAX) dismiss(root.firstElementChild);

  const el = document.createElement('div');
  el.className = `toast ${variant}`;
  el.dataset.msg = message;
  el.dataset.variant = variant;
  el.setAttribute('role', variant === 'error' || variant === 'warning' ? 'alert' : 'status');
  el.innerHTML = `
    <span class="toast-ico">${icon(ICONS[variant] ?? 'info')}</span>
    <span class="toast-msg"></span>
    <button type="button" class="toast-x">${icon('close')}</button>
    <span class="toast-bar"></span>`;
  el.querySelector('.toast-msg').textContent = message;
  const x = el.querySelector('.toast-x');
  x.setAttribute('aria-label', t('toast.dismiss'));
  x.dataset.tip = t('toast.dismiss');
  x.addEventListener('click', () => dismiss(el));
  root.append(el);

  const ms = duration ?? DURATION[variant] ?? 4000;
  const bar = el.querySelector('.toast-bar');
  const anim = bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: ms, fill: 'forwards', easing: 'linear' });
  anim.onfinish = () => dismiss(el);
  el.addEventListener('pointerenter', () => anim.pause());
  el.addEventListener('pointerleave', () => anim.play());
  el.addEventListener('focusin', () => anim.pause());
  el.addEventListener('focusout', () => anim.play());
  return el;
}

toast.info = (m, o) => toast(m, { ...o, variant: 'info' });
toast.success = (m, o) => toast(m, { ...o, variant: 'success' });
toast.warning = (m, o) => toast(m, { ...o, variant: 'warning' });
toast.error = (m, o) => toast(m, { ...o, variant: 'error' });
