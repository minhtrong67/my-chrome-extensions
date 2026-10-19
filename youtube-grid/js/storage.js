/**
 * storage.js — single source of truth for persisted settings.
 *
 * Loaded (as a classic script, no bundler) by the content script, the popup,
 * the options page and the background service worker.
 *
 * Design notes
 *  - Everything lives under ONE chrome.storage.local key, so live-sync via
 *    chrome.storage.onChanged and import/export stay trivial.
 *  - Every write goes through `store.patch()`, which re-reads the latest saved
 *    value and merges only the changed keys. The old code let the popup and
 *    the options page each keep a full private copy and overwrite the whole
 *    blob, so a stale page could silently undo a change made in the other.
 *  - Every value is validated (`sanitize`) on load, patch and import, so a
 *    hand-edited or corrupted backup can never break the UI or the injected CSS.
 */

const SETTINGS_KEY = "yg_settings";
const SCHEMA_VERSION = 3;

const COLUMN_MIN = 2;
const COLUMN_MAX = 8;

/** Material Design 500 swatches. `hex` is only used for the picker dots. */
const THEME_COLORS = [
  { id: "red", hex: "#F44336" }, { id: "pink", hex: "#E91E63" },
  { id: "purple", hex: "#9C27B0" }, { id: "deepPurple", hex: "#673AB7" },
  { id: "indigo", hex: "#3F51B5" }, { id: "blue", hex: "#2196F3" },
  { id: "lightBlue", hex: "#03A9F4" }, { id: "cyan", hex: "#00BCD4" },
  { id: "teal", hex: "#009688" }, { id: "green", hex: "#4CAF50" },
  { id: "lightGreen", hex: "#8BC34A" }, { id: "lime", hex: "#CDDC39" },
  { id: "yellow", hex: "#FFEB3B" }, { id: "amber", hex: "#FFC107" },
  { id: "orange", hex: "#FF9800" }, { id: "deepOrange", hex: "#FF5722" },
  { id: "brown", hex: "#795548" }, { id: "blueGrey", hex: "#607D8B" }
];

/** Selectable UI fonts. "system" is the default and downloads nothing. */
const FONTS = [
  { id: "system", label: null }, // label comes from i18n
  { id: "roboto", label: "Roboto" },
  { id: "inter", label: "Inter" },
  { id: "open-sans", label: "Open Sans" },
  { id: "noto-sans", label: "Noto Sans" },
  { id: "be-vietnam-pro", label: "Be Vietnam Pro" },
  { id: "montserrat", label: "Montserrat" },
  { id: "nunito", label: "Nunito" }
];

const FONT_SIZES = ["small", "medium", "large", "xlarge"];
const THEME_MODES = ["system", "light", "dark"];
const LANGUAGES = ["auto", "en", "vi"];

/** @type {Record<string, any>} */
const DEFAULT_SETTINGS = {
  // Master switch: pauses every effect without losing the configuration.
  enabled: true,

  // Interface preferences
  language: "auto", // "auto" follows the browser / device language
  theme: "system", // "system" | "light" | "dark"
  themeColor: "red",
  font: "system",
  fontSize: "medium",
  showPreview: true,

  // Grid columns
  useCustomColumns: false,
  columns: 5,
  perPageColumns: false,
  columnsHome: 5,
  columnsSubscriptions: 4,
  columnsChannel: 4,

  // Declutter toggles
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

/** Return a fully valid settings object; invalid or unknown values fall back to defaults. */
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
  if (FONT_SIZES.includes(src.fontSize)) out.fontSize = src.fontSize;
  if (THEME_COLORS.some((c) => c.id === src.themeColor)) out.themeColor = src.themeColor;
  if (FONTS.some((f) => f.id === src.font)) out.font = src.font;
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

  /** Portable JSON document the user can back up or share. */
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
