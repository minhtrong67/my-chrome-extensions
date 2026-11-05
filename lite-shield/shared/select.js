// Dropdown tùy biến (thay <select> gốc để hỗ trợ giao diện sáng/tối), đúng mẫu ARIA combobox + listbox.
// Danh sách có chiều cao tối đa và cuộn; hỗ trợ bàn phím (↑ ↓ Home End Enter Space Esc, gõ chữ để nhảy).
import { icon } from './icons.js';

let uid = 0;

/**
 * createSelect(host, { label, options: [{ value, label, fontFamily? }], value, onChange })
 * Trả về { setValue, setOptions, setLabel, close }.
 */
export function createSelect(host, { label = '', options = [], value, onChange } = {}) {
  const id = `sel${++uid}`;
  let open = false;
  let active = -1;
  let typed = '';
  let typedTimer;

  host.classList.add('sel');
  host.innerHTML = `
    <span class="sel-label" id="${id}-lbl"></span>
    <button type="button" class="sel-trigger" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-list" aria-labelledby="${id}-lbl ${id}-val">
      <span class="sel-value" id="${id}-val"></span>
      <span class="sel-chevron">${icon('chevron')}</span>
    </button>
    <ul class="sel-list" role="listbox" id="${id}-list" aria-labelledby="${id}-lbl" tabindex="-1"></ul>`;
  const trigger = host.querySelector('.sel-trigger');
  const list = host.querySelector('.sel-list');
  const valueEl = host.querySelector('.sel-value');
  host.querySelector('.sel-label').textContent = label;

  const idx = () => options.findIndex((o) => o.value === value);

  function renderOptions() {
    list.innerHTML = '';
    options.forEach((o, i) => {
      const li = document.createElement('li');
      li.id = `${id}-o${i}`;
      li.setAttribute('role', 'option');
      li.dataset.value = o.value;
      li.innerHTML = `<span class="sel-opt-label"></span><span class="sel-opt-check">${icon('check')}</span>`;
      const lab = li.querySelector('.sel-opt-label');
      lab.textContent = o.label;
      if (o.fontFamily) lab.style.fontFamily = o.fontFamily;
      li.addEventListener('pointerenter', () => setActive(i, false));
      li.addEventListener('click', () => choose(i));
      list.append(li);
    });
    syncValue();
  }

  function syncValue() {
    const i = idx();
    const o = options[i];
    valueEl.textContent = o?.label ?? '';
    valueEl.style.fontFamily = o?.fontFamily ?? '';
    [...list.children].forEach((li, n) => li.setAttribute('aria-selected', String(n === i)));
  }

  function setActive(i, scroll = true) {
    active = Math.max(0, Math.min(options.length - 1, i));
    [...list.children].forEach((li, n) => li.classList.toggle('active', n === active));
    const el = list.children[active];
    if (el) {
      trigger.setAttribute('aria-activedescendant', el.id);
      if (scroll) el.scrollIntoView({ block: 'nearest' });
    }
  }

  function openList() {
    if (open) return;
    open = true;
    // Mở lên trên nếu bên dưới không đủ chỗ.
    const z = parseFloat(document.documentElement.style.zoom) || 1;
    const r = trigger.getBoundingClientRect();
    const need = Math.min(options.length * 48 + 16, 260) * z;
    host.classList.toggle('up', innerHeight - r.bottom < need && r.top > innerHeight - r.bottom);
    host.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    setActive(Math.max(0, idx()));
  }
  function closeList(focus = false) {
    if (!open) return;
    open = false;
    host.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
    if (focus) trigger.focus();
  }
  function choose(i) {
    const o = options[i];
    if (!o) return;
    const changed = o.value !== value;
    value = o.value;
    syncValue();
    closeList(true);
    if (changed) onChange?.(value);
  }

  trigger.addEventListener('click', () => (open ? closeList() : openList()));
  trigger.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      if (!open) openList();
      else setActive(active + (k === 'ArrowDown' ? 1 : -1));
    } else if (k === 'Home' || k === 'End') {
      if (open) (e.preventDefault(), setActive(k === 'Home' ? 0 : options.length - 1));
    } else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (open) choose(active);
      else openList();
    } else if (k === 'Escape') {
      if (open) (e.preventDefault(), e.stopPropagation(), closeList(true));
    } else if (k === 'Tab') {
      closeList();
    } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      typed += k.toLowerCase();
      clearTimeout(typedTimer);
      typedTimer = setTimeout(() => (typed = ''), 600);
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed));
      if (i >= 0) (openList(), setActive(i));
    }
  });
  document.addEventListener('pointerdown', (e) => open && !host.contains(e.target) && closeList(), true);
  addEventListener('blur', () => closeList());

  renderOptions();

  return {
    setValue(v) { value = v; syncValue(); },
    setOptions(o, v = value) { options = o; value = v; renderOptions(); },
    setLabel(l) { host.querySelector('.sel-label').textContent = l; },
    close: () => closeList(),
  };
}
