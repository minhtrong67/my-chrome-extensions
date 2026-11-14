// SmartShot — i18n module (English + Vietnamese).
// The language follows the device automatically ("auto") unless the user picks one.
// Shared by popup.html and background.js.

const I18N = {
  en: {
    tagline: "Capture your screen",

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
    showInFolder: "Show in folder",
    toastCleared: "History cleared",
    undo: "Undo",
    toastFileMissing: "The file was moved or deleted",
    toastSavedToDownloads: "Saved to Downloads",
    capturing: "Capturing…",

    settings: "Settings",
    back: "Back",
    appearance: "Appearance",
    theme: "Theme",
    themeDesc: "Choose how SmartShot looks",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    language: "Language",
    languageDesc: "Interface language",
    langAuto: "Auto (device)",
    shortcuts: "Keyboard shortcuts",
    shortcutsDesc: "Change them on the extensions page",
    shortcutNone: "Not set",

    about: "About",
    author: "Author",
    aiAssist: "AI assistant",
    aiAssistValue: "Claude (Anthropic)",
    version: "Version",
    license: "Free and open source · MIT License",
    privacy: "100% on-device — no analytics, no network requests.",

    selectHint: "Drag to select an area — press Esc to cancel",
    errRestricted: "This page can't be captured",
    errFailed: "Capture failed",
    errTooTall: "Page was too tall — captured the first part"
  },

  vi: {
    tagline: "Chụp màn hình",

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
    showInFolder: "Hiện trong thư mục",
    toastCleared: "Đã xoá lịch sử",
    undo: "Hoàn tác",
    toastFileMissing: "Tệp đã bị di chuyển hoặc xoá",
    toastSavedToDownloads: "Đã lưu vào Downloads",
    capturing: "Đang chụp…",

    settings: "Cài đặt",
    back: "Quay lại",
    appearance: "Giao diện",
    theme: "Chủ đề",
    themeDesc: "Chọn diện mạo của SmartShot",
    themeSystem: "Hệ thống",
    themeLight: "Sáng",
    themeDark: "Tối",
    language: "Ngôn ngữ",
    languageDesc: "Ngôn ngữ giao diện",
    langAuto: "Tự động (thiết bị)",
    shortcuts: "Phím tắt",
    shortcutsDesc: "Đổi phím tắt tại trang tiện ích",
    shortcutNone: "Chưa đặt",

    about: "Giới thiệu",
    author: "Tác giả",
    aiAssist: "AI hỗ trợ",
    aiAssistValue: "Claude (Anthropic)",
    version: "Phiên bản",
    license: "Miễn phí, mã nguồn mở · Giấy phép MIT",
    privacy: "Xử lý 100% trên máy — không theo dõi, không gọi mạng.",

    selectHint: "Kéo để chọn vùng — nhấn Esc để huỷ",
    errRestricted: "Không thể chụp trang này",
    errFailed: "Chụp không thành công",
    errTooTall: "Trang quá dài — đã chụp phần đầu"
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
  }
};
