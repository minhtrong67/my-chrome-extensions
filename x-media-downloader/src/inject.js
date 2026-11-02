// Chạy trong MAIN world: đọc phản hồi API của chính trang X để biết URL media gốc.
(() => {
  if (window.__xmdHooked) return;
  window.__xmdHooked = true;

  const API = /\/(graphql|i\/api|api\/1\.1|api\/2)\//;

  const slim = (m) => {
    if (m.type === 'photo') return { type: 'photo', url: m.media_url_https, thumb: m.media_url_https };
    const v = (m.video_info?.variants || []).filter((x) => x.content_type === 'video/mp4')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    return v ? { type: m.type === 'animated_gif' ? 'gif' : 'video', url: v.url, thumb: m.media_url_https } : null;
  };

  const walk = (n, out) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { for (const v of n) walk(v, out); return; }
    const leg = n.legacy;
    const media = leg && (leg.extended_entities?.media || leg.entities?.media);
    if (n.rest_id && media && media.length) {
      const u = n.core?.user_results?.result;
      out[n.rest_id] = {
        id: n.rest_id,
        screenName: u?.core?.screen_name || u?.legacy?.screen_name || '',
        name: u?.core?.name || u?.legacy?.name || '',
        text: n.note_tweet?.note_tweet_results?.result?.text || leg.full_text || '',
        createdAt: leg.created_at || '',
        media: media.map(slim).filter(Boolean)
      };
    }
    for (const k in n) walk(n[k], out);
  };

  const handle = (json) => {
    try {
      const out = {};
      walk(json, out);
      if (Object.keys(out).length) window.postMessage({ __xmd: true, tweets: out }, '*');
    } catch (_) { /* bỏ qua */ }
  };

  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await _fetch.apply(this, args);
    try {
      const a = args[0];
      const url = typeof a === 'string' ? a : a?.url || String(a);
      if (API.test(url)) res.clone().json().then(handle).catch(() => {});
    } catch (_) { /* bỏ qua */ }
    return res;
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
          const body = rt === '' || rt === 'text' ? JSON.parse(this.responseText) : rt === 'json' ? this.response : null;
          if (body) handle(body);
        } catch (_) { /* bỏ qua */ }
      });
    }
    return _send.apply(this, a);
  };
})();
