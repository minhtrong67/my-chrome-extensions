// background.js — Service Worker
//
// Classic (non-module) service worker, so it can importScripts() the exact
// same shared.js used by popup.js/options.js — this is what guarantees the
// right-click menu and the popup's bulk-save always agree on "does this
// image get converted to JPG, or downloaded as-is?" (see shouldConvertExt
// in shared.js). Previously this file carried its own duplicated copy of
// the filename/folder helpers, which is exactly how the convert-toggle bug
// slipped in: the popup and the context menu quietly drifted apart.
importScripts("shared.js");

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set({ ...DEFAULT_SETTINGS, ...stored });
  createContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});

function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "saveWithPicsGrab",
      title: "Save image with Pics Grab",
      contexts: ["image"]
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveWithPicsGrab" && info.srcUrl) {
    await processImage(info.srcUrl, tab);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_IMAGE") {
    processImage(message.url, null, message.saveAs).then(result => {
      sendResponse({ success: true, result });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
});

async function processImage(srcUrl, tab, forceSaveAs) {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  // saveAs dialog: always open when mode is "ask", or when explicitly forced
  const openSaveAs = forceSaveAs || settings.saveMode === "ask";

  const tabId = tab ? tab.id : (await getActiveTab())?.id;
  if (!tabId) return;

  const ext = getExtFromUrl(srcUrl);
  const convert = shouldConvertExt(ext, settings);
  const finalExt = convert ? "jpg" : ext;

  let dataUrl = null;
  if (convert) {
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: fetchImageAsDataURL,
        args: [srcUrl, settings.quality]
      });
      dataUrl = result?.[0]?.result || null;
    } catch (_) {}
  }

  const filename = buildDownloadPath(srcUrl, settings, finalExt);

  try {
    await chrome.downloads.download({
      url: dataUrl || srcUrl,
      filename: dataUrl ? filename : undefined,
      conflictAction: openSaveAs ? undefined : settings.conflictAction,
      saveAs: openSaveAs
    });

    if (!openSaveAs && settings.showNotification) {
      chrome.notifications?.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Pics Grab",
        message: `Saved: ${filename.split("/").pop()}`
      });
    }
  } catch (err) {
    console.error("download error:", err);
    // Fallback without filename
    chrome.downloads.download({ url: srcUrl, saveAs: openSaveAs });
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Injected into page context. Only ever called when shouldConvertExt() has
// already decided this image needs converting.
function fetchImageAsDataURL(srcUrl, quality) {
  return new Promise((resolve) => {
    function tryConvert(img) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width  = img.naturalWidth  || img.width  || 1;
        canvas.height = img.naturalHeight || img.height || 1;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", (quality || 92) / 100));
      } catch (_) { resolve(null); }
    }

    const img1 = new Image();
    img1.crossOrigin = "anonymous";
    img1.onload = () => tryConvert(img1);
    img1.onerror = () => {
      const img2 = new Image();
      img2.onload = () => tryConvert(img2);
      img2.onerror = () => resolve(null);
      img2.src = srcUrl;
    };
    img1.src = srcUrl;
  });
}
