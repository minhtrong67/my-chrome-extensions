/**
 * storage.js — single source of truth for saved settings.
 * Loaded as a classic script by the content script, popup, options page and
 * service worker.
 *
 * - Everything lives under one chrome.storage.local key.
 * - Writes go through `store.patch()`, which merges into the latest saved
 *   value, so the popup, options page and shortcut never overwrite each other.
 * - Every value is validated by `sanitize()` on load, patch and import.
 */

const SETTINGS_KEY = "yg_settings";
const SCHEMA_VERSION = 4;

const COLUMN_MIN = 2;
const COLUMN_MAX = 8;

const THEME_MODES = ["system", "light", "dark"];
// "auto" = not chosen yet: follow the browser language until the user picks one.
const LANGUAGES = ["auto", "en", "vi"];

/** @type {Record<string, any>} */
const DEFAULT_SETTINGS = {
  enabled: true, // master switch: pauses every effect, keeps the configuration

  language: "auto",
  theme: "system",
  showPreview: true,

  useCustomColumns: false,
  columns: 5,
  perPageColumns: false,
  columnsHome: 5,
  columnsSubscriptions: 4,
  columnsChannel: 4,

  hideShorts: false,
  compactCards: false,
  hideComments: false,
  hideEndCards: false,
  focusMode: false
};

const BOOLEAN_KEYS = [
  "enabled", "showPreview", "useCustomColumns", "perPageColumns",
  "hideShorts", "compactCards", "hideComments", "hideEndCards", "focusMode"
];
const COLUMN_KEYS = ["columns", "columnsHome", "columnsSubscriptions", "columnsChannel"];

/** Return fully valid settings; unknown or invalid values fall back to defaults. */
function sanitize(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = { ...DEFAULT_SETTINGS };

  for (const key of BOOLEAN_KEYS) {
    if (typeof src[key] === "boolean") out[key] = src[key];
  }
  for (const key of COLUMN_KEYS) {
    const n = Math.round(Number(src[key]));
    if (Number.isFinite(n)) out[key] = Math.min(COLUMN_MAX, Math.max(COLUMN_MIN, n));
  }
  if (THEME_MODES.includes(src.theme)) out.theme = src.theme;
  if (LANGUAGES.includes(src.language)) out.language = src.language;
  return out;
}

const storageGet = (key) =>
  new Promise((resolve) => chrome.storage.local.get([key], (r) => resolve(r[key])));
const storageSet = (obj) =>
  new Promise((resolve) => chrome.storage.local.set(obj, () => resolve()));

let writeQueue = Promise.resolve();

const store = {
  async load() {
    return sanitize(await storageGet(SETTINGS_KEY));
  },

  /** Merge `partial` into the latest saved settings. Writes are serialised. */
  patch(partial) {
    writeQueue = writeQueue
      .then(async () => {
        const next = sanitize({ ...(await this.load()), ...partial });
        await storageSet({ [SETTINGS_KEY]: next });
        return next;
      })
      .catch((err) => {
        console.error("[YouTube Grid] could not save settings", err);
        return this.load();
      });
    return writeQueue;
  },

  reset() {
    writeQueue = writeQueue
      .then(async () => {
        const next = { ...DEFAULT_SETTINGS };
        await storageSet({ [SETTINGS_KEY]: next });
        return next;
      })
      .catch((err) => {
        console.error("[YouTube Grid] could not reset settings", err);
        return this.load();
      });
    return writeQueue;
  },

  /** Portable JSON document for backup or sharing. */
  async exportAll() {
    return {
      app: "YouTube Grid",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      settings: await this.load()
    };
  },

  /** Validate and apply an imported document; throws on anything unusable. */
  async importAll(data) {
    if (!data || typeof data !== "object" || !data.settings || typeof data.settings !== "object") {
      throw new Error("Invalid settings file");
    }
    return this.reset().then(() => this.patch(data.settings));
  }
};
