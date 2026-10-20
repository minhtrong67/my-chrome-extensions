// TubeShot - storage module
// Persists user settings and capture history via chrome.storage.local.

const DEFAULT_SETTINGS = {
  language: null, // null = detect from the browser on first run
  theme: "system", // light | dark | system
  color: "pink", // Material color key (see MD_COLORS in theme.js)

  format: "png", // png | jpeg
  quality: 90, // JPEG quality, 1-100
  scale: 100, // 100 | 75 | 50 | 25
  watermarkTimestamp: true,
  captionInfo: false
};

const SETTINGS_KEY = "tubeshot_settings";
const HISTORY_KEY = "tubeshot_history";
const HISTORY_LIMIT = 10;

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

// Keeps only known keys and validates every value, so stale or corrupt data can never break the UI.
function sanitizeSettings(raw) {
  const s = raw && typeof raw === "object" ? raw : {};
  const quality = Number(s.quality);
  return {
    language: pick(s.language, ["en", "vi"], null),
    theme: pick(s.theme, ["light", "dark", "system"], DEFAULT_SETTINGS.theme),
    color: MD_COLORS.some((c) => c.key === s.color) ? s.color : DEFAULT_SETTINGS.color,
    format: pick(s.format, ["png", "jpeg"], DEFAULT_SETTINGS.format),
    quality: Number.isFinite(quality) ? Math.min(100, Math.max(10, Math.round(quality))) : DEFAULT_SETTINGS.quality,
    scale: pick(Number(s.scale), [100, 75, 50, 25], DEFAULT_SETTINGS.scale),
    watermarkTimestamp: typeof s.watermarkTimestamp === "boolean" ? s.watermarkTimestamp : DEFAULT_SETTINGS.watermarkTimestamp,
    captionInfo: typeof s.captionInfo === "boolean" ? s.captionInfo : DEFAULT_SETTINGS.captionInfo
  };
}

const store = {
  async loadSettings() {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return sanitizeSettings(result[SETTINGS_KEY]);
  },
  async saveSettings(settings) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  },

  async loadHistory() {
    const result = await chrome.storage.local.get(HISTORY_KEY);
    return Array.isArray(result[HISTORY_KEY]) ? result[HISTORY_KEY] : [];
  },
  async addToHistory(entry) {
    const history = await this.loadHistory();
    history.unshift({ ...entry, ts: Date.now() });
    const trimmed = history.slice(0, HISTORY_LIMIT);
    await chrome.storage.local.set({ [HISTORY_KEY]: trimmed });
    return trimmed;
  },
  async clearHistory() {
    await chrome.storage.local.set({ [HISTORY_KEY]: [] });
  }
};
