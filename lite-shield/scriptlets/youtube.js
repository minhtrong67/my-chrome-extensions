// Scriptlet chạy trong "MAIN world" của youtube.com tại document_start (đăng ký động từ background.js).
// Ba lớp: (1) cắt dữ liệu quảng cáo khỏi phản hồi JSON của YouTube, (2) tự bỏ qua quảng cáo đang phát,
// (3) ẩn khung quảng cáo còn sót. Chạy theo kiểu "cố gắng hết sức": YouTube đổi cấu trúc thường xuyên.
(() => {
  if (window.__lsYT) return;
  Object.defineProperty(window, '__lsYT', { value: true });

  const AD_KEYS = ['adPlacements', 'playerAds', 'adSlots', 'adBreakHeartbeatParams'];
  const AD_ITEM_KEYS = ['adSlotRenderer', 'promotedSparklesWebRenderer', 'promotedVideoRenderer', 'bannerPromoRenderer', 'displayAdRenderer'];
  const isAdItem = (it) => AD_ITEM_KEYS.some((k) => k in it) || AD_ITEM_KEYS.some((k) => it.richItemRenderer?.content && k in it.richItemRenderer.content);

  function prune(o, depth = 0) {
    if (!o || typeof o !== 'object' || depth > 14) return o;
    if (Array.isArray(o)) {
      for (let i = o.length - 1; i >= 0; i--) {
        const it = o[i];
        if (it && typeof it === 'object' && !Array.isArray(it) && isAdItem(it)) o.splice(i, 1);
        else prune(it, depth + 1);
      }
      return o;
    }
    for (const k of AD_KEYS) if (k in o) delete o[k];
    for (const k of Object.keys(o)) prune(o[k], depth + 1);
    return o;
  }
  const safePrune = (v) => {
    try {
      return prune(v);
    } catch {
      return v;
    }
  };

  // (1a) Dữ liệu nhúng sẵn trong trang.
  for (const name of ['ytInitialPlayerResponse', 'ytInitialData']) {
    let val;
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        get: () => val,
        set: (v) => {
          val = safePrune(v);
        },
      });
    } catch {
      /* đã bị định nghĩa */
    }
  }

  // (1b) Phản hồi fetch tới /youtubei/v1/*.
  const YT_API = /\/youtubei\/v1\/(player|next|browse|search|reel|get_watch|guide)/;
  const origJson = Response.prototype.json;
  Response.prototype.json = function () {
    const p = origJson.call(this);
    return YT_API.test(this.url) ? p.then(safePrune) : p;
  };

  // (1c) JSON.parse (một số đường dẫn của YouTube dùng cách này).
  const HINT = /adPlacements|playerAds|adSlots|adSlotRenderer/;
  const origParse = JSON.parse;
  JSON.parse = function (text, reviver) {
    const v = origParse.call(this, text, reviver);
    if (typeof text === 'string' && text.length > 200 && HINT.test(text)) safePrune(v);
    return v;
  };

  // (2) Bỏ qua quảng cáo đang phát (khi vẫn còn sót lại).
  let mutedByUs = false;
  const SKIP = '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-overlay-close-button';
  setInterval(() => {
    const player = document.querySelector('.html5-video-player');
    if (!player) return;
    const video = player.querySelector('video.html5-main-video, video');
    if (player.classList.contains('ad-showing')) {
      document.querySelectorAll(SKIP).forEach((b) => b.click());
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        if (!video.muted) ((video.muted = true), (mutedByUs = true));
        video.currentTime = video.duration;
      }
    } else if (mutedByUs && video) {
      video.muted = false;
      mutedByUs = false;
    }
  }, 400);

  // (3) Ẩn khung quảng cáo còn sót.
  const css = `#masthead-ad, #player-ads, ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-banner-promo-renderer,
    ytd-display-ad-renderer, ytd-statement-banner-renderer, ytd-promoted-sparkles-web-renderer, ytd-promoted-video-renderer,
    .ytp-ad-overlay-container, .ytp-ad-module .ytp-ad-image-overlay, #related ytd-ad-slot-renderer { display: none !important; }`;
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
})();
