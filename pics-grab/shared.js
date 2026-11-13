// shared.js — i18n, theme, settings schema, and the save/convert decision
// logic shared by background.js, popup.js and options.js.
// (Also loaded as a service-worker script, so nothing here may touch the DOM
// at top level.)

const APP_NAME = "Pics Grab";
const APP_AUTHOR = "minhtrong67";
const APP_AI_ASSISTANT = "Claude";

const I18N = {
  en: {
    appName: APP_NAME,
    appTagline: "Bulk image downloader",
    appDesc: "Scan any page, pick the images you want and save them all at once — with optional JPG conversion.",
    settings: "Settings",

    // Navigation
    navSaving: "Saving",
    navImages: "Images",
    navAppearance: "Appearance",
    navAbout: "About",

    // Saving
    saveLocation: "Save location",
    saveModeAsk: "Ask where to save",
    saveModeAskDesc: "Your browser opens a Save As dialog for each download",
    saveModeDownloads: "Downloads folder",
    saveModeDownloadsDesc: "Save straight to your Downloads folder",
    saveModeSubfolder: "Subfolder in Downloads",
    saveModeSubfolderDesc: "Keep everything together in a folder you name",
    subfolderLabel: "Subfolder name",
    subfolderPlaceholder: "e.g. Pics/Wallpapers",
    subfolderHint: "Use / to create nested folders.",
    errorInvalidFolder: "Folder names can't contain \\ : * ? \" < > |",
    conflictAction: "If a file already exists",
    uniquify: "Rename automatically",
    overwrite: "Replace it",
    prompt: "Ask me",
    filenameTemplate: "File name",
    filenameTemplateHint: "Select a variable to add it to the name.",
    previewLabel: "Preview",
    notifications: "Show a notification after saving",
    notificationsHint: "Only when saving without a Save As dialog",

    // Images
    sectionConversion: "JPG conversion",
    sectionScanning: "Scanning",
    quality: "JPEG quality",
    qualityHint: "Higher quality means larger files. Applies to converted images only.",
    convertWebp: "Convert WebP to JPG",
    convertWebpHint: "Off keeps the original WebP file",
    convertPng: "Convert PNG to JPG",
    convertPngHint: "Off keeps the original PNG and its transparency",
    convertGif: "Convert GIF to JPG",
    convertGifHint: "Off keeps animations intact. On saves the first frame only",
    hideLogos: "Hide logo images",
    hideLogosHint: "Spots site logos, brand marks and favicons by file name, position and shape",
    minSize: "Skip small images",
    minSizeHint: "Hides icons and tracking pixels smaller than this",
    minSizePx: (n) => `${n}px`,

    // Appearance
    theme: "App theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    language: "Language",
    langEn: "English",
    langVi: "Tiếng Việt",
    langSystem: "System default",

    // About
    aboutVersion: "Version",
    aboutAuthor: "Author",
    aboutAi: "AI assistance",
    aboutAiValue: "Claude, by Anthropic",
    aboutAiHint: "Designed and built with help from Claude",
    saved: "Settings saved",

    // Popup
    searchPlaceholder: "Filter by name",
    clearSearch: "Clear filter",
    gridView: "Grid view",
    listView: "List view",
    rescan: "Rescan page",
    openSettings: "Settings",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    clearSelection: "Clear selection",
    saveImage: "Save image",
    cancel: "Cancel",
    count: (n) => `${n} image${n !== 1 ? "s" : ""}`,
    selectedOf: (n, total) => `${n} of ${total} selected`,
    saveAll: (n) => `Save all (${n})`,
    saveSelected: (n) => `Save ${n} selected`,
    savingProgress: (i, n) => `Saving ${i} of ${n}…`,
    savedN: (n) => `Saved ${n} image${n !== 1 ? "s" : ""}`,
    savedWithErrors: (ok, fail) => `Saved ${ok}, ${fail} failed`,
    stoppedAt: (done, n) => `Stopped after ${done} of ${n}`,
    imageSaved: "Image saved",
    imageError: "Couldn't save this image",
    unknown: "Unknown size",
    filterAll: "All",
    showLogosChip: (n) => `Show ${n} hidden logo${n !== 1 ? "s" : ""}`,
    hideLogosChip: "Hide logos",
    logoBadge: "Logo",
    noImagesTitle: "No images found",
    noImagesDesc: "Scroll the page to load more images, then scan again. Tip: you can also right-click any image to save it.",
    restrictedTitle: "Can't scan this page",
    restrictedDesc: "Browsers don't let extensions run on this kind of page. Open a regular website and try again.",
    noMatchTitle: "Nothing to show",
    noMatchDesc: (n) => `Your filters hide all ${n} images on this page.`,
    resetFilters: "Reset filters",
    scanning: "Scanning page…",
    imageCountBadgeTitle: (n) => `${n} image${n !== 1 ? "s" : ""} found on this page`
  },
  vi: {
    appName: APP_NAME,
    appTagline: "Tải hàng loạt ảnh",
    appDesc: "Quét bất kỳ trang nào, chọn ảnh bạn muốn và lưu tất cả cùng lúc — có thể chuyển sang JPG.",
    settings: "Cài đặt",

    navSaving: "Lưu tệp",
    navImages: "Ảnh",
    navAppearance: "Giao diện",
    navAbout: "Giới thiệu",

    saveLocation: "Vị trí lưu",
    saveModeAsk: "Hỏi nơi lưu",
    saveModeAskDesc: "Trình duyệt mở hộp thoại Save As cho mỗi lần tải",
    saveModeDownloads: "Thư mục Downloads",
    saveModeDownloadsDesc: "Lưu thẳng vào thư mục Downloads",
    saveModeSubfolder: "Thư mục con trong Downloads",
    saveModeSubfolderDesc: "Gom tất cả vào một thư mục do bạn đặt tên",
    subfolderLabel: "Tên thư mục con",
    subfolderPlaceholder: "vd: Pics/Hình nền",
    subfolderHint: "Dùng / để tạo thư mục lồng nhau.",
    errorInvalidFolder: "Tên thư mục không được chứa \\ : * ? \" < > |",
    conflictAction: "Khi tệp đã tồn tại",
    uniquify: "Tự đổi tên",
    overwrite: "Ghi đè",
    prompt: "Hỏi tôi",
    filenameTemplate: "Tên tệp",
    filenameTemplateHint: "Chọn một biến để thêm vào tên tệp.",
    previewLabel: "Xem trước",
    notifications: "Hiện thông báo sau khi lưu",
    notificationsHint: "Chỉ khi lưu không qua hộp thoại Save As",

    sectionConversion: "Chuyển đổi sang JPG",
    sectionScanning: "Quét ảnh",
    quality: "Chất lượng JPEG",
    qualityHint: "Chất lượng cao hơn thì tệp lớn hơn. Chỉ áp dụng cho ảnh được chuyển đổi.",
    convertWebp: "Chuyển WebP sang JPG",
    convertWebpHint: "Tắt: giữ nguyên tệp WebP gốc",
    convertPng: "Chuyển PNG sang JPG",
    convertPngHint: "Tắt: giữ nguyên PNG gốc và nền trong suốt",
    convertGif: "Chuyển GIF sang JPG",
    convertGifHint: "Tắt: giữ nguyên hoạt ảnh. Bật: chỉ lưu khung hình đầu",
    hideLogos: "Ẩn ảnh logo",
    hideLogosHint: "Nhận diện logo trang, biểu tượng thương hiệu và favicon qua tên tệp, vị trí và hình dạng",
    minSize: "Bỏ qua ảnh nhỏ",
    minSizeHint: "Ẩn icon và pixel theo dõi nhỏ hơn mức này",
    minSizePx: (n) => `${n}px`,

    theme: "Chủ đề ứng dụng",
    themeLight: "Sáng",
    themeDark: "Tối",
    themeSystem: "Hệ thống",
    language: "Ngôn ngữ",
    langEn: "English",
    langVi: "Tiếng Việt",
    langSystem: "Mặc định hệ thống",

    aboutVersion: "Phiên bản",
    aboutAuthor: "Tác giả",
    aboutAi: "AI hỗ trợ",
    aboutAiValue: "Claude, của Anthropic",
    aboutAiHint: "Được thiết kế và xây dựng với sự hỗ trợ của Claude",
    saved: "Đã lưu cài đặt",

    searchPlaceholder: "Lọc theo tên",
    clearSearch: "Xoá bộ lọc",
    gridView: "Dạng lưới",
    listView: "Dạng danh sách",
    rescan: "Quét lại trang",
    openSettings: "Cài đặt",
    selectAll: "Chọn tất cả",
    deselectAll: "Bỏ chọn tất cả",
    clearSelection: "Bỏ chọn",
    saveImage: "Lưu ảnh",
    cancel: "Huỷ",
    count: (n) => `${n} ảnh`,
    selectedOf: (n, total) => `Đã chọn ${n}/${total}`,
    saveAll: (n) => `Lưu tất cả (${n})`,
    saveSelected: (n) => `Lưu ${n} ảnh đã chọn`,
    savingProgress: (i, n) => `Đang lưu ${i}/${n}…`,
    savedN: (n) => `Đã lưu ${n} ảnh`,
    savedWithErrors: (ok, fail) => `Đã lưu ${ok}, lỗi ${fail}`,
    stoppedAt: (done, n) => `Đã dừng sau ${done}/${n}`,
    imageSaved: "Đã lưu ảnh",
    imageError: "Không thể lưu ảnh này",
    unknown: "Không rõ kích thước",
    filterAll: "Tất cả",
    showLogosChip: (n) => `Hiện ${n} logo đã ẩn`,
    hideLogosChip: "Ẩn logo",
    logoBadge: "Logo",
    noImagesTitle: "Không tìm thấy ảnh",
    noImagesDesc: "Hãy cuộn trang để tải thêm ảnh rồi quét lại. Mẹo: bạn cũng có thể chuột phải vào ảnh bất kỳ để lưu.",
    restrictedTitle: "Không thể quét trang này",
    restrictedDesc: "Trình duyệt không cho tiện ích chạy trên loại trang này. Hãy mở một trang web thông thường rồi thử lại.",
    noMatchTitle: "Không có gì để hiển thị",
    noMatchDesc: (n) => `Bộ lọc đang ẩn toàn bộ ${n} ảnh trên trang này.`,
    resetFilters: "Đặt lại bộ lọc",
    scanning: "Đang quét trang…",
    imageCountBadgeTitle: (n) => `Tìm thấy ${n} ảnh trên trang này`
  }
};

