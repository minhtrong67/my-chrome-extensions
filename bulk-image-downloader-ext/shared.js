// shared.js — i18n, theme, settings schema, and the save/convert decision
// logic shared by background.js, popup.js and options.js.

const I18N = {
  en: {
    appName: "PixGrab",
    appTagline: "Bulk Image Downloader",
    appDesc: "Scan any webpage and download multiple images at once, with optional JPG conversion",
    settings: "Settings",
    general: "General",
    sectionQuality: "Output Quality",
    sectionAppearance: "Appearance",
    sectionBehaviour: "Behaviour",
    quality: "JPEG Quality",
    qualityHint: "Higher quality = larger file size. Applies to images that get converted to JPG, and to any image that needs auto-cropping/resizing to meet the 512×512 / 3:1 requirement.",

    // Save location modes
    saveLocation: "Save Location",
    saveModeLabel: "Save Mode",
    saveModeAsk: "Ask every time",
    saveModeAskDesc: "Browser shows a Save As dialog — you pick any folder on your computer",
    saveModeDownloads: "Downloads folder",
    saveModeDownloadsDesc: "Saved directly to your Downloads folder (or a subfolder)",
    saveModeSubfolder: "Downloads subfolder",
    saveModeSubfolderDesc: "Saved into a custom subfolder inside Downloads",
    subfolderLabel: "Subfolder path",
    subfolderPlaceholder: "e.g. Photos/JPG",
    subfolderHint: "Relative to Downloads — name it anything, use / for nested folders (e.g. Work/Screenshots)",

    filenameTemplate: "Filename Template",
    filenameTemplateHint: "Click a variable to insert",
    filenameTemplatePlaceholder: "{original}",
    conflictAction: "If file already exists",
    uniquify: "Auto rename",
    overwrite: "Overwrite",
    prompt: "Ask me",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    language: "Language",
    langEn: "English",
    langVi: "Tiếng Việt",
    langSystem: "System default",
    notifications: "Show notification after saving",
    convertWebp: "Convert WebP images",
    convertWebpHint: "When off, WebP images download in their original format",
    convertPng: "Convert PNG images",
    convertPngHint: "When off, PNG images download in their original format",
    excludeLogos: "Auto-exclude logos",
    excludeLogosHint: "Logos, brand marks and site icons (detected from file name, alt text, CSS class and page position) are left out of the list and of Save all / Save selected",
    logosHidden: (n) => `${n} logo${n !== 1 ? "s" : ""} hidden`,
    formatSupportNote: "PixGrab only downloads PNG, JPG, and WebP images (at least 512×512, aspect ratio up to 3:1). Other formats are skipped automatically.",
    save: "Save settings",
    saved: "Settings saved",
    openOptions: "Open settings",
    pageImages: "Images on this page",
    noImages: "No images found on this page",
    loading: "Scanning images…",
    saveAll: "Save all",
    saveSelected: "Save selected",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    imageSaved: "Image saved",
    imageError: "Could not save image",
    rightClickTip: "Right-click any image on any page to save it — or open this popup to grab many at once",
    preview: "Preview",
    unknown: "Unknown",
    saving: "Saving…",
    done: "Done",
    errorInvalidFolder: "Folder name can't contain \\ : * ? \" < > |",
    previewLabel: "FILENAME PREVIEW",
    count: (n) => `${n} image${n !== 1 ? "s" : ""}`,
    savingBtn: "Saving…",
    savingProgress: (i, n) => `Saving ${i} of ${n}…`,
    savedAllBtn: "Saved!",
    scanning: "Scanning page…",
    rescan: "Rescan page",
    rescanning: "Rescanning…",
    filterAll: "All",
    filterOther: "Other",
    minSize: "Skip small images",
    minSizeHint: "Images smaller than this (icons, tracking pixels…) are hidden from the list",
    minSizePx: (n) => `${n}px`,
    sortHint: "Largest images first",
    imageCountBadgeTitle: (n) => `${n} image${n !== 1 ? "s" : ""} found on this page`,
    imageTooSmall: "Below 512×512 or more elongated than 3:1 — will be auto-cropped/resized on save",
    imageFormatNotAllowed: "Skipped — only PNG, JPG, or WebP images are supported",
    imageProcessingFailed: "Skipped — couldn't process this image (cross-origin restriction)",
    skippedSize: (n) => `${n} skipped`,
  },
  vi: {
    appName: "PixGrab",
    appTagline: "Tải hàng loạt ảnh",
    appDesc: "Quét bất kỳ trang web nào và tải nhiều ảnh cùng lúc, có thể chuyển đổi sang JPG",
    settings: "Cài đặt",
    general: "Chung",
    sectionQuality: "Chất lượng đầu ra",
    sectionAppearance: "Giao diện",
    sectionBehaviour: "Hành vi",
    quality: "Chất lượng JPEG",
    qualityHint: "Chất lượng cao hơn = tệp lớn hơn. Áp dụng cho ảnh được chuyển sang JPG, và cho ảnh cần tự động crop/thay đổi kích thước để đạt yêu cầu 512×512 / tỷ lệ 3:1.",

    saveLocation: "Vị trí lưu",
    saveModeLabel: "Chế độ lưu",
    saveModeAsk: "Hỏi mỗi lần",
    saveModeAskDesc: "Trình duyệt hiển thị hộp thoại Save As — bạn chọn bất kỳ thư mục nào trên máy",
    saveModeDownloads: "Thư mục Downloads",
    saveModeDownloadsDesc: "Lưu thẳng vào thư mục Downloads (không hỏi)",
    saveModeSubfolder: "Thư mục con trong Downloads",
    saveModeSubfolderDesc: "Lưu vào một thư mục con tuỳ chỉnh bên trong Downloads",
    subfolderLabel: "Đường dẫn thư mục con",
    subfolderPlaceholder: "vd: Photos/JPG",
    subfolderHint: "Tương đối với Downloads — đặt tên tuỳ ý, dùng / để tạo thư mục lồng nhau (vd: Ảnh/Đã chuyển)",

    filenameTemplate: "Mẫu tên tệp",
    filenameTemplateHint: "Nhấn vào biến để chèn",
    filenameTemplatePlaceholder: "{original}",
    conflictAction: "Nếu tệp đã tồn tại",
    uniquify: "Tự đổi tên",
    overwrite: "Ghi đè",
    prompt: "Hỏi tôi",
    theme: "Giao diện",
    themeLight: "Sáng",
    themeDark: "Tối",
    themeSystem: "Theo hệ thống",
    language: "Ngôn ngữ",
    langEn: "English",
    langVi: "Tiếng Việt",
    langSystem: "Mặc định hệ thống",
    notifications: "Hiển thị thông báo sau khi lưu",
    convertWebp: "Chuyển đổi ảnh WebP",
    convertWebpHint: "Khi tắt, ảnh WebP sẽ tải về đúng định dạng gốc",
    convertPng: "Chuyển đổi ảnh PNG",
    convertPngHint: "Khi tắt, ảnh PNG sẽ tải về đúng định dạng gốc",
    excludeLogos: "Tự động loại bỏ logo",
    excludeLogosHint: "Logo, biểu tượng thương hiệu và icon trang web (nhận diện qua tên tệp, alt, class CSS và vị trí trên trang) sẽ không xuất hiện trong danh sách và không bị tải khi Lưu tất cả / Lưu đã chọn",
    logosHidden: (n) => `đã ẩn ${n} logo`,
    formatSupportNote: "PixGrab chỉ tải ảnh định dạng PNG, JPG và WebP (tối thiểu 512×512, tỷ lệ khung hình tối đa 3:1). Các định dạng khác sẽ tự động bị bỏ qua.",
    save: "Lưu cài đặt",
    saved: "Đã lưu cài đặt",
    openOptions: "Mở cài đặt",
    pageImages: "Ảnh trên trang này",
    noImages: "Không tìm thấy ảnh nào trên trang này",
    loading: "Đang quét ảnh…",
    saveAll: "Lưu tất cả",
    saveSelected: "Lưu đã chọn",
    selectAll: "Chọn tất cả",
    deselectAll: "Bỏ chọn tất cả",
    imageSaved: "Đã lưu ảnh",
    imageError: "Không thể lưu ảnh",
    rightClickTip: "Chuột phải vào ảnh để lưu — hoặc mở popup này để tải nhiều ảnh cùng lúc",
    preview: "Xem trước",
    unknown: "Không rõ",
    saving: "Đang lưu…",
    done: "Xong",
    errorInvalidFolder: "Tên thư mục không được chứa \\ : * ? \" < > |",
    previewLabel: "XEM TRƯỚC TÊN TỆP",
    count: (n) => `${n} ảnh`,
    savingBtn: "Đang lưu…",
    savingProgress: (i, n) => `Đang lưu ${i}/${n}…`,
    savedAllBtn: "Đã lưu!",
    scanning: "Đang quét trang…",
    rescan: "Quét lại trang",
    rescanning: "Đang quét lại…",
    filterAll: "Tất cả",
    filterOther: "Khác",
    minSize: "Ẩn ảnh nhỏ",
    minSizeHint: "Ảnh nhỏ hơn kích thước này (icon, pixel theo dõi…) sẽ bị ẩn khỏi danh sách",
    minSizePx: (n) => `${n}px`,
    sortHint: "Ảnh lớn nhất hiển thị trước",
    imageCountBadgeTitle: (n) => `Tìm thấy ${n} ảnh trên trang này`,
    imageTooSmall: "Nhỏ hơn 512×512 hoặc dài hơn tỷ lệ 3:1 — sẽ tự động crop/phóng to khi lưu",
    imageFormatNotAllowed: "Đã bỏ qua — chỉ hỗ trợ định dạng PNG, JPG, hoặc WebP",
    imageProcessingFailed: "Đã bỏ qua — không thể xử lý ảnh này (hạn chế cross-origin)",
    skippedSize: (n) => `${n} ảnh bị bỏ qua`,
  }
};

