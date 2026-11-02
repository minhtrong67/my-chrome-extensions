(() => {
  const { DEFAULTS, FONTS, t } = globalThis.XMD;
  const ART = 'article[data-testid="tweet"]';
  const MEDIA_SEL = '[data-testid="tweetPhoto"],[data-testid="videoPlayer"],[data-testid="videoComponent"]';
  const REVEAL = new Set(['view', 'show', 'xem', 'hiển thị', 'hiện']);

  const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  const cache = new Map();
  let S = { ...DEFAULTS };
  let hovered = null;

  // ---- dữ liệu từ inject.js ----
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || !e.data.__xmd) return;
    for (const [id, tw] of Object.entries(e.data.tweets)) cache.set(id, tw);
    scheduleScan();
  });

  // ---- cài đặt ----
  const safe = (fn) => { try { return fn(); } catch (_) { /* extension reloaded */ } };
  const load = () => safe(() => chrome.storage.sync.get(DEFAULTS).then((v) => {
    S = v;
    document.querySelectorAll('.xmd-btn').forEach((b) => {
      b.title = t(S.language, 'btn.download');
      b.setAttribute('aria-label', b.title);
    });
    scheduleScan();
  }));
  safe(() => chrome.storage.onChanged.addListener((_, area) => { if (area === 'sync') load(); }));
  load();

  // ---- theme helpers ----
  const pageIsDark = () => {
    const m = (getComputedStyle(document.body || document.documentElement).backgroundColor.match(/[\d.]+/g) || []).map(Number);
    if (m.length < 3) return true;
    return 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2] < 128;
  };
  const tokens = (dark) => (S.themeCache && S.themeCache[dark ? 'dark' : 'light']) || (dark
    ? { primary: '#cfbdfe', inverseSurface: '#e6e0e9', inverseOnSurface: '#322f35', inversePrimary: '#65558f' }
    : { primary: '#65558f', inverseSurface: '#322f35', inverseOnSurface: '#f5eff7', inversePrimary: '#cfbdfe' });
  const extDark = () => S.themeMode === 'dark' || (S.themeMode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);

  // ---- toast (snackbar M3) ----
  let toastEl, toastTimer;
  function toast(msg, isErr) {
    if (!document.body) return;
    const c = tokens(extDark());
    const f = FONTS.find((x) => x.id === S.font) || FONTS[0];
    if (!toastEl || !toastEl.isConnected) {
      toastEl = document.createElement('div');
      toastEl.className = 'xmd-toast';
      toastEl.setAttribute('role', 'status');
      document.body.append(toastEl);
    }
    const st = toastEl.style;
    st.setProperty('--xmd-inv-surface', c.inverseSurface);
    st.setProperty('--xmd-inv-on', c.inverseOnSurface);
    st.setProperty('--xmd-inv-primary', c.inversePrimary);
    st.setProperty('--xmd-font', f.stack);
    st.setProperty('--xmd-fs', S.fontSize === 'small' ? '13px' : S.fontSize === 'large' ? '16px' : '14px');
    const dot = document.createElement('span'); dot.className = 'xmd-dot';
    const txt = document.createElement('span'); txt.textContent = msg;
    toastEl.replaceChildren(dot, txt);
    toastEl.classList.toggle('err', !!isErr);
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  // ---- tìm id bài đăng ----
  function tweetId(article) {
    if (article) {
      for (const tm of article.querySelectorAll('a[href*="/status/"] time')) {
        const m = tm.closest('a').getAttribute('href').match(/\/status\/(\d+)/);
        if (m) return m[1];
      }
    }
    const m = location.pathname.match(/\/status\/(\d+)/);
    return m ? m[1] : null;
  }

  const send = (m) => chrome.runtime.sendMessage(m);

  async function run(article, btn) {
    const lang = S.language;
    if (btn) btn.classList.add('xmd-busy');
    try {
      const id = tweetId(article);
      if (!id) { toast(t(lang, 'toast.none'), true); return; }
      let tw = cache.get(id);
      if (!tw || !tw.media || !tw.media.length) {
        tw = await send({ type: 'fetchTweet', id });
        if (tw && tw.media && tw.media.length) cache.set(id, tw);
      }
      if (!tw || !tw.media || !tw.media.length) { toast(t(lang, 'toast.none'), true); return; }
      const inModal = article && article.closest('[aria-modal="true"]');
      const mm = location.pathname.match(/\/(?:photo|video)\/(\d+)/);
      const only = inModal && mm ? Number(mm[1]) : 0;
      const res = await send({ type: 'download', tweet: tw, only });
      if (res && res.ok) {
        toast(t(lang, 'toast.start', { n: res.count }));
        if (btn) { btn.innerHTML = CHECK; btn.classList.add('xmd-ok'); setTimeout(() => { btn.innerHTML = ICON; btn.classList.remove('xmd-ok'); }, 1600); }
      } else toast(t(lang, 'toast.fail'), true);
    } catch (_) {
      toast(t(lang, 'toast.fail'), true);
    } finally {
      if (btn) btn.classList.remove('xmd-busy');
    }
  }

  // ---- chèn nút vào thanh hành động ----
  function decorate(a) {
    const group = a.querySelector('[data-testid="reply"]')?.closest('[role="group"]');
    if (!group || group.querySelector('.xmd-wrap')) return;
    const id = tweetId(a);
    const inModal = a.closest('[aria-modal="true"]') && /\/(photo|video)\/\d+/.test(location.pathname);
    const has = a.querySelector(MEDIA_SEL) || (id && cache.get(id)?.media?.length) || inModal;
    if (!has) return;
    const wrap = document.createElement('div');
    wrap.className = 'xmd-wrap';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'xmd-btn';
    btn.innerHTML = ICON;
    btn.title = t(S.language, 'btn.download');
    btn.setAttribute('aria-label', btn.title);
    btn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); run(a, btn); });
    wrap.append(btn);
    group.append(wrap);
  }

  function reveal() {
    if (!S.autoReveal) return;
    document.querySelectorAll('article [role="button"], article button').forEach((el) => {
      if (el.dataset.xmdR) return;
      const txt = (el.textContent || '').trim().toLowerCase();
      if (REVEAL.has(txt)) { el.dataset.xmdR = '1'; el.click(); }
    });
  }

  let scanTimer = 0;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = 0;
      if (!document.body) return;
      document.documentElement.style.setProperty('--xmd-accent', tokens(pageIsDark()).primary);
      document.querySelectorAll(ART).forEach(decorate);
      reveal();
    }, 150);
  }

  new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', scheduleScan);

  // ---- phím tắt ----
  document.addEventListener('mouseover', (e) => {
    const a = e.target.closest && e.target.closest(ART);
    if (a) hovered = a;
  }, { passive: true });
  document.addEventListener('mouseout', (e) => {
    if (hovered && !hovered.contains(e.relatedTarget)) hovered = null;
  }, { passive: true });

  function targetArticle() {
    if (hovered && hovered.isConnected) return hovered;
    const f = document.activeElement && document.activeElement.closest && document.activeElement.closest(ART);
    if (f) return f;
    const root = document.querySelector('[aria-modal="true"]') || document;
    let best = null, bestVis = 0;
    for (const a of root.querySelectorAll(ART)) {
      const r = a.getBoundingClientRect();
      const vis = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      if (vis > bestVis) { bestVis = vis; best = a; }
    }
    return best;
  }

  function trigger() {
    const a = targetArticle();
    if (!a && !/\/status\/\d+/.test(location.pathname)) { toast(t(S.language, 'toast.none'), true); return; }
    run(a, a && a.querySelector('.xmd-btn'));
  }

  document.addEventListener('keydown', (e) => {
    if (!S.shortcutEnabled || e.repeat || e.isComposing || e.metaKey) return;
    const el = e.target;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
    const sc = S.shortcut;
    if (!sc || e.code !== sc.code || e.ctrlKey !== sc.ctrl || e.altKey !== sc.alt || e.shiftKey !== sc.shift) return;
    e.preventDefault();
    e.stopPropagation();
    trigger();
  }, true);

  safe(() => chrome.runtime.onMessage.addListener((msg) => { if (msg && msg.type === 'trigger') trigger(); }));
})();
