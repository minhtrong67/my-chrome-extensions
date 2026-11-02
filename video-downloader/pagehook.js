/* Runs in the page (MAIN world) on big video sites: reads playable MP4 links (video + sound together) from the page's own data */
(() => {
  if (window.__vdlPage) return; window.__vdlPage = true;
  const H = location.hostname;
  const SITE = /(^|\.)facebook\.com$/.test(H) ? 'facebook' : /(^|\.)instagram\.com$/.test(H) ? 'instagram'
    : /(^|\.)tiktok\.com$/.test(H) ? 'tiktok' : /(^|\.)(x|twitter)\.com$/.test(H) ? 'x' : '';
  if (!SITE) return;

  const seen = new Set();
  const un = s => { try { return JSON.parse('"' + s + '"'); } catch { return ''; } };
  const lastIn = (re, str) => { let last = ''; for (const m of str.matchAll(re)) last = m[1]; return last; };
  const GOOD = /^https:\/\/.+(\.mp4|\/video\/|mime_type=video)/i;

  const EXTRACT = {
    facebook(t) {
      const out = [], re = /"(browser_native_hd_url|browser_native_sd_url|playable_url_quality_hd|playable_url|progressive_url)"\s*:\s*"(https:[^"]+)"/g; let m;
      while ((m = re.exec(t))) out.push({ raw: m[2], idx: m.index, q: /hd/i.test(m[1]) || /"quality"\s*:\s*"HD/.test(t.slice(m.index, m.index + 400)) ? 'hd' : 'sd' });
      return out;
    },
    instagram(t) {
      const out = [], re = /"video_versions"\s*:\s*\[([^\]]*)\]/g; let m;
      while ((m = re.exec(t))) { const u = m[1].match(/"url"\s*:\s*"(https:[^"]+)"/); if (u) out.push({ raw: u[1], idx: m.index, q: 'hd' }); }
      return out;
    },
    tiktok(t) {
      const out = [], re = /"(playAddr|downloadAddr)"\s*:\s*"(https:[^"]+)"/g; let m;
      while ((m = re.exec(t))) out.push({ raw: m[2], idx: m.index, q: m[1] === 'playAddr' ? 'hd' : 'sd' });
      return out;
    },
    x(t) {
      const out = [], re = /\{[^{}]*"content_type"\s*:\s*"video\/mp4"[^{}]*\}/g; let m;
      while ((m = re.exec(t))) {
        const u = m[0].match(/"url"\s*:\s*"(https:[^"]+)"/), b = +((m[0].match(/"bitrate"\s*:\s*(\d+)/) || [])[1] || 0);
        if (u) out.push({ raw: u[1], idx: m.index, q: b >= 800000 ? 'hd' : 'sd', b });
      }
      return out;
    }
  };
  const VID = {
    facebook: (t, i) => lastIn(/"(?:id|video_id|videoId)"\s*:\s*"(\d{8,})"/g, t.slice(Math.max(0, i - 4000), i)),
    instagram: (t, i) => lastIn(/"code"\s*:\s*"([\w-]{5,})"/g, t.slice(Math.max(0, i - 4000), i)) || ((t.slice(i, i + 2500).match(/"code"\s*:\s*"([\w-]{5,})"/) || [])[1] || ''),
    tiktok: (t, i) => lastIn(/"id"\s*:\s*"(\d{15,})"/g, t.slice(Math.max(0, i - 5000), i)),
    x: (t, i) => lastIn(/"(?:rest_id|id_str)"\s*:\s*"(\d{10,})"/g, t.slice(Math.max(0, i - 6000), i))
  };

  function scan(text) {
    if (!text || text.length < 50 || !/playable_url|progressive_url|browser_native|video_versions|playAddr|downloadAddr|video\\?\/mp4/.test(text)) return;
    const out = [];
    for (const f of EXTRACT[SITE](text)) {
      const url = un(f.raw);
      if (!GOOD.test(url) || seen.has(url)) continue;
      seen.add(url);
      out.push({ url, site: SITE, vid: VID[SITE](text, f.idx), q: f.q, b: f.b || 0 });
    }
    if (out.length) window.postMessage({ vdl: 'pagesrc', items: out }, location.origin);
  }

  const API = /graphql|\/api\/|ajax|item_list/;
  const of = window.fetch;
  window.fetch = function (...a) {
    const p = of.apply(this, a);
    try {
      const u = String((a[0] && a[0].url) || a[0]);
      if (API.test(u)) p.then(r => r.clone().text().then(scan).catch(() => {})).catch(() => {});
    } catch {}
    return p;
  };
  const oo = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u) { this.__vu = String(u); return oo.apply(this, arguments); };
  const os = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener('load', () => {
      try { if ((this.responseType === '' || this.responseType === 'text') && API.test(this.__vu)) scan(this.responseText); } catch {}
    });
    return os.apply(this, arguments);
  };

  const scanScripts = () => document.querySelectorAll('script').forEach(s => { if (s.textContent.length < 8e6) scan(s.textContent); });
  document.addEventListener('DOMContentLoaded', scanScripts);
  addEventListener('load', scanScripts);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.tagName === 'SCRIPT') setTimeout(() => scan(n.textContent), 60);
  }))).observe(document, { childList: true, subtree: true });
})();