// saveMode: "ask" | "downloads" | "subfolder"
const DEFAULT_SETTINGS = {
  quality: 92,
  saveMode: "ask",
  saveSubfolder: "",
  filenameTemplate: "{original}",
  conflictAction: "uniquify",
  theme: "system",
  language: "system",
  showNotification: true,
  convertWebp: true,
  convertPng: true,
  minImageSize: 32,
  excludeLogos: true
};

// ── Download requirement: format + min resolution + max aspect ratio ──
//
// PixGrab only ever writes PNG, JPG/JPEG, or WebP files to disk. Anything
// else (GIF, SVG, AVIF, BMP, or a URL with no recognizable image
// extension) is excluded from the scanner and rejected if the user tries
// to save it via the right-click menu — see isAllowedExt() below.
//
// On top of the format restriction, every image actually written to disk
// must be at least 512x512 and no more elongated than 3:1 (longer side :
// shorter side). This is checked with the image's REAL decoded pixel
// dimensions right before each download — never the DOM/CSS box size,
// which can lie for background-images (the element's rendered box is not
// the source image's native resolution).
const MIN_IMAGE_DIMENSION = 512; // px, both width and height
const MAX_ASPECT_RATIO = 3;      // e.g. 1536x512 is exactly 3:1 and OK; 1537x512 is not

