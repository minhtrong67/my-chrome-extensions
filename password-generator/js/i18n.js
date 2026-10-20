const I18N = {
  en: {
    appName: "Password Generator",
    modePassword: "Password", modePassphrase: "Passphrase", modePin: "PIN",
    copy: "Copy", regenerate: "Generate new", settings: "Settings", back: "Back",
    strength: ["Weak", "Fair", "Good", "Strong", "Very strong"],
    crackLabel: "Time to crack",
    crack: {
      instant: "instantly",
      seconds: (n) => `${n} second${n === 1 ? "" : "s"}`,
      minutes: (n) => `${n} minute${n === 1 ? "" : "s"}`,
      hours: (n) => `${n} hour${n === 1 ? "" : "s"}`,
      days: (n) => `${n} day${n === 1 ? "" : "s"}`,
      years: (n) => `${n} year${n === 1 ? "" : "s"}`,
      thousandYears: (n) => `${n} thousand years`,
      millionYears: (n) => `${n} million years`,
      billionYears: () => "billions of years"
    },
    length: "Length", wordCount: "Words", pinLength: "Digits",
    uppercase: "A–Z", lowercase: "a–z", numbers: "0–9", symbols: "#$%",
    advanced: "Advanced options",
    excludeAmbiguous: "Exclude look-alike characters (I l 1 O 0)",
    noDuplicate: "No repeated characters",
    customExclude: "Characters to exclude",
    separator: "Separator", sepSpace: "Space",
    capitalize: "Capitalize words", addNumber: "Add a number",
    generatePassword: "Generate password", generatePassphrase: "Generate passphrase", generatePin: "Generate PIN",
    history: "Recent", historyHint: "Cleared when you close the browser",
    historyEmpty: "Nothing generated yet", clear: "Clear",
    toastCopied: "Copied to clipboard", toastCopyFailed: "Couldn’t copy — select the text manually",
    toastCleared: "History cleared",
    errNoType: "Select at least one character type",
    errAllExcluded: "Every character is excluded — loosen the filters",
    warnShorter: "Not enough unique characters — password is shorter than requested",
    appearance: "Color", themeTitle: "Theme", languageTitle: "Language",
    themeSystem: "System", themeLight: "Light", themeDark: "Dark",
    langAuto: "Auto", langEn: "English", langVi: "Tiếng Việt",
    about: "About", author: "Author", madeWith: "Supported by Claude (Anthropic)",
    openLanding: "Open landing page", version: "Version",
    colorNames: { red: "Red", pink: "Pink", purple: "Purple", deepPurple: "Deep purple", indigo: "Indigo", blue: "Blue", lightBlue: "Light blue", cyan: "Cyan", teal: "Teal", green: "Green", lightGreen: "Light green", lime: "Lime", yellow: "Yellow", amber: "Amber", orange: "Orange", deepOrange: "Deep orange", brown: "Brown", blueGrey: "Blue grey" }
  },
  vi: {
    appName: "Password Generator",
    modePassword: "Mật khẩu", modePassphrase: "Cụm từ", modePin: "PIN",
    copy: "Sao chép", regenerate: "Tạo mới", settings: "Cài đặt", back: "Quay lại",
    strength: ["Yếu", "Trung bình", "Khá", "Mạnh", "Rất mạnh"],
    crackLabel: "Thời gian bẻ khóa",
    crack: {
      instant: "tức thì",
      seconds: (n) => `${n} giây`, minutes: (n) => `${n} phút`, hours: (n) => `${n} giờ`,
      days: (n) => `${n} ngày`, years: (n) => `${n} năm`,
      thousandYears: (n) => `${n} nghìn năm`, millionYears: (n) => `${n} triệu năm`,
      billionYears: () => "hàng tỷ năm"
    },
    length: "Độ dài", wordCount: "Số từ", pinLength: "Số chữ số",
    uppercase: "A–Z", lowercase: "a–z", numbers: "0–9", symbols: "#$%",
    advanced: "Tùy chọn nâng cao",
    excludeAmbiguous: "Loại ký tự dễ nhầm (I l 1 O 0)",
    noDuplicate: "Không lặp ký tự",
    customExclude: "Ký tự cần loại trừ",
    separator: "Dấu phân cách", sepSpace: "Cách",
    capitalize: "Viết hoa chữ cái đầu", addNumber: "Thêm số ngẫu nhiên",
    generatePassword: "Tạo mật khẩu", generatePassphrase: "Tạo cụm từ", generatePin: "Tạo mã PIN",
    history: "Gần đây", historyHint: "Tự xóa khi bạn đóng trình duyệt",
    historyEmpty: "Chưa có gì được tạo", clear: "Xóa",
    toastCopied: "Đã sao chép", toastCopyFailed: "Không sao chép được — hãy bôi đen và chép thủ công",
    toastCleared: "Đã xóa lịch sử",
    errNoType: "Hãy chọn ít nhất một loại ký tự",
    errAllExcluded: "Mọi ký tự đều bị loại — hãy nới lỏng bộ lọc",
    warnShorter: "Không đủ ký tự khác nhau — mật khẩu ngắn hơn yêu cầu",
    appearance: "Màu sắc", themeTitle: "Giao diện", languageTitle: "Ngôn ngữ",
    themeSystem: "Hệ thống", themeLight: "Sáng", themeDark: "Tối",
    langAuto: "Tự động", langEn: "English", langVi: "Tiếng Việt",
    about: "Giới thiệu", author: "Tác giả", madeWith: "Hỗ trợ bởi Claude (Anthropic)",
    openLanding: "Mở trang giới thiệu", version: "Phiên bản",
    colorNames: { red: "Đỏ", pink: "Hồng", purple: "Tím", deepPurple: "Tím đậm", indigo: "Chàm", blue: "Xanh dương", lightBlue: "Xanh da trời", cyan: "Xanh lơ", teal: "Xanh ngọc", green: "Xanh lá", lightGreen: "Xanh lá nhạt", lime: "Xanh chanh", yellow: "Vàng", amber: "Hổ phách", orange: "Cam", deepOrange: "Cam đậm", brown: "Nâu", blueGrey: "Xám xanh" }
  }
};

const i18n = {
  lang: "en",
  /** Resolve "auto" to the browser UI language: Vietnamese if it is, otherwise English. */
  resolve(pref) {
    if (pref === "en" || pref === "vi") return pref;
    const l = (navigator.language || "en").toLowerCase();
    return l.startsWith("vi") ? "vi" : "en";
  },
  set(pref) {
    this.lang = this.resolve(pref);
    document.documentElement.lang = this.lang;
    this.apply();
  },
  /** t("a.b", arg) — dotted lookup, functions are called with arg, falls back to English. */
  t(key, arg) {
    const look = (dict) => key.split(".").reduce((o, k) => (o == null ? o : o[k]), dict);
    let v = look(I18N[this.lang]);
    if (v === undefined) v = look(I18N.en);
    return typeof v === "function" ? v(arg) : v ?? key;
  },
  apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((n) => { n.textContent = this.t(n.dataset.i18n); });
    root.querySelectorAll("[data-i18n-label]").forEach((n) => {
      const v = this.t(n.dataset.i18nLabel);
      n.setAttribute("aria-label", v);
      n.setAttribute("title", v);
    });
  }
};
