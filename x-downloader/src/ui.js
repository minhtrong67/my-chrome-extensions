// Thành phần giao diện dùng chung: toast, tooltip, menu, hộp thoại xác nhận (kiểu Fluent).
// getCtx() -> { dark: boolean }
(() => {
  const X = globalThis.XD;
  const host = () => document.body || document.documentElement;
  const theme = (el, c) => { el.dataset.theme = c.dark ? 'dark' : 'light'; };

  // ---------- toast (info / success / warning / error) ----------
  const TOAST_ICON = { info: 'info', success: 'circle-check', warning: 'triangle-alert', error: 'circle-alert' };
  function createToaster(getCtx) {
    let el, timer;
    return function show(msg, variant = 'info', ms) {
      const h = host();
      if (!h) return;
      if (!el || !el.isConnected) { el = document.createElement('div'); el.className = 'xd-toast'; h.append(el); }
      theme(el, getCtx());
      el.dataset.variant = variant;
      el.setAttribute('role', variant === 'error' || variant === 'warning' ? 'alert' : 'status');
      const ico = document.createElement('span'); ico.className = 'xd-ico';
      ico.innerHTML = X.icon(TOAST_ICON[variant] || 'info');
      const tx = document.createElement('span'); tx.textContent = msg;
      el.replaceChildren(ico, tx);
      requestAnimationFrame(() => el.classList.add('show'));
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('show'), ms || (variant === 'error' || variant === 'warning' ? 5000 : 3000));
    };
  }

  // ---------- tooltip: gắn thuộc tính data-xd-tip ----------
  function initTooltips(getCtx) {
    const SEL = '[data-xd-tip]';
    let tip, timer, cur;
    const hide = () => { clearTimeout(timer); cur = null; if (tip) tip.classList.remove('show'); };
    const show = (el) => {
      const text = el.getAttribute('data-xd-tip');
      if (!text || !el.isConnected) return;
      if (!tip || !tip.isConnected) {
        tip = document.createElement('div'); tip.className = 'xd-tip'; tip.setAttribute('role', 'tooltip');
        host().append(tip);
      }
      cur = el;
      theme(tip, getCtx());
      tip.textContent = text;
      tip.classList.remove('show');
      tip.style.left = '0px'; tip.style.top = '0px';
      const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      const x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
      let y = r.top - h - 8, below = false;
      if (y < 8) { y = r.bottom + 8; below = true; }
      tip.dataset.pos = below ? 'below' : 'above';
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
      requestAnimationFrame(() => { if (cur === el) tip.classList.add('show'); });
    };
    const target = (e) => (e.target && e.target.closest ? e.target.closest(SEL) : null);
    document.addEventListener('mouseover', (e) => {
      const el = target(e);
      if (!el || el === cur) return;
      clearTimeout(timer);
      timer = setTimeout(() => show(el), 350);
    }, true);
    document.addEventListener('mouseout', (e) => {
      const el = target(e);
      if (el && !el.contains(e.relatedTarget)) hide();
    }, true);
    document.addEventListener('focusin', (e) => {
      const el = target(e);
      if (el && el.matches(':focus-visible')) show(el);
    }, true);
    document.addEventListener('focusout', hide, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); }, true);
    document.addEventListener('pointerdown', hide, true);
    window.addEventListener('scroll', hide, { capture: true, passive: true });
    window.addEventListener('blur', hide);
  }

  // ---------- menu ----------
  function createMenu(getCtx) {
    let el = null;
    const close = () => {
      if (!el) return;
      el.remove(); el = null;
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onKey, true);
    };
    const onOutside = (e) => { if (el && !el.contains(e.target)) close(); };
    const onKey = (e) => {
      if (!el) return;
      const its = [...el.querySelectorAll('.xd-mi')];
      const i = its.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); its[(i + 1) % its.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); its[(i - 1 + its.length) % its.length].focus(); }
    };
    // rows: [{ label, sub?, thumb?, sep?, onPick }]
    function open(anchor, rows) {
      close();
      el = document.createElement('div');
      el.className = 'xd-menu';
      el.setAttribute('role', 'menu');
      theme(el, getCtx());
      rows.forEach((r, n) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'xd-mi'; b.setAttribute('role', 'menuitem');
        if (r.thumb) { const im = document.createElement('img'); im.src = r.thumb; im.alt = ''; im.referrerPolicy = 'no-referrer'; b.append(im); }
        else { const ic = document.createElement('span'); ic.className = 'xd-mi-ic'; ic.innerHTML = X.icon('download'); b.append(ic); }
        const tx = document.createElement('span'); tx.className = 'xd-mi-tx';
        const l1 = document.createElement('span'); l1.textContent = r.label; tx.append(l1);
        if (r.sub) { const l2 = document.createElement('small'); l2.textContent = r.sub; tx.append(l2); }
        b.append(tx);
        b.addEventListener('click', (e) => { e.stopPropagation(); close(); r.onPick(); });
        el.append(b);
        if (n === 0 && rows.length > 1) { const s = document.createElement('div'); s.className = 'xd-sep'; el.append(s); }
      });
      host().append(el);
      const rc = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
      const x = Math.min(innerWidth - w - 8, Math.max(8, rc.right - w));
      let y = rc.bottom + 6, up = false;
      if (y + h > innerHeight - 8) { y = rc.top - h - 6; up = true; }
      el.classList.toggle('up', up);
      el.style.left = x + 'px'; el.style.top = Math.max(8, y) + 'px';
      requestAnimationFrame(() => { if (el) { el.classList.add('show'); const f = el.querySelector('.xd-mi'); if (f) f.focus({ preventScroll: true }); } });
      document.addEventListener('pointerdown', onOutside, true);
      document.addEventListener('keydown', onKey, true);
    }
    return { open, close, isOpen: () => !!el };
  }

  // ---------- hộp thoại xác nhận: trả về Promise<boolean> ----------
  function confirmDialog(getCtx, { title, body, ok, cancel }) {
    return new Promise((resolve) => {
      const prev = document.activeElement;
      const scrim = document.createElement('div');
      scrim.className = 'xd-scrim';
      theme(scrim, getCtx());
      const dlg = document.createElement('div');
      dlg.className = 'xd-dialog';
      dlg.setAttribute('role', 'alertdialog'); dlg.setAttribute('aria-modal', 'true');
      dlg.setAttribute('aria-labelledby', 'xd-dlg-t'); dlg.setAttribute('aria-describedby', 'xd-dlg-b');
      dlg.innerHTML = '<div class="xd-dlg-body"><h2 id="xd-dlg-t"></h2><p id="xd-dlg-b"></p></div><div class="xd-dlg-actions"><button type="button" class="xd-dlg-btn primary"></button><button type="button" class="xd-dlg-btn"></button></div>';
      dlg.querySelector('h2').textContent = title;
      dlg.querySelector('p').textContent = body;
      const [bYes, bNo] = dlg.querySelectorAll('button');
      bYes.textContent = ok; bNo.textContent = cancel;
      const done = (v) => {
        document.removeEventListener('keydown', onKey, true);
        scrim.classList.remove('show');
        setTimeout(() => scrim.remove(), 200);
        if (prev && prev.focus) prev.focus();
        resolve(v);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); }
        else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === bNo ? bYes : bNo).focus(); }
      };
      bNo.addEventListener('click', () => done(false));
      bYes.addEventListener('click', () => done(true));
      scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) done(false); });
      scrim.append(dlg);
      host().append(scrim);
      document.addEventListener('keydown', onKey, true);
      requestAnimationFrame(() => { scrim.classList.add('show'); bYes.focus(); });
    });
  }

  Object.assign(X, { createToaster, initTooltips, createMenu, confirmDialog });
})();
