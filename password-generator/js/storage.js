/* Settings live in chrome.storage.local. Generated-password history lives in
 * chrome.storage.session, which the browser wipes when it closes, so secrets
 * are never written to disk. Falls back to localStorage / memory when the
 * extension APIs are unavailable (e.g. when the page is opened for testing). */

const DEFAULT_SETTINGS = {
  language: "auto", // auto | en | vi
  theme: "system",  // system | light | dark
  color: "teal",
  mode: "password", // password | passphrase | pin
  length: 16,
  upper: true, lower: true, numbers: true, symbols: true,
  excludeAmbiguous: false, noDuplicate: false, customExclude: "",
  wordCount: 4, separator: "-", capitalize: true, addNumber: true,
  pinLength: 6
};

const SETTINGS_KEY = "pg_settings";
const HISTORY_KEY = "pg_history";
const APPEARANCE_KEY = "pg-appearance"; // synchronous mirror read by boot.js to avoid a theme flash
const HISTORY_LIMIT = 8;

const ext = typeof chrome !== "undefined" && chrome.storage ? chrome.storage : null;
const memoryHistory = [];

const store = {
  async loadSettings() {
    let saved = {};
    try {
      if (ext && ext.local) saved = (await ext.local.get(SETTINGS_KEY))[SETTINGS_KEY] || {};
      else saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    } catch (_) { /* use defaults */ }
    return { ...DEFAULT_SETTINGS, ...saved };
  },

  async saveSettings(settings) {
    try {
      if (ext && ext.local) await ext.local.set({ [SETTINGS_KEY]: settings });
      else localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (_) { /* best effort */ }
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ theme: settings.theme, color: settings.color }));
    } catch (_) { /* best effort */ }
  },

  async loadHistory() {
    try {
      if (ext && ext.session) return (await ext.session.get(HISTORY_KEY))[HISTORY_KEY] || [];
    } catch (_) { /* fall through */ }
    return memoryHistory.slice();
  },

  async saveHistory(list) {
    try {
      if (ext && ext.session) { await ext.session.set({ [HISTORY_KEY]: list }); return; }
    } catch (_) { /* fall through */ }
    memoryHistory.length = 0;
    memoryHistory.push(...list);
  },

  async addToHistory(value) {
    const list = (await this.loadHistory()).filter((v) => v !== value);
    list.unshift(value);
    const next = list.slice(0, HISTORY_LIMIT);
    await this.saveHistory(next);
    return next;
  },

  async clearHistory() { await this.saveHistory([]); }
};
