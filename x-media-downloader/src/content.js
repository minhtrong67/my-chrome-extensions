(() => {
  const X = globalThis.XMD;
  const { DEFAULTS, FONTS, t } = X;

  // Mọi selector phụ thuộc vào giao diện X nằm ở đây để dễ sửa khi X thay đổi
  const SEL = {
    article: 'article[data-testid="tweet"]',
    reply: '[data-testid="reply"]',
    group: '[role="group"]',
    media: '[data-testid="tweetPhoto"],[data-testid="videoPlayer"],[data-testid="videoComponent"]',
    tweetText: '[data-testid="tweetText"]',
    modal: '[aria-modal="true"]',
    timeLink: 'a[href*="/status/"] time'
  };
  const REVEAL_WORDS = ['view', 'show', 'xem', 'hiển thị', 'hiện'];
  const TTL = 30 * 60 * 1000;

  const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  const cache = new Map();
  const recent = new Map();
  const pending = new Set();
  let S = { ...DEFAULTS };
  let hovered = null, full = true, timer = 0, lastAccent = 0, lastHref = location.href;

  // ---- ngữ cảnh giao diện cho toast / tooltip / menu ----
  const ctx = () => {
    const d = X.isDarkMode(S);
    const f = FONTS.find((x) => x.id === S.font) || FONTS[0];
    const k = S.fontSize;
    return { dark: d, tokens: X.getTokens(S, d), font: f.stack, fs: k === 'small' ? '13px' : k === 'large' ? '16px' : '14px', fsSm: k === 'small' ? '11px' : k === 'large' ? '14px' : '12px' };
  };
  const toast = X.createToaster(ctx);
  X.initTooltips(ctx);
  const mediaCount = (article) => {
    const id = tweetId(article);
    const tw = id && cacheGet(id);
    if (!tw) return article ? article.querySelectorAll('[data-testid="tweetPhoto"]').length : 0;
    const q = tw.quotedId && cacheGet(tw.quotedId);
    return tw.media.length + (q ? q.media.length : 0);
  };
  const tipFor = (article) => tipText() + (mediaCount(article) > 1 ? '\n' + t(S.language, 'tip.rightClick') : '');
  const tipText = () => t(S.language, 'btn.download') + (S.shortcutEnabled && S.shortcut ? ` (${X.fmtShortcut(S.shortcut)})` : '');

  // ---- bộ nhớ đệm có hạn dùng ----
  const cacheGet = (id) => {
    const e = cache.get(id);
    if (!e) return null;
    if (Date.now() - e.ts > TTL) { cache.delete(id); return null; }
    return e.tw;
  };
  const cacheSet = (id, tw) => cache.set(id, { tw, ts: Date.now() });
  setInterval(() => { const now = Date.now(); for (const [k, e] of cache) if (now - e.ts > TTL) cache.delete(k); }, 5 * 60 * 1000);

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || !e.data.__xmd) return;
    for (const [id, tw] of Object.entries(e.data.tweets)) cacheSet(id, tw);
    if (cache.size > 600) for (const k of [...cache.keys()].slice(0, 200)) cache.delete(k);
    queue();
  });

  // ---- cài đặt ----
  const safe = (fn) => { try { return fn(); } catch (_) { /* extension đã reload */ } };
  const send = (m) => chrome.runtime.sendMessage(m);
  const logEvt = (level, code, tweetId) => safe(() => send({ type: 'log', level, code, tweetId }).catch(() => {}));
  const load = () => safe(() => chrome.storage.sync.get(DEFAULTS).then((v) => {
    S = v;
    if (!S.enabled) document.querySelectorAll('.xmd-wrap').forEach((n) => n.remove());
    document.querySelectorAll('.xmd-btn').forEach((b) => b.setAttribute('data-xmd-tip', tipFor(b.closest(SEL.article))));
    accent(true);
    queue();
  }));
  safe(() => chrome.storage.onChanged.addListener((_, area) => { if (area === 'sync') load(); }));
  load();

  function accent(force) {
    const now = Date.now();
    if (!force && now - lastAccent < 5000) return;
    lastAccent = now;
    if (!document.body) return;
    const m = (getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g) || []).map(Number);
    const pageDark = m.length < 3 ? true : 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2] < 128;
    document.documentElement.style.setProperty('--xmd-accent', X.getTokens(S, pageDark).primary);
  }

  // ---- id bài đăng / media ----
  function tweetId(article) {
    if (article) {
      for (const tm of article.querySelectorAll(SEL.timeLink)) {
        const m = tm.closest('a').getAttribute('href').match(/\/status\/(\d+)/);
        if (m) return m[1];
      }
    }
    const m = location.pathname.match(/\/status\/(\d+)/);
    return m ? m[1] : null;
  }

  // Gom media của bài chính và bài được trích dẫn (nếu có)
  async function resolveItems(id) {
    let tw = cacheGet(id);
    const quotedMissing = tw && tw.quotedId && !cacheGet(tw.quotedId) && !tw.quoted;
    if (!tw || quotedMissing) {
      const fresh = await send({ type: 'fetchTweet', id });
      if (fresh && Array.isArray(fresh.media)) { tw = fresh; cacheSet(id, fresh); if (fresh.quoted) cacheSet(fresh.quoted.id || fresh.quotedId, fresh.quoted); }
    }
    if (!tw) return [];
    const items = [];
    tw.media.forEach((media, i) => items.push({ tweet: tw, index: i + 1, media, quote: false }));
    const q = (tw.quotedId && cacheGet(tw.quotedId)) || tw.quoted;
    if (q && q.media && q.media.length) q.media.forEach((media, i) => items.push({ tweet: q, index: i + 1, media, quote: true }));
    return items;
  }

  const hasMediaFor = (id) => {
    const tw = id && cacheGet(id);
    if (!tw) return false;
    if (tw.media.length) return true;
    const q = tw.quotedId && cacheGet(tw.quotedId);
    return !!(q && q.media.length);
  };

  // ---- thao tác tải ----
  const setState = (btn, st) => { if (btn) btn.dataset.state = st || ''; };
  function finishBtn(btn, ok) {
    if (!btn) return;
    btn.classList.remove('xmd-busy', 'xmd-prog');
    setState(btn, '');
    btn.style.removeProperty('--p');
    if (ok) {
      btn.innerHTML = CHECK; btn.classList.add('xmd-ok');
      setTimeout(() => { btn.innerHTML = ICON; btn.classList.remove('xmd-ok'); }, 1500);
    }
  }

  async function activate(article, btn, mode, forceAll) {
    const lang = S.language;
    if (btn && btn.dataset.state) return;
    setState(btn, 'busy');
    if (btn) btn.classList.add('xmd-busy');
    try {
      const id = tweetId(article);
      if (!id) { toast(t(lang, 'toast.none'), 'warning'); finishBtn(btn); return; }
      let items = await resolveItems(id);
      const inModal = article && article.closest(SEL.modal);
      const mm = location.pathname.match(/\/(?:photo|video)\/(\d+)/);
      if (inModal && mm) items = items.filter((it) => !it.quote && it.index === Number(mm[1]));
      if (!items.length) { toast(t(lang, 'toast.none'), 'warning'); logEvt('warning', 'NO_MEDIA', id); finishBtn(btn); return; }
      if (!forceAll && items.length > 1 && btn && (mode === 'menu' || S.multiMode === 'menu')) {
        finishBtn(btn);
        openMenu(btn, items, (sel) => start(sel, btn, id));
        return;
      }
      await start(items, btn, id);
    } catch (_) {
      toast(t(lang, 'toast.fail'), 'error');
      finishBtn(btn);
    }
  }

  async function start(items, btn, id) {
    const lang = S.language;
    const jobs = [];
    for (const it of items) {
      let j = jobs.find((x) => x.tweet.id === it.tweet.id);
      if (!j) { j = { tweet: it.tweet, only: [] }; jobs.push(j); }
      j.only.push(it.index);
    }
    // nếu chọn toàn bộ media của một bài thì không cần giới hạn chỉ số
    for (const j of jobs) if (j.only.length === j.tweet.media.length) j.only = null;
    setState(btn, 'busy');
    if (btn) btn.classList.add('xmd-busy');
    try {
      const res = await send({ type: 'download', jobs, tid: id });
      if (res && (res.dup || res.canceled)) { finishBtn(btn); return; }
      if (res && res.ok) {
        if (btn) {
          btn.dataset.tid = id;
          btn.classList.remove('xmd-busy'); btn.classList.add('xmd-prog'); setState(btn, 'prog');
          btn.style.setProperty('--p', 3);
          setTimeout(() => { if (btn.dataset.state === 'prog') finishBtn(btn, true); }, 120000);
        }
      } else { toast(t(lang, 'toast.fail'), 'error'); finishBtn(btn); }
    } catch (_) {
      toast(t(lang, 'toast.fail'), 'error');
      finishBtn(btn);
    }
  }

  // ---- menu chọn media (M3 menu dùng chung) ----
  const menu = X.createMenu(ctx);
  const thumbUrl = (u) => (u ? u.replace(/\.\w+(\?.*)?$/, '') + '?format=jpg&name=small' : '');
  function openMenu(anchor, items, onPick) {
    const rows = [{ label: t(S.language, 'menu.all', { n: items.length }), onPick: () => onPick(items) }];
    items.forEach((it) => {
      const key = it.media.type === 'photo' ? 'menu.photo' : it.media.type === 'gif' ? 'menu.gif' : 'menu.video';
      rows.push({ label: t(S.language, key, { n: it.index }), sub: it.quote ? t(S.language, 'menu.quote') : '', thumb: thumbUrl(it.media.thumb), onPick: () => onPick([it]) });
    });
    menu.open(anchor, rows);
  }

  // ---- chèn nút vào thanh hành động ----
  function decorate(a) {
    if (!S.enabled) return;
    const group = a.querySelector(SEL.reply)?.closest(SEL.group);
    if (!group || group.querySelector('.xmd-wrap')) return;
    const id = tweetId(a);
    const inModal = a.closest(SEL.modal) && /\/(photo|video)\/\d+/.test(location.pathname);
    if (!(a.querySelector(SEL.media) || hasMediaFor(id) || inModal)) return;
    const wrap = document.createElement('div');
    wrap.className = 'xmd-wrap';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'xmd-btn';
    btn.innerHTML = ICON;
    btn.setAttribute('data-xmd-tip', tipFor(a));
    btn.setAttribute('aria-label', t(S.language, 'btn.download'));
    btn.addEventListener('pointerenter', () => btn.setAttribute('data-xmd-tip', tipFor(a)));
    btn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); activate(a, btn, 'default'); });
    btn.addEventListener('contextmenu', (ev) => { ev.preventDefault(); ev.stopPropagation(); activate(a, btn, 'menu'); });
    wrap.append(btn);
    group.append(wrap);
  }

  // ---- tự hiện nội dung nhạy cảm ----
  const extraWords = () => (S.revealKeywords || '').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
  // Nhận diện theo cấu trúc: nút ngắn nằm cạnh một đoạn cảnh báo dài, không thuộc nội dung bài/thanh hành động
  function looksLikeWarningButton(el, article) {
    if (el.closest(SEL.group) || el.closest('a')) return false;
    const txt = (el.textContent || '').trim();
    if (!txt || txt.length > 24 || /\d/.test(txt)) return false;
    let p = el.parentElement;
    for (let i = 0; i < 4 && p && p !== article; i++, p = p.parentElement) {
      if ((p.textContent || '').length >= txt.length + 30) {
        return !p.querySelector(SEL.tweetText + ',' + SEL.group + ',time');
      }
    }
    return false;
  }
  function reveal(a) {
    if (!S.autoReveal) return;
    const words = new Set([...REVEAL_WORDS, ...extraWords()]);
    for (const el of a.querySelectorAll('[role="button"],button')) {
      if (el.dataset.xmdR || el.closest(SEL.group) || el.closest(SEL.tweetText)) continue;
      const txt = (el.textContent || '').trim().toLowerCase();
      if (words.has(txt) || looksLikeWarningButton(el, a)) { el.dataset.xmdR = '1'; el.click(); }
    }
  }

  // ---- hàng đợi quét: chỉ xử lý bài đăng mới/đổi ----
  function queue(el) {
    if (el) pending.add(el); else full = true;
    if (!timer) timer = setTimeout(flush, 200);
  }
  function flush() {
    timer = 0;
    if (!document.body) { full = true; timer = setTimeout(flush, 300); return; }
    accent();
    const list = full ? [...document.querySelectorAll(SEL.article)] : [...pending];
    full = false;
    pending.clear();
    for (const a of list) if (a.isConnected) { decorate(a); reveal(a); }
  }

  new MutationObserver((recs) => {
    for (const r of recs) {
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        const c = n.classList;
        if (c && (c.contains('xmd-wrap') || c.contains('xmd-toast') || c.contains('xmd-tip') || c.contains('xmd-menu') || c.contains('xmd-scrim'))) continue;
        const own = n.closest(SEL.article);
        if (own) { queue(own); continue; }
        for (const a of n.querySelectorAll(SEL.article)) queue(a);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('DOMContentLoaded', () => queue());
  setInterval(() => { if (location.href !== lastHref) { lastHref = location.href; menu.close(); queue(); } }, 800);

  // ---- phím tắt ----
  document.addEventListener('mouseover', (e) => {
    const a = e.target.closest && e.target.closest(SEL.article);
    if (a) hovered = a;
  }, { passive: true });
  document.addEventListener('mouseout', (e) => {
    if (hovered && !hovered.contains(e.relatedTarget)) hovered = null;
  }, { passive: true });

  function targetArticle() {
    if (hovered && hovered.isConnected) return hovered;
    const f = document.activeElement && document.activeElement.closest && document.activeElement.closest(SEL.article);
    if (f) return f;
    const root = document.querySelector(SEL.modal) || document;
    let best = null, bestVis = 0;
    for (const a of root.querySelectorAll(SEL.article)) {
      const r = a.getBoundingClientRect();
      const vis = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      if (vis > bestVis) { bestVis = vis; best = a; }
    }
    return best;
  }

  function trigger() {
    if (!S.enabled) return;
    const a = targetArticle();
    if (!a && !/\/status\/\d+/.test(location.pathname)) { toast(t(S.language, 'toast.none'), 'warning'); return; }
    const id = tweetId(a);
    const now = Date.now();
    if (id && (recent.get(id) || 0) > now - 1200) return;
    if (id) recent.set(id, now);
    // phím tắt luôn tải tất cả, không mở menu
    const btn = a && a.querySelector('.xmd-btn');
    activate(a, btn, 'default', true);
  }

  document.addEventListener('keydown', (e) => {
    if (!S.enabled || !S.shortcutEnabled || e.repeat || e.isComposing || e.metaKey) return;
    const el = e.target;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
    const sc = S.shortcut;
    if (!sc || e.code !== sc.code || e.ctrlKey !== sc.ctrl || e.altKey !== sc.alt || e.shiftKey !== sc.shift) return;
    e.preventDefault();
    e.stopPropagation();
    trigger();
  }, true);

  // ---- tin nhắn từ background ----
  safe(() => chrome.runtime.onMessage.addListener((msg) => {
    if (!msg) return;
    if (msg.type === 'trigger') trigger();
    else if (msg.type === 'dlFailed') toast(t(S.language, 'toast.fail'), 'error');
    else if (msg.type === 'progress') {
      document.querySelectorAll(`.xmd-btn[data-tid="${msg.tid}"]`).forEach((b) => {
        if (msg.done) finishBtn(b, true); else b.style.setProperty('--p', Math.max(3, Math.round(msg.pct * 100)));
      });
    }
  }));
})();
