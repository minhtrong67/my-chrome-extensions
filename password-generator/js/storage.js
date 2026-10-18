// LockSmith — storage module
// Persists user settings and history via chrome.storage.local (falls back to
// localStorage when chrome.storage is unavailable, e.g. when opened as a plain page).

const DEFAULT_SETTINGS = {
  language: "auto",
  color: "teal",
  theme: "system",
  fontSize: "medium",
  showStrength: true,
  showHistory: true,
  historyLimit: 10,

  mode: "password", // "password" | "passphrase" | "pin"

  length: 16,
  optUpper: true,
  optLower: true,
  optNumbers: true,
  optSymbols: true,
  excludeAmbiguous: false,
  noDuplicate: false,
  customExclude: "",

  wordCount: 4,
  separator: "-",
  capitalize: true,
  addNumber: true,

  pinLength: 6
};

const STORAGE_KEY = "locksmith_settings";
const HISTORY_KEY = "locksmith_history";

const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

function storageGet(keys) {
  return new Promise((resolve) => {
    if (hasChromeStorage) {
      chrome.storage.local.get(keys, (result) => resolve(result));
    } else {
      const result = {};
      const keyList = Array.isArray(keys) ? keys : [keys];
      keyList.forEach((k) => {
        const raw = localStorage.getItem(k);
        if (raw !== null) {
          try { result[k] = JSON.parse(raw); } catch (e) { result[k] = raw; }
        }
      });
      resolve(result);
    }
  });
}

function storageSet(obj) {
  return new Promise((resolve) => {
    if (hasChromeStorage) {
      chrome.storage.local.set(obj, () => resolve());
    } else {
      Object.keys(obj).forEach((k) => localStorage.setItem(k, JSON.stringify(obj[k])));
      resolve();
    }
  });
}

/**
 * One-time migration for people upgrading from PassForge (this extension's
 * previous name): if the new "locksmith_*" keys are empty but the old
 * "passforge_*" keys still hold data, copy it over once so nobody's saved
 * settings or history silently vanish just because of the rename.
 */
let _migrationChecked = false;
async function migrateLegacyKeys() {
  if (_migrationChecked) return;
  _migrationChecked = true;
  try {
    const [newData, oldData] = await Promise.all([
      storageGet([STORAGE_KEY, HISTORY_KEY]),
      storageGet(["passforge_settings", "passforge_history"])
    ]);
    const patch = {};
    if (!newData[STORAGE_KEY] && oldData.passforge_settings) {
      patch[STORAGE_KEY] = oldData.passforge_settings;
    }
    if (!newData[HISTORY_KEY] && oldData.passforge_history) {
      patch[HISTORY_KEY] = oldData.passforge_history;
    }
    if (Object.keys(patch).length > 0) await storageSet(patch);
  } catch (_) {
    // Best-effort only — a failed migration should never block the app.
  }
}

const store = {
  async loadSettings() {
    await migrateLegacyKeys();
    const result = await storageGet([STORAGE_KEY]);
    const saved = result[STORAGE_KEY] || {};
    const language = saved.language || DEFAULT_SETTINGS.language;
    return { ...DEFAULT_SETTINGS, ...saved, language };
  },

  async saveSettings(settings) {
    await storageSet({ [STORAGE_KEY]: settings });
  },

  async resetSettings() {
    await storageSet({ [STORAGE_KEY]: DEFAULT_SETTINGS });
    return { ...DEFAULT_SETTINGS };
  },

  async loadHistory() {
    await migrateLegacyKeys();
    const result = await storageGet([HISTORY_KEY]);
    return result[HISTORY_KEY] || [];
  },

  async saveHistory(history) {
    await storageSet({ [HISTORY_KEY]: history });
  },

  async addToHistory(value, limit) {
    const history = await this.loadHistory();
    history.unshift({ value, ts: Date.now() });
    const trimmed = history.slice(0, limit);
    await this.saveHistory(trimmed);
    return trimmed;
  },

  async clearHistory() {
    await this.saveHistory([]);
  },

  async exportAll() {
    const settings = await this.loadSettings();
    const history = await this.loadHistory();
    return {
      app: "LockSmith",
      version: "2.1.0",
      exportedAt: new Date().toISOString(),
      settings,
      history
    };
  },

  async importAll(data) {
    if (!data || typeof data !== "object" || !data.settings) {
      throw new Error("Invalid file");
    }
    const mergedSettings = { ...DEFAULT_SETTINGS, ...data.settings };
    await this.saveSettings(mergedSettings);
    if (Array.isArray(data.history)) {
      await this.saveHistory(data.history);
    }
    return mergedSettings;
  }
};
