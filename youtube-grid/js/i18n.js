/**
 * i18n.js — tiny dependency-free English / Vietnamese dictionary.
 *
 * chrome.i18n cannot switch language at runtime, so the in-page strings live
 * here (instant switching, no reload). chrome.i18n + _locales/ is still used
 * for the two fields Chrome reads itself: the extension name and description.
 *
 * The language preference is "auto" | "en" | "vi". "auto" (the default) picks
 * Vietnamese when the browser / device UI language is Vietnamese and English
 * otherwise, so first-time users get their own language with no setup.
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
    landingPage: "Landing page",
    back: "Back",
    changeTheme: "Change theme mode",
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

    // Options navigation
    navLayout: "Layout",
    navAppearance: "Appearance",
    navBackup: "Backup",
    navAbout: "About",

    // Layout
    perPageColumns: "Different count per page",
    perPageColumnsDesc: "Set Home, Subscriptions and Channel separately",
    columnsHome: "Home",
    columnsSubscriptions: "Subscriptions",
    columnsChannel: "Channel",
    showPreview: "Show grid preview",

    // Appearance
    themeSection: "Theme",
    mode: "Mode",
    modeSystem: "System",
    modeLight: "Light",
    modeDark: "Dark",
    themeColor: "Theme color",
    typography: "Typography",
    font: "Font",
    fontSystem: "System default",
    fontSize: "Font size",
    sizeSmall: "Small",
    sizeMedium: "Medium",
    sizeLarge: "Large",
    sizeXLarge: "Extra large",
    fontSample: "The quick brown fox jumps over the lazy dog. 0123456789",
    language: "Language",
    langAuto: "Auto",
    langAutoDesc: "Follows your device language",
    langEn: "English",
    langVi: "Tiếng Việt",

    // Backup
    backupTitle: "Backup & restore",
    backupDesc: "Save your configuration to a file, or load one on another computer.",
    exportSettings: "Export",
    importSettings: "Import",
    resetTitle: "Reset",
    resetDesc: "Restore every option to its default value.",
    resetSettings: "Reset settings",
    resetDialogTitle: "Reset all settings?",
    resetDialogBody: "Every option returns to its default value. This can't be undone.",
    cancel: "Cancel",
    confirmReset: "Reset",

    // About
    version: "Version",
    developedBy: "Developed by",
    aiCredit: "Built with the help of Claude (AI)",
    shortcutTitle: "Keyboard shortcut",
    shortcutDesc: "Toggle custom columns on any tab",
    manageShortcuts: "Manage shortcuts",
    sourceCode: "Source code",
    licenseLine: "Free and open source · MIT License",
    privacyLine: "No accounts, no analytics, no network requests. Settings stay on your device.",

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
    landingPage: "Trang giới thiệu",
    back: "Quay lại",
    changeTheme: "Đổi chế độ giao diện",
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
    navAppearance: "Giao diện",
    navBackup: "Sao lưu",
    navAbout: "Giới thiệu",

    perPageColumns: "Số cột riêng cho từng trang",
    perPageColumnsDesc: "Đặt riêng cho Trang chủ, Kênh đăng ký và Kênh",
    columnsHome: "Trang chủ",
    columnsSubscriptions: "Kênh đăng ký",
    columnsChannel: "Trang kênh",
    showPreview: "Hiện xem trước lưới",

    themeSection: "Chủ đề",
    mode: "Chế độ",
    modeSystem: "Hệ thống",
    modeLight: "Sáng",
    modeDark: "Tối",
    themeColor: "Màu chủ đề",
    typography: "Chữ viết",
    font: "Phông chữ",
    fontSystem: "Mặc định hệ thống",
    fontSize: "Cỡ chữ",
    sizeSmall: "Nhỏ",
    sizeMedium: "Vừa",
    sizeLarge: "Lớn",
    sizeXLarge: "Rất lớn",
    fontSample: "Thử phông chữ: Tiếng Việt có dấu, ABC xyz 0123456789",
    language: "Ngôn ngữ",
    langAuto: "Tự động",
    langAutoDesc: "Theo ngôn ngữ của thiết bị",
    langEn: "English",
    langVi: "Tiếng Việt",

    backupTitle: "Sao lưu & khôi phục",
    backupDesc: "Lưu cấu hình ra tệp, hoặc nạp lại trên máy tính khác.",
    exportSettings: "Xuất tệp",
    importSettings: "Nhập tệp",
    resetTitle: "Đặt lại",
    resetDesc: "Đưa mọi tuỳ chọn về giá trị mặc định.",
    resetSettings: "Đặt lại cài đặt",
    resetDialogTitle: "Đặt lại toàn bộ cài đặt?",
    resetDialogBody: "Mọi tuỳ chọn sẽ trở về mặc định. Không thể hoàn tác.",
    cancel: "Huỷ",
    confirmReset: "Đặt lại",

    version: "Phiên bản",
    developedBy: "Phát triển bởi",
    aiCredit: "Được xây dựng với sự hỗ trợ của Claude (AI)",
    shortcutTitle: "Phím tắt",
    shortcutDesc: "Bật/tắt số cột tuỳ chỉnh trên mọi tab",
    manageShortcuts: "Quản lý phím tắt",
    sourceCode: "Mã nguồn",
    licenseLine: "Miễn phí và mã nguồn mở · Giấy phép MIT",
    privacyLine: "Không tài khoản, không theo dõi, không gửi dữ liệu. Cài đặt chỉ nằm trên máy bạn.",

    toastEnabled: "Đã bật tiện ích",
    toastDisabled: "Đã tạm dừng tiện ích",
    toastExported: "Đã xuất cài đặt",
    toastImported: "Đã nhập cài đặt",
    toastImportFailed: "Tệp này không phải bản sao lưu YouTube Grid hợp lệ",
    toastReset: "Đã đặt lại cài đặt mặc định"
  }
};

/** Names of the Material colour swatches, per language. */
const COLOR_NAMES = {
  en: {
    red: "Red", pink: "Pink", purple: "Purple", deepPurple: "Deep purple", indigo: "Indigo",
    blue: "Blue", lightBlue: "Light blue", cyan: "Cyan", teal: "Teal", green: "Green",
    lightGreen: "Light green", lime: "Lime", yellow: "Yellow", amber: "Amber",
    orange: "Orange", deepOrange: "Deep orange", brown: "Brown", blueGrey: "Blue grey"
  },
  vi: {
    red: "Đỏ", pink: "Hồng", purple: "Tím", deepPurple: "Tím đậm", indigo: "Chàm",
    blue: "Xanh dương", lightBlue: "Xanh da trời", cyan: "Xanh lơ", teal: "Xanh mòng két",
    green: "Xanh lá", lightGreen: "Xanh lá nhạt", lime: "Vàng chanh", yellow: "Vàng",
    amber: "Hổ phách", orange: "Cam", deepOrange: "Cam đậm", brown: "Nâu", blueGrey: "Xám xanh"
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

  colorName(id) {
    return (COLOR_NAMES[this.lang] && COLOR_NAMES[this.lang][id]) || COLOR_NAMES.en[id] || id;
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
