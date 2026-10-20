// Photo Converter — storage module (author: minhtrong67, built with Claude)
// Shared by popup.html (<script>) and background.js (importScripts).

const DEFAULT_SETTINGS = {
  language: null, // null = auto-detect on first run
  theme: "system", // light | dark | system
  color: "#FF5722", // Material seed colour
  showHistory: true,
  historyLimit: 10,
  defaultFormat: "png",
  defaultQuality: 90,
  askFilename: false,
  showNotification: true,
  menuOriginal: true,
  menuPng: true,
  menuJpeg: true,
  menuWebp: true
};

const APP_VERSION = "3.0.0";
const STORAGE_KEY = "photoconverter_settings";
const HISTORY_KEY = "photoconverter_history";
const LEGACY_KEYS = [
  ["pixflip_settings", "pixflip_history"],
  ["saveimageas_settings", "saveimageas_history"]
];

function detectLanguage() {
  let lang = "en";
  try {
    lang = (chrome.i18n && chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()) || navigator.language || "en";
  } catch (_) { /* keep default */ }
  return /^vi/i.test(lang) ? "vi" : "en";
}

/** Whitelists + validates every setting so imported/legacy data can never poison the app. */
function sanitizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === "object" ? raw : {}) };
  const out = {};
  out.language = s.language === "vi" || s.language === "en" ? s.language : detectLanguage();
  out.theme = ["light", "dark", "system"].includes(s.theme) ? s.theme : "system";
  out.color = /^#[0-9a-f]{6}$/i.test(s.color) ? s.color.toUpperCase() : DEFAULT_SETTINGS.color;
  out.showHistory = !!s.showHistory;
  out.historyLimit = [5, 10, 20].includes(Number(s.historyLimit)) ? Number(s.historyLimit) : 10;
  out.defaultFormat = ["png", "jpeg", "webp"].includes(s.defaultFormat) ? s.defaultFormat : "png";
  const q = Number(s.defaultQuality);
  out.defaultQuality = q >= 1 && q <= 100 ? Math.round(q) : 90;
  out.askFilename = !!s.askFilename;
  out.showNotification = !!s.showNotification;
  ["menuOriginal", "menuPng", "menuJpeg", "menuWebp"].forEach((k) => (out[k] = !!s[k]));
  return out;
}

const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

function storageGet(keys) {
  return new Promise((resolve) => {
    if (hasChromeStorage) return chrome.storage.local.get(keys, (r) => resolve(r || {}));
    const result = {};
    (Array.isArray(keys) ? keys : [keys]).forEach((k) => {
      try { const raw = localStorage.getItem(k); if (raw !== null) result[k] = JSON.parse(raw); } catch (_) {}
    });
    resolve(result);
  });
}

function storageSet(obj) {
  return new Promise((resolve) => {
    if (hasChromeStorage) return chrome.storage.local.set(obj, () => resolve());
    try { Object.keys(obj).forEach((k) => localStorage.setItem(k, JSON.stringify(obj[k]))); } catch (_) {}
    resolve();
  });
}

/** One-time migration from PixFlip / SaveImageAs so nobody loses data after the rename. */
let _migration = null;
function migrateLegacyKeys() {
  if (_migration) return _migration;
  _migration = (async () => {
    try {
      const cur = await storageGet([STORAGE_KEY, HISTORY_KEY]);
      const patch = {};
      for (const [sKey, hKey] of LEGACY_KEYS) {
        const old = await storageGet([sKey, hKey]);
        if (!cur[STORAGE_KEY] && !patch[STORAGE_KEY] && old[sKey]) patch[STORAGE_KEY] = sanitizeSettings(old[sKey]);
        if (!cur[HISTORY_KEY] && !patch[HISTORY_KEY] && Array.isArray(old[hKey])) patch[HISTORY_KEY] = old[hKey];
      }
      if (Object.keys(patch).length) await storageSet(patch);
    } catch (_) { /* best effort */ }
  })();
  return _migration;
}

const store = {
  async loadSettings() {
    await migrateLegacyKeys();
    const r = await storageGet([STORAGE_KEY]);
    return sanitizeSettings(r[STORAGE_KEY]);
  },
  async saveSettings(settings) {
    await storageSet({ [STORAGE_KEY]: sanitizeSettings(settings) });
  },
  async resetSettings() {
    const fresh = sanitizeSettings({});
    await storageSet({ [STORAGE_KEY]: fresh });
    return fresh;
  },
  async loadHistory() {
    await migrateLegacyKeys();
    const r = await storageGet([HISTORY_KEY]);
    return Array.isArray(r[HISTORY_KEY]) ? r[HISTORY_KEY] : [];
  },
  async saveHistory(history) {
    await storageSet({ [HISTORY_KEY]: history });
  },
  /** Adds one or many entries with a single read + single write. */
  async addToHistory(entries, limit) {
    const list = (Array.isArray(entries) ? entries : [entries]).map((e) => ({ ...e, ts: Date.now() }));
    const history = await this.loadHistory();
    const trimmed = [...list.reverse(), ...history].slice(0, limit);
    await this.saveHistory(trimmed);
    return trimmed;
  },
  async clearHistory() {
    await this.saveHistory([]);
  },
  async exportAll() {
    return {
      app: "Photo Converter",
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      settings: await this.loadSettings(),
      history: await this.loadHistory()
    };
  },
  async importAll(data) {
    if (!data || typeof data !== "object" || !data.settings || typeof data.settings !== "object") {
      throw new Error("Invalid file");
    }
    const merged = sanitizeSettings(data.settings);
    await this.saveSettings(merged);
    if (Array.isArray(data.history)) {
      const clean = data.history
        .filter((h) => h && typeof h === "object")
        .slice(0, merged.historyLimit)
        .map((h) => ({
          source: h.source === "context-menu" ? "context-menu" : "popup",
          filename: String(h.filename || "image").slice(0, 160),
          originalName: h.originalName ? String(h.originalName).slice(0, 160) : undefined,
          originalUrl: typeof h.originalUrl === "string" && /^https?:/i.test(h.originalUrl) ? h.originalUrl : undefined,
          format: ["original", "png", "jpeg", "webp"].includes(h.format) ? h.format : "png",
          thumbnail: typeof h.thumbnail === "string" && h.thumbnail.startsWith("data:image/") ? h.thumbnail : "",
          ts: Number(h.ts) || Date.now()
        }));
      await this.saveHistory(clean);
    }
    return merged;
  }
};
