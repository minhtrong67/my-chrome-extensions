/**
 * background.js — Manifest V3 service worker.
 *  1. Keeps the toolbar badge in sync with the active column count.
 *  2. Handles the Alt+Shift+Y shortcut (toggle custom columns).
 *  3. Opens the settings page right after a fresh install (not on updates).
 */
importScripts("storage.js"); // shares sanitize()/store with every other surface

const BADGE_COLOR = "#F44336";

async function refreshBadge() {
  const s = await store.load();
  const show = s.enabled && s.useCustomColumns;
  // In per-page mode there is no single number; show the Home value.
  const n = s.perPageColumns ? s.columnsHome : s.columns;
  await chrome.action.setBadgeText({ text: show ? String(n) : "" });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  if (chrome.action.setBadgeTextColor) await chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
}

chrome.runtime.onInstalled.addListener((details) => {
  refreshBadge();
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(refreshBadge);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[SETTINGS_KEY]) refreshBadge();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-custom-columns") return;
  const s = await store.load();
  // Turning columns on also un-pauses the extension, otherwise the shortcut
  // would appear to do nothing while the master switch is off.
  await store.patch(
    s.useCustomColumns && s.enabled ? { useCustomColumns: false } : { enabled: true, useCustomColumns: true }
  );
});
