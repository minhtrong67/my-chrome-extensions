/**
 * i18n.js — English / Vietnamese dictionary + tiny DOM translation helper.
 * Hand-rolled (not chrome.i18n) so the language switches instantly at runtime
 * without reloading the popup. Safe to import in the service worker.
 */

const AUTHOR = "minhtrong67";
const AI_ASSISTANT = "Claude";
const APP_VERSION = "2.0.0";
// Landing page bundled inside the extension (opened in a new tab from Settings).
const LANDING_PATH = "landing.html";

const I18N = {
  en: {
    tagline: "Smart bookmark manager",
    addCurrentPage: "Bookmark this page",
    searchPlaceholder: "Search title, URL, tags, notes…",
    clearSearch: "Clear search",
    allFolders: "All folders",
    duplicates: "Duplicates",
    resultsCount: (n) => `${n} bookmark${n !== 1 ? "s" : ""}`,
    emptyTitle: "No bookmarks found",
    emptyHintSearch: "Try a different search term or clear your filters",
    emptyHintEmpty: "Tap “Bookmark this page” to get started",

    addBookmark: "Add bookmark",
    editBookmark: "Edit bookmark",
    titleLabel: "Title",
    urlLabel: "URL",
    folderLabel: "Folder",
    tagsLabel: "Tags",
    noteLabel: "Note",
    newFolder: "New folder",
    newFolderPlaceholder: "Folder name",
    create: "Create",
    tagInputPlaceholder: "Type a tag, press Enter",
    removeTag: "Remove tag",
    deleteBookmark: "Delete",
    cancel: "Cancel",
    save: "Save",
    back: "Back",
    deleteTitle: "Delete bookmark?",
    deleteConfirm: "This also removes it from Chrome's bookmarks.",

    selectMode: "Select multiple",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    bulkCount: (n) => `${n} selected`,
    bulkAddTag: "Add tag to selected",
    bulkDelete: "Delete selected",
    bulkTagTitle: "Add tag",
    bulkTagPrompt: "This tag will be added to all selected bookmarks.",
    bulkDeleteTitle: (n) => `Delete ${n} bookmark${n !== 1 ? "s" : ""}?`,
    bulkDeleteConfirm: "They will also be removed from Chrome's bookmarks.",
    confirm: "Confirm",

    openBookmark: "Open",
    editAction: "Edit",
    copyUrl: "Copy URL",
    deleteAction: "Delete",
    noteBadge: "Has a note",

    more: "More",
    exportJson: "Export backup (JSON)",
    exportHtml: "Export bookmarks (HTML)",
    importJson: "Import backup (JSON)",
    resetDefault: "Reset extension data",
    resetTitle: "Reset extension data?",
    resetConfirm: "All tags, notes and settings will be cleared. Your Chrome bookmarks are never affected.",
    reset: "Reset",

    settings: "Settings",
    colorSection: "Colour",
    colorHint: "Pick a Material Design accent colour",
    themeSection: "Appearance",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    languageSection: "Language",
    langSystem: "Auto",
    langEn: "English",
    langVi: "Tiếng Việt",
    about: "About",
    authorLabel: "Author",
    aiLabel: "AI assistant",
    aiValue: "Claude by Anthropic",
    version: "Version",
    shortcutHint: "Shortcut",
    manageShortcuts: "Change shortcut",
    openLanding: "Open landing page",

    toastSaved: "Bookmark saved",
    toastUpdated: "Bookmark updated",
    toastDeleted: "Bookmark deleted",
    toastUrlCopied: "URL copied",
    toastError: "Something went wrong",
    toastTagAdded: (n) => `Tag added to ${n} bookmark${n !== 1 ? "s" : ""}`,
    toastBulkDeleted: (n) => `${n} bookmark${n !== 1 ? "s" : ""} deleted`,
    toastExported: "Exported successfully",
    toastImported: (created, merged) => `Imported: ${created} new, ${merged} merged`,
    toastImportFailed: "Invalid import file",
    toastReset: "Extension data reset",
    toastFolderCreated: "Folder created",
    toastInvalidUrl: "Please enter a valid URL",
    toastQuickSaved: "Page bookmarked",
    toastNoPage: "This page can't be bookmarked",
    notifyAlready: "is already bookmarked",
    notifySaved: "Bookmarked",
    notifyFailed: "Could not bookmark this page"
  },
  vi: {
    tagline: "Quản lý bookmark thông minh",
    addCurrentPage: "Lưu trang này",
    searchPlaceholder: "Tìm tiêu đề, URL, thẻ, ghi chú…",
    clearSearch: "Xoá tìm kiếm",
    allFolders: "Tất cả thư mục",
    duplicates: "Trùng lặp",
    resultsCount: (n) => `${n} bookmark`,
    emptyTitle: "Không tìm thấy bookmark",
    emptyHintSearch: "Thử từ khoá khác hoặc xoá bộ lọc",
    emptyHintEmpty: "Nhấn “Lưu trang này” để bắt đầu",

    addBookmark: "Thêm bookmark",
    editBookmark: "Sửa bookmark",
    titleLabel: "Tiêu đề",
    urlLabel: "URL",
    folderLabel: "Thư mục",
    tagsLabel: "Thẻ",
    noteLabel: "Ghi chú",
    newFolder: "Thư mục mới",
    newFolderPlaceholder: "Tên thư mục",
    create: "Tạo",
    tagInputPlaceholder: "Nhập thẻ, nhấn Enter",
    removeTag: "Xoá thẻ",
    deleteBookmark: "Xoá",
    cancel: "Huỷ",
    save: "Lưu",
    back: "Quay lại",
    deleteTitle: "Xoá bookmark?",
    deleteConfirm: "Bookmark cũng sẽ bị xoá khỏi Chrome.",

    selectMode: "Chọn nhiều",
    selectAll: "Chọn tất cả",
    deselectAll: "Bỏ chọn tất cả",
    bulkCount: (n) => `Đã chọn ${n}`,
    bulkAddTag: "Thêm thẻ cho mục đã chọn",
    bulkDelete: "Xoá mục đã chọn",
    bulkTagTitle: "Thêm thẻ",
    bulkTagPrompt: "Thẻ này sẽ được thêm vào tất cả bookmark đã chọn.",
    bulkDeleteTitle: (n) => `Xoá ${n} bookmark?`,
    bulkDeleteConfirm: "Các bookmark cũng sẽ bị xoá khỏi Chrome.",
    confirm: "Xác nhận",

    openBookmark: "Mở",
    editAction: "Sửa",
    copyUrl: "Sao chép URL",
    deleteAction: "Xoá",
    noteBadge: "Có ghi chú",

    more: "Thêm",
    exportJson: "Xuất bản sao lưu (JSON)",
    exportHtml: "Xuất bookmark (HTML)",
    importJson: "Nhập bản sao lưu (JSON)",
    resetDefault: "Đặt lại dữ liệu extension",
    resetTitle: "Đặt lại dữ liệu extension?",
    resetConfirm: "Toàn bộ thẻ, ghi chú và cài đặt sẽ bị xoá. Bookmark Chrome của bạn không bị ảnh hưởng.",
    reset: "Đặt lại",

    settings: "Cài đặt",
    colorSection: "Màu sắc",
    colorHint: "Chọn màu nhấn theo Material Design",
    themeSection: "Giao diện",
    themeLight: "Sáng",
    themeDark: "Tối",
    themeSystem: "Hệ thống",
    languageSection: "Ngôn ngữ",
    langSystem: "Tự động",
    langEn: "English",
    langVi: "Tiếng Việt",
    about: "Giới thiệu",
    authorLabel: "Tác giả",
    aiLabel: "Hỗ trợ bởi AI",
    aiValue: "Claude của Anthropic",
    version: "Phiên bản",
    version: "Phiên bản",
    shortcutHint: "Phím tắt",
    manageShortcuts: "Đổi phím tắt",
    openLanding: "Mở trang giới thiệu",

    toastSaved: "Đã lưu bookmark",
    toastUpdated: "Đã cập nhật bookmark",
    toastDeleted: "Đã xoá bookmark",
    toastUrlCopied: "Đã sao chép URL",
    toastError: "Đã xảy ra lỗi",
    toastTagAdded: (n) => `Đã thêm thẻ vào ${n} bookmark`,
    toastBulkDeleted: (n) => `Đã xoá ${n} bookmark`,
    toastExported: "Xuất thành công",
    toastImported: (created, merged) => `Đã nhập: ${created} mới, ${merged} đã gộp`,
    toastImportFailed: "Tệp nhập không hợp lệ",
    toastReset: "Đã đặt lại dữ liệu extension",
    toastFolderCreated: "Đã tạo thư mục",
    toastInvalidUrl: "Vui lòng nhập URL hợp lệ",
    toastQuickSaved: "Đã lưu trang",
    toastNoPage: "Không thể lưu trang này",
    notifyAlready: "đã có trong bookmark",
    notifySaved: "Đã lưu",
    notifyFailed: "Không thể lưu trang này"
  }
};

/** Resolve the "system | en | vi" preference to a concrete "en" | "vi". */
function resolveLang(settings) {
  const lang = settings && settings.language;
  if (lang === "vi" || lang === "en") return lang;
  const nav = (typeof navigator !== "undefined" && navigator.language) || "en";
  return nav.toLowerCase().startsWith("vi") ? "vi" : "en";
}

const i18n = {
  current: "en",

  t(key) {
    return (I18N[this.current] && I18N[this.current][key]) ?? I18N.en[key] ?? key;
  },

  setLang(lang) {
    this.current = I18N[lang] ? lang : "en";
    if (typeof document !== "undefined") this.apply();
  },

  apply(root = document) {
    document.documentElement.lang = this.current;
    root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = this.t(el.dataset.i18n); });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = this.t(el.dataset.i18nPlaceholder); });
    root.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const val = this.t(el.dataset.i18nTitle);
      el.title = val;
      el.setAttribute("aria-label", val);
    });
  }
};