function meetsImageRequirements(w, h) {
  if (!w || !h) return false;
  if (w < MIN_IMAGE_DIMENSION || h < MIN_IMAGE_DIMENSION) return false;
  return Math.max(w, h) / Math.min(w, h) <= MAX_ASPECT_RATIO;
}

// Given an image's real decoded pixel size, work out how to turn it into
// something that satisfies meetsImageRequirements():
//   1. Crop the longer side (centered) so the ratio is at most 3:1.
//   2. If the shorter side is still under 512px after that crop, scale the
//      whole thing up uniformly until it hits exactly 512 — a uniform
//      scale never changes the aspect ratio, so step 1's ratio fix holds.
// Returns { sx, sy, sw, sh, dw, dh }: sx/sy/sw/sh is the source crop
// rectangle (in the original image's pixels), dw/dh is the final output
// size to draw that crop into. Returns null when w/h are missing entirely
// (dimensions couldn't be read at all — nothing to compute).
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
  const scale = shorter < MIN_IMAGE_DIMENSION ? (MIN_IMAGE_DIMENSION / shorter) : 1;
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  return { sx, sy, sw, sh, dw, dh };
}

// Injected into the page (via chrome.scripting.executeScript's `func`) to
// read an image's true naturalWidth/naturalHeight before we commit to
// downloading it. Must stay self-contained — no references to anything
// outside this function — since executeScript serializes it and runs it
// in the page's isolated world, not this file's scope. Reuses the same
// crossOrigin-then-plain fallback as processImageForDownload so it
// succeeds on the same set of images that does.
function checkImageDimensions(srcUrl) {
  return new Promise((resolve) => {
    function done(img) {
      resolve({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
    }
    const img1 = new Image();
    img1.crossOrigin = "anonymous";
    img1.onload = () => done(img1);
    img1.onerror = () => {
      const img2 = new Image();
      img2.onload = () => done(img2);
      img2.onerror = () => resolve({ w: 0, h: 0 });
      img2.src = srcUrl;
    };
    img1.src = srcUrl;
  });
}

// Injected into the page (via chrome.scripting.executeScript's `func`) to
// crop/scale an image to `crop` (from computeCropAndScale) and re-encode
// it as `mimeType`. Single implementation shared by background.js
// (right-click) and popup.js (popup list) for both the "convert to JPG"
// step AND the "auto-fix size/ratio" step, so the two entry points can
// never drift out of sync. Must stay self-contained (see
// checkImageDimensions above for why). Returns null on failure (most
// commonly a cross-origin image tainting the canvas) so the caller can
// decide how to handle that.
function processImageForDownload(srcUrl, crop, mimeType, quality) {
  return new Promise((resolve) => {
    function draw(img) {
      try {
        const c = document.createElement("canvas");
        c.width = crop.dw;
        c.height = crop.dh;
        const ctx = c.getContext("2d");
        if (mimeType === "image/jpeg") {
          // JPEG has no alpha channel — flatten transparency onto white
          // first, same as the old convertToJpg/fetchImageAsDataURL did.
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, c.width, c.height);
        }
        ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.dw, crop.dh);
        resolve(c.toDataURL(mimeType, (quality || 92) / 100));
      } catch (_) { resolve(null); }
    }
    const img1 = new Image();
    img1.crossOrigin = "anonymous";
    img1.onload = () => draw(img1);
    img1.onerror = () => {
      const img2 = new Image();
      img2.onload = () => draw(img2);
      img2.onerror = () => resolve(null);
      img2.src = srcUrl;
    };
    img1.src = srcUrl;
  });
}

