(() => {
  'use strict';
  const { DEFAULTS, t, resolveLang } = globalThis.DLA;

  /* ------------------------------------------------------------------ *
   * Settings
   * ------------------------------------------------------------------ */
  let settings = { ...DEFAULTS };
  const loadSettings = () => {
    try {
      chrome.storage.sync.get(DEFAULTS).then((s) => { settings = s; }).catch(() => {});
    } catch { /* extension context invalidated */ }
  };
  loadSettings();
  try { chrome.storage.onChanged.addListener(loadSettings); } catch { /* ignore */ }

  const lang = () => resolveLang(settings.language, document.documentElement.lang || navigator.language);
  const tr = (key, vars) => t(lang(), key, vars);
  // Debug: run localStorage.setItem('dlaDebug','1') in the Discord tab's console, then reload.
  const dbg = (...a) => { try { if (localStorage.getItem('dlaDebug')) console.log('[DLA]', ...a); } catch { /* ignore */ } };

  /* ------------------------------------------------------------------ *
   * Icons (Lucide paths)
   * ------------------------------------------------------------------ */
  const ICONS = {
    images: '<path d="M18 22H4a2 2 0 0 1-2-2V6"/><path d="m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18"/><circle cx="12" cy="8" r="2"/><rect width="16" height="16" x="6" y="2" rx="2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    ok: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
  };
  const svg = (name, size = 18) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

  /* ------------------------------------------------------------------ *
   * Track which message the context menu belongs to
   * ------------------------------------------------------------------ */
  const MSG_SEL = 'li[id^="chat-messages-"]';
  let lastMsg = null;
  const track = (e) => {
    const el = e.target instanceof Element ? e.target.closest(MSG_SEL) : null;
    if (el) lastMsg = el;
  };
  document.addEventListener('contextmenu', track, true);
  document.addEventListener('mousedown', track, true);

  /* ------------------------------------------------------------------ *
   * Collect images of a message
   * ------------------------------------------------------------------ */
  const IMG_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|tiff?)$/i;
  const DISCORD_HOST = /(^|\.)discord(app)?\.(com|net)$/i;
  const SKIP_SEL = [
    '[class*="embedAuthor"]', '[class*="embedFooter"]', '[class*="embedProvider"]',
    '[class*="repliedMessage"]', '[class*="reaction"]', '[class*="sticker"]',
    '[class*="emoji"]', '[class*="avatar"]', '[class*="Avatar"]'
  ].join(',');

  const isDiscordMedia = (u) =>
    DISCORD_HOST.test(u.hostname) && /^\/(attachments|external)\//.test(u.pathname);

  /** Strip Discord's resize/convert params so we get the original file. */
  function toOriginal(href) {
    try {
      const u = new URL(href, location.href);
      ['width', 'height', 'format', 'quality', 'animated'].forEach((k) => u.searchParams.delete(k));
      return u.href;
    } catch { return null; }
  }

  // Only ancestors *inside* the root count, so classes on Discord's outer wrappers can't hide images.
  const skippedWithin = (el, root) => {
    for (let n = el; n && n !== root; n = n.parentElement) if (n.matches(SKIP_SEL)) return true;
    return false;
  };

  function scan(root) {
    const out = [];
    const seen = new Set();
    for (const img of root.querySelectorAll('img')) {
      if (skippedWithin(img, root)) continue;
      const isEmbed = !!img.closest('[class*="embedWrapper"], [class*="embedFull"]');
      if (isEmbed && !settings.includeEmbeds) continue;

      // Prefer the original link wrapped around the thumbnail.
      let href = null;
      const a = img.closest('a[href]');
      if (a) {
        try {
          const au = new URL(a.href);
          if (isDiscordMedia(au) || IMG_EXT.test(au.pathname)) href = a.href;
        } catch { /* ignore */ }
      }
      if (!href) href = img.currentSrc || img.src;

      let u;
      try { u = new URL(href); } catch { continue; }
      if (!/^https?:$/.test(u.protocol)) continue;
      if (DISCORD_HOST.test(u.hostname) && !isDiscordMedia(u)) continue;

      const orig = toOriginal(u.href);
      if (!orig) continue;
      const key = orig.split('?')[0];
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(orig);
    }
    return out;
  }

  function collectImages(msg) {
    const acc = msg.querySelector('[id^="message-accessories-"]');
    let out = acc ? scan(acc) : [];
    if (!out.length) out = scan(msg); // fallback if Discord renames the accessories container
    dbg('collectImages', { hasAccessories: !!acc, count: out.length, out });
    return out;
  }

  function getMeta(msg) {
    const idMatch = /chat-messages-(?:\d+-)?(\d+)$/.exec(msg.id);
    const timeEl = msg.querySelector('time[datetime]');
    let user = '';
    let cur = msg;
    for (let i = 0; cur && i < 200; i++, cur = cur.previousElementSibling) {
      const n = cur.querySelector && cur.querySelector('[id^="message-username-"]');
      if (n) { user = n.textContent.trim(); break; }
    }
    return {
      user: user || 'discord',
      messageId: idMatch ? idMatch[1] : '',
      timestamp: timeEl ? Date.parse(timeEl.getAttribute('datetime')) || Date.now() : Date.now()
    };
  }

  /* ------------------------------------------------------------------ *
   * Context menu integration
   * ------------------------------------------------------------------ */
  const lastTry = new WeakMap();
  const observer = new MutationObserver((mutations) => {
    const menus = new Set();
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (!(n instanceof Element)) continue;
        const own = n.closest('[role="menu"]');
        if (own) menus.add(own);
        n.querySelectorAll('[role="menu"]').forEach((x) => menus.add(x));
      }
    }
    menus.forEach(schedule);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  /** The menu may render its items a moment after it's attached: retry a few times (enhance is idempotent). */
  function schedule(menu) {
    const now = Date.now();
    if (now - (lastTry.get(menu) || 0) < 400) return;
    lastTry.set(menu, now);
    [0, 16, 60, 150, 300].forEach((ms) => setTimeout(() => enhance(menu), ms));
  }

  function enhance(menu) {
    if (!menu.isConnected || menu.querySelector('[data-dla]')) return;
    const isMessageMenu = menu.id === 'message-actions' || !!menu.querySelector('[id^="message-actions"]');
    if (!isMessageMenu) return;
    const msg = lastMsg;
    if (!msg || !msg.isConnected) { dbg('no tracked message'); return; }

    const count = collectImages(msg).length;
    if (!count) return;

    const template =
      menu.querySelector('[id$="copy-link"]') ||
      menu.querySelector('[role="menuitem"]:not([class*="danger"]):not([class*="Danger"])');
    if (!template) { dbg('no template item', menu); return; }

    const item = buildItem(template, count, () => {
      closeMenu(menu);
      startDownload(msg);
    });
    template.insertAdjacentElement('afterend', item);
    dbg('menu item injected', count);
    keepInViewport(menu);
  }

  function buildItem(template, count, onClick) {
    const el = template.cloneNode(true);
    const stripState = (n) => {
      n.removeAttribute('id');
      if (typeof n.className === 'string') {
        n.className = n.className.split(/\s+/).filter((c) => c && !/focused|selected|hover/i.test(c)).join(' ');
      }
    };
    stripState(el);
    el.querySelectorAll('*').forEach(stripState);
    el.classList.add('dla-item');
    el.dataset.dla = '1';
    el.setAttribute('role', 'menuitem');
    el.setAttribute('tabindex', '-1');

    // Label: first leaf element that carries text.
    const leaf = [...el.querySelectorAll('div,span')].find((n) => !n.children.length && n.textContent.trim());
    const label = leaf || el;
    label.textContent = tr('menuAll', { n: count });
    if (count > 1) {
      const badge = document.createElement('span');
      badge.className = 'dla-badge';
      badge.textContent = String(count);
      label.appendChild(badge);
    }

    // Icon: swap Discord's svg for ours, keeping its classes and size.
    const tmp = document.createElement('div');
    tmp.innerHTML = svg('images');
    const icon = tmp.firstElementChild;
    icon.setAttribute('style', 'fill:none;stroke:currentColor');
    const old = el.querySelector('svg');
    if (old) {
      icon.setAttribute('class', old.getAttribute('class') || '');
      icon.setAttribute('width', old.getAttribute('width') || '18');
      icon.setAttribute('height', old.getAttribute('height') || '18');
      old.replaceWith(icon);
    } else {
      el.appendChild(icon);
    }

    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return el;
  }

  /**
   * Close the menu with a synthetic "click outside". Do NOT send Escape: Discord binds Esc to
   * "mark channel as read" which also jumps the chat to the newest message.
   */
  function closeMenu(menu) {
    const fire = (type) => document.body.dispatchEvent(
      new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 })
    );
    fire('mousedown');
    fire('mouseup');
    fire('click');
    setTimeout(() => { if (menu.isConnected) menu.style.display = 'none'; }, 120);
  }

  /** The extra row makes the menu taller; nudge it up if it now overflows the window. */
  function keepInViewport(menu) {
    requestAnimationFrame(() => {
      const r = menu.getBoundingClientRect();
      const over = r.bottom - (window.innerHeight - 8);
      if (over <= 0) return;
      for (let el = menu; el && el !== document.body; el = el.parentElement) {
        const pos = getComputedStyle(el).position;
        if ((pos === 'absolute' || pos === 'fixed') && el.style.top) {
          el.style.top = Math.max(8, parseFloat(el.style.top) - over) + 'px';
          return;
        }
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Download flow
   * ------------------------------------------------------------------ */
  async function startDownload(msg) {
    const urls = collectImages(msg);
    if (!urls.length) { toast.show({ icon: 'info', title: tr('toastNoImages'), autoHide: 4000 }); return; }
    const meta = getMeta(msg);

    if (settings.showToast) {
      toast.show({
        icon: 'download',
        title: tr('toastProgressTitle', { n: urls.length }),
        sub: tr('toastProgressSub', { done: 0, total: urls.length }),
        progress: 0
      });
    }
    try {
      const res = await chrome.runtime.sendMessage({ type: 'dla:download', meta, urls });
      if (!settings.showToast) return;
      showResult(res);
    } catch {
      toast.show({ icon: 'warn', tone: 'err', title: tr('toastReload'), autoHide: 8000 });
    }
  }

  function showResult(res) {
    if (!res) return;
    const action = res.firstId != null && res.done > 0
      ? { label: tr('toastShow'), run: () => chrome.runtime.sendMessage({ type: 'dla:show', id: res.firstId }).catch(() => {}) }
      : null;
    if (res.failed === 0) {
      toast.show({
        icon: 'ok', tone: 'ok',
        title: tr('toastDoneTitle', { n: res.done }),
        sub: res.folder ? tr('toastDoneSub', { folder: res.folder }) : tr('toastDoneSubRoot'),
        action, autoHide: 6000
      });
    } else if (res.done > 0) {
      toast.show({
        icon: 'warn', tone: 'warn',
        title: tr('toastPartialTitle', { done: res.done, total: res.total }),
        sub: tr('toastPartialSub', { failed: res.failed }),
        action, autoHide: 8000
      });
    } else {
      toast.show({ icon: 'warn', tone: 'err', title: tr('toastErrorTitle'), sub: tr('toastErrorSub'), autoHide: 8000 });
    }
  }

  try {
    chrome.runtime.onMessage.addListener((m) => {
      if (m && m.type === 'dla:progress' && settings.showToast) toast.progress(m.done, m.total);
    });
  } catch { /* ignore */ }

  /* ------------------------------------------------------------------ *
   * Fluent toast (Shadow DOM so Discord's CSS can't touch it)
   * ------------------------------------------------------------------ */
  const TOAST_CSS = `
    :host { all: initial; }
    .card {
      --bg: rgba(44,44,44,.84); --fg: #fff; --fg2: rgba(255,255,255,.72);
      --stroke: rgba(255,255,255,.09); --hover: rgba(255,255,255,.08); --btn: rgba(255,255,255,.07);
      --accent: #60cdff; --ok: #6ccb5f; --warn: #fce100; --err: #ff99a4; --track: rgba(255,255,255,.12);
      box-sizing: border-box; position: relative; overflow: hidden;
      width: 348px; padding: 14px 12px 18px 16px;
      display: grid; grid-template-columns: 32px 1fr 28px; column-gap: 12px; row-gap: 2px; align-items: start;
      font: 400 14px/20px "Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,Roboto,sans-serif;
      color: var(--fg); background: var(--bg);
      border: 1px solid var(--stroke); border-radius: 8px;
      box-shadow: 0 8px 16px rgba(0,0,0,.28), 0 0 2px rgba(0,0,0,.24);
      -webkit-backdrop-filter: blur(30px) saturate(150%); backdrop-filter: blur(30px) saturate(150%);
      animation: in 250ms cubic-bezier(0,0,0,1);
    }
    .card[data-theme="light"] {
      --bg: rgba(252,252,252,.88); --fg: #1a1a1a; --fg2: rgba(0,0,0,.62);
      --stroke: rgba(0,0,0,.08); --hover: rgba(0,0,0,.05); --btn: rgba(255,255,255,.7);
      --accent: #0067c0; --ok: #0f7b0f; --warn: #9d5d00; --err: #c42b1c; --track: rgba(0,0,0,.08);
      box-shadow: 0 8px 16px rgba(0,0,0,.14), 0 0 2px rgba(0,0,0,.12);
    }
    .card.out { animation: out 167ms cubic-bezier(1,0,1,1) forwards; }
    .card[hidden] { display: none; }
    .ico {
      grid-row: 1 / span 3; width: 32px; height: 32px; border-radius: 16px;
      display: grid; place-items: center; color: var(--tone, var(--accent));
      background: color-mix(in srgb, var(--tone, var(--accent)) 16%, transparent);
    }
    .card[data-tone="ok"] { --tone: var(--ok); }
    .card[data-tone="warn"] { --tone: var(--warn); }
    .card[data-tone="err"] { --tone: var(--err); }
    .title { grid-column: 2; font-weight: 600; margin-top: 6px; }
    .card:not([data-sub]) .title { margin-top: 6px; margin-bottom: 6px; }
    .sub { grid-column: 2; color: var(--fg2); font-size: 12px; line-height: 16px; }
    .sub:empty { display: none; }
    .close {
      grid-column: 3; grid-row: 1; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 4px;
      background: transparent; color: var(--fg2); display: grid; place-items: center; cursor: pointer;
    }
    .close:hover { background: var(--hover); color: var(--fg); }
    .close:focus-visible, .btn:focus-visible { outline: 2px solid var(--fg); outline-offset: 1px; }
    .btn {
      grid-column: 2; justify-self: start; margin-top: 8px; padding: 4px 12px; min-height: 28px;
      font: inherit; font-size: 12px; color: var(--fg); background: var(--btn);
      border: 1px solid var(--stroke); border-bottom-color: color-mix(in srgb, var(--stroke) 60%, #000);
      border-radius: 4px; cursor: pointer;
    }
    .btn:hover { background: var(--hover); }
    .btn[hidden] { display: none; }
    .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--track); }
    .bar[hidden] { display: none; }
    .fill { height: 100%; width: 0; background: var(--accent); border-radius: 0 2px 2px 0; transition: width 200ms cubic-bezier(0,0,0,1); }
    @keyframes in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
    @keyframes out { to { opacity: 0; transform: translateY(8px); } }
    @media (prefers-reduced-motion: reduce) { .card, .card.out { animation: none; } .fill { transition: none; } }
  `;

  const toast = (() => {
    let host, card, els, timer, actionRun;

    function ensure() {
      if (host && host.isConnected) return;
      host = document.createElement('div');
      host.style.cssText = 'all:initial;position:fixed;right:24px;bottom:24px;z-index:2147483647;';
      const root = host.attachShadow({ mode: 'closed' });
      root.innerHTML = `
        <style>${TOAST_CSS}</style>
        <div class="card" role="status" aria-live="polite" hidden>
          <div class="ico"></div>
          <div class="title"></div>
          <button class="close" type="button">${svg('x', 16)}</button>
          <div class="sub"></div>
          <button class="btn" type="button" hidden></button>
          <div class="bar" hidden><div class="fill"></div></div>
        </div>`;
      card = root.querySelector('.card');
      els = {
        ico: root.querySelector('.ico'), title: root.querySelector('.title'), sub: root.querySelector('.sub'),
        close: root.querySelector('.close'), btn: root.querySelector('.btn'),
        bar: root.querySelector('.bar'), fill: root.querySelector('.fill')
      };
      els.close.addEventListener('click', hide);
      els.btn.addEventListener('click', () => { if (actionRun) actionRun(); hide(); });
      card.addEventListener('mouseenter', () => clearTimeout(timer));
      card.addEventListener('mouseleave', () => { if (card.dataset.autoHide) schedule(+card.dataset.autoHide); });
      document.documentElement.appendChild(host);
    }

    const isDark = () =>
      settings.theme === 'dark' ||
      (settings.theme === 'system' && !document.documentElement.classList.contains('theme-light'));

    function schedule(ms) { clearTimeout(timer); timer = setTimeout(hide, ms); }

    function hide() {
      if (!card || card.hidden) return;
      clearTimeout(timer);
      card.classList.add('out');
      setTimeout(() => { card.hidden = true; card.classList.remove('out'); }, 170);
    }

    function show(o) {
      ensure();
      clearTimeout(timer);
      card.classList.remove('out');
      card.hidden = false;
      card.dataset.theme = isDark() ? 'dark' : 'light';
      card.dataset.tone = o.tone || '';
      if (o.sub) card.dataset.sub = '1'; else delete card.dataset.sub;
      els.ico.innerHTML = svg(o.icon || 'info', 18);
      els.title.textContent = o.title || '';
      els.sub.textContent = o.sub || '';
      els.close.setAttribute('aria-label', tr('toastClose'));
      actionRun = o.action ? o.action.run : null;
      els.btn.hidden = !o.action;
      if (o.action) els.btn.textContent = o.action.label;
      els.bar.hidden = o.progress == null;
      els.fill.style.width = (o.progress || 0) + '%';
      if (o.autoHide) { card.dataset.autoHide = o.autoHide; schedule(o.autoHide); }
      else delete card.dataset.autoHide;
    }

    function progress(done, total) {
      if (!card || card.hidden || els.bar.hidden) return;
      els.sub.textContent = tr('toastProgressSub', { done, total });
      els.fill.style.width = Math.round((done / total) * 100) + '%';
    }

    return { show, progress, hide };
  })();
})();
