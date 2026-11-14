// SmartShot — background service worker (Manifest V3)
// Author: minhtrong67 (with AI support from Claude)

importScripts("storage.js", "i18n.js");

const OFFSCREEN_URL = "offscreen.html";
const CAPTURE_MIN_DELAY = 600; // chrome.tabs.captureVisibleTab allows ~2 calls/second
const CAPTURE_TTL = 6 * 60 * 60 * 1000;
// Fluent brand / success / danger colors
const BADGE_BRAND = "#0F6CBD";
const BADGE_OK = "#107C10";
const BADGE_ERROR = "#C50F1F";

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

async function captureVisible(tab) {
  const dataUrl = await grab(tab);
  return offscreen("encode-image", { dataUrl });
}

async function captureArea(tab) {
  await ensureContentScript(tab.id);
  const selection = await sendToContent(tab.id, {
    type: "start-area-selection",
    hint: i18n.t("selectHint")
  });
  if (!selection || !selection.ok) return { cancelled: true };

  const dataUrl = await grab(tab);
  return offscreen("crop-image", { dataUrl, rect: selection.rect, viewportWidth: selection.viewportWidth });
}

async function captureFullPage(tab) {
  await ensureContentScript(tab.id);
  await sendToContent(tab.id, { type: "prepare-fullpage" });
  const m = await sendToContent(tab.id, { type: "get-page-metrics" });

  let vh = m.viewportHeight;         // refined after the first frame (what one screenshot really covers)
  let limitHeight = m.totalHeight;   // may shrink if the canvas size limit is hit
  let truncated = false;
  const stepCount = Math.max(1, Math.ceil(m.totalHeight / vh));
  let y = 0;
  let lastY = -1;
  let index = 0;
  let ok = false;

  try {
    await offscreen("stitch-begin", { totalWidth: m.viewportWidth, totalHeight: m.totalHeight });
    while (true) {
      const targetY = Math.max(0, Math.min(y, limitHeight - vh));
      const moved = await sendToContent(tab.id, { type: "scroll-to", x: 0, y: targetY });
      const actualY = moved && typeof moved.scrollY === "number" ? moved.scrollY : targetY;
      if (index > 0 && actualY <= lastY + 1) break;   // the page can't scroll any further
      if (index === 1) await sendToContent(tab.id, { type: "hide-fixed" });
      await sleep(CAPTURE_MIN_DELAY);
      setBadge(`${index + 1}/${stepCount}`, BADGE_BRAND);

      const dataUrl = await grab(tab);
      const res = await offscreen("stitch-add", { dataUrl, y: actualY, viewportWidth: m.viewportWidth });
      if (res.maxCssHeight && res.maxCssHeight < limitHeight) {
        limitHeight = res.maxCssHeight;
        truncated = true;
      }
      if (index === 0 && res.imgCssHeight && res.imgCssHeight < vh - 1) vh = Math.max(1, Math.floor(res.imgCssHeight));

      lastY = actualY;
      index++;
      if (actualY + vh >= limitHeight - 0.5) break;
      y = actualY + vh;
    }
    ok = true;
  } finally {
    if (!ok) offscreen("stitch-abort").catch(() => {}); // free the half-built canvas
    // Always put the page back, even when a capture step fails halfway.
    try { await sendToContent(tab.id, { type: "restore", x: m.originalScrollX, y: m.originalScrollY }); } catch (e) { /* tab gone */ }
  }

  const result = await offscreen("stitch-end", {});
  return { ...result, truncated };
}

/* ============ Save to the default Downloads folder ============ */

const pendingDownloads = new Map(); // downloadId -> { url, cid }

async function downloadCapture(result, captureType) {
  const { url } = await offscreen("blob-url", { id: result.id });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `smartshot-${captureType}-${stamp}.png`;
  try {
    // A relative filename lands in the user's default Downloads folder, no prompt.
    const downloadId = await chrome.downloads.download({ url, filename, saveAs: false, conflictAction: "uniquify" });
    pendingDownloads.set(downloadId, { url, cid: result.id });
    return { filename, downloadId };
  } catch (err) {
    offscreen("revoke-url", { url }).catch(() => {});
    throw err;
  }
}

// Free the blob URL and the stored capture once the file is on disk (or the download failed).
chrome.downloads.onChanged.addListener((delta) => {
  const job = pendingDownloads.get(delta.id);
  if (!job || !delta.state || delta.state.current === "in_progress") return;
  pendingDownloads.delete(delta.id);
  offscreen("revoke-url", { url: job.url }).catch(() => {});
  capturesDb.delete(job.cid).catch(() => {});
});

/* ============ Badge helpers ============ */

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

  try {
    const settings = await store.loadSettings();
    i18n.current = resolveLanguage(settings.language);

    let tab;
    if (hintedTabId) tab = await chrome.tabs.get(hintedTabId);
    else [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.id) return;

    capturesDb.purgeOld(CAPTURE_TTL).catch(() => {});
    setBadge("…", BADGE_BRAND);

    let result;
    if (captureType === "visible") result = await captureVisible(tab);
    else if (captureType === "area") result = await captureArea(tab);
    else if (captureType === "fullpage") result = await captureFullPage(tab);
    else { chrome.action.setBadgeText({ text: "" }); return; }

    if (result.cancelled) { chrome.action.setBadgeText({ text: "" }); return; }

    const { filename, downloadId } = await downloadCapture(result, captureType);
    await store.upsertHistory({ cid: result.id, captureType, filename, downloadId, format: "png", thumbnail: result.thumbnail });
    flashBadge("✓", BADGE_OK, result.truncated ? i18n.t("errTooTall") : i18n.t("toastSavedToDownloads"));
  } catch (err) {
    flashBadge("!", BADGE_ERROR, friendlyError(err));
  } finally {
    busy = false;
  }
}

/* ============ Keyboard shortcuts ============ */

const COMMAND_TYPES = { "capture-visible": "visible", "capture-fullpage": "fullpage", "capture-area": "area" };

chrome.commands.onCommand.addListener((command, tab) => {
  const type = COMMAND_TYPES[command];
  if (type) performCapture(type, tab && tab.id);
});

/* ============ Messages from popup ============ */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "capture" && message.captureType) {
    performCapture(message.captureType, message.tabId);
    sendResponse({ ok: true });
  }
  return false;
});

chrome.runtime.onStartup.addListener(() => capturesDb.purgeOld(CAPTURE_TTL).catch(() => {}));
