// Chạy trong MAIN world: đọc phản hồi GraphQL của chính trang X để biết URL media gốc.
// Được thiết kế để nhẹ: chỉ xử lý phản hồi JSON nhỏ, xử lý lúc rảnh, giới hạn độ sâu/số node.
(() => {
  if (window.__xmdHooked) return;
  window.__xmdHooked = true;

  const API = /\/graphql\//;
  const MAX_BYTES = 6e6;
  const MAX_NODES = 300000;
  const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 0));

  const slim = (m) => {
    if (!m) return null;
    if (m.type === 'photo') return { type: 'photo', url: m.media_url_https, thumb: m.media_url_https };
    const v = (m.video_info?.variants || []).filter((x) => x.content_type === 'video/mp4')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    return v ? { type: m.type === 'animated_gif' ? 'gif' : 'video', url: v.url, thumb: m.media_url_https } : null;
  };

  const walk = (root, out) => {
    const stack = [root];
    let nodes = 0;
    while (stack.length && nodes++ < MAX_NODES) {
      const n = stack.pop();
      if (!n || typeof n !== 'object') continue;
      if (Array.isArray(n)) { for (let i = 0; i < n.length; i++) stack.push(n[i]); continue; }
      const leg = n.legacy;
      const media = leg && (leg.extended_entities?.media || leg.entities?.media);
      const q = n.quoted_status_result?.result;
      const quotedId = (leg && leg.quoted_status_id_str) || (q && (q.rest_id || q.tweet?.rest_id)) || '';
      if (n.rest_id && leg && ((media && media.length) || quotedId)) {
        const u = n.core?.user_results?.result;
        out[n.rest_id] = {
          id: n.rest_id,
          screenName: u?.core?.screen_name || u?.legacy?.screen_name || '',
          name: u?.core?.name || u?.legacy?.name || '',
          text: n.note_tweet?.note_tweet_results?.result?.text || leg.full_text || '',
          createdAt: leg.created_at || '',
          quotedId,
          media: (media || []).map(slim).filter(Boolean)
        };
      }
      for (const k in n) { const v = n[k]; if (v && typeof v === 'object') stack.push(v); }
    }
  };

  const handle = (json) => idle(() => {
    try {
      const out = {};
      walk(json, out);
      if (Object.keys(out).length) window.postMessage({ __xmd: true, tweets: out }, '*');
    } catch (_) { /* bỏ qua */ }
  });

  // fetch: giữ nguyên Promise gốc, chỉ nhánh phụ để đọc dữ liệu
  const _fetch = window.fetch;
  window.fetch = function (...args) {
    const p = _fetch.apply(this, args);
    try {
      const a = args[0];
      const url = typeof a === 'string' ? a : (a && a.url) || String(a);
      if (API.test(url)) {
        p.then((res) => {
          try {
            const ct = res.headers.get('content-type') || '';
            const len = Number(res.headers.get('content-length')) || 0;
            if (res.ok && /json/.test(ct) && len < MAX_BYTES) res.clone().json().then(handle).catch(() => {});
          } catch (_) { /* bỏ qua */ }
        }, () => {});
      }
    } catch (_) { /* bỏ qua */ }
    return p;
  };

  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u, ...r) {
    this.__xmdUrl = String(u);
    return _open.call(this, m, u, ...r);
  };
  const _send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...a) {
    if (API.test(this.__xmdUrl || '')) {
      this.addEventListener('load', () => {
        try {
          const rt = this.responseType;
          if (rt === '' || rt === 'text') { if (this.responseText.length < MAX_BYTES) handle(JSON.parse(this.responseText)); }
          else if (rt === 'json' && this.response) handle(this.response);
        } catch (_) { /* bỏ qua */ }
      });
    }
    return _send.apply(this, a);
  };
})();
