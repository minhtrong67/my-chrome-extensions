// Content script: ẩn phần tử riêng theo trang + đếm số phần tử đã ẩn.
// Selector chung dạng .class/#id được áp dụng "theo nhu cầu": chỉ hỏi background những class/id thật sự có trên trang,
// nên mỗi tab không phải giữ hàng chục nghìn luật CSS trong RAM. Phần còn lại (thuộc tính, tổ hợp) là CSS tĩnh nhỏ do background.js đăng ký.
(() => {
  if (window.__liteShieldLoaded) return;
  window.__liteShieldLoaded = true;

  const isTop = window === window.top;
  let sheet = null;
  let styleEl = null;
  let chunks = [];
  let countChunks = [];
  let lazySheet = null;
  let lazyEl = null;
  const lazyHidden = []; // selector đã được áp dụng theo nhu cầu (để đếm số phần tử ẩn)
  const seenTokens = new Set();
  let queue = [];
  let observer = null;
  let flushTimer = 0;

  function addLazy(selectors) {
    for (let i = 0; i < selectors.length; i += 200) {
      const part = selectors.slice(i, i + 200);
      const rule = `${part.join(',')}{display:none!important}`;
      lazyHidden.push(...part);
      try {
        if (!lazySheet) {
          lazySheet = new CSSStyleSheet();
          document.adoptedStyleSheets = [...document.adoptedStyleSheets, lazySheet];
        }
        lazySheet.insertRule(rule, lazySheet.cssRules.length);
        continue;
      } catch {
        lazySheet = null;
      }
      if (!lazyEl) {
        lazyEl = document.createElement('style');
        lazyEl.dataset.liteShield = 'lazy';
        (document.head || document.documentElement).appendChild(lazyEl);
      }
      lazyEl.appendChild(document.createTextNode(rule + '\n'));
    }
  }

  const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^\w-]/g, '\\$&'));
  function collect(el) {
    if (el.nodeType !== 1) return;
    const visit = (n) => {
      if (n.id) queue.push('#' + esc(n.id));
      const cl = n.classList;
      if (cl) for (let i = 0; i < cl.length; i++) queue.push('.' + esc(cl[i]));
    };
    visit(el);
    const all = el.querySelectorAll?.('[class],[id]');
    if (all) for (let i = 0; i < all.length; i++) visit(all[i]);
  }

  async function flush() {
    flushTimer = 0;
    const fresh = [];
    for (const t of queue) if (!seenTokens.has(t)) (seenTokens.add(t), fresh.push(t));
    queue = [];
    for (let i = 0; i < fresh.length; i += 2000) {
      let r;
      try {
        r = await chrome.runtime.sendMessage({ type: 'generic-match', tokens: fresh.slice(i, i + 2000) });
      } catch {
        return;
      }
      if (r?.match?.length) addLazy(r.match);
    }
  }
  const schedule = () => { if (!flushTimer) flushTimer = setTimeout(flush, 120); };

  function startLazy() {
    if (observer) return;
    collect(document.documentElement);
    schedule();
    observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'attributes') collect(m.target.nodeType === 1 ? m.target : document.documentElement);
        else m.addedNodes.forEach(collect);
      }
      if (queue.length) schedule();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'id'] });
  }

  function inject(list) {
    // Mỗi nhóm là một luật riêng: nhóm hỏng chỉ bị trình duyệt bỏ qua, không kéo theo nhóm khác.
    const css = list.map((c) => `${c}{display:none!important}`).join('\n');
    try {
      if (!sheet) {
        sheet = new CSSStyleSheet();
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      }
      sheet.replaceSync(css);
      return;
    } catch {
      sheet = null;
    }
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.dataset.liteShield = '';
      (document.head || document.documentElement).appendChild(styleEl);
    }
    styleEl.textContent = css;
  }

  function countHidden() {
    // Dùng Set để một phần tử khớp nhiều nhóm chỉ được đếm một lần.
    const seen = new Set();
    const lazyGroups = [];
    for (let i = 0; i < lazyHidden.length; i += 200) lazyGroups.push(lazyHidden.slice(i, i + 200).join(','));
    for (const c of [...chunks, ...countChunks, ...lazyGroups]) {
      try {
        document.querySelectorAll(c).forEach((el) => seen.add(el));
      } catch {
        /* nhóm không hợp lệ */
      }
    }
    return seen.size;
  }

  let last = -1;
  function report() {
    const n = countHidden();
    if (n !== last) {
      last = n;
      chrome.runtime.sendMessage({ type: 'hidden-count', count: n }).catch(() => {});
    }
  }
  const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 0));

  async function load() {
    let res;
    try {
      res = await chrome.runtime.sendMessage({ type: 'cosmetic', host: location.hostname, top: isTop });
    } catch {
      return;
    }
    chunks = res?.chunks ?? [];
    countChunks = res?.countChunks ?? [];
    if (chunks.length) inject(chunks);
    if (res?.lazy) startLazy();
    if (!chunks.length && !countChunks.length && !res?.lazy) return;
    const run = () => setTimeout(() => idle(report), 1200);
    if (document.readyState === 'complete') run();
    else addEventListener('load', run, { once: true });
    setTimeout(() => idle(report), 4500);
  }

  // Cùng "isolated world" với picker.js nên picker có thể gọi trực tiếp.
  window.__liteShieldReload = load;
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'refresh') load();
  });

  load();
})();
