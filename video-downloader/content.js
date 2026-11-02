/* Floating download button on top of every <video> */
(async () => {
  let S = await getSettings();
  const T = (k, v) => tr(S.lang, k, v);
  const tracked = new Map();         // video -> { wrap, btn, panel, timer }
  const jobs = new Map();            // jobId -> tracked entry
  let host = null, root = null, styleEl = null;

  const CSS = `
  :host{all:initial}
  *{box-sizing:border-box;font-family:var(--font)}
  .wrap{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;will-change:transform;transition:opacity .25s}
  .wrap.hide{opacity:0;visibility:hidden}
  .fab{pointer-events:auto;position:absolute;top:0;display:flex;align-items:center;height:44px;min-width:44px;padding:0 11px;border:0;cursor:pointer;
    color:var(--on-primary-container);background:var(--primary-container);border-radius:22px;overflow:hidden;
    box-shadow:0 2px 10px rgb(0 0 0/.4),0 0 0 1px rgb(255 255 255/.14);font:600 var(--fs)/1 var(--font);
    transition:border-radius .4s cubic-bezier(.34,1.56,.64,1),transform .3s cubic-bezier(.34,1.56,.64,1),background .2s,color .2s,padding .3s}
  .l .fab{left:0}.r .fab{right:0}
  .fab svg{flex:none}
  .fab:hover,.fab:focus-visible{border-radius:14px;background:var(--primary);color:var(--on-primary);outline:none}
  .fab:active{transform:scale(.9);border-radius:12px}
  .panel{pointer-events:auto;position:absolute;top:54px;width:max-content;min-width:250px;max-width:340px;font-size:var(--fs);color:var(--on-surface);
    background:var(--surface-container-high);border-radius:26px;padding:8px;box-shadow:0 10px 30px rgb(0 0 0/.4);animation:pop .35s cubic-bezier(.34,1.56,.64,1)}
  .l .panel{left:0;transform-origin:top left}.r .panel{right:0;transform-origin:top right}
  @keyframes pop{from{opacity:0;transform:scale(.8) translateY(-8px)}}
  .head{padding:8px 12px 6px;font-size:.85em;font-weight:600;color:var(--primary)}
  .opt{display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border:0;background:transparent;border-radius:18px;cursor:pointer;color:inherit;text-align:left;font:inherit;transition:background .15s,border-radius .35s cubic-bezier(.34,1.56,.64,1)}
  .opt:hover{background:var(--secondary-container);border-radius:22px}
  .opt .ic{flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:var(--primary-container);color:var(--on-primary-container)}
  .opt .tx{min-width:0;flex:1}
  .opt .t{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .opt .s{font-size:.85em;color:var(--on-surface-variant);margin-top:2px}
  .toast{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:22px;min-width:220px}
  .toast.err{background:var(--error-container);color:var(--on-error-container)}
  .toast .tx{flex:1;line-height:1.35}
  .bar{height:5px;border-radius:3px;background:var(--outline-variant);overflow:hidden;margin-top:8px}
  .bar i{display:block;height:100%;width:0;background:var(--primary);border-radius:3px;transition:width .25s}
  @media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`;

  /* ---------- host / shadow root ---------- */
  function ensureHost() {
    if (host) return;
    host = document.createElement('div');
    host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
    root = host.attachShadow({ mode: 'open' });
    styleEl = document.createElement('style'); styleEl.textContent = CSS; root.appendChild(styleEl);
    applyTheme(host, S);
    (document.fullscreenElement || document.documentElement).appendChild(host);
  }
  document.addEventListener('fullscreenchange', () => {
    if (!host) return;
    const fs = document.fullscreenElement;
    (fs && fs.tagName !== 'VIDEO' ? fs : document.documentElement).appendChild(host);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => host && applyTheme(host, S));
  chrome.storage.onChanged.addListener(async () => {
    S = await getSettings();
    if (host) applyTheme(host, S);
    tracked.forEach(e => { e.wrap.className = 'wrap ' + (S.btnPos === 'left' ? 'l' : 'r'); e.btn.setAttribute('aria-label', T('download')); });
  });

  /* ---------- video discovery ---------- */
  const srcsOf = v => {
    const out = new Set(), add = u => { if (u && /^https?:/i.test(u)) out.add(u); };
    add(v.currentSrc); add(v.src); v.querySelectorAll('source').forEach(s => add(s.src));
    return [...out];
  };
  const report = v => {
    const urls = srcsOf(v);
    if (urls.length) try { chrome.runtime.sendMessage({ type: 'report', urls }).catch(() => {}); } catch {}
  };

  function captureThumb(v) {
    try {
      const w = 192, h = Math.max(1, Math.round(w * (v.videoHeight || 9) / (v.videoWidth || 16)));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(v, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.6);
    } catch { return v.poster && /^https?:/i.test(v.poster) ? v.poster : ''; }
  }
  function track(v) {
    ensureHost();
    const wrap = document.createElement('div');
    wrap.className = 'wrap hide ' + (S.btnPos === 'left' ? 'l' : 'r');
    const btn = document.createElement('button');
    btn.className = 'fab'; btn.type = 'button'; btn.setAttribute('aria-label', T('download'));
    btn.innerHTML = icon('download', 22, 2.2);
    wrap.appendChild(btn); root.appendChild(wrap);
    const entry = { wrap, btn, panel: null, timer: 0 };
    tracked.set(v, entry);
    ['pointerdown', 'mousedown', 'mouseup', 'dblclick', 'contextmenu'].forEach(ev => wrap.addEventListener(ev, e => e.stopPropagation()));
    btn.addEventListener('mouseenter', () => { entry.hover = true; });
    btn.addEventListener('mouseleave', () => { entry.hover = false; });
    btn.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); onClick(v, entry); });
    ['loadedmetadata', 'loadeddata', 'playing', 'emptied'].forEach(ev => v.addEventListener(ev, () => report(v)));
    v.addEventListener('playing', () => setTimeout(() => { const th = captureThumb(v); if (th) try { chrome.runtime.sendMessage({ type: 'thumb', thumb: th }).catch(() => {}); } catch {} }, 700));
    report(v);
  }
  function scan() { document.querySelectorAll('video').forEach(v => { if (!tracked.has(v)) track(v); }); }

  function update() {
    for (const [v, e] of tracked) {
      let r;
      if (v.isConnected) {
        r = v.getBoundingClientRect();
        const cs = getComputedStyle(v);
        e.vis = r.width >= 160 && r.height >= 90 && cs.visibility !== 'hidden' && cs.display !== 'none';
        e.rect = r; e.srcs = srcsOf(v); e.gone = 0;
      } else {                                   // site removed the preview video: keep the button briefly so it can still be clicked
        if (!e.gone) e.gone = Date.now();
        if (!e.hover && Date.now() - e.gone > 3000) { e.wrap.remove(); tracked.delete(v); continue; }
        r = e.rect;
      }
      const shown = S.btnShow === 'always' || e.hover || Date.now() - (e.lastHover || 0) < 2500;
      const ok = S.showButton && shown && r && e.vis && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
      e.wrap.classList.toggle('hide', !ok);
      if (!ok) { closePanel(e); continue; }
      const left = Math.max(r.left, 0), right = Math.min(r.right, innerWidth), top = Math.max(r.top, 0);
      const x = S.btnPos === 'left' ? left + 12 : right - 12;
      e.wrap.style.transform = `translate(${Math.round(x)}px,${Math.round(top + 12)}px)`;
    }
  }
  let mo = 0;
  new MutationObserver(() => { clearTimeout(mo); mo = setTimeout(() => { scan(); update(); }, 30); }).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('scroll', update, { passive: true, capture: true });
  addEventListener('resize', update, { passive: true });
  setInterval(update, 250);
  scan();
  // show the button the instant the pointer is over any video (also inside open shadow roots; feeds create the preview <video> on hover)
  const deepAt = (x, y) => {
    const out = [], walk = root => { for (const el of root.elementsFromPoint(x, y)) { out.push(el); if (el.shadowRoot) walk(el.shadowRoot); } };
    walk(document); return out;
  };
  let ptrRaf = 0;
  const onPointer = ev => {
    if (ptrRaf) return;
    const x = ev.clientX, y = ev.clientY;
    ptrRaf = requestAnimationFrame(() => {
      ptrRaf = 0;
      for (const el of deepAt(x, y)) {
        if (el.tagName !== 'VIDEO') continue;
        if (!tracked.has(el)) track(el);
        const e = tracked.get(el); if (e) e.lastHover = Date.now();
        update(); break;
      }
    });
  };
  document.addEventListener('mouseover', onPointer, true);
  document.addEventListener('mousemove', onPointer, { capture: true, passive: true });

  // the page's own declared video (og:video / JSON-LD) as a last-resort source
  function metaScan() {
    if (window !== top) return;
    const urls = new Set(), add = u => { try { u = new URL(u, location.href).href; } catch { return; } if (/^https?:/.test(u) && /\.(mp4|webm|m3u8|mov)(\?|#|$)/i.test(u)) urls.add(u); };
    ['og:video', 'og:video:url', 'og:video:secure_url'].forEach(p => document.querySelectorAll(`meta[property="${p}"]`).forEach(m => add(m.content)));
    document.querySelectorAll('meta[name="twitter:player:stream"]').forEach(m => add(m.content));
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try { const walk = o => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(walk); if (o.contentUrl && /VideoObject/.test(JSON.stringify(o['@type']))) add(o.contentUrl); Object.values(o).forEach(walk); }; walk(JSON.parse(s.textContent)); } catch {}
    });
    if (urls.size) try { chrome.runtime.sendMessage({ type: 'report', urls: [...urls], meta: true }).catch(() => {}); } catch {}
  }
  metaScan(); setTimeout(metaScan, 3000);

  /* ---------- panels (menu / toast) ---------- */
  function closePanel(e) { clearTimeout(e.timer); if (e.panel) { e.panel.remove(); e.panel = null; } }
  function openPanel(e, el, autoHide) {
    closePanel(e); e.panel = el; e.wrap.appendChild(el);
    if (autoHide) e.timer = setTimeout(() => closePanel(e), autoHide);
  }
  function toast(e, msg, kind = 'ok', autoHide = 3500, progress = false) {
    const el = document.createElement('div');
    el.className = 'panel toast' + (kind === 'err' ? ' err' : '');
    el.innerHTML = `${icon(kind === 'err' ? 'alert' : 'download', 22)}<div class="tx"><div class="m">${esc(msg)}</div>${progress ? '<div class="bar"><i></i></div>' : ''}</div>`;
    openPanel(e, el, autoHide);
  }
  document.addEventListener('pointerdown', ev => { if (!ev.composedPath().includes(host)) tracked.forEach(closePanel); }, true);

  /* ---------- actions ---------- */
  async function onClick(v, e) {
    let r;
    try { r = await chrome.runtime.sendMessage({ type: 'download', pick: true, srcs: (e.srcs && e.srcs.length ? e.srcs : srcsOf(v)), thumb: captureThumb(v) }); } catch { r = { ok: false }; }
    if (!r || !r.ok) return toast(e, r && r.error === 'none' ? T('noSource') : T('failed'), 'err', 4500);
    if (r.hls) { jobs.set(r.jobId, e); toast(e, T('preparing', { n: 0 }), 'ok', 0, true); }
    else toast(e, T('started'));
  }
  chrome.runtime.onMessage.addListener(m => {
    if (m.type !== 'progress' || !jobs.has(m.jobId)) return;
    const e = jobs.get(m.jobId);
    if (m.state === 'running') {
      if (!e.panel || !e.panel.querySelector('.bar')) toast(e, '', 'ok', 0, true);
      e.panel.querySelector('.m').textContent = T('preparing', { n: m.pct });
      e.panel.querySelector('.bar i').style.width = m.pct + '%';
    } else {
      jobs.delete(m.jobId);
      if (m.state === 'saved') toast(e, T('saved'));
      else toast(e, /DRM/.test(m.error || '') ? T('drm') : T('failed'), 'err', 5000);
    }
  });
})();