// Output MIME type for each allowed extension, used when re-encoding an
// image that isn't being force-converted to JPG (still needs a mime type
// for canvas.toDataURL when auto-fixing size/ratio).
const MIME_FOR_EXT = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

async function getSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  // Cache a lightweight copy locally so theme/lang can be applied instantly
  // on next open (avoids a flash of the wrong theme before storage.sync resolves).
  try {
    localStorage.setItem("pixgrab_cache", JSON.stringify({
      theme: settings.theme,
      language: settings.language
    }));
  } catch (_) {}
  return settings;
}

// Reads the small local cache synchronously so the page can paint in the
// right theme immediately, before the async chrome.storage.sync call resolves.
function getCachedThemePrefs() {
  try {
    const raw = localStorage.getItem("pixgrab_cache");
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { theme: "system", language: "system" };
}

// Removes characters that are invalid in Windows folder names, trims
// trailing dots/spaces from each path segment (also invalid on Windows),
// but otherwise allows free-form naming — including Vietnamese diacritics,
// spaces, dashes, underscores, and any other Unicode letters.
function sanitizeFolderPath(path) {
  return (path || "")
    .replace(/\\/g, "/")
    .split("/")
    .map(seg => seg
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/[. ]+$/, "")
      .trim())
    .filter(Boolean)
    .join("/");
}

