// SmartShot — i18n module (English + Vietnamese).
// The language follows the device automatically ("auto") unless the user picks one.
// Shared by popup.html, editor.html and background.js.

const I18N = {
  en: {
    tagline: "Screenshot & Annotate",

    captureVisible: "Visible area",
    captureVisibleSub: "Just what's on screen right now",
    captureFullPage: "Full page",
    captureFullPageSub: "Scrolls and stitches the whole page",
    captureArea: "Selected area",
    captureAreaSub: "Drag to pick exactly what you need",
    restrictedTitle: "This page can't be captured",
    restrictedSub: "Browser pages and the Web Store are protected. Open a regular website and try again.",
    capturing: "Capturing…",

    history: "Recent captures",
    clear: "Clear",
    historyEmpty: "No screenshots yet",
    historyEmptySub: "Your latest captures will show up here.",
    typeVisible: "Visible area",
    typeFullPage: "Full page",
    typeArea: "Selected area",
    metaEditor: "Edited",
    metaDownload: "Downloaded",
    metaClipboard: "Copied",

    settings: "Settings",
    back: "Back",
    toggleTheme: "Change theme",
    appearance: "Appearance",
    theme: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    themeColor: "Theme color",
    font: "Font",
    fontSize: "Font size",
    fontSmall: "Small",
    fontMedium: "Medium",
    fontLarge: "Large",
    fontXLarge: "Extra large",
    language: "Language",
    langAuto: "Auto (device language)",
    fontPreview: "The quick brown fox jumps over the lazy dog",

    captureSection: "Capture",
    format: "Format",
    quality: "JPEG quality",
    fullPageDelay: "Scroll delay (full page)",
    fullPageDelayHint: "Chrome limits captures to about 2 per second.",
    openEditorAfterCapture: "Open editor after capture",
    openEditorHint: "Off: save or copy instantly",
    quickSaveAction: "When not editing",
    afterDownload: "Save to Downloads",
    afterClipboard: "Copy to clipboard",

    historySection: "History",
    showHistory: "Show recent captures",
    historyLimit: "Items to keep",

    dataManagement: "Data",
    exportSettings: "Export",
    importSettings: "Import",
    resetDefault: "Reset settings",
    resetTitle: "Reset all settings?",
    resetBody: "Appearance, language and capture options go back to their defaults. Your history is kept.",
    cancel: "Cancel",
    reset: "Reset",

    about: "About",
    version: "Version",
    authorLine: "Created by",
    aiLine: "with AI support from Claude",
    licenseLine: "Open source · MIT License",

    toastCleared: "History cleared",
    toastExported: "Settings exported",
    toastImported: "Settings imported",
    toastImportFailed: "Invalid settings file",
    toastReset: "Settings reset",

    selectHint: "Drag to select an area — press Esc to cancel",
    errRestricted: "This page can't be captured",
    errFailed: "Capture failed",
    errTooTall: "Page was too tall — captured the first part",

    editorTitle: "SmartShot Editor",
    discard: "Close editor",
    toolSelect: "Select & move (V)",
    toolPen: "Pen (P)",
    toolArrow: "Arrow (A)",
    toolRect: "Rectangle (R)",
    toolEllipse: "Ellipse (E)",
    toolText: "Text (T)",
    toolHighlight: "Highlighter (H)",
    toolBlur: "Pixelate / redact (B)",
    toolCrop: "Crop (C)",
    color: "Color",
    strokeSize: "Size",
    undo: "Undo (Ctrl+Z)",
    redo: "Redo (Ctrl+Y)",
    clearAll: "Remove all annotations",
    deleteSel: "Delete selected (Del)",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    zoomFit: "Fit to window",
    filename: "File name",
    copyClipboard: "Copy",
    downloadImage: "Download",
    textPlaceholder: "Type text…",
    cropApply: "Apply crop",
    cropCancel: "Cancel",
    cropHint: "Enter to apply · Esc to cancel",
    unsavedTitle: "Discard changes?",
    unsavedBody: "You have edits that haven't been downloaded or copied.",
    keepEditing: "Keep editing",
    discardClose: "Discard & close",

    toastCopied: "Copied to clipboard",
    toastCopyFailed: "Couldn't copy to clipboard",
    toastDownloaded: "Image downloaded",
    toastCropApplied: "Crop applied",
    toastCleared2: "Annotations removed",
    toastNothingToUndo: "Nothing to undo",
    toastNothingToRedo: "Nothing to redo",
    toastLoadFailed: "Couldn't load the captured image"
  },
  vi: {
    tagline: "Chụp & Chú Thích Màn Hình",

    captureVisible: "Vùng hiển thị",
    captureVisibleSub: "Chỉ phần đang hiện trên màn hình",
    captureFullPage: "Toàn trang",
    captureFullPageSub: "Tự động cuộn và ghép cả trang",
    captureArea: "Vùng chọn",
    captureAreaSub: "Kéo để chọn đúng phần bạn cần",
    restrictedTitle: "Không thể chụp trang này",
    restrictedSub: "Trang của trình duyệt và Web Store được bảo vệ. Hãy mở một trang web thông thường rồi thử lại.",
    capturing: "Đang chụp…",

    history: "Ảnh chụp gần đây",
    clear: "Xoá",
    historyEmpty: "Chưa có ảnh chụp nào",
    historyEmptySub: "Các ảnh chụp mới nhất sẽ hiện ở đây.",
    typeVisible: "Vùng hiển thị",
    typeFullPage: "Toàn trang",
    typeArea: "Vùng chọn",
    metaEditor: "Đã chỉnh sửa",
    metaDownload: "Đã tải xuống",
    metaClipboard: "Đã sao chép",

    settings: "Cài đặt",
    back: "Quay lại",
    toggleTheme: "Đổi giao diện",
    appearance: "Giao diện",
    theme: "Chủ đề",
    themeSystem: "Hệ thống",
    themeLight: "Sáng",
    themeDark: "Tối",
    themeColor: "Màu chủ đề",
    font: "Phông chữ",
    fontSize: "Cỡ chữ",
    fontSmall: "Nhỏ",
    fontMedium: "Vừa",
    fontLarge: "Lớn",
    fontXLarge: "Rất lớn",
    language: "Ngôn ngữ",
    langAuto: "Tự động (theo thiết bị)",
    fontPreview: "Quá nhiều chữ nghĩa đẹp tựa gió thoảng mây trôi",

    captureSection: "Chụp ảnh",
    format: "Định dạng",
    quality: "Chất lượng JPEG",
    fullPageDelay: "Độ trễ cuộn (toàn trang)",
    fullPageDelayHint: "Chrome giới hạn khoảng 2 lần chụp mỗi giây.",
    openEditorAfterCapture: "Mở trình chỉnh sửa sau khi chụp",
    openEditorHint: "Tắt: lưu hoặc sao chép ngay",
    quickSaveAction: "Khi không chỉnh sửa",
    afterDownload: "Lưu vào Downloads",
    afterClipboard: "Sao chép vào clipboard",

    historySection: "Lịch sử",
    showHistory: "Hiện ảnh chụp gần đây",
    historyLimit: "Số mục lưu giữ",

    dataManagement: "Dữ liệu",
    exportSettings: "Xuất",
    importSettings: "Nhập",
    resetDefault: "Khôi phục cài đặt",
    resetTitle: "Khôi phục toàn bộ cài đặt?",
    resetBody: "Giao diện, ngôn ngữ và tuỳ chọn chụp sẽ về mặc định. Lịch sử vẫn được giữ lại.",
    cancel: "Huỷ",
    reset: "Khôi phục",

    about: "Giới thiệu",
    version: "Phiên bản",
    authorLine: "Tác giả",
    aiLine: "với sự hỗ trợ của AI Claude",
    licenseLine: "Mã nguồn mở · Giấy phép MIT",

    toastCleared: "Đã xoá lịch sử",
    toastExported: "Đã xuất cài đặt",
    toastImported: "Đã nhập cài đặt",
    toastImportFailed: "Tệp cài đặt không hợp lệ",
    toastReset: "Đã khôi phục cài đặt",

    selectHint: "Kéo để chọn vùng chụp — nhấn Esc để huỷ",
    errRestricted: "Không thể chụp trang này",
    errFailed: "Chụp ảnh thất bại",
    errTooTall: "Trang quá dài — đã chụp phần đầu",

    editorTitle: "Trình chỉnh sửa SmartShot",
    discard: "Đóng trình chỉnh sửa",
    toolSelect: "Chọn & di chuyển (V)",
    toolPen: "Bút vẽ (P)",
    toolArrow: "Mũi tên (A)",
    toolRect: "Hình chữ nhật (R)",
    toolEllipse: "Hình elip (E)",
    toolText: "Chữ (T)",
    toolHighlight: "Bút dạ quang (H)",
    toolBlur: "Che điểm ảnh (B)",
    toolCrop: "Cắt ảnh (C)",
    color: "Màu",
    strokeSize: "Kích thước",
    undo: "Hoàn tác (Ctrl+Z)",
    redo: "Làm lại (Ctrl+Y)",
    clearAll: "Xoá tất cả chú thích",
    deleteSel: "Xoá mục đã chọn (Del)",
    zoomIn: "Phóng to",
    zoomOut: "Thu nhỏ",
    zoomFit: "Vừa khung nhìn",
    filename: "Tên tệp",
    copyClipboard: "Sao chép",
    downloadImage: "Tải xuống",
    textPlaceholder: "Nhập chữ…",
    cropApply: "Áp dụng cắt",
    cropCancel: "Huỷ",
    cropHint: "Enter để áp dụng · Esc để huỷ",
    unsavedTitle: "Bỏ các thay đổi?",
    unsavedBody: "Bạn có chỉnh sửa chưa được tải xuống hoặc sao chép.",
    keepEditing: "Tiếp tục chỉnh sửa",
    discardClose: "Bỏ & đóng",

    toastCopied: "Đã sao chép vào clipboard",
    toastCopyFailed: "Không thể sao chép vào clipboard",
    toastDownloaded: "Đã tải ảnh xuống",
    toastCropApplied: "Đã áp dụng cắt ảnh",
    toastCleared2: "Đã xoá các chú thích",
    toastNothingToUndo: "Không có gì để hoàn tác",
    toastNothingToRedo: "Không có gì để làm lại",
    toastLoadFailed: "Không thể tải ảnh đã chụp"
  }
};

const i18n = {
  current: "en",

  t(key) {
    return (I18N[this.current] && I18N[this.current][key]) || I18N.en[key] || key;
  },

  /** @param setting "auto" | "en" | "vi" */
  setLang(setting) {
    this.current = resolveLanguage(setting);
    if (typeof document !== "undefined") this.apply();
  },

  apply(root) {
    const scope = root || document;
    if (!root) document.documentElement.lang = this.current;

    scope.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = this.t(node.getAttribute("data-i18n"));
    });
    scope.querySelectorAll("[data-i18n-title]").forEach((node) => {
      const text = this.t(node.getAttribute("data-i18n-title"));
      node.title = text;
      node.setAttribute("aria-label", text);
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      node.placeholder = this.t(node.getAttribute("data-i18n-placeholder"));
    });
  }
};
