// inject.js — functions serialised into the page via chrome.scripting.executeScript.
// Each one MUST be fully self-contained (no references to anything outside its own body).

/**
 * Scans the page for downloadable images.
 * cfg: { minSize, max }
 * Returns { list: [{ src, w, h, alt, isLogo }] } — logo flagging is heuristic and done here
 * (not in shared code) because it needs live DOM context.
 */
function collectPageImages(cfg) {
  const floor = Number.isFinite(cfg && cfg.minSize) ? cfg.minSize : 32;
  const max = (cfg && cfg.max) || 400;
  const seen = new Map(), results = [];

  // ── Logo detection ────────────────────────────────────────
  const LOGO_RE = /(^|[^a-z])(logo|logos|logotype|logomark|wordmark|brandmark|site-?icon|favicon)([^a-z]|$)/i;
  const LOGO_CAMEL_RE = /[a-z0-9](Logo|Logos|Logotype|Wordmark|Favicon)(?![a-z])/;
  const BRAND_RE = /(^|[^a-z])(navbar-brand|site-brand|brand-logo|site-title|site-name)([^a-z]|$)/i;
  const hasLogoText = (s) => !!s && (LOGO_RE.test(s) || LOGO_CAMEL_RE.test(s));
  const classOf = (el) => (typeof el.className === "string" ? el.className : (el.className && el.className.baseVal) || "");
  const attr = (el, n) => (el.getAttribute && el.getAttribute(n)) || "";

  function isHomeLink(a) {
    try {
      const u = new URL(a.getAttribute("href") || "", location.href);
      if (u.origin !== location.origin) return false;
      return /^\/(index\.(html?|php))?$/i.test(u.pathname) || /^\/[a-z]{2}(-[a-z]{2})?\/?$/i.test(u.pathname);
    } catch (_) { return false; }
  }

  function looksLikeLogo(el, src) {
    let path = src;
    try { path = decodeURIComponent(new URL(src, location.href).pathname); } catch (_) {}
    if (hasLogoText(path)) return true;
    if (!el || el.nodeType !== 1) return false;
    if (attr(el, "itemprop").toLowerCase() === "logo") return true;
    const own = [el.alt, classOf(el), el.id, attr(el, "name"), attr(el, "aria-label"), attr(el, "title"), attr(el, "data-testid")];
    if (own.some((v) => hasLogoText(v) || BRAND_RE.test(v || ""))) return true;
    let p = el.parentElement, depth = 0;
    while (p && depth < 4 && p !== document.body && p !== document.documentElement) {
      if (attr(p, "itemprop").toLowerCase() === "logo") return true;
      const hints = [classOf(p), p.id, attr(p, "aria-label")];
      if (hints.some((v) => hasLogoText(v) || BRAND_RE.test(v || ""))) return true;
      p = p.parentElement; depth++;
    }
    const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
    const side = Math.max(rect.width || 0, rect.height || 0);
    if (!side) return false;
    const a = el.closest && el.closest("a[href]");
    if (a && side <= 400 && isHomeLink(a)) return true;
    if (side <= 240 && el.closest &&
        el.closest('header, nav, footer, [role="banner"], [role="contentinfo"], [role="navigation"]')) return true;
    return false;
  }

  // knownDims: true when w/h are real decoded pixels or a laid-out box; false when unknown (0).
  function add(src, w, h, alt, el) {
    if (!src || src.startsWith("data:") || src.startsWith("blob:") || !/^https?:/i.test(src)) return;
    const logo = looksLikeLogo(el, src);
    if (seen.has(src)) {
      const prev = seen.get(src);
      prev.isLogo = prev.isLogo && logo;               // a logo only if EVERY use looks like one
      if (!prev.w && w) { prev.w = w; prev.h = h; }
      return;
    }
    if (w && h && (w < floor || h < floor)) return;     // known-small → icon / tracking pixel
    const item = { src, w: w || 0, h: h || 0, alt: alt || "", isLogo: logo };
    seen.set(src, item);
    results.push(item);
  }

  const abs = (u) => { try { return new URL(u, location.href).href; } catch (_) { return ""; } };

  // largest candidate from a srcset string → { url, w }
  function bestFromSrcset(srcset) {
    let best = null;
    (srcset || "").split(",").forEach((part) => {
      const bits = part.trim().split(/\s+/);
      if (!bits[0]) return;
      const wd = /^(\d+)w$/.test(bits[1] || "") ? parseInt(bits[1], 10) : 0;
      if (!best || wd > best.w) best = { url: bits[0], w: wd };
    });
    return best;
  }

  document.querySelectorAll("img").forEach((img) => {
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const lazy = img.getAttribute("data-src") || img.getAttribute("data-original") ||
                 img.getAttribute("data-lazy-src") || img.getAttribute("data-lazy");
    const big = bestFromSrcset(img.srcset || img.getAttribute("data-srcset"));
    if (big && big.w > nw) {
      add(abs(big.url), big.w, nw ? Math.round(big.w * nh / nw) : 0, img.alt, img);
    } else if (img.currentSrc || img.src) {
      add(img.currentSrc || img.src, nw, nh, img.alt, img);
    }
    if (lazy) add(abs(lazy), 0, 0, img.alt, img);
  });

  // CSS background images (cap the walk so huge DOMs stay fast)
  const all = document.querySelectorAll("*");
  const limit = Math.min(all.length, 6000);
  for (let i = 0; i < limit; i++) {
    const el = all[i];
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none") continue;
    const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
    if (!m) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    add(abs(m[1]), Math.round(r.width), Math.round(r.height), "", el);
  }

  document.querySelectorAll("picture source[srcset]").forEach((s) => {
    const b = bestFromSrcset(s.srcset);
    if (b) add(abs(b.url), b.w, 0, "", (s.closest("picture") && s.closest("picture").querySelector("img")) || s.parentElement);
  });

  // Thumbnails that link to the full-size file
  document.querySelectorAll("a[href]").forEach((a) => {
    const h = a.getAttribute("href") || "";
    if (/\.(png|jpe?g|webp)(\?|#|$)/i.test(h)) add(abs(h), 0, 0, "", a.querySelector("img") || a);
  });

  return { list: results.slice(0, max) };
}

/**
 * Loads an image once in the page context (so cookies/referer rules of the site apply),
 * reads its real pixel size and — only when needed — crops / upscales / re-encodes it.
 * cfg: { minDim, maxRatio, convert, outMime, quality }
 * Resolves { status, w, h, needsFix, dataUrl? } where status is one of:
 *   "original"   – already fine, download the URL as-is
 *   "processed"  – dataUrl holds the converted / fixed image
 *   "tainted"    – size known but the canvas is cross-origin locked (caller retries elsewhere)
 *   "unreadable" – couldn't decode the image at all
 */
function processImageInPage(src, cfg) {
  return new Promise((resolve) => {
    function load(cors, cb) {
      const img = new Image();
      if (cors) img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => cb(img);
      img.onerror = () => cb(null);
      img.src = src;
    }
    function run(img) {
      const w = img.naturalWidth || 0, h = img.naturalHeight || 0;
      if (!w || !h) return resolve({ status: "unreadable", w: 0, h: 0 });
      const needsFix = w < cfg.minDim || h < cfg.minDim || Math.max(w, h) / Math.min(w, h) > cfg.maxRatio;
      if (!needsFix && !cfg.convert) return resolve({ status: "original", w, h, needsFix });
      let sx = 0, sy = 0, sw = w, sh = h;
      if (sw > sh * cfg.maxRatio) { sw = Math.round(sh * cfg.maxRatio); sx = Math.round((w - sw) / 2); }
      else if (sh > sw * cfg.maxRatio) { sh = Math.round(sw * cfg.maxRatio); sy = Math.round((h - sh) / 2); }
      const shorter = Math.min(sw, sh);
      const scale = shorter < cfg.minDim ? cfg.minDim / shorter : 1;
      const dw = Math.max(1, Math.round(sw * scale)), dh = Math.max(1, Math.round(sh * scale));
      try {
        const c = document.createElement("canvas");
        c.width = dw; c.height = dh;
        const ctx = c.getContext("2d");
        if (cfg.outMime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, dw, dh); }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
        resolve({ status: "processed", w, h, needsFix, dataUrl: c.toDataURL(cfg.outMime, (cfg.quality || 92) / 100) });
      } catch (_) {
        resolve({ status: "tainted", w, h, needsFix });
      }
    }
    load(true, (a) => {
      if (a) return run(a);
      load(false, (b) => (b ? run(b) : resolve({ status: "unreadable", w: 0, h: 0 })));
    });
  });
}
