/* Frame agent: runs in the page's MAIN world, but only inside frames created by the simulator overlay. It makes the page believe it runs on the chosen device
   and talks to the simulator through postMessage. */
(() => {
  'use strict';
  if (window === window.top) return;

  const TAG = '__rt';
  let cfg = null;
  let remoteScroll = false;
  // Only frames created by the simulator carry this marker (with a per-session token).
  try { if (window.name.indexOf('__rt:') === 0) cfg = JSON.parse(window.name.slice(5)); } catch (e) {}
  if (!cfg || !cfg.tok) return;

  const post = (msg) => { try { msg[TAG] = 1; window.parent.postMessage(msg, '*'); } catch (e) {} };
  const origDesc = new Map(), wanted = new Set();
  const def = (o, p, v) => {
    const key = (o === window ? 'w:' : o === Navigator.prototype ? 'n:' : 's:') + p;
    wanted.add(key);
    if (!origDesc.has(key)) origDesc.set(key, [o, p, Object.getOwnPropertyDescriptor(o, p)]);
    try { Object.defineProperty(o, p, { configurable: true, enumerable: true, get: typeof v === 'function' ? v : () => v }); } catch (e) {}
  };
  // Put back the browser's own values for everything the current config no longer overrides.
  function restoreUnwanted() {
    origDesc.forEach(([o, p, d], key) => {
      if (wanted.has(key)) return;
      try { if (d) Object.defineProperty(o, p, d); else delete o[p]; } catch (e) {}
      origDesc.delete(key);
    });
  }
  const whenRoot = (fn) => {
    if (document.documentElement) return fn();
    const mo = new MutationObserver(() => { if (document.documentElement) { mo.disconnect(); fn(); } });
    mo.observe(document, { childList: true });
  };

  /* ---------- device overrides ---------- */
  let styleEl = null;
  const origMM = window.matchMedia.bind(window);
  const realUAD = navigator.userAgentData;

  function rewriteMQ(q) {
    return String(q)
      .replace(/\((any-)?pointer\s*:\s*coarse\)/gi, '(min-width:0px)')
      .replace(/\((any-)?pointer\s*:\s*fine\)/gi, '(max-width:-1px)')
      .replace(/\((any-)?hover\s*:\s*none\)/gi, '(min-width:0px)')
      .replace(/\((any-)?hover\s*:\s*hover\)/gi, '(max-width:-1px)');
  }

  const mqOrig = new WeakMap();
  function walkRules(rules, fn) {
    for (const r of Array.from(rules)) { if (r.media) fn(r); if (r.cssRules && r.cssRules.length) walkRules(r.cssRules, fn); }
  }
  function rewriteCssMedia(on) {
    if (document.readyState === 'loading') return;
    for (const sh of Array.from(document.styleSheets)) {
      let rules; try { rules = sh.cssRules; } catch (e) { continue; }
      walkRules(rules, (r) => {
        try {
          const cur = r.media.mediaText;
          if (on) { if (/(hover|pointer)\s*:/i.test(cur) && !mqOrig.has(r)) { mqOrig.set(r, cur); r.media.mediaText = rewriteMQ(cur); } }
          else if (mqOrig.has(r)) { r.media.mediaText = mqOrig.get(r); mqOrig.delete(r); }
        } catch (e) {}
      });
    }
  }

  function apply(c) {
    cfg = c; wanted.clear();
    const N = Navigator.prototype;
    if (c.ua) {
      def(N, 'userAgent', c.ua);
      def(N, 'appVersion', c.ua.replace(/^Mozilla\//, ''));
      def(N, 'platform', c.platform || 'Linux armv81');
      def(N, 'vendor', c.vendor || 'Google Inc.');
      if (c.os === 'ios') def(N, 'userAgentData', () => undefined);
      else if (realUAD) {
        const fake = {
          brands: realUAD.brands, mobile: !!c.mobile, platform: c.uaPlatform || realUAD.platform,
          toJSON() { return { brands: this.brands, mobile: this.mobile, platform: this.platform }; },
          getHighEntropyValues: (h) => realUAD.getHighEntropyValues(h).then((v) => Object.assign({}, v, { mobile: !!c.mobile, platform: c.uaPlatform || v.platform }))
        };
        def(N, 'userAgentData', () => fake);
      }
    }
    if (c.dpr) def(window, 'devicePixelRatio', c.dpr);
    if (c.sw && c.sh) {
      const S = Screen.prototype;
      def(S, 'width', c.sw); def(S, 'availWidth', c.sw);
      def(S, 'height', c.sh); def(S, 'availHeight', c.sh);
    }
    if (c.touch) {
      def(N, 'maxTouchPoints', 5);
      try { if (!('ontouchstart' in window)) window.ontouchstart = null; } catch (e) {}
      try { if (!('ontouchstart' in document)) document.ontouchstart = null; } catch (e) {}
      window.matchMedia = (q) => origMM(rewriteMQ(q));
    } else {
      window.matchMedia = origMM;
    }
    rewriteCssMedia(!!c.touch);
    restoreUnwanted();
    whenRoot(() => {
      if (!styleEl) { styleEl = document.createElement('style'); styleEl.setAttribute('data-rt', ''); (document.head || document.documentElement).appendChild(styleEl); }
      try { document.documentElement.style.setProperty('scrollbar-width', c.hideScroll ? 'none' : '', 'important'); } catch (e) {}
      styleEl.textContent = c.hideScroll ? '*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}' : '';
    });
  }
  if (cfg) apply(cfg);

  /* ---------- touch emulation (mouse drag -> scroll + touch events) ---------- */
  let drag = null, raf = 0, inertia = 0;
  function scrollerFor(el, dx, dy) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const oy = /(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1;
      const ox = /(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1;
      if ((oy && dy) || (ox && dx)) return n;
    }
    return document.scrollingElement || document.documentElement;
  }
  function fireTouch(type, e, target) {
    try {
      const t = new Touch({ identifier: 1, target, clientX: e.clientX, clientY: e.clientY, pageX: e.pageX, pageY: e.pageY, screenX: e.screenX, screenY: e.screenY, radiusX: 11, radiusY: 11, force: 0.5 });
      const end = type === 'touchend';
      target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true, view: window, touches: end ? [] : [t], targetTouches: end ? [] : [t], changedTouches: [t] }));
    } catch (err) {}
  }
  function fireTouches(type, e, target, d) {
    try {
      const mk = (id, x) => new Touch({ identifier: id, target, clientX: x, clientY: e.clientY, pageX: x + pageXOffset, pageY: e.clientY + pageYOffset, screenX: x, screenY: e.clientY, radiusX: 11, radiusY: 11, force: 0.5 });
      const cx = drag && drag.pinch ? drag.pinch.cx : e.clientX;
      const list = [mk(1, cx - d), mk(2, cx + d)], end = type === 'touchend';
      target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true, view: window, touches: end ? [] : list, targetTouches: end ? [] : list, changedTouches: list }));
    } catch (err) {}
  }
  addEventListener('mousedown', (e) => {
    if (!cfg || !cfg.touch || e.button !== 0) return;
    cancelAnimationFrame(inertia);
    drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), vx: 0, vy: 0, moved: false, target: e.target, scroller: null, pinch: e.shiftKey ? { cx: e.clientX } : null, long: false };
    if (drag.pinch) { e.preventDefault(); fireTouches('touchstart', e, e.target, 40); return; }
    fireTouch('touchstart', e, e.target);
    const d0 = drag;
    d0.timer = setTimeout(() => {
      if (drag === d0 && !d0.moved) {
        d0.long = true;
        try { d0.target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, composed: true, clientX: d0.x, clientY: d0.y, button: 2 })); } catch (err) {}
      }
    }, 550);
  }, true);
  addEventListener('mousemove', (e) => {
    if (!drag) return;
    if (!(e.buttons & 1)) { drag = null; return; }
    if (drag.pinch) { e.preventDefault(); drag.moved = true; fireTouches('touchmove', e, drag.target, 40 + Math.hypot(e.clientX - drag.x, e.clientY - drag.y)); return; }
    const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    drag.moved = true;
    e.preventDefault();
    if (!drag.scroller) drag.scroller = scrollerFor(drag.target, dx, dy);
    drag.scroller.scrollBy(-dx, -dy);
    const now = performance.now(), dt = Math.max(1, now - drag.t);
    drag.vx = dx / dt; drag.vy = dy / dt; drag.t = now; drag.lx = e.clientX; drag.ly = e.clientY;
    fireTouch('touchmove', e, drag.target);
  }, true);
  addEventListener('mouseup', (e) => {
    if (!drag) return;
    const d = drag; drag = null; clearTimeout(d.timer);
    if (d.pinch) { fireTouches('touchend', e, d.target, 40 + Math.hypot(e.clientX - d.x, e.clientY - d.y)); return; }
    fireTouch('touchend', e, d.target);
    if (d.long) { const stopL = (ev) => { ev.stopPropagation(); ev.preventDefault(); removeEventListener('click', stopL, true); }; addEventListener('click', stopL, true); setTimeout(() => removeEventListener('click', stopL, true), 0); return; }
    if (d.moved && d.scroller && performance.now() - d.t < 80) {
      let vx = d.vx * 16, vy = d.vy * 16;
      const step = () => {
        vx *= 0.94; vy *= 0.94;
        if (Math.abs(vx) < 0.3 && Math.abs(vy) < 0.3) return;
        d.scroller.scrollBy(-vx, -vy);
        inertia = requestAnimationFrame(step);
      };
      inertia = requestAnimationFrame(step);
    }
    if (d.moved) {
      const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); removeEventListener('click', stop, true); };
      addEventListener('click', stop, true);
      setTimeout(() => removeEventListener('click', stop, true), 0);
    }
  }, true);
  addEventListener('dragstart', (e) => { if (cfg && cfg.touch) e.preventDefault(); }, true);

  /* ---------- page colour -> status bar colour ---------- */
  function sendTheme() {
    try {
      let bg = '';
      const m = document.querySelector('meta[name="theme-color"]');
      if (m && m.content) bg = m.content;
      else for (const el of [document.body, document.documentElement]) {
        if (!el) continue;
        const c = getComputedStyle(el).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') { bg = c; break; }
      }
      let bgb = '';
      for (const el of [document.body, document.documentElement]) {
        if (!el) continue;
        const c = getComputedStyle(el).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') { bgb = c; break; }
      }
      post({ type: 'theme', bg: bg || bgb || '#ffffff', bgb: bgb || '#ffffff' });
    } catch (e) {}
  }

  /* ---------- <meta name="viewport"> ---------- */
  let lastVp = '__none__', vpTimer = 0;
  function sendViewport() {
    try {
      const m = document.querySelector('meta[name="viewport" i]');
      const v = m ? (m.getAttribute('content') || '') : null;
      const key = v === null ? '__null__' : v;
      if (key === lastVp) return; lastVp = key;
      post({ type: 'viewport', content: v });
    } catch (e) {}
  }
  const vpSoon = () => { clearTimeout(vpTimer); vpTimer = setTimeout(sendViewport, 60); };
  try { new MutationObserver(vpSoon).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['content', 'name'] }); } catch (e) {}

  /* ---------- messaging ---------- */
  function ratio() {
    const el = document.scrollingElement || document.documentElement;
    const max = el.scrollHeight - el.clientHeight;
    return max > 0 ? el.scrollTop / max : 0;
  }
  addEventListener('scroll', () => {
    if (remoteScroll || raf) return;
    raf = requestAnimationFrame(() => { raf = 0; post({ type: 'scroll', ry: ratio() }); });
  }, { passive: true, capture: true });

  let navTimer = 0;
  function sendNav() {
    clearTimeout(navTimer);
    navTimer = setTimeout(() => post({ type: 'nav', href: location.href, title: document.title || '' }), 30);
  }
  ['pushState', 'replaceState'].forEach((k) => {
    const o = history[k];
    history[k] = function () { const r = o.apply(this, arguments); sendNav(); return r; };
  });
  addEventListener('popstate', sendNav);
  addEventListener('hashchange', sendNav);
  addEventListener('DOMContentLoaded', () => { sendNav(); sendTheme(); sendViewport(); if (cfg && cfg.touch) rewriteCssMedia(true); });
  addEventListener('load', () => { sendNav(); sendTheme(); sendViewport(); setTimeout(sendTheme, 900); setTimeout(sendTheme, 2500); setTimeout(() => cfg && cfg.touch && rewriteCssMedia(true), 600); });

  addEventListener('message', (e) => {
    const d = e.data;
    if (e.source !== window.parent || !d || d[TAG] !== 1 || d.tok !== cfg.tok) return;
    switch (d.type) {
      case 'config': apply(d.cfg); break;
      case 'scrollTo': {
        const el = document.scrollingElement || document.documentElement;
        remoteScroll = true;
        el.scrollTop = d.ry * Math.max(0, el.scrollHeight - el.clientHeight);
        setTimeout(() => { remoteScroll = false; }, 80);
        break;
      }
      case 'measure': post({ type: 'size', key: d.key, h: Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0), w: document.documentElement.scrollWidth }); break;
      case 'back': history.back(); break;
      case 'forward': history.forward(); break;
      case 'reload': location.reload(); break;
    }
  });

  post({ type: 'hello', href: location.href });
})();
