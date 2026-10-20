// core.js — settings schema and the save/convert decision logic.
// DOM-free on purpose: loaded by the service worker (background.js) AND by the
// popup / options pages, so every entry point shares exactly one implementation.

const MIN_IMAGE_DIMENSION = 512; // px, both width and height
const MAX_ASPECT_RATIO = 3;      // longer side : shorter side
const KNOWN_IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];
const OTHER_IMAGE_EXTS = ["gif", "svg", "avif", "bmp", "ico", "tif", "tiff", "heic", "jfif"];
const MIME_FOR_EXT = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const BULK_FALLBACK_FOLDER = "Multi Downloader"; // used when bulk-saving in "Ask every time" mode
const REPO_URL = "https://github.com/minhtrong67/multi-downloader";

const DEFAULT_SETTINGS = {
  // appearance
  themeMode: "system",      // "light" | "dark" | "system"
  themeColor: "deepPurple", // key of MD_THEMES
  fontFamily: "system",     // id from FONTS
  fontSize: 14,             // px (root font size)
  language: "system",       // "system" | "en" | "vi"
  viewMode: "grid",         // "grid" | "list"
  // download
  saveMode: "ask",          // "ask" | "downloads" | "subfolder"
  saveSubfolder: "",
  filenameTemplate: "{original}",
  conflictAction: "uniquify",
  // images
  quality: 92,
  convertWebp: true,
  convertPng: true,
  minImageSize: 32,
  excludeLogos: true,
  // general
  showNotification: true
};

async function getSettings() {
  const stored = await chrome.storage.sync.get(null);
  const s = { ...DEFAULT_SETTINGS, ...stored };
  // v2 → v3 migration: the old "theme" key became "themeMode".
  if (stored.themeMode === undefined && ["light", "dark", "system"].includes(stored.theme)) {
    s.themeMode = stored.theme;
  }
  return s;
}

// ── Image requirement: min 512×512, max 3:1 ─────────────────
function meetsImageRequirements(w, h) {
  if (!w || !h) return false;
  if (w < MIN_IMAGE_DIMENSION || h < MIN_IMAGE_DIMENSION) return false;
  return Math.max(w, h) / Math.min(w, h) <= MAX_ASPECT_RATIO;
}

// Centre-crop the long side down to 3:1, then upscale uniformly so the short
// side reaches 512px. Returns null when the size is unknown.
function computeCropAndScale(w, h) {
  if (!w || !h) return null;
  let sx = 0, sy = 0, sw = w, sh = h;
  if (sw > sh * MAX_ASPECT_RATIO) {
    sw = Math.round(sh * MAX_ASPECT_RATIO);
    sx = Math.round((w - sw) / 2);
  } else if (sh > sw * MAX_ASPECT_RATIO) {
    sh = Math.round(sw * MAX_ASPECT_RATIO);
    sy = Math.round((h - sh) / 2);
  }
  const shorter = Math.min(sw, sh);
  const scale = shorter < MIN_IMAGE_DIMENSION ? MIN_IMAGE_DIMENSION / shorter : 1;
  return { sx, sy, sw, sh, dw: Math.max(1, Math.round(sw * scale)), dh: Math.max(1, Math.round(sh * scale)) };
}

// ── Format detection / conversion decision ──────────────────
function getExtFromUrl(src) {
  try {
    const u = new URL(src);
    const last = decodeURIComponent(u.pathname.split("/").pop() || "");
    const m = /\.([a-z0-9]+)$/i.exec(last);
    const ext = m ? m[1].toLowerCase() : "";
    if (KNOWN_IMAGE_EXTS.includes(ext)) return ext;
    if (OTHER_IMAGE_EXTS.includes(ext)) return "unknown";
    // Extension-less CDN URLs often carry the format in the query (?format=webp, ?fm=jpg …)
    for (const key of ["format", "fm", "ext", "type", "output", "f"]) {
      const v = (u.searchParams.get(key) || "").toLowerCase().replace(/^image\//, "");
      if (KNOWN_IMAGE_EXTS.includes(v)) return v;
    }
  } catch (_) {}
  return "unknown";
}

const isAllowedExt = (ext) => ext !== "unknown";

function shouldConvertExt(ext, settings) {
  switch (ext) {
    case "webp": return !!settings.convertWebp;
    case "png": return !!settings.convertPng;
    default: return false; // jpg/jpeg are never re-encoded just for conversion
  }
}

// ── Filenames / paths ───────────────────────────────────────
const INVALID_FOLDER_CHARS = /[<>:"\\|?*\x00-\x1F]/;

function sanitizeFolderPath(path) {
  return (path || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((seg) => seg.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/[. ]+$/, "").trim())
    .filter((seg) => seg && seg !== "..")
    .join("/");
}

function buildFilenameOnly(srcUrl, settings, finalExt, index) {
  let name = "image";
  try {
    const parts = new URL(srcUrl).pathname.split("/").filter(Boolean);
    const last = decodeURIComponent(parts[parts.length - 1] || "image");
    name = (last.replace(/\.[^.]+$/, "") || "image").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").substring(0, 100);
  } catch (_) {}

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const filename = (settings.filenameTemplate || "{original}")
    .replace(/\{original\}/g, name)
    .replace(/\{datetime\}/g, `${date}_${time}`)
    .replace(/\{date\}/g, date)
    .replace(/\{time\}/g, time)
    .replace(/\{index\}/g, String(index || 1).padStart(3, "0"));

  return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim() + "." + (finalExt || "jpg");
}

// opts: { index, folder } — `folder` overrides the folder derived from saveMode.
function buildDownloadPath(srcUrl, settings, finalExt, opts = {}) {
  const filename = buildFilenameOnly(srcUrl, settings, finalExt, opts.index);
  let folder = "";
  if (opts.folder) folder = sanitizeFolderPath(opts.folder);
  else if (settings.saveMode === "subfolder" && settings.saveSubfolder) folder = sanitizeFolderPath(settings.saveSubfolder);
  return folder ? folder + "/" + filename : filename;
}
