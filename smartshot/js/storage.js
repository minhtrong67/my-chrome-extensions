// SmartShot — storage module
// Settings + history live in chrome.storage.local. Captured images (large blobs)
// are handed between the offscreen page, the service worker and the editor via
// IndexedDB — chrome.storage.session has a tiny quota and can't hold real screenshots.
// Loaded by popup.html / editor.html via <script> and by background.js via importScripts.

const DEFAULT_SETTINGS = {
  language: "auto",        // "auto" (follow device) | "en" | "vi"
  theme: "system",         // "system" | "light" | "dark"
  accent: "lightBlue",     // key of ACCENT_COLORS
  openEditor: true         // true: open the editor after each capture | false: download the PNG straight away
};

const HISTORY_LIMIT = 10;
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

/** Validate/normalise settings coming from storage. Unknown (legacy) keys are dropped. */
function sanitizeSettings(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const pick = (v, allowed, fb) => (allowed.includes(v) ? v : fb);
  return {
    language: pick(r.language, ["auto", ...SUPPORTED_LANGS], DEFAULT_SETTINGS.language),
    theme: pick(r.theme, ["system", "light", "dark"], DEFAULT_SETTINGS.theme),
    accent: typeof ACCENT_COLORS !== "undefined" && ACCENT_COLORS[r.accent] ? r.accent : DEFAULT_SETTINGS.accent,
    openEditor: typeof r.openEditor === "boolean" ? r.openEditor : DEFAULT_SETTINGS.openEditor
  };
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

  async loadHistory() {
    const result = await storageGet([HISTORY_KEY]);
    return Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];
  },

  async saveHistory(history) {
    await storageSet({ [HISTORY_KEY]: history });
  },

  /** Add an entry, or update the existing one with the same capture id (`cid`) so one capture = one row. */
  async upsertHistory(entry) {
    const history = await this.loadHistory();
    const i = entry.cid ? history.findIndex((h) => h.cid === entry.cid) : -1;
    if (i >= 0) history[i] = { ...history[i], ...entry, ts: Date.now() };
    else history.unshift({ ...entry, ts: Date.now() });
    const trimmed = history.slice(0, HISTORY_LIMIT);
    await this.saveHistory(trimmed);
    return trimmed;
  },

  async clearHistory() {
    await this.saveHistory([]);
  }
};
