// TubeShot - content script (runs only on youtube.com / m.youtube.com)
// Finds the active <video>, reports its state, seeks it and draws clean frames onto a canvas.

(() => {
  if (window.__tubeshotLoaded) return;
  window.__tubeshotLoaded = true;

  const TARGET = "tubeshot-content";
  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const FRAME_STEP = 1 / 30;

  /* ---------- Page / video detection ---------- */

  function isPlayerPage() {
    const p = location.pathname;
    return p === "/watch" || p.startsWith("/shorts/") || p.startsWith("/live/");
  }

  function visibleArea(el) {
    const r = el.getBoundingClientRect();
    const w = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0));
    const h = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0));
    return w * h;
  }

  // Shorts keeps several <video> elements in the DOM; the real one is the one most visible on screen.
  function findVideo() {
    if (!isPlayerPage()) return null;
    const videos = Array.from(document.querySelectorAll("video")).filter((v) => v.videoWidth > 0);
    if (videos.length === 0) return null;
    if (videos.length === 1) return videos[0];
    return videos.sort((a, b) => visibleArea(b) - visibleArea(a))[0];
  }

  function textOf(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = el && el.textContent.trim();
      if (text) return text;
    }
    return "";
  }

  function getVideoTitle() {
    const fromDom = textOf([
      "ytd-reel-video-renderer[is-active] .ytShortsVideoTitleViewModelShortsVideoTitle",
      "h1.ytd-watch-metadata yt-formatted-string",
      "h1.title yt-formatted-string",
      "#title h1"
    ]);
    if (fromDom) return fromDom;
    // document.title can carry an unread-notification prefix like "(3) ".
    return document.title.replace(/^\(\d+\)\s*/, "").replace(/\s*-\s*YouTube\s*$/i, "").trim() || "YouTube video";
  }

  function getChannelName() {
    return textOf([
      "ytd-reel-video-renderer[is-active] ytd-channel-name a",
      "ytd-watch-metadata ytd-channel-name a",
      "#owner #channel-name a",
      "#channel-name #text",
      "ytd-channel-name #text"
    ]);
  }

  function getVideoId() {
    try {
      const u = new URL(location.href);
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && ["shorts", "live"].includes(parts[0])) return parts[1];
    } catch (e) {
      /* ignore */
    }
    return "";
  }

  function formatTime(totalSeconds) {
    if (!Number.isFinite(totalSeconds)) return "0:00";
    const s = Math.max(0, Math.floor(totalSeconds));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
  }

  /* ---------- Canvas drawing ---------- */

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (ctx.measureText(text.slice(0, mid) + "\u2026").width <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return text.slice(0, lo) + "\u2026";
  }

  function drawTimestampBadge(ctx, w, h, label) {
    const fontSize = Math.max(14, Math.round(h * 0.032));
    ctx.font = `600 ${fontSize}px ${FONT}`;
    ctx.textBaseline = "middle";
    const padX = Math.round(h * 0.012) + 8;
    const padY = Math.round(h * 0.01) + 5;
    const boxW = ctx.measureText(label).width + padX * 2;
    const boxH = fontSize + padY * 2;
    const margin = Math.round(h * 0.02) + 6;
    const x = w - boxW - margin;
    const y = h - boxH - margin;

    ctx.fillStyle = "rgba(15, 15, 15, 0.78)";
    roundRect(ctx, x, y, boxW, boxH, Math.min(8, boxH / 2));
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x + padX, y + boxH / 2 + 1);
  }

  function drawCaption(ctx, w, videoH, captionH, title, channel, timeLabel) {
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, videoH, w, captionH);

    const pad = Math.round(captionH * 0.18);
    const titleSize = Math.max(13, Math.round(captionH * 0.34));
    const metaSize = Math.max(11, Math.round(captionH * 0.24));
    ctx.textBaseline = "top";

    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${titleSize}px ${FONT}`;
    const titleY = videoH + pad * 0.7;
    ctx.fillText(truncateText(ctx, title, w - pad * 2), pad, titleY);

    ctx.fillStyle = "#b0b0b0";
    ctx.font = `500 ${metaSize}px ${FONT}`;
    const meta = channel ? `${channel} \u00B7 ${timeLabel}` : timeLabel;
    ctx.fillText(truncateText(ctx, meta, w - pad * 2), pad, titleY + titleSize + pad * 0.35);
  }

  function buildThumbnail(source) {
    const scale = Math.min(1, 160 / Math.max(source.width, source.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(source.width * scale));
    c.height = Math.max(1, Math.round(source.height * scale));
    c.getContext("2d").drawImage(source, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.7);
  }

  /* ---------- Capture ---------- */

  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  // After a seek the decoder needs a moment; drawing too early produces a black or stale frame.
  async function waitUntilReady(video, timeoutMs = 1500) {
    if (!video.seeking && video.readyState >= 2) return;
    await new Promise((resolve) => {
      const events = ["seeked", "canplay", "loadeddata"];
      const finish = () => {
        events.forEach((e) => video.removeEventListener(e, finish));
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(finish, timeoutMs);
      events.forEach((e) => video.addEventListener(e, finish));
    });
    await nextFrame();
  }

  async function captureFrame(options) {
    const video = findVideo();
    if (!video) return { ok: false, error: "no-video" };

    await waitUntilReady(video);

    const factor = (options.scale || 100) / 100;
    const w = Math.max(1, Math.round(video.videoWidth * factor));
    const h = Math.max(1, Math.round(video.videoHeight * factor));

    const title = getVideoTitle();
    const channel = getChannelName();
    const timeLabel = formatTime(video.currentTime);
    const captionH = options.captionInfo ? Math.max(46, Math.round(h * 0.16)) : 0;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h + captionH;
    const ctx = canvas.getContext("2d");

    try {
      ctx.drawImage(video, 0, 0, w, h);
    } catch (e) {
      return { ok: false, error: "draw-failed" };
    }

    if (options.watermarkTimestamp) drawTimestampBadge(ctx, w, h, timeLabel);
    if (options.captionInfo) drawCaption(ctx, w, h, captionH, title, channel, timeLabel);

    const isJpeg = options.format === "jpeg";
    const quality = isJpeg ? Math.min(Math.max((options.quality || 90) / 100, 0.1), 1) : undefined;

    let dataUrl;
    try {
      dataUrl = canvas.toDataURL(isJpeg ? "image/jpeg" : "image/png", quality);
    } catch (e) {
      return { ok: false, error: "encode-failed" };
    }

    const videoId = getVideoId();
    const seconds = Math.floor(video.currentTime);
    return {
      ok: true,
      dataUrl,
      thumbnail: buildThumbnail(canvas),
      title,
      channel,
      timeLabel,
      videoId,
      videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s` : location.href,
      width: canvas.width,
      height: canvas.height
    };
  }

  /* ---------- Status & playback ---------- */

  function getStatus() {
    if (!isPlayerPage()) return { ok: true, hasVideo: false, reason: "not-watch" };
    const video = findVideo();
    if (!video) return { ok: true, hasVideo: false, reason: "no-video" };
    const live = !Number.isFinite(video.duration);
    return {
      ok: true,
      hasVideo: true,
      title: getVideoTitle(),
      channel: getChannelName(),
      currentTime: video.currentTime || 0,
      duration: live ? 0 : video.duration || 0,
      live,
      paused: video.paused
    };
  }

  function clampTime(video, t) {
    const max = Number.isFinite(video.duration) ? video.duration : Infinity;
    return Math.min(Math.max(t, 0), max);
  }

  async function handle(message) {
    const video = findVideo();
    switch (message.type) {
      case "get-status":
        return getStatus();
      case "seek":
        if (video) video.currentTime = clampTime(video, video.currentTime + message.delta);
        return getStatus();
      case "seek-to":
        if (video) video.currentTime = clampTime(video, message.seconds);
        return getStatus();
      case "step-frame":
        if (video) {
          video.pause();
          video.currentTime = clampTime(video, video.currentTime + message.direction * FRAME_STEP);
        }
        return getStatus();
      case "toggle-play":
        if (video) {
          if (video.paused) await video.play().catch(() => {});
          else video.pause();
        }
        return getStatus();
      case "capture-frame":
        return captureFrame(message.options || {});
      default:
        return { ok: false, error: "unknown-message" };
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.target !== TARGET) return false;
    handle(message)
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false, error: "exception" }));
    return true; // keep the channel open for the async response
  });
})();
