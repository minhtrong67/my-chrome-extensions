/**
 * Case Converter — lightweight i18n (English / Vietnamese)
 */

const I18N_STRINGS = {
  en: {
    appName: 'Case Converter',
    tagline: 'Transform text anywhere, instantly',
    tools: 'Tools',
    uppercase: 'UPPERCASE',
    lowercase: 'lowercase',
    capitalize: 'Capitalize Each Word',
    sentenceCase: 'Sentence case',
    titleCase: 'Title Case',
    alternatingCase: 'aLTERNATING cASE',
    inverseCase: 'InVeRsE CaSe',
    snakeCase: 'snake_case',
    kebabCase: 'kebab-case',
    camelCase: 'camelCase',
    removeExtraSpaces: 'Trim Extra Spaces',
    inputPlaceholder: 'Type or paste text here…',
    outputPlaceholder: 'Result will appear here…',
    copy: 'Copy',
    copied: 'Copied!',
    clear: 'Clear',
    paste: 'Paste',
    swap: 'Use as input',
    charCount: 'characters',
    wordCount: 'words',
    settings: 'Settings',
    openSettings: 'Open settings',
    shortcutsHint: 'Shortcuts work in any text field on any website',
    settingsTitle: 'Settings',
    appearance: 'Appearance',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    language: 'Language',
    languageEn: 'English',
    languageVi: 'Tiếng Việt',
    font: 'Font',
    fontRoboto: 'Roboto',
    color: 'Accent color',
    colorPurple: 'Purple', colorBlue: 'Blue', colorGreen: 'Green', colorOrange: 'Orange', colorPink: 'Pink', colorTeal: 'Teal',
    viewLanding: 'View landing page',
    author: 'Author',
    aiSupport: 'AI support: Claude',
    closeLanding: 'Close landing page',
    back: '← Back',
    settingsInExtension: 'Settings are kept inside the extension popup.',
    fontBeVietnamPro: 'Be Vietnam Pro',
    fontInter: 'Inter',
    shortcuts: 'Keyboard Shortcuts',
    shortcutsDesc: 'Apply a transformation directly inside any input, textarea, or editable field on the web — including Facebook and TikTok composers. Click a shortcut to record a new key combination.',
    shortcutsEnabled: 'Enable in-page shortcuts',
    shortcutRecording: 'Press a key combination…',
    shortcutReset: 'Reset to default',
    resetAll: 'Reset all settings',
    about: 'About',
    aboutText: 'Case Converter is a free, open, privacy-friendly extension. All text is processed locally on your device — nothing is ever sent to a server.',
    version: 'Version',
    sourceCode: 'Source code',
    reportIssue: 'Report an issue',
    privacyPolicy: 'Privacy policy',
    saved: 'Settings saved',
    conflictWarning: 'This shortcut is already used by another action',
    excludedSites: 'Disabled on these sites',
    excludedSitesDesc: 'Add one domain per line (e.g. example.com) where in-page shortcuts should be turned off.',
    excludedSitesPlaceholder: 'example.com',
    save: 'Save',
    footerMadeWith: 'Built for people who write.',
  },
  vi: {
    appName: 'Case Converter',
    tagline: 'Chuyển đổi văn bản mọi nơi, tức thì',
    tools: 'Công cụ',
    uppercase: 'CHỮ HOA',
    lowercase: 'chữ thường',
    capitalize: 'Viết Hoa Từng Từ',
    sentenceCase: 'Viết hoa đầu câu',
    titleCase: 'Viết Hoa Tiêu Đề',
    alternatingCase: 'cHỮ xEN kẼ',
    inverseCase: 'đẢO nGƯỢC cHỮ hOA',
    snakeCase: 'snake_case',
    kebabCase: 'kebab-case',
    camelCase: 'camelCase',
    removeExtraSpaces: 'Xóa Khoảng Trắng Thừa',
    inputPlaceholder: 'Nhập hoặc dán văn bản vào đây…',
    outputPlaceholder: 'Kết quả sẽ hiện ở đây…',
    copy: 'Sao chép',
    copied: 'Đã sao chép!',
    clear: 'Xóa',
    paste: 'Dán',
    swap: 'Dùng làm đầu vào',
    charCount: 'ký tự',
    wordCount: 'từ',
    settings: 'Cài đặt',
    openSettings: 'Mở trang cài đặt',
    shortcutsHint: 'Phím tắt hoạt động trong mọi ô nhập liệu trên mọi trang web',
    settingsTitle: 'Cài đặt',
    appearance: 'Giao diện',
    theme: 'Chủ đề',
    themeLight: 'Sáng',
    themeDark: 'Tối',
    themeSystem: 'Theo hệ thống',
    language: 'Ngôn ngữ',
    languageEn: 'English',
    languageVi: 'Tiếng Việt',
    font: 'Phông chữ',
    fontRoboto: 'Roboto',
    color: 'Màu chủ đề',
    colorPurple: 'Tím', colorBlue: 'Xanh dương', colorGreen: 'Xanh lá', colorOrange: 'Cam', colorPink: 'Hồng', colorTeal: 'Xanh ngọc',
    viewLanding: 'Xem landing page',
    author: 'Tác giả',
    aiSupport: 'Hỗ trợ AI: Claude',
    closeLanding: 'Đóng landing page',
    back: '← Quay lại',
    settingsInExtension: 'Cài đặt được giữ ngay trong popup của tiện ích.',
    fontBeVietnamPro: 'Be Vietnam Pro',
    fontInter: 'Inter',
    shortcuts: 'Phím tắt',
    shortcutsDesc: 'Áp dụng chuyển đổi ngay trong ô nhập, textarea hoặc vùng chỉnh sửa trên web — kể cả trình soạn bài của Facebook và TikTok. Nhấp vào một phím tắt để ghi lại tổ hợp phím mới.',
    shortcutsEnabled: 'Bật phím tắt trong trang',
    shortcutRecording: 'Nhấn tổ hợp phím…',
    shortcutReset: 'Đặt lại mặc định',
    resetAll: 'Đặt lại toàn bộ cài đặt',
    about: 'Giới thiệu',
    aboutText: 'Case Converter là tiện ích miễn phí, mã nguồn mở và tôn trọng quyền riêng tư. Toàn bộ văn bản được xử lý ngay trên thiết bị của bạn — không gửi lên bất kỳ máy chủ nào.',
    version: 'Phiên bản',
    sourceCode: 'Mã nguồn',
    reportIssue: 'Báo lỗi',
    privacyPolicy: 'Chính sách bảo mật',
    saved: 'Đã lưu cài đặt',
    conflictWarning: 'Phím tắt này đã được dùng cho một thao tác khác',
    excludedSites: 'Tắt trên các trang sau',
    excludedSitesDesc: 'Mỗi dòng một tên miền (ví dụ: example.com) muốn tắt phím tắt trong trang.',
    excludedSitesPlaceholder: 'example.com',
    save: 'Lưu',
    footerMadeWith: 'Tạo ra cho những người viết lách.',
  }
};

const I18N = {
  get(lang, key) {
    const dict = I18N_STRINGS[lang] || I18N_STRINGS.en;
    return dict[key] || I18N_STRINGS.en[key] || key;
  },
  apply(lang) {
    document.documentElement.lang = lang === 'vi' ? 'vi' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = I18N.get(lang, key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', I18N.get(lang, key));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', I18N.get(lang, key));
    });
  }
};

if (typeof module !== 'undefined') {
  module.exports = { I18N, I18N_STRINGS };
}
