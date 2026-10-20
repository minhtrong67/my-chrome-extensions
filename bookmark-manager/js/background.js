/**
 * background.js — service worker.
 *  1. Removes orphaned tag/note metadata when a bookmark is deleted anywhere.
 *  2. Keeps the toolbar badge = total bookmark count, coloured with the theme.
 *  3. Alt+Shift+M: bookmarks the active tab instantly, with a notification.
 */
importScripts("theme.js", "i18n.js", "storage.js");

async function lang() { return resolveLang(await store.loadSettings()); }

chrome.runtime.onInstalled.addListener(async () => {
  const saved = await storageGet([SETTINGS_KEY]);
  if (!saved[SETTINGS_KEY]) await store.saveSettings({ ...DEFAULT_SETTINGS });
  refreshBadge();
});
chrome.runtime.onStartup.addListener(refreshBadge);

// ── 1. Orphaned metadata cleanup ──
chrome.bookmarks.onRemoved.addListener(async (id, info) => {
  const ids = [id];
  (function collect(n) { if (!n) return; if (n.id && n.id !== id) ids.push(n.id); (n.children || []).forEach(collect); })(info && info.node);
  await store.deleteMetaMany(ids);
  refreshBadge();
});
chrome.bookmarks.onCreated.addListener(refreshBadge);
chrome.bookmarks.onImportEnded?.addListener(refreshBadge);

// ── 2. Toolbar badge ──
async function refreshBadge() {
  try {
    const tree = await chrome.bookmarks.getTree();
    let count = 0;
    (function walk(nodes) { for (const n of nodes) { if (n.url) count++; else if (n.children) walk(n.children); } })(tree);
    const settings = await store.loadSettings();
    await chrome.action.setBadgeText({ text: count > 0 ? (count > 999 ? "999+" : String(count)) : "" });
    await chrome.action.setBadgeBackgroundColor({ color: buildScheme(colorById(settings.color).hex, false)["--md-primary"] });
    await chrome.action.setBadgeTextColor?.({ color: "#ffffff" });
  } catch (_) {}
}
chrome.storage.onChanged.addListener((changes) => { if (changes[SETTINGS_KEY]) refreshBadge(); });

// ── 3. Keyboard shortcut ──
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "quick-bookmark") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !/^(https?|ftp|file):/i.test(tab.url)) return;
  const t = I18N[await lang()];
  const name = tab.title || tab.url;

  const existing = await chrome.bookmarks.search({ url: tab.url });
  if (existing.length) return notify("TagMark", `${name} — ${t.notifyAlready}`);

  try {
    const { lastFolderId } = await store.loadSettings();
    let parentId;
    if (lastFolderId) { try { await chrome.bookmarks.getSubTree(lastFolderId); parentId = lastFolderId; } catch (_) {} }
    await chrome.bookmarks.create({ parentId, title: name, url: tab.url });
    notify("TagMark", `${t.notifySaved}: ${name}`);
  } catch (_) {
    notify("TagMark", t.notifyFailed);
  }
});

function notify(title, message) {
  chrome.notifications?.create({ type: "basic", iconUrl: "icons/icon128.png", title, message });
}
