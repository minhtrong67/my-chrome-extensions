/**
 * storage.js — everything TagMark itself persists in chrome.storage.local.
 *
 *  - SETTINGS_KEY → user preferences (theme mode, colour, language, view, sort…)
 *  - META_KEY     → { [bookmarkId]: { tags: string[], note: string } }
 *
 * Metadata is keyed by the bookmark's own chrome.bookmarks id (not its URL),
 * so duplicates can carry independent tags/notes, and background.js removes
 * the matching entry whenever a bookmark is deleted, so nothing is orphaned.
 */

const DEFAULT_SETTINGS = {
  theme: "system",      // "system" | "light" | "dark"
  color: "teal",        // one of MD_COLORS ids
  language: "system",   // "system" | "en" | "vi"
  defaultView: "list",  // "list" | "grid"
  defaultSort: "dateAdded", // "dateAdded" | "titleAsc" | "titleDesc"
  lastFolderId: ""      // folder used most recently — quick-add reuses it
};

const SETTINGS_KEY = "tagmark_settings";
const META_KEY = "tagmark_meta";

const storageGet = (keys) => new Promise((resolve) => chrome.storage.local.get(keys, resolve));
const storageSet = (obj) => new Promise((resolve) => chrome.storage.local.set(obj, resolve));

const store = {
  async loadSettings() {
    const res = await storageGet([SETTINGS_KEY]);
    const saved = res[SETTINGS_KEY] || {};
    const merged = { ...DEFAULT_SETTINGS };
    for (const k in DEFAULT_SETTINGS) if (saved[k] !== undefined) merged[k] = saved[k];
    return merged;
  },
  async saveSettings(settings) {
    await storageSet({ [SETTINGS_KEY]: settings });
    return settings;
  },
  async patchSettings(partial) {
    const next = { ...(await this.loadSettings()), ...partial };
    await this.saveSettings(next);
    return next;
  },
  async resetSettings() {
    return this.saveSettings({ ...DEFAULT_SETTINGS });
  },

  async loadAllMeta() {
    const res = await storageGet([META_KEY]);
    return res[META_KEY] || {};
  },
  async saveAllMeta(meta) {
    await storageSet({ [META_KEY]: meta });
    return meta;
  },
  async setMeta(bookmarkId, meta) {
    const all = await this.loadAllMeta();
    const hasContent = (meta.tags && meta.tags.length) || (meta.note && meta.note.trim());
    if (hasContent) all[bookmarkId] = { tags: meta.tags || [], note: meta.note || "" };
    else delete all[bookmarkId]; // no empty records kept around
    await this.saveAllMeta(all);
    return all;
  },
  async setMetaMany(entries) {
    const all = await this.loadAllMeta();
    for (const [id, meta] of entries) {
      const hasContent = (meta.tags && meta.tags.length) || (meta.note && meta.note.trim());
      if (hasContent) all[id] = { tags: meta.tags || [], note: meta.note || "" };
      else delete all[id];
    }
    await this.saveAllMeta(all);
    return all;
  },
  async deleteMeta(bookmarkId) {
    const all = await this.loadAllMeta();
    if (all[bookmarkId]) { delete all[bookmarkId]; await this.saveAllMeta(all); }
    return all;
  },
  async deleteMetaMany(ids) {
    const all = await this.loadAllMeta();
    let changed = false;
    for (const id of ids) if (all[id]) { delete all[id]; changed = true; }
    if (changed) await this.saveAllMeta(all);
    return all;
  }
};
