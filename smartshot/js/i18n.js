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
    toastCleared: "History cleared",

    settings: "Settings",
    back: "Back",
    themeColor: "Theme color",
    theme: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    language: "Language",
    langAuto: "Auto follows your device language",
    langAutoShort: "Auto",
    afterCapture: "After capturing",
    openEditor: "Open editor",
    openEditorOn: "Annotate the screenshot before saving it",
    openEditorOff: "Save the PNG straight to your Downloads folder",
    toastSavedToDownloads: "Saved to Downloads",

    about: "About",
    authorLine: "Created by",
    aiLine: "with AI support from Claude",
    licenseLine: "Open source · MIT License",
    openLanding: "Open landing page",

    selectHint: "Drag to select an area — press Esc to cancel",
    errRestricted: "This page can't be captured",
    errFailed: "Capture failed",
    errTooTall: "Page was too tall — captured the first part",

    editorTitle: "SmartShot Editor",
    toggleTheme: "Change theme",
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
    customColor: "Custom color",
    strokeSize: "Size",
    undo: "Undo (Ctrl+Z)",
    redo: "Redo (Ctrl+Y)",
    clearAll: "Remove all annotations",
    deleteSel: "Delete selected (Del)",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    zoomFit: "Fit to window",
    filename: "File name",
    quality: "JPEG quality",
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
    toastExportFailed: "Couldn't export the image",
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
    captureFullPageSub: "Tự cuộn và ghép cả trang thành một ảnh",
    captureArea: "Vùng chọn",
    captureAreaSub: "Kéo để chọn đúng phần bạn cần",
    restrictedTitle: "Không thể chụp trang này",
    restrictedSub: "Trang hệ thống của trình duyệt và Web Store được bảo vệ. Hãy mở một trang web bình thường rồi thử lại.",

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
    toastCleared: "Đã xoá lịch sử",

    settings: "Cài đặt",
    back: "Quay lại",
    themeColor: "Màu chủ đề",
    theme: "Giao diện",
    themeSystem: "Hệ thống",
    themeLight: "Sáng",
    themeDark: "Tối",
    language: "Ngôn ngữ",
    langAuto: "Tự động theo ngôn ngữ của thiết bị",
    langAutoShort: "Tự động",
    afterCapture: "Sau khi chụp",
    openEditor: "Mở trình chỉnh sửa",
    openEditorOn: "Chỉnh sửa ảnh trước khi lưu",
    openEditorOff: "Tải ảnh PNG thẳng vào thư mục Downloads",
    toastSavedToDownloads: "Đã lưu vào Downloads",

    about: "Giới thiệu",
    authorLine: "Tác giả",
    aiLine: "với sự hỗ trợ của AI Claude",
    licenseLine: "Mã nguồn mở · Giấy phép MIT",
    openLanding: "Mở trang giới thiệu",

    selectHint: "Kéo để chọn vùng — nhấn Esc để huỷ",
    errRestricted: "Không thể chụp trang này",
    errFailed: "Chụp không thành công",
    errTooTall: "Trang quá dài — đã chụp phần đầu",

    editorTitle: "Trình chỉnh sửa SmartShot",
    toggleTheme: "Đổi giao diện",
    discard: "Đóng trình chỉnh sửa",
    toolSelect: "Chọn & di chuyển (V)",
    toolPen: "Bút vẽ (P)",
    toolArrow: "Mũi tên (A)",
    toolRect: "Hình chữ nhật (R)",
    toolEllipse: "Hình elip (E)",
    toolText: "Văn bản (T)",
    toolHighlight: "Bút nhấn (H)",
    toolBlur: "Làm mờ / che thông tin (B)",
    toolCrop: "Cắt ảnh (C)",
    color: "Màu",
    customColor: "Màu tuỳ chọn",
    strokeSize: "Kích thước",
    undo: "Hoàn tác (Ctrl+Z)",
    redo: "Làm lại (Ctrl+Y)",
    clearAll: "Xoá tất cả chú thích",
    deleteSel: "Xoá mục đã chọn (Del)",
    zoomIn: "Phóng to",
    zoomOut: "Thu nhỏ",
    zoomFit: "Vừa khung nhìn",
    filename: "Tên tệp",
    quality: "Chất lượng JPEG",
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
    toastExportFailed: "Không thể xuất ảnh",
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
