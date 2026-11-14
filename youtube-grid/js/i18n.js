/**
 * i18n.js — tiny dependency-free English / Vietnamese dictionary.
 *
 * chrome.i18n can't switch language at runtime, so in-page strings live here
 * (instant switching, no reload). chrome.i18n + _locales/ is only used for the
 * fields Chrome reads itself: extension name, description, shortcut label.
 *
 * Preference is "auto" | "en" | "vi". "auto" (the default) follows the browser
 * language: Vietnamese if it is Vietnamese, English otherwise.
 */
const I18N = {
  en: {
    appName: "YouTube Grid",
    tagline: "Your grid, your rules",
    settings: "Settings",

    // Popup + shared
    enableExtension: "Enable extension",
    pausedHint: "All effects are paused",
    customColumns: "Custom column count",
    columnsPerRow: "columns per row",
    defaultLayoutNote: "Using YouTube's default layout.",
    perPageActive: "Different count per page",
    perPageActiveHint: "Fine-tune each page in Settings",
    openSettings: "Open settings",
    openFull: "Open in a new tab",
    back: "Back",
    changeTheme: "Change theme",
    gridColumns: "Grid columns",

    // Declutter
    declutter: "Declutter",
    hideShorts: "Hide Shorts",
    hideShortsDesc: "Remove Shorts shelves and the Shorts menu entry",
    compactCards: "Compact cards",
    compactCardsDesc: "Hide avatars, descriptions and metadata on video cards",
    hideComments: "Hide comments",
    hideCommentsDesc: "Remove the comments section on watch pages",
    hideEndCards: "Hide end-screen cards",
    hideEndCardsDesc: "Remove suggestion cards that cover the end of a video",
    focusMode: "Focus mode",
    focusModeDesc: "Hide the related-videos sidebar on watch pages",

    // Navigation
    navLayout: "Layout",
    navGeneral: "General",
    navAbout: "About",

    // Layout
    perPageColumns: "Different count per page",
    perPageColumnsDesc: "Set Home, Subscriptions and Channel separately",
    columnsHome: "Home",
    columnsSubscriptions: "Subscriptions",
    columnsChannel: "Channel",
    showPreview: "Show grid preview",

    // General
    groupAppearance: "Appearance",
    themeTitle: "App theme",
    themeDesc: "Choose light, dark, or match your system",
    modeSystem: "System",
    modeLight: "Light",
    modeDark: "Dark",
    languageTitle: "Language",
    languageDesc: "Language used across the extension",
    langEn: "English",
    langVi: "Tiếng Việt",
    groupShortcut: "Keyboard shortcut",
    shortcutTitle: "Toggle columns",
    shortcutDesc: "Turns custom columns on or off on any YouTube tab",
    manageShortcuts: "Manage shortcuts",
    manageShortcutsDesc: "Change the keys in your browser's extension settings",
    groupData: "Backup and reset",
    exportTitle: "Export settings",
    exportDesc: "Save your configuration to a JSON file",
    importTitle: "Import settings",
    importDesc: "Load a configuration from a JSON file",
    resetTitle: "Reset settings",
    resetDesc: "Restore every option to its default value",
    exportBtn: "Export",
    importBtn: "Import",
    resetBtn: "Reset",
    resetDialogTitle: "Reset all settings?",
    resetDialogBody: "Every option returns to its default value. This can't be undone.",
    cancel: "Cancel",
    confirmReset: "Reset",

    // About
    version: "Version",
    groupCredits: "Credits",
    authorTitle: "Author",
    authorDesc: "Designed and developed by",
    aiTitle: "AI assistant",
    aiDesc: "Built with the help of Claude, an AI assistant by Anthropic",
    groupMore: "More",
    sourceTitle: "Source code",
    sourceDesc: "View the project on GitHub",
    privacyTitle: "Privacy",
    privacyDesc: "No accounts, no analytics, no network requests. Settings stay on your device.",
    licenseTitle: "License",
    licenseDesc: "Free and open source",

    // Toasts
    toastEnabled: "Extension enabled",
    toastDisabled: "Extension paused",
    toastExported: "Settings exported",
    toastImported: "Settings imported",
    toastImportFailed: "That file isn't a valid YouTube Grid backup",
    toastReset: "Settings restored to default"
  },

  vi: {
    appName: "YouTube Grid",
    tagline: "Lưới video theo ý bạn",
    settings: "Cài đặt",

    enableExtension: "Bật tiện ích",
    pausedHint: "Mọi hiệu ứng đang tạm dừng",
    customColumns: "Tuỳ chỉnh số cột",
    columnsPerRow: "cột mỗi hàng",
    defaultLayoutNote: "Đang dùng bố cục mặc định của YouTube.",
    perPageActive: "Số cột riêng cho từng trang",
    perPageActiveHint: "Tinh chỉnh từng trang trong Cài đặt",
    openSettings: "Mở cài đặt",
    openFull: "Mở trong tab mới",
    back: "Quay lại",
    changeTheme: "Đổi giao diện",
    gridColumns: "Số cột lưới",

    declutter: "Dọn giao diện",
    hideShorts: "Ẩn Shorts",
    hideShortsDesc: "Ẩn các khối Shorts và mục Shorts trên thanh bên",
    compactCards: "Thẻ video gọn",
    compactCardsDesc: "Ẩn ảnh đại diện, mô tả và thông tin phụ trên thẻ video",
    hideComments: "Ẩn bình luận",
    hideCommentsDesc: "Ẩn phần bình luận ở trang xem video",
    hideEndCards: "Ẩn thẻ cuối video",
    hideEndCardsDesc: "Ẩn các thẻ gợi ý che phần cuối video",
    focusMode: "Chế độ tập trung",
    focusModeDesc: "Ẩn cột video đề xuất ở trang xem video",

    navLayout: "Bố cục",
    navGeneral: "Chung",
    navAbout: "Giới thiệu",

    perPageColumns: "Số cột riêng cho từng trang",
    perPageColumnsDesc: "Đặt riêng cho Trang chủ, Kênh đăng ký và Kênh",
    columnsHome: "Trang chủ",
    columnsSubscriptions: "Kênh đăng ký",
    columnsChannel: "Trang kênh",
    showPreview: "Hiện xem trước lưới",

    groupAppearance: "Giao diện",
    themeTitle: "Chế độ giao diện",
    themeDesc: "Chọn sáng, tối hoặc theo hệ thống",
    modeSystem: "Hệ thống",
    modeLight: "Sáng",
    modeDark: "Tối",
    languageTitle: "Ngôn ngữ",
    languageDesc: "Ngôn ngữ hiển thị của tiện ích",
    langEn: "English",
    langVi: "Tiếng Việt",
    groupShortcut: "Phím tắt",
    shortcutTitle: "Bật/tắt số cột",
    shortcutDesc: "Bật hoặc tắt số cột tuỳ chỉnh trên mọi tab YouTube",
    manageShortcuts: "Quản lý phím tắt",
    manageShortcutsDesc: "Đổi phím trong cài đặt tiện ích của trình duyệt",
    groupData: "Sao lưu và đặt lại",
    exportTitle: "Xuất cài đặt",
    exportDesc: "Lưu cấu hình ra tệp JSON",
    importTitle: "Nhập cài đặt",
    importDesc: "Nạp cấu hình từ tệp JSON",
    resetTitle: "Đặt lại cài đặt",
    resetDesc: "Đưa mọi tuỳ chọn về giá trị mặc định",
    exportBtn: "Xuất",
    importBtn: "Nhập",
    resetBtn: "Đặt lại",
    resetDialogTitle: "Đặt lại toàn bộ cài đặt?",
    resetDialogBody: "Mọi tuỳ chọn sẽ trở về mặc định. Không thể hoàn tác.",
    cancel: "Huỷ",
    confirmReset: "Đặt lại",

    version: "Phiên bản",
    groupCredits: "Thông tin",
    authorTitle: "Tác giả",
    authorDesc: "Thiết kế và phát triển bởi",
    aiTitle: "AI hỗ trợ",
    aiDesc: "Xây dựng với sự hỗ trợ của Claude, trợ lý AI của Anthropic",
    groupMore: "Khác",
    sourceTitle: "Mã nguồn",
    sourceDesc: "Xem dự án trên GitHub",
    privacyTitle: "Quyền riêng tư",
    privacyDesc: "Không tài khoản, không theo dõi, không gửi dữ liệu. Cài đặt chỉ nằm trên máy bạn.",
    licenseTitle: "Giấy phép",
    licenseDesc: "Miễn phí và mã nguồn mở",

    toastEnabled: "Đã bật tiện ích",
    toastDisabled: "Đã tạm dừng tiện ích",
    toastExported: "Đã xuất cài đặt",
    toastImported: "Đã nhập cài đặt",
    toastImportFailed: "Tệp này không phải bản sao lưu YouTube Grid hợp lệ",
    toastReset: "Đã đặt lại cài đặt mặc định"
  }
};

const i18n = {
  lang: "en",

  /** Language of the browser / device: "vi" for Vietnamese, otherwise "en". */
  detect() {
    let ui = "";
    try {
      ui = (chrome.i18n && chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()) || "";
    } catch (e) { /* not available */ }
    const candidates = [ui, ...(navigator.languages || []), navigator.language || ""];
    return candidates.some((l) => /^vi\b/i.test(l || "")) ? "vi" : "en";
  },

  /** Turn a stored preference ("auto" | "en" | "vi") into a concrete language. */
  resolve(pref) {
    return pref === "en" || pref === "vi" ? pref : this.detect();
  },

  setLang(pref) {
    this.lang = this.resolve(pref);
    document.documentElement.lang = this.lang;
  },

  t(key) {
    return (I18N[this.lang] && I18N[this.lang][key]) || I18N.en[key] || key;
  },

  /** Translate every [data-i18n], [data-i18n-title] and [data-i18n-aria] under root. */
  apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = this.t(el.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = this.t(el.dataset.i18nTitle);
    });
    root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", this.t(el.dataset.i18nAria));
    });
  }
};
