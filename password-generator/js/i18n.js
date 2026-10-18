// LockSmith — i18n module
// Bilingual dictionary: English (en) and Vietnamese (vi)

const I18N = {
  en: {
    tagline: "Password Generator",
    modePassword: "Password",
    modePassphrase: "Passphrase",
    modePin: "PIN",
    copy: "Copy",
    copied: "Copied!",
    regenerate: "Regenerate",
    strengthWeak: "Weak",
    strengthFair: "Fair",
    strengthGood: "Good",
    strengthStrong: "Strong",
    strengthVeryStrong: "Very strong",
    crackTimeLabel: "Time to crack:",
    crackInstant: "instantly",
    crackSeconds: (n) => `${n} second${n !== 1 ? "s" : ""}`,
    crackMinutes: (n) => `${n} minute${n !== 1 ? "s" : ""}`,
    crackHours: (n) => `${n} hour${n !== 1 ? "s" : ""}`,
    crackDays: (n) => `${n} day${n !== 1 ? "s" : ""}`,
    crackYears: (n) => `${n} year${n !== 1 ? "s" : ""}`,
    crackThousandYears: (n) => `${n} thousand years`,
    crackMillionYears: (n) => `${n} million years`,
    crackBillionYears: (n) => `${n}+ billion years`,
    length: "Length",
    uppercase: "Uppercase A-Z",
    lowercase: "Lowercase a-z",
    numbers: "Numbers 0-9",
    symbols: "Symbols !@#$",
    advanced: "Advanced options",
    excludeAmbiguous: "Exclude ambiguous characters (l, 1, I, O, 0)",
    noDuplicate: "Avoid repeating characters",
    customExclude: "Custom characters to exclude",
    wordCount: "Number of words",
    separator: "Separator",
    capitalize: "Capitalize each word",
    addNumber: "Add a random number",
    pinLength: "Number of digits",
    generate: "Generate Password",
    generatePassphrase: "Generate Passphrase",
    generatePin: "Generate PIN",
    history: "Recent history",
    clear: "Clear",
    exportTxt: "Export .txt",
    toastHistoryExported: "History exported as .txt",
    toastHistoryEmpty: "No history to export",
    madeBy: "Made by",
    settings: "Settings",
    appearance: "Appearance",
    theme: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    fontSize: "Font size",
    fontSmall: "Small",
    fontMedium: "Medium",
    fontLarge: "Large",
    language: "Language",
    languageAuto: "Auto (device)",
    displayOptions: "Display",
    showStrength: "Show strength meter",
    showHistory: "Save recent history",
    showHistoryHint: "When off, generated values are shown once and never saved anywhere — nothing to clear later.",
    historyLimit: "History items to keep",
    dataManagement: "Data",
    exportSettings: "Export settings",
    importSettings: "Import settings",
    resetDefault: "Reset to default",
    confirmClickAgain: "Click again to confirm",
    about: "About",
    colorTheme: "Theme color",
    credits: "Credits",
    openLanding: "Open landing page",
    creditsTitle: "Built with care",
    creditsBody: "An open-source password toolkit crafted by",
    withClaude: "with support from Claude AI",
    close: "Close",
    authorLine: "Developed by",
    historyEmpty: "No passwords generated yet",
    historyPrivacyHint: "History is stored only on this device, in plain text, so anyone with access to your computer could read it. Keep it off for anything highly sensitive.",
    toastCopied: "Copied to clipboard",
    toastCopyFailed: "Could not copy",
    toastCleared: "History cleared",
    toastExported: "Settings exported",
    toastImported: "Settings imported successfully",
    toastImportFailed: "Invalid settings file",
    toastReset: "Settings reset to default",
    needOneCharType: "Select at least one character type",
    warningShorterThanRequested: "Fewer unique characters available than requested — password is shorter than the length you set",
    customExcludePlaceholder: "e.g. { } ; \""
  },
  vi: {
    tagline: "Trình Tạo Mật Khẩu",
    modePassword: "Mật khẩu",
    modePassphrase: "Cụm mật khẩu",
    modePin: "Mã PIN",
    copy: "Sao chép",
    copied: "Đã sao chép!",
    regenerate: "Tạo lại",
    strengthWeak: "Yếu",
    strengthFair: "Trung bình",
    strengthGood: "Khá",
    strengthStrong: "Mạnh",
    strengthVeryStrong: "Rất mạnh",
    crackTimeLabel: "Thời gian bẻ khoá:",
    crackInstant: "ngay lập tức",
    crackSeconds: (n) => `${n} giây`,
    crackMinutes: (n) => `${n} phút`,
    crackHours: (n) => `${n} giờ`,
    crackDays: (n) => `${n} ngày`,
    crackYears: (n) => `${n} năm`,
    crackThousandYears: (n) => `${n} nghìn năm`,
    crackMillionYears: (n) => `${n} triệu năm`,
    crackBillionYears: (n) => `hơn ${n} tỷ năm`,
    length: "Độ dài",
    uppercase: "Chữ hoa A-Z",
    lowercase: "Chữ thường a-z",
    numbers: "Chữ số 0-9",
    symbols: "Ký tự đặc biệt !@#$",
    advanced: "Tuỳ chọn nâng cao",
    excludeAmbiguous: "Loại ký tự dễ nhầm (l, 1, I, O, 0)",
    noDuplicate: "Tránh lặp lại ký tự",
    customExclude: "Ký tự tuỳ chỉnh cần loại bỏ",
    wordCount: "Số lượng từ",
    separator: "Ký tự phân cách",
    capitalize: "Viết hoa chữ cái đầu mỗi từ",
    addNumber: "Thêm số ngẫu nhiên",
    pinLength: "Số chữ số",
    generate: "Tạo Mật Khẩu",
    generatePassphrase: "Tạo Cụm Mật Khẩu",
    generatePin: "Tạo Mã PIN",
    history: "Lịch sử gần đây",
    clear: "Xoá",
    exportTxt: "Xuất .txt",
    toastHistoryExported: "Đã xuất lịch sử ra file .txt",
    toastHistoryEmpty: "Không có lịch sử để xuất",
    madeBy: "Thực hiện bởi",
    settings: "Cài đặt",
    appearance: "Giao diện",
    theme: "Chủ đề",
    themeSystem: "Theo hệ thống",
    themeLight: "Sáng",
    themeDark: "Tối",
    fontSize: "Cỡ chữ",
    fontSmall: "Nhỏ",
    fontMedium: "Vừa",
    fontLarge: "Lớn",
    language: "Ngôn ngữ",
    languageAuto: "Tự động (thiết bị)",
    displayOptions: "Hiển thị",
    showStrength: "Hiện thanh đo độ mạnh",
    showHistory: "Lưu lịch sử gần đây",
    showHistoryHint: "Khi tắt, giá trị vừa tạo chỉ hiện một lần và không được lưu lại ở đâu cả — không có gì để xoá về sau.",
    historyLimit: "Số mục lịch sử lưu trữ",
    dataManagement: "Dữ liệu",
    exportSettings: "Xuất cài đặt",
    importSettings: "Nhập cài đặt",
    resetDefault: "Khôi phục mặc định",
    confirmClickAgain: "Nhấn lại để xác nhận",
    about: "Giới thiệu",
    colorTheme: "Màu chủ đề",
    credits: "Ghi nhận",
    openLanding: "Mở trang giới thiệu",
    creditsTitle: "Được tạo nên bằng sự tận tâm",
    creditsBody: "Bộ công cụ mật khẩu mã nguồn mở được phát triển bởi",
    withClaude: "với sự hỗ trợ của Claude AI",
    close: "Đóng",
    authorLine: "Phát triển bởi",
    historyEmpty: "Chưa có mật khẩu nào được tạo",
    historyPrivacyHint: "Lịch sử chỉ lưu trên thiết bị này dưới dạng văn bản thường, nên bất kỳ ai dùng chung máy tính đều có thể đọc được. Nên tắt nếu bạn tạo thứ gì đó thực sự nhạy cảm.",
    toastCopied: "Đã sao chép vào bộ nhớ tạm",
    toastCopyFailed: "Không thể sao chép",
    toastCleared: "Đã xoá lịch sử",
    toastExported: "Đã xuất cài đặt",
    toastImported: "Nhập cài đặt thành công",
    toastImportFailed: "Tệp cài đặt không hợp lệ",
    toastReset: "Đã khôi phục cài đặt mặc định",
    needOneCharType: "Chọn ít nhất một loại ký tự",
    warningShorterThanRequested: "Không đủ ký tự khác nhau như yêu cầu — mật khẩu ngắn hơn độ dài bạn đã đặt",
    customExcludePlaceholder: "vd: { } ; \""
  }
};

const i18n = {
  current: "en",

  /** Look up a key; if its value is a function (used for strings that need
   *  a number interpolated, e.g. crack-time durations), call it with the
   *  remaining arguments. */
  t(key, ...args) {
    const entry = (I18N[this.current] && I18N[this.current][key]) ?? I18N.en[key] ?? key;
    return typeof entry === "function" ? entry(...args) : entry;
  },

  setLang(lang) {
    const detected = (navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en";
    this.current = lang === "auto" ? detected : (I18N[lang] ? lang : "en");
    this.apply();
  },

  apply() {
    document.documentElement.lang = this.current;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      if (el.classList.contains("is-armed")) return; // mid-countdown "click again to confirm" state — don't clobber it
      const key = el.getAttribute("data-i18n");
      el.textContent = this.t(key);
    });

    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      el.title = this.t(key);
    });

    const excludeInput = document.getElementById("customExclude");
    if (excludeInput) excludeInput.placeholder = this.t("customExcludePlaceholder");

    const langCode = document.getElementById("langCode");
    if (langCode) langCode.textContent = this.current.toUpperCase();

    const languageSelect = document.getElementById("languageSelect");
    if (languageSelect) languageSelect.value = this.current;
  }
};
