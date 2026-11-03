// Trình chọn phần tử (element zapper) — được chèn theo yêu cầu từ popup (activeTab).
(async () => {
  if (window.__liteShieldPicker) {
    window.__liteShieldPicker.destroy();
    return;
  }

  const tokens = await chrome.runtime.sendMessage({ type: 'theme-tokens' }).catch(() => null);
  const dark = tokens?.mode === 'dark' || (tokens?.mode !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  const c = (tokens && (dark ? tokens.dark : tokens.light)) || {
    primary: '#6750a4', onPrimary: '#fff', primaryContainer: '#eaddff', onPrimaryContainer: '#21005d',
    surfaceContainerHigh: '#ece6f0', onSurface: '#1d1b20', onSurfaceVariant: '#49454f', outlineVariant: '#cac4d0',
    secondaryContainer: '#e8def8', onSecondaryContainer: '#1d192b',
  };

  const BAD_ID = /\d{4,}|^[a-f0-9]{8,}$|^(ember|react|:r)/i;
  const BAD_CLASS = /\d{2,}|^(css|jsx|sc|svelte|styled)[-_]|^(active|open|show|hide|hidden|visible|hover|focus|selected|loading)$/i;
  const goodClasses = (el) =>
    [...(el.classList || [])].filter((k) => k.length <= 40 && !BAD_CLASS.test(k) && /^[\w-]+$/.test(k));

  const count = (sel) => {
    try {
      return document.querySelectorAll(sel).length;
    } catch {
      return 0;
    }
  };

  function specificSelector(el) {
    const parts = [];
    let node = el;
    for (let depth = 0; node && node.nodeType === 1 && node !== document.documentElement && depth < 7; depth++, node = node.parentElement) {
      let part = node.localName;
      if (node.id && !BAD_ID.test(node.id)) {
        parts.unshift('#' + CSS.escape(node.id));
        if (count(parts.join(' > ')) === 1) return parts.join(' > ');
        continue;
      }
      const cls = goodClasses(node).slice(0, 3);
      if (cls.length) part += cls.map((k) => '.' + CSS.escape(k)).join('');
      parts.unshift(part);
      let sel = parts.join(' > ');
      if (count(sel) === 1) return sel;
      const parent = node.parentElement;
      if (parent) {
        const same = [...parent.children].filter((x) => x.localName === node.localName);
        if (same.length > 1) {
          parts[0] = `${part}:nth-of-type(${same.indexOf(node) + 1})`;
          sel = parts.join(' > ');
          if (count(sel) === 1) return sel;
        }
      }
    }
    return parts.join(' > ');
  }

  function looseSelector(el) {
    const cls = goodClasses(el).slice(0, 2);
    return cls.length ? el.localName + cls.map((k) => '.' + CSS.escape(k)).join('') : '';
  }

  // ---------- UI ----------
  const host = document.createElement('lite-shield-picker');
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
  <style>
    :host{all:initial}
    *{box-sizing:border-box;font-family:"Google Sans Flex","Google Sans","Roboto Flex",Roboto,system-ui,sans-serif}
    .hl{position:fixed;pointer-events:none;border:3px solid ${c.primary};background:${c.primary}2e;border-radius:10px;
        transition:top .16s cubic-bezier(.34,1.4,.64,1),left .16s cubic-bezier(.34,1.4,.64,1),width .16s cubic-bezier(.34,1.4,.64,1),height .16s cubic-bezier(.34,1.4,.64,1);
        box-shadow:0 0 0 9999px ${dark ? '#00000055' : '#0000002e'};display:none}
    .tag{position:absolute;left:-3px;top:-34px;background:${c.primary};color:${c.onPrimary};font:600 12px/1 ui-monospace,Menlo,monospace;
         padding:7px 10px;border-radius:12px 12px 12px 4px;white-space:nowrap;max-width:60vw;overflow:hidden;text-overflow:ellipsis}
    .bar{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);width:min(580px,calc(100vw - 24px));pointer-events:auto;
         background:${c.surfaceContainerHigh};color:${c.onSurface};border-radius:32px;padding:16px 16px 14px;
         box-shadow:0 8px 28px #00000040,0 0 0 1px ${c.outlineVariant};animation:pop .35s cubic-bezier(.34,1.56,.64,1)}
    @keyframes pop{from{transform:translateX(-50%) translateY(30px) scale(.9);opacity:0}}
    .title{font:700 16px/1.2 inherit;margin:0 6px 4px;display:flex;align-items:center;gap:8px}
    .title svg{width:20px;height:20px;stroke:${c.primary};fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .sel{margin:6px 6px 12px;padding:10px 14px;border-radius:16px;background:${c.primaryContainer};color:${c.onPrimaryContainer};
         font:500 12.5px/1.45 ui-monospace,Menlo,monospace;word-break:break-all;max-height:64px;overflow:auto}
    .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .sp{flex:1}
    button{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 18px;
           border-radius:20px;font:600 14px/1 inherit;color:${c.onSecondaryContainer};background:${c.secondaryContainer};
           transition:border-radius .25s cubic-bezier(.34,1.56,.64,1),transform .2s,filter .15s}
    button:hover{filter:brightness(.96)}
    button:active{border-radius:12px;transform:scale(.96)}
    button.pri{background:${c.primary};color:${c.onPrimary};height:44px;padding:0 24px}
    button.txt{background:transparent;color:${c.primary}}
    button[disabled]{opacity:.38;pointer-events:none}
    .seg{display:none;gap:2px}
    .seg.on{display:flex}
    .seg button{border-radius:8px;padding:0 14px;height:36px;font-weight:500}
    .seg button:first-child{border-radius:18px 8px 8px 18px}
    .seg button:last-child{border-radius:8px 18px 18px 8px}
    .seg button.sel-on{background:${c.primary};color:${c.onPrimary}}
    .hint{font:400 12px/1.3 inherit;color:${c.onSurfaceVariant};margin:10px 8px 0}
    .done{display:none;font:700 16px/1 inherit;padding:14px 8px;color:${c.primary}}
  </style>
  <div class="hl"><div class="tag"></div></div>
  <div class="bar">
    <div class="title"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg><span>Chọn phần tử cần ẩn</span></div>
    <div class="main">
      <div class="sel">Di chuột lên trang rồi bấm vào phần tử…</div>
      <div class="row">
        <button class="up" disabled>↑ Rộng hơn</button>
        <button class="down" disabled>↓ Hẹp hơn</button>
        <div class="seg"><button class="one sel-on">Chỉ phần tử này</button><button class="many">Tất cả tương tự</button></div>
        <span class="sp"></span>
        <button class="txt cancel">Hủy</button>
        <button class="pri ok" disabled>Ẩn</button>
      </div>
      <div class="hint">Phím tắt: ↑ ↓ đổi phạm vi · Enter xác nhận · Esc hủy</div>
    </div>
    <div class="done">Đã ẩn phần tử ✓</div>
  </div>`;
  document.documentElement.appendChild(host);

  const $ = (s) => root.querySelector(s);
  const hl = $('.hl');
  const tag = $('.tag');
  const selBox = $('.sel');
  const btn = { up: $('.up'), down: $('.down'), ok: $('.ok'), cancel: $('.cancel'), one: $('.one'), many: $('.many') };
  const seg = $('.seg');

  let target = null;
  let locked = false;
  let childStack = [];
  let useLoose = false;
  let specific = '';
  let loose = '';
  let looseCount = 0;

  const currentSelector = () => (useLoose && loose ? loose : specific);

  function refresh() {
    if (!target) return;
    const r = target.getBoundingClientRect();
    hl.style.display = 'block';
    hl.style.top = r.top + 'px';
    hl.style.left = r.left + 'px';
    hl.style.width = r.width + 'px';
    hl.style.height = r.height + 'px';
    tag.style.top = r.top < 40 ? 'auto' : '-34px';
    tag.style.bottom = r.top < 40 ? '-34px' : 'auto';
    tag.textContent = target.localName + (target.id ? '#' + target.id : '') + goodClasses(target).slice(0, 2).map((k) => '.' + k).join('');
    specific = specificSelector(target);
    loose = looseSelector(target);
    looseCount = loose ? count(loose) : 0;
    const showSeg = locked && loose && looseCount > 1 && looseCount <= 60;
    seg.classList.toggle('on', showSeg);
    if (!showSeg) useLoose = false;
    btn.many.textContent = `Tất cả tương tự (${looseCount})`;
    btn.one.classList.toggle('sel-on', !useLoose);
    btn.many.classList.toggle('sel-on', useLoose);
    selBox.textContent = currentSelector();
    btn.ok.disabled = !locked;
    btn.up.disabled = !locked || !target.parentElement || target.parentElement === document.documentElement;
    btn.down.disabled = !locked || !childStack.length;
  }

  const inUi = (e) => e.composedPath().includes(host);

  function onMove(e) {
    if (locked || inUi(e)) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el !== target && el !== document.documentElement && el !== document.body) {
      target = el;
      refresh();
    }
  }
  function swallow(e) {
    if (inUi(e)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }
  function onClick(e) {
    if (inUi(e)) return;
    swallow(e);
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el) {
      target = el;
      locked = true;
      childStack = [];
      useLoose = false;
      refresh();
    }
  }
  function onKey(e) {
    if (e.key === 'Escape') destroy();
    else if (e.key === 'Enter' && locked) confirm();
    else if (e.key === 'ArrowUp' && locked) goUp();
    else if (e.key === 'ArrowDown' && locked) goDown();
    else return;
    e.preventDefault();
    e.stopPropagation();
  }
  function goUp() {
    const p = target?.parentElement;
    if (p && p !== document.documentElement) {
      childStack.push(target);
      target = p;
      refresh();
    }
  }
  function goDown() {
    const ch = childStack.pop();
    if (ch) {
      target = ch;
      refresh();
    }
  }

  async function confirm() {
    const selector = currentSelector();
    if (!selector) return;
    const style = document.createElement('style');
    style.textContent = `${selector}{display:none!important}`;
    document.documentElement.appendChild(style);
    const h = location.hostname.replace(/^www\./, '');
    await chrome.runtime.sendMessage({ type: 'add-filter', host: h, selector }).catch(() => {});
    window.__liteShieldReload?.();
    hl.style.display = 'none';
    $('.main').style.display = 'none';
    $('.title').style.display = 'none';
    $('.done').style.display = 'block';
    setTimeout(destroy, 900);
  }

  function destroy() {
    for (const [t, fn, o] of listeners) removeEventListener(t, fn, o);
    host.remove();
    delete window.__liteShieldPicker;
  }

  btn.up.onclick = goUp;
  btn.down.onclick = goDown;
  btn.ok.onclick = confirm;
  btn.cancel.onclick = destroy;
  btn.one.onclick = () => ((useLoose = false), refresh());
  btn.many.onclick = () => ((useLoose = true), refresh());

  const listeners = [
    ['mousemove', onMove, true],
    ['click', onClick, true],
    ['mousedown', swallow, true],
    ['mouseup', swallow, true],
    ['pointerdown', swallow, true],
    ['keydown', onKey, true],
    ['scroll', () => refresh(), true],
    ['resize', () => refresh(), true],
  ];
  for (const [t, fn, o] of listeners) addEventListener(t, fn, o);

  window.__liteShieldPicker = { destroy };
})();