// Characters that are always invalid in a Windows folder/file name.
const INVALID_FOLDER_CHARS = /[<>:"\\|?*\x00-\x1F]/;

async function getLang(settings) {
  if (!settings) settings = await getSettings();
  const lang = settings.language;
  if (lang === "vi") return "vi";
  if (lang === "en") return "en";
  const nav = navigator.language || "en";
  return nav.startsWith("vi") ? "vi" : "en";
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
  } else if (theme === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", dark ? "dark" : "light");
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
      if (document.documentElement.getAttribute("data-theme-mode") === "system") {
        root.setAttribute("data-theme", e.matches ? "dark" : "light");
      }
    });
  }
  root.setAttribute("data-theme-mode", theme);
}

// ── Format / conversion decision ────────────────────────────
//
// This is the single source of truth for "does this image get converted to
// JPG, or downloaded in its original format?" — used by both background.js
// (right-click menu) and popup.js (popup list), so the two entry points can
// never drift out of sync with each other again.
//
// The only formats PixGrab downloads. Anything whose URL extension isn't
// in this list (gif, svg, avif, bmp, or no recognizable extension at all)
// is treated as "unknown" and excluded from downloads entirely — see
// isAllowedExt().
const KNOWN_IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];

function getExtFromUrl(src) {
  try {
    const last = new URL(src).pathname.split("/").pop() || "";
    const ext = last.split(".").pop().toLowerCase().split("?")[0];
    return KNOWN_IMAGE_EXTS.includes(ext) ? ext : "unknown";
  } catch (_) {
    return "unknown";
  }
}

// Format gate: only PNG/JPG/JPEG/WebP are ever scanned or downloaded.
function isAllowedExt(ext) {
  return ext !== "unknown";
}

/**
 * Decide whether `ext` should be converted to JPG given the user's settings.
 * Centralized so enabling/disabling "Convert PNG/WebP/GIF" in Settings has
 * one, and only one, code path that honors it.
 */
function shouldConvertExt(ext, settings) {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return false; // already a JPG — never re-encode
    case "webp":
      return !!settings.convertWebp;
    case "png":
      return !!settings.convertPng;
    default:
      // Unreachable in practice: callers gate on isAllowedExt() before
      // ever reaching here, and jpg/jpeg/png/webp are all handled above.
      return false;
  }
}

// Build filename (no folder prefix — folder handled by saveMode).
// `finalExt` is whatever getExtFromUrl()/shouldConvertExt() decided for this
// particular image — "jpg" when converting, the original extension otherwise.
function buildFilenameOnly(srcUrl, settings, finalExt) {
  let name = "image";
  try {
    const url = new URL(srcUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "image";
    name = last.replace(/\.[^.]+$/, "") || "image";
    name = name.replace(/[<>:"/\\|?*]/g, "_").substring(0, 100);
  } catch (_) {}

  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  let filename = (settings.filenameTemplate || "{original}")
    .replace("{original}", name)
    .replace("{date}", date)
    .replace("{time}", time)
    .replace("{datetime}", `${date}_${time}`);

  const ext = finalExt || "jpg";
  return filename.replace(/[<>:"/\\|?*]/g, "_") + "." + ext;
}

// Build full download path based on saveMode.
function buildDownloadPath(srcUrl, settings, finalExt) {
  const filename = buildFilenameOnly(srcUrl, settings, finalExt);
  if (settings.saveMode === "subfolder" && settings.saveSubfolder) {
    const folder = sanitizeFolderPath(settings.saveSubfolder);
    if (folder) return folder + "/" + filename;
  }
  // "downloads" → just filename (goes to root Downloads)
  return filename;
}
