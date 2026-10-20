// Photo Converter — i18n (English / Tiếng Việt). Safe to load in the service worker.

const I18N = {
  en: {
    appName: "Photo Converter",
    tagline: "Image format converter",
    dropTitle: "Drop images here or click to browse",
    dropSub: "PNG · JPEG · WEBP · GIF · BMP · SVG",
    pasteHint: "Tip: paste a screenshot with Ctrl+V",
    urlLabel: "Image URL",
    load: "Load",
    queueCount: (n) => `${n} image${n !== 1 ? "s" : ""}`,
    clearAll: "Clear all",
    removeImage: "Remove",
    format: "Output format",
    quality: "Quality",
    resize: "Resize",
    width: "Width",
    height: "Height",
    lockRatio: "Lock aspect ratio",
    filename: "File name",
    convertOne: "Convert & download",
    convertAll: (n) => `Convert ${n} images`,
    converting: (i, n) => `Converting ${i}/${n}…`,
    resizeBatchHint: "Resize is available for a single image only",
    history: "Recent history",
    historyEmpty: "Nothing converted yet",
    exportTxt: "Export",
    clear: "Clear",
    confirmAgain: "Tap again to confirm",
    redoAction: "Convert again",
    sourceContextMenu: "Right-click",
    sourcePopup: "Popup",

    settings: "Settings",
    back: "Back",
    colors: "Accent colour",
    theme: "Appearance",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    language: "Language",
    advanced: "Advanced options",
    defaultFormat: "Default format",
    defaultQuality: "Default quality",
    showHistory: "Show recent history",
    historyLimit: "History size",
    contextMenu: "Right-click menu formats",
    menuOriginal: "Original",
    menuPng: "PNG",
    menuJpeg: "JPEG",
    menuWebp: "WEBP",
    askFilename: "Ask where to save each time",
    showNotification: "Notify after saving",
    exportSettings: "Export",
    importSettings: "Import",
    resetDefault: "Reset to default",
    about: "About",
    author: "Author",
    aiCredit: "Built with the help of Claude AI",
    openLanding: "Open introduction page",
    version: "Version",

    saveImageAs: "Save image as",
    notifyDoneTitle: "Image saved",
    notifyDone: "Your image was converted and downloaded.",
    notifyFailedTitle: "Save failed",
    notifyFailed: "Could not convert or download this image.",

    toastLoaded: "Image loaded",
    toastImagesLoaded: (n) => `${n} images loaded`,
    toastSkipped: (n) => `${n} file(s) skipped (not a valid image)`,
    toastInvalidFile: "That file is not a supported image",
    toastLoadFailed: "Could not load this image",
    toastInvalidUrl: "Enter a valid http(s) image URL",
    toastTooLarge: "Image is too large to convert",
    toastNoImage: "Add an image first",
    toastConverted: "Converted successfully",
    toastConvertedZip: (n) => `${n} images saved in one .zip`,
    toastConvertFailed: "Conversion failed",
    toastPasted: "Image pasted",
    toastCleared: "History cleared",
    toastHistoryEmpty: "History is empty",
    toastHistoryExported: "History exported",
    toastExported: "Settings exported",
    toastImported: "Settings imported",
    toastImportFailed: "Invalid settings file",
    toastReset: "Settings reset",
    toastRedoing: "Converting again…",
    toastRedoUnavailable: "This item cannot be repeated"
  },
  vi: {
    appName: "Photo Converter",
    tagline: "Chuyển đổi định dạng ảnh",
    dropTitle: "Thả ảnh vào đây hoặc bấm để chọn",
    dropSub: "PNG · JPEG · WEBP · GIF · BMP · SVG",
    pasteHint: "Mẹo: dán ảnh chụp màn hình bằng Ctrl+V",
    urlLabel: "Đường dẫn ảnh",
    load: "Tải",
    queueCount: (n) => `${n} ảnh`,
    clearAll: "Xoá tất cả",
    removeImage: "Xoá",
    format: "Định dạng đầu ra",
    quality: "Chất lượng",
    resize: "Đổi kích thước",
    width: "Rộng",
    height: "Cao",
    lockRatio: "Khoá tỉ lệ khung hình",
    filename: "Tên tệp",
    convertOne: "Chuyển đổi & tải xuống",
    convertAll: (n) => `Chuyển đổi ${n} ảnh`,
    converting: (i, n) => `Đang chuyển đổi ${i}/${n}…`,
    resizeBatchHint: "Chỉ đổi kích thước được khi chọn một ảnh",
    history: "Lịch sử gần đây",
    historyEmpty: "Chưa có ảnh nào được chuyển đổi",
    exportTxt: "Xuất",
    clear: "Xoá",
    confirmAgain: "Bấm lần nữa để xác nhận",
    redoAction: "Chuyển đổi lại",
    sourceContextMenu: "Chuột phải",
    sourcePopup: "Popup",

    settings: "Cài đặt",
    back: "Quay lại",
    colors: "Màu chủ đạo",
    theme: "Giao diện",
    themeLight: "Sáng",
    themeDark: "Tối",
    themeSystem: "Hệ thống",
    language: "Ngôn ngữ",
    advanced: "Tuỳ chọn nâng cao",
    defaultFormat: "Định dạng mặc định",
    defaultQuality: "Chất lượng mặc định",
    showHistory: "Hiện lịch sử gần đây",
    historyLimit: "Số mục lịch sử",
    contextMenu: "Định dạng trong menu chuột phải",
    menuOriginal: "Gốc",
    menuPng: "PNG",
    menuJpeg: "JPEG",
    menuWebp: "WEBP",
    askFilename: "Hỏi nơi lưu mỗi lần tải",
    showNotification: "Thông báo sau khi lưu",
    exportSettings: "Xuất",
    importSettings: "Nhập",
    resetDefault: "Khôi phục mặc định",
    about: "Giới thiệu",
    author: "Tác giả",
    aiCredit: "Phát triển với sự hỗ trợ của AI Claude",
    openLanding: "Mở trang giới thiệu",
    version: "Phiên bản",

    saveImageAs: "Lưu ảnh dưới dạng",
    notifyDoneTitle: "Đã lưu ảnh",
    notifyDone: "Ảnh đã được chuyển đổi và tải xuống.",
    notifyFailedTitle: "Lưu ảnh thất bại",
    notifyFailed: "Không thể chuyển đổi hoặc tải ảnh này.",

    toastLoaded: "Đã tải ảnh",
    toastImagesLoaded: (n) => `Đã tải ${n} ảnh`,
    toastSkipped: (n) => `Bỏ qua ${n} tệp (không phải ảnh hợp lệ)`,
    toastInvalidFile: "Tệp này không phải ảnh được hỗ trợ",
    toastLoadFailed: "Không thể tải ảnh này",
    toastInvalidUrl: "Nhập đường dẫn ảnh http(s) hợp lệ",
    toastTooLarge: "Ảnh quá lớn để chuyển đổi",
    toastNoImage: "Hãy thêm ảnh trước",
    toastConverted: "Chuyển đổi thành công",
    toastConvertedZip: (n) => `Đã lưu ${n} ảnh trong một tệp .zip`,
    toastConvertFailed: "Chuyển đổi thất bại",
    toastPasted: "Đã dán ảnh",
    toastCleared: "Đã xoá lịch sử",
    toastHistoryEmpty: "Lịch sử đang trống",
    toastHistoryExported: "Đã xuất lịch sử",
    toastExported: "Đã xuất cài đặt",
    toastImported: "Đã nhập cài đặt",
    toastImportFailed: "Tệp cài đặt không hợp lệ",
    toastReset: "Đã khôi phục cài đặt",
    toastRedoing: "Đang chuyển đổi lại…",
    toastRedoUnavailable: "Mục này không thể lặp lại"
  }
};

const i18n = {
  lang: "en",

  setLang(lang) {
    this.lang = I18N[lang] ? lang : "en";
    if (typeof document !== "undefined") {
      document.documentElement.lang = this.lang;
      this.apply();
    }
  },

  t(key, ...args) {
    const v = (I18N[this.lang] && I18N[this.lang][key]) ?? I18N.en[key] ?? key;
    return typeof v === "function" ? v(...args) : v;
  },

  /** Translates every [data-i18n], [data-i18n-placeholder], [data-i18n-title] and [data-i18n-label] node. */
  apply(root) {
    if (typeof document === "undefined") return;
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((n) => (n.textContent = this.t(n.dataset.i18n)));
    scope.querySelectorAll("[data-i18n-title]").forEach((n) => {
      const text = this.t(n.dataset.i18nTitle);
      n.title = text;
      n.setAttribute("aria-label", text);
    });
    if (!root) document.title = `${this.t("appName")} — ${this.t("tagline")}`;
  }
};
