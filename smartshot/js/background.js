// SmartShot — background service worker (Manifest V3)
// Author: minhtrong67 (with AI support from Claude)

importScripts("accents.js", "fonts.js", "storage.js", "i18n.js");

const OFFSCREEN_URL = "offscreen.html";
const CAPTURE_MIN_DELAY = 550; // chrome.tabs.captureVisibleTab allows ~2 calls/second
const CAPTURE_TTL = 6 * 60 * 60 * 1000;
const BADGE = { progress: "#9C27B0", ok: "#2E7D32", error: "#B3261E" };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let busy = false;

/* ============ Offscreen document lifecycle ============ */

let creatingOffscreen = null;

async function hasOffscreenDocument() {
  if (!chrome.runtime.getContexts) return false;
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)]
  });
  return contexts.length > 0;
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: ["BLOBS"],
        justification: "Crop, stitch and encode captured screenshots into image blobs."
      })
      .catch((err) => {
        if (!/single offscreen|already exists/i.test(String(err))) throw err;
      })
      .finally(() => { creatingOffscreen = null; });
  }
  await creatingOffscreen;
}

async function offscreen(type, payload) {
  await ensureOffscreenDocument();
  const res = await chrome.runtime.sendMessage({ target: "offscreen", type, payload });
  if (!res || !res.ok) throw new Error((res && res.error) || "Offscreen task failed");
  return res;
}

/* ============ Content script helpers ============ */

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ["js/content.js"] });
}

function sendToContent(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { target: "content", ...message }, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(response);
    });
  });
}

const grab = (tab) => chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });

/* ============ Capture flows (each returns { id, width, height, thumbnail, ... }) ============ */

async function captureVisible(tab, settings) {
  const dataUrl = await grab(tab);
  return offscreen("encode-image", { dataUrl, format: settings.format, quality: settings.quality / 100 });
}

async function captureArea(tab, settings) {
  await ensureContentScript(tab.id);
  const selection = await sendToContent(tab.id, {
    type: "start-area-selection",
    hint: i18n.t("selectHint")
  });
  if (!selection || !selection.ok) return { cancelled: true };

  const dataUrl = await grab(tab);
  return offscreen("crop-image", {
    dataUrl,
    rect: selection.rect,
    viewportWidth: selection.viewportWidth,
    format: settings.format,
    quality: settings.quality / 100
  });
}

async function captureFullPage(tab, settings) {
  await ensureContentScript(tab.id);
  await sendToContent(tab.id, { type: "prepare-fullpage" });
  const m = await sendToContent(tab.id, { type: "get-page-metrics" });
  const delay = Math.max(settings.fullPageDelay, CAPTURE_MIN_DELAY);
  const vh = m.viewportHeight;

  let limitHeight = m.totalHeight;   // may shrink if the canvas size limit is hit
  let truncated = false;
  const stepCount = Math.max(1, Math.ceil(m.totalHeight / vh));
  let y = 0;
  let index = 0;

  try {
    await offscreen("stitch-begin", { totalWidth: m.viewportWidth, totalHeight: m.totalHeight });
    while (true) {
      const targetY = Math.max(0, Math.min(y, limitHeight - vh));
      await sendToContent(tab.id, { type: "scroll-to", x: 0, y: targetY });
      if (index === 1) await sendToContent(tab.id, { type: "hide-fixed" });
      await sleep(delay);
      setBadge(`${index + 1}/${stepCount}`, BADGE.progress);

      const dataUrl = await grab(tab);
      const res = await offscreen("stitch-add", {
        dataUrl, y: targetY, viewportWidth: m.viewportWidth
      });
      if (res.maxCssHeight && res.maxCssHeight < limitHeight) {
        limitHeight = res.maxCssHeight;
        truncated = true;
      }

      index++;
      if (targetY + vh >= limitHeight - 0.5) break;
      y += vh;
    }
  } finally {
    // Always put the page back, even when a capture step fails halfway.
    try { await sendToContent(tab.id, { type: "restore", x: m.originalScrollX, y: m.originalScrollY }); } catch (e) { /* tab gone */ }
  }

  const result = await offscreen("stitch-end", {
    format: settings.format,
    quality: settings.quality / 100,
    cssHeight: Math.min(limitHeight, m.totalHeight)
  });
  return { ...result, truncated };
}

