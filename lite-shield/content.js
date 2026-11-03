// Content script: ẩn phần tử riêng theo trang + đếm số phần tử đã ẩn.
// Selector chung được Chrome áp dụng bằng CSS tĩnh (đăng ký trong background.js), không đi qua đây.
(() => {
  if (window.__liteShieldLoaded) return;
  window.__liteShieldLoaded = true;

  const isTop = window === window.top;
  let sheet = null;
  let styleEl = null;
  let chunks = [];
  let countChunks = [];

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
    for (const c of [...chunks, ...countChunks]) {
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
    if (!chunks.length && !countChunks.length) return;
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
