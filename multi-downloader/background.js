// background.js — service worker (classic script so it can importScripts shared code).
// Owns the whole save pipeline, so downloads keep running after the popup closes.
importScripts("js/core.js", "js/i18n.js", "js/inject.js");

const CONCURRENCY = 4;
const cancelled = new Set();   // batchIds the popup asked to cancel
const popupPorts = new Set();  // open popup connections (used to decide whether to notify)

// ── Lifecycle ───────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => createContextMenu());
chrome.runtime.onStartup.addListener(() => createContextMenu());
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.language) createContextMenu();
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "popup") return;
  popupPorts.add(port);
  port.onDisconnect.addListener(() => popupPorts.delete(port));
});

async function currentT() {
  const s = await getSettings();
  return { t: makeT(resolveLang(s.language)), settings: s };
}

async function createContextMenu() {
  const { t } = await currentT();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "multiDownloaderSave", title: t("ctxSave"), contexts: ["image"] });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "multiDownloaderSave" || !info.srcUrl) return;
  const { t, settings } = await currentT();
  const stats = await runBatch({ urls: [info.srcUrl], tabId: tab && tab.id, batchId: "ctx-" + Date.now(), bulk: false });
  const r = stats.results[0] || {};
  if (r.ok) {
    if (settings.showNotification && settings.saveMode !== "ask") notify(t("savedFile", r.filename.split("/").pop()));
  } else {
    notify(r.reason === "FORMAT_NOT_ALLOWED" ? t("skipFormat") : r.skipped ? t("skipProcessing") : t("saveFailed"));
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "SAVE_BATCH") {
    runBatch(msg).then(async (stats) => {
      const { t, settings } = await currentT();
      // Popup closed mid-batch? Tell the user via a notification instead.
      if (msg.bulk && !popupPorts.size && settings.showNotification && !stats.cancelled) {
        notify(t("batchDone", stats.done, stats.skipped + stats.failed));
      }
      sendResponse(stats);
    });
    return true; // async response
  }
  if (msg && msg.type === "CANCEL_BATCH") cancelled.add(msg.batchId);
});

function notify(message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon128.png"),
    title: "Multi Downloader",
    message
  }, () => void chrome.runtime.lastError);
}

// ── Batch runner (bounded concurrency) ──────────────────────
async function runBatch({ urls, tabId, batchId, bulk }) {
  const settings = await getSettings();
  if (tabId == null) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab && tab.id;
  }
  const total = urls.length;
  const stats = { total, done: 0, skipped: 0, failed: 0, cancelled: false, folder: null, results: new Array(total) };
  // A Save-As dialog per file is unusable in bulk, so "ask" mode drops into a fixed folder.
  const folder = bulk && settings.saveMode === "ask" ? BULK_FALLBACK_FOLDER : null;
  const openSaveAs = !bulk && settings.saveMode === "ask";
  stats.folder = folder;
  let next = 0;

  async function worker() {
    while (true) {
      if (cancelled.has(batchId)) return;
      const i = next++;
      if (i >= total) return;
      let r;
      try {
        r = await saveOne(urls[i], { tabId, settings, index: i + 1, openSaveAs, folder });
      } catch (err) {
        console.error("save failed:", urls[i], err);
        r = { failed: true };
      }
      stats.results[i] = r;
      if (r.ok) stats.done++; else if (r.skipped) stats.skipped++; else stats.failed++;
      chrome.runtime.sendMessage({ type: "BATCH_PROGRESS", batchId, total, done: stats.done, skipped: stats.skipped, failed: stats.failed })
        .catch(() => {});
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));
  stats.cancelled = cancelled.delete(batchId);
  return stats;
}

// ── One image: analyse → (maybe) fix/convert → download ─────
async function saveOne(srcUrl, { tabId, settings, index, openSaveAs, folder }) {
  const ext = getExtFromUrl(srcUrl);
  if (!isAllowedExt(ext)) return { skipped: true, reason: "FORMAT_NOT_ALLOWED" };

  const convert = shouldConvertExt(ext, settings);
  const cfg = {
    minDim: MIN_IMAGE_DIMENSION, maxRatio: MAX_ASPECT_RATIO,
    convert, outMime: convert ? "image/jpeg" : MIME_FOR_EXT[ext], quality: settings.quality
  };

  // 1) Decode inside the page (honours the site's cookies / referer rules).
  let res = null;
  if (tabId != null) {
    try {
      const out = await chrome.scripting.executeScript({ target: { tabId }, func: processImageInPage, args: [srcUrl, cfg] });
      res = (out && out[0] && out[0].result) || null;
    } catch (_) { /* restricted tab — fall through to the worker */ }
  }
  // 2) Cross-origin canvas locked, or the page couldn't decode it → retry from the extension
  //    (host_permissions let the worker fetch without CORS).
  if (!res || res.status === "tainted" || res.status === "unreadable") {
    try { res = await processInWorker(srcUrl, cfg); } catch (_) { /* keep whatever we learned from the page */ }
  }
  if (!res) res = { status: "unreadable" };

  let dataUrl = null;
  if (res.status === "processed") dataUrl = res.dataUrl;
  else if (res.status === "tainted") {
    // Can't fix it. Fine if it already meets the requirement (just skip the JPG conversion).
    if (res.needsFix) return { skipped: true, reason: "PROCESSING_FAILED" };
  } else if (res.status !== "original") {
    return { skipped: true, reason: "PROCESSING_FAILED" };
  }

  const outExt = dataUrl && convert ? "jpg" : ext;
  const filename = buildDownloadPath(srcUrl, settings, outExt, { index, folder });
  const url = dataUrl || srcUrl;
  try {
    await chrome.downloads.download({ url, filename, conflictAction: settings.conflictAction, saveAs: openSaveAs });
  } catch (err) {
    // Bad filename for the OS/browser → let Chrome pick one.
    await chrome.downloads.download({ url, saveAs: openSaveAs });
  }
  return { ok: true, filename };
}

// Worker-side fallback: fetch → decode → OffscreenCanvas (no CORS taint inside an extension).
async function processInWorker(src, cfg) {
  const resp = await fetch(src, { credentials: "include" });
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  const bmp = await createImageBitmap(await resp.blob());
  const w = bmp.width, h = bmp.height;
  const needsFix = !meetsImageRequirements(w, h);
  if (!needsFix && !cfg.convert) { bmp.close(); return { status: "original", w, h, needsFix }; }
  const crop = computeCropAndScale(w, h);
  const canvas = new OffscreenCanvas(crop.dw, crop.dh);
  const ctx = canvas.getContext("2d");
  if (cfg.outMime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, crop.dw, crop.dh); }
  ctx.drawImage(bmp, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.dw, crop.dh);
  bmp.close();
  const blob = await canvas.convertToBlob({ type: cfg.outMime, quality: (cfg.quality || 92) / 100 });
  return { status: "processed", w, h, needsFix, dataUrl: await blobToDataUrl(blob) };
}

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  return "data:" + (blob.type || "application/octet-stream") + ";base64," + btoa(bin);
}