/* ============ Delivery helpers ============ */

function generateFilename(type, format) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `smartshot-${type}-${stamp}.${format === "jpeg" ? "jpg" : "png"}`;
}

function setBadge(text, color) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
}

let badgeTimer = null;
function flashBadge(text, color, titleText) {
  setBadge(text, color);
  chrome.action.setTitle({ title: titleText ? `SmartShot — ${titleText}` : "SmartShot" });
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => {
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setTitle({ title: "SmartShot" });
  }, 3500);
}

async function downloadCapture(id, filename) {
  const { url } = await offscreen("blob-url", { id });
  await chrome.downloads.download({ url, filename, saveAs: false });
}

/** Copy via the page itself — offscreen documents are never focused, so they can't write to the clipboard. */
async function copyViaTab(tab, id) {
  const { dataUrl } = await offscreen("png-data-url", { id });
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [dataUrl],
    func: async (url) => {
      try {
        if (!navigator.clipboard || !window.ClipboardItem) return { ok: false };
        window.focus();
        const blob = await (await fetch(url)).blob();
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        return { ok: true };
      } catch (e) { return { ok: false }; }
    }
  });
  return !!(injection && injection.result && injection.result.ok);
}

function friendlyError(err) {
  const msg = String((err && err.message) || err);
  if (/cannot access|extensions gallery|chrome:\/\/|devtools|not allowed|cannot be scripted|activeTab|permission/i.test(msg)) {
    return i18n.t("errRestricted");
  }
  return i18n.t("errFailed");
}

/* ============ Main entry point ============ */

async function performCapture(captureType, hintedTabId) {
  if (busy) return;
  busy = true;

  const settings = await store.loadSettings();
  i18n.current = resolveLanguage(settings.language);

  try {
    let tab;
    if (hintedTabId) tab = await chrome.tabs.get(hintedTabId);
    else [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.id) return;

    capturesDb.purgeOld(CAPTURE_TTL).catch(() => {});
    setBadge("…", BADGE.progress);

    let result;
    if (captureType === "visible") result = await captureVisible(tab, settings);
    else if (captureType === "area") result = await captureArea(tab, settings);
    else if (captureType === "fullpage") result = await captureFullPage(tab, settings);
    else return;

    if (result.cancelled) { chrome.action.setBadgeText({ text: "" }); return; }

    const note = result.truncated ? i18n.t("errTooTall") : "";

    if (settings.openEditorAfterCapture) {
      await store.addToHistory(
        { captureType, filename: null, format: settings.format, action: "editor", thumbnail: result.thumbnail },
        settings.historyLimit
      );
      await chrome.tabs.create({
        url: chrome.runtime.getURL(`editor.html?id=${encodeURIComponent(result.id)}&type=${captureType}`)
      });
      flashBadge("✓", BADGE.ok, note);
      return;
    }

    let action = settings.afterCapture;
    let filename = null;

    if (action === "clipboard") {
      let copied = false;
      try { copied = await copyViaTab(tab, result.id); } catch (e) { copied = false; }
      if (copied) {
        await offscreen("delete-capture", { id: result.id }).catch(() => {});
      } else {
        action = "download"; // clipboard unavailable on this page (e.g. plain http://) — don't lose the shot
      }
    }
    if (action === "download") {
      filename = generateFilename(captureType, settings.format);
      await downloadCapture(result.id, filename);
    }

    await store.addToHistory(
      { captureType, filename, format: settings.format, action, thumbnail: result.thumbnail },
      settings.historyLimit
    );
    flashBadge("✓", BADGE.ok, note);
  } catch (err) {
    flashBadge("!", BADGE.error, friendlyError(err));
  } finally {
    busy = false;
  }
}

/* ============ Messages from popup ============ */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "capture" && message.captureType) {
    performCapture(message.captureType, message.tabId);
    sendResponse({ ok: true });
    return false;
  }
  if (message && message.type === "get-busy") {
    sendResponse({ busy });
    return false;
  }
  return false;
});

chrome.runtime.onStartup.addListener(() => capturesDb.purgeOld(CAPTURE_TTL).catch(() => {}));
