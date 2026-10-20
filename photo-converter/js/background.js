// Photo Converter — background service worker (author: minhtrong67, built with Claude)

importScripts("i18n.js", "storage.js");

const MENU_PARENT_ID = "save-image-as-parent";
const OFFSCREEN_URL = "offscreen.html";

/* ============ Offscreen document lifecycle ============ */

let creatingOffscreen = null;

async function hasOffscreenDocument() {
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
        justification: "Decode and re-encode images (fetch + canvas) to save them in another format."
      })
      .catch((err) => { if (!String(err).includes("single offscreen")) throw err; })
      .finally(() => { creatingOffscreen = null; });
  }
  await creatingOffscreen;
}

async function convertViaOffscreen(payload) {
  await ensureOffscreenDocument();
  return chrome.runtime.sendMessage({ target: "offscreen", type: "convert-image", payload });
}

/* ============ Context menus (serialised so two rebuilds never collide) ============ */

let menuQueue = Promise.resolve();
function rebuildContextMenus() {
  menuQueue = menuQueue.then(async () => {
    const s = await store.loadSettings();
    i18n.setLang(s.language);
    await new Promise((resolve) => chrome.contextMenus.removeAll(resolve));
    const items = [
      [s.menuOriginal, "save-original", "menuOriginal"],
      [s.menuPng, "save-png", "menuPng"],
      [s.menuJpeg, "save-jpeg", "menuJpeg"],
      [s.menuWebp, "save-webp", "menuWebp"]
    ].filter((i) => i[0]);
    if (!items.length) return; // nothing enabled → no menu at all
    chrome.contextMenus.create({ id: MENU_PARENT_ID, title: i18n.t("saveImageAs"), contexts: ["image"] });
    items.forEach(([, id, key]) =>
      chrome.contextMenus.create({ id, parentId: MENU_PARENT_ID, title: i18n.t(key), contexts: ["image"] })
    );
  }).catch(() => {});
  return menuQueue;
}

/* ============ Helpers ============ */

function sanitizeFilename(name) {
  return String(name).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "image";
}

function baseNameFromUrl(url) {
  if (/^data:/i.test(url)) return "image"; // data: URLs have no meaningful file name
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop() || "image";
    return sanitizeFilename(decodeURIComponent(last).replace(/\.[a-z0-9]{1,5}$/i, ""));
  } catch (_) { return "image"; }
}

let badgeTimer = null;
function flashBadge(text, color) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2200);
}

function notify(ok) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: i18n.t(ok ? "notifyDoneTitle" : "notifyFailedTitle"),
    message: i18n.t(ok ? "notifyDone" : "notifyFailed")
  });
}

/* ============ Core save flow ============ */

async function saveImageFromUrl(imageUrl, format, source) {
  const settings = await store.loadSettings();
  i18n.setLang(settings.language);
  try {
    const result = await convertViaOffscreen({ url: imageUrl, format, quality: settings.defaultQuality });
    if (!result || !result.ok) throw new Error((result && result.error) || "Conversion error");

    const ext = result.ext && result.ext !== "img" ? result.ext : extFromUrl(imageUrl);
    const filename = `${baseNameFromUrl(imageUrl)}.${ext}`;
    await chrome.downloads.download({ url: result.blobUrl, filename, saveAs: settings.askFilename, conflictAction: "uniquify" });

    await store.addToHistory({ source, originalUrl: imageUrl, filename, format, thumbnail: result.thumbnail || "" }, settings.historyLimit);
    flashBadge("✓", "#2E9E5B");
    if (settings.showNotification) notify(true);
  } catch (err) {
    // The user closing the "Save as" dialog is not a failure.
    if (String(err && err.message).includes("canceled")) return;
    flashBadge("!", "#E0522E");
    if (settings.showNotification) notify(false);
  }
}

function extFromUrl(url) {
  try {
    const m = new URL(url).pathname.match(/\.([a-z0-9]{2,4})$/i);
    return m ? m[1].toLowerCase() : "img";
  } catch (_) { return "img"; }
}

/* ============ Event wiring ============ */

chrome.runtime.onInstalled.addListener(rebuildContextMenus);
chrome.runtime.onStartup.addListener(rebuildContextMenus);

chrome.contextMenus.onClicked.addListener((info) => {
  if (!info.srcUrl) return;
  const format = { "save-original": "original", "save-png": "png", "save-jpeg": "jpeg", "save-webp": "webp" }[info.menuItemId];
  if (format) saveImageFromUrl(info.srcUrl, format, "context-menu");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || sender.id !== chrome.runtime.id) return false;
  if (message.type === "rebuild-context-menus") {
    rebuildContextMenus().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === "redo-save" && message.payload && /^https?:|^data:image\//i.test(message.payload.url || "")) {
    saveImageFromUrl(message.payload.url, message.payload.format, "context-menu").then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});
