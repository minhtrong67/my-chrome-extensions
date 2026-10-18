// SmartShot — storage module
// Settings + history live in chrome.storage.local. Captured images (large blobs)
// are handed between the offscreen page, the service worker and the editor via
// IndexedDB — chrome.storage.session has a tiny quota and can't hold real screenshots.
// Loaded by popup.html / editor.html via <script> and by background.js via importScripts.

const DEFAULT_SETTINGS = {
  language: "auto",        // "auto" (follow device) | "en" | "vi"
  theme: "system",         // "system" | "light" | "dark"
  accent: "purple",        // key of ACCENT_COLORS
  font: "system",          // key of FONT_OPTIONS
  fontSize: "medium",      // "small" | "medium" | "large" | "xlarge"

  showHistory: true,
  historyLimit: 10,

  format: "png",
  quality: 90,
  fullPageDelay: 600,
  openEditorAfterCapture: false,
  afterCapture: "download" // "download" | "clipboard" (only when the editor is off)
};

const STORAGE_KEY = "smartshot_settings";
const HISTORY_KEY = "smartshot_history";
const SUPPORTED_LANGS = ["en", "vi"];

const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

function storageGet(keys) {
  return new Promise((resolve) => {
    if (hasChromeStorage) {
      chrome.storage.local.get(keys, (result) => resolve(result || {}));
    } else {
      const result = {};
      (Array.isArray(keys) ? keys : [keys]).forEach((k) => {
        const raw = localStorage.getItem(k);
        if (raw !== null) { try { result[k] = JSON.parse(raw); } catch (e) { result[k] = raw; } }
      });
      resolve(result);
    }
  });
}

function storageSet(obj) {
  return new Promise((resolve) => {
    if (hasChromeStorage) {
      chrome.storage.local.set(obj, () => { void chrome.runtime.lastError; resolve(); });
    } else {
      Object.keys(obj).forEach((k) => localStorage.setItem(k, JSON.stringify(obj[k])));
      resolve();
    }
  });
}

/** Device language -> one of SUPPORTED_LANGS (Vietnamese if the device is Vietnamese, else English). */
function detectDeviceLanguage() {
  let code = "";
  try { if (typeof chrome !== "undefined" && chrome.i18n && chrome.i18n.getUILanguage) code = chrome.i18n.getUILanguage(); } catch (e) { /* ignore */ }
  if (!code && typeof navigator !== "undefined") code = (navigator.languages && navigator.languages[0]) || navigator.language || "";
  const base = String(code).toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGS.includes(base) ? base : "en";
}

function resolveLanguage(setting) {
  return SUPPORTED_LANGS.includes(setting) ? setting : detectDeviceLanguage();
}

/** Validate/normalise settings coming from storage or an imported file. */
function sanitizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === "object" ? raw : {}) };
  const pick = (v, allowed, fb) => (allowed.includes(v) ? v : fb);
  s.language = pick(s.language, ["auto", ...SUPPORTED_LANGS], "auto");
  s.theme = pick(s.theme, ["system", "light", "dark"], "system");
  s.accent = typeof ACCENT_COLORS !== "undefined" && ACCENT_COLORS[s.accent] ? s.accent : "purple";
  s.font = typeof FONT_OPTIONS !== "undefined" && FONT_OPTIONS[s.font] ? s.font : "system";
  s.fontSize = pick(s.fontSize, ["small", "medium", "large", "xlarge"], "medium");
  s.showHistory = !!s.showHistory;
  s.historyLimit = pick(Number(s.historyLimit), [5, 10, 20], 10);
  s.format = pick(s.format, ["png", "jpeg"], "png");
  s.quality = Math.min(100, Math.max(1, Math.round(Number(s.quality) || 90)));
  s.fullPageDelay = Math.min(2000, Math.max(550, Math.round(Number(s.fullPageDelay) || 600)));
  s.openEditorAfterCapture = !!s.openEditorAfterCapture;
  s.afterCapture = pick(s.afterCapture, ["download", "clipboard"], "download");
  return s;
}

/* ============ IndexedDB blob hand-off ============ */

const IDB_NAME = "smartshot";
const IDB_STORE = "captures";

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbRun(mode, fn) {
  const db = await idbOpen();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, mode);
      const res = fn(tx.objectStore(IDB_STORE));
      tx.oncomplete = () => resolve(res && "result" in res ? res.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

const capturesDb = {
  put: (id, value) => idbRun("readwrite", (s) => s.put(value, id)),
  get: (id) => idbRun("readonly", (s) => s.get(id)),
  delete: (id) => idbRun("readwrite", (s) => s.delete(id)),
  /** Remove every stored capture older than maxAgeMs (ids are `cap-<timestamp>`). */
  async purgeOld(maxAgeMs) {
    const db = await idbOpen();
    try {
      await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        const store = tx.objectStore(IDB_STORE);
        const cur = store.openKeyCursor();
        cur.onsuccess = () => {
          const c = cur.result;
          if (!c) return;
          const ts = Number(String(c.key).replace("cap-", ""));
          if (!ts || Date.now() - ts > maxAgeMs) store.delete(c.key);
          c.continue();
        };
        tx.oncomplete = resolve;
        tx.onerror = resolve;
        tx.onabort = resolve;
      });
    } finally { db.close(); }
  }
};

const store = {
  async loadSettings() {
    const result = await storageGet([STORAGE_KEY]);
    return sanitizeSettings(result[STORAGE_KEY]);
  },

  async saveSettings(settings) {
    await storageSet({ [STORAGE_KEY]: sanitizeSettings(settings) });
  },

  async resetSettings() {
    await storageSet({ [STORAGE_KEY]: { ...DEFAULT_SETTINGS } });
    return { ...DEFAULT_SETTINGS };
  },

  async loadHistory() {
    const result = await storageGet([HISTORY_KEY]);
    return Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];
  },

  async saveHistory(history) {
    await storageSet({ [HISTORY_KEY]: history });
  },

  async addToHistory(entry, limit) {
    const history = await this.loadHistory();
    history.unshift({ ...entry, ts: Date.now() });
    const trimmed = history.slice(0, limit || DEFAULT_SETTINGS.historyLimit);
    await this.saveHistory(trimmed);
    return trimmed;
  },

  async clearHistory() {
    await this.saveHistory([]);
  },

  async exportAll() {
    return {
      app: "SmartShot",
      version: hasChromeStorage ? chrome.runtime.getManifest().version : "1.1.0",
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
          captureType: ["visible", "fullpage", "area"].includes(h.captureType) ? h.captureType : "visible",
          filename: typeof h.filename === "string" ? h.filename : null,
          format: h.format === "jpeg" ? "jpeg" : "png",
          action: ["editor", "download", "clipboard"].includes(h.action) ? h.action : "download",
          thumbnail: typeof h.thumbnail === "string" && h.thumbnail.startsWith("data:image/") ? h.thumbnail : "",
          ts: Number(h.ts) || Date.now()
        }));
      await this.saveHistory(clean);
    }
    return merged;
  }
};