// saveMode: "ask" | "downloads" | "subfolder"
// viewMode: "grid" | "list"
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
  convertGif: false,
  minImageSize: 32,
  hideLogos: true,
  viewMode: "grid"
};

const CACHE_KEY = "picsgrab_cache";

// Cache a lightweight copy locally so theme/lang can be applied instantly on
// the next open (no flash of the wrong theme while storage.sync resolves).
function cachePrefs(settings) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      theme: settings.theme,
      language: settings.language
    }));
  } catch (_) {}
}

async function getSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  cachePrefs(settings);
  return settings;
}

// Synchronous read of the cache, for first paint.
function getCachedThemePrefs() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { theme: "system", language: "system" };
}

async function getLang(settings) {
  if (!settings) settings = await getSettings();
  return resolveLang(settings.language);
}

function resolveLang(choice) {
  if (choice === "vi") return "vi";
  if (choice === "en") return "en";
  return (navigator.language || "en").startsWith("vi") ? "vi" : "en";
}

// Fills every [data-i18n] / [data-i18n-placeholder] / [data-i18n-title] node.
// String values only; function values (count, selectedOf…) are used from JS.
function applyI18n(root, dict) {
  root.querySelectorAll("[data-i18n]").forEach(el => {
    const v = dict[el.dataset.i18n];
    if (typeof v === "string") el.textContent = v;
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const v = dict[el.dataset.i18nPlaceholder];
    if (typeof v === "string") el.placeholder = v;
  });
  root.querySelectorAll("[data-i18n-title]").forEach(el => {
    const v = dict[el.dataset.i18nTitle];
    if (typeof v === "string") { el.title = v; el.setAttribute("aria-label", v); }
  });
}

let _themeMedia = null;
function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme-mode", theme);
  if (!_themeMedia) {
    _themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
    _themeMedia.addEventListener("change", () => {
      if (root.getAttribute("data-theme-mode") === "system") applyTheme("system");
    });
  }
  const dark = theme === "dark" || (theme !== "light" && _themeMedia.matches);
  root.setAttribute("data-theme", dark ? "dark" : "light");
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

// ── Format / conversion decision ────────────────────────────
//
// Single source of truth for "does this image get converted to JPG, or
// downloaded in its original format?" — used by both background.js
// (right-click menu) and popup.js (popup list), so the two entry points can
// never drift out of sync.
const KNOWN_IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "svg", "avif", "bmp"];

function getExtFromUrl(src) {
  try {
    const last = new URL(src).pathname.split("/").pop() || "";
    const ext = last.split(".").pop().toLowerCase().split("?")[0];
    return KNOWN_IMAGE_EXTS.includes(ext) ? ext : "unknown";
  } catch (_) {
    return "unknown";
  }
}

function shouldConvertExt(ext, settings) {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return false; // already a JPG — never re-encode
    case "webp":
      return !!settings.convertWebp;
    case "png":
      return !!settings.convertPng;
    case "gif":
      return !!settings.convertGif;
    default:
      // svg / avif / bmp / unknown — no dedicated toggle exists, so keep the
      // original promise ("save any image as JPG") for these formats.
      return true;
  }
}

// Build filename (no folder prefix — folder handled by saveMode).
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
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
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
  return filename;
}
