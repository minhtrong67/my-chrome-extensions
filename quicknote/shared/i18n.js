/* ================================================================
   QUICKNOTE — shared/i18n.js
   ------------------------------------------------------------------
   Single source of truth for every user-facing string in the
   extension (popup, options page and landing page). Centralising
   strings here means:
     1. Adding a 3rd language later only touches this file.
     2. HTML stays clean — elements just declare *what* string they
        need via `data-i18n="key"`, not the string itself.
     3. There is one place to check for missing/duplicate keys.

   Usage in HTML:
     <span data-i18n="newNote"></span>                → textContent
     <input data-i18n-placeholder="searchPlaceholder"> → placeholder
     <button data-i18n-title="settingsTitle">          → title tooltip
     <p data-i18n-html="importModalDesc"></p>          → innerHTML (only
                                                           for keys that
                                                           are known-safe)

   Usage in JS:
     QNI18n.t('vi', 'newNote')            → "Ghi chú mới"
     QNI18n.t('en', 'wordCount', 12, 80)  → "12 words · 80 chars"
     QNI18n.apply('vi', document)         → walks the DOM and fills in
                                             every data-i18n* element

   Author: gnort67 · built with the help of Claude (Anthropic)
   ================================================================ */

(function (global) {
  'use strict';

  const DICT = {
    // ================================================================
    // TIẾNG VIỆT
    // ================================================================
    vi: {
      // ---- Chung ----
      appName: 'QuickNote',
      appTagline: 'Ghi chú nhanh, gọn, đúng chất Material You',
      brandCredit: 'QuickNote · gnort67 & Claude AI',

      // ---- Popup: thanh bên ----
      searchPlaceholder: 'Tìm kiếm ghi chú…',
      newNote: 'Ghi chú mới',
      noNotesTitle: 'Chưa có ghi chú nào',
      noNotesDesc: 'Nhấn “Ghi chú mới” để bắt đầu viết.',
      noResults: 'Không tìm thấy ghi chú phù hợp.',
      untitled: 'Không có tiêu đề',
      sortLabel: 'Sắp xếp',
      sortUpdated: 'Sửa đổi gần đây',
      sortCreated: 'Mới tạo trước',
      sortTitleAz: 'Tiêu đề A–Z',
      allNotes: 'Tất cả',
      pinnedNotes: 'Đã ghim',
      viewTrash: 'Thùng rác',
      backToNotes: 'Quay lại ghi chú',

      // ---- Popup: thanh công cụ / trình soạn thảo ----
      titlePlaceholder: 'Tiêu đề',
      contentPlaceholder: 'Bắt đầu viết…',
      saved: 'Đã lưu',
      saving: 'Đang lưu…',
      wordCount: (w, c) => `${w} từ · ${c} ký tự`,
      copyContentTooltip: 'Sao chép nội dung',
      pinTooltip: 'Ghim ghi chú',
      unpinTooltip: 'Bỏ ghim',
      deleteTooltip: 'Xoá ghi chú',
      duplicateTooltip: 'Nhân bản ghi chú',
      colorTooltip: 'Gắn nhãn màu',
      importExportTooltip: 'Nhập / Xuất ghi chú',
      settingsTooltip: 'Cài đặt',
      landingTooltip: 'Giới thiệu QuickNote',
      sidebarOpenTooltip: 'Mở danh sách ghi chú',
      sidebarCloseTooltip: 'Đóng danh sách',

      // ---- Nhãn màu ----
      colorNone: 'Không màu',
      colorRed: 'Đỏ',
      colorOrange: 'Cam',
      colorYellow: 'Vàng',
      colorGreen: 'Xanh lá',
      colorBlue: 'Xanh dương',
      colorPurple: 'Tím',

      // ---- Xoá / Thùng rác ----
      deleteTitle: 'Chuyển vào thùng rác?',
      deleteDesc: 'Ghi chú sẽ được chuyển vào thùng rác và tự động xoá vĩnh viễn sau 30 ngày.',
      cancel: 'Huỷ',
      delete: 'Chuyển vào thùng rác',
      trashTitle: 'Thùng rác',
      trashDesc: 'Ghi chú trong thùng rác sẽ tự động bị xoá vĩnh viễn sau 30 ngày.',
      trashEmptyTitle: 'Thùng rác trống',
      trashEmptyDesc: 'Không có ghi chú nào đã xoá.',
      restoreNote: 'Khôi phục',
      deleteForever: 'Xoá vĩnh viễn',
      deleteForeverTitle: 'Xoá vĩnh viễn?',
      deleteForeverDesc: 'Hành động này không thể hoàn tác. Ghi chú sẽ bị xoá hoàn toàn.',
      emptyTrashBtn: 'Dọn sạch thùng rác',
      daysLeft: (d) => (d <= 0 ? 'Sẽ xoá hôm nay' : `Còn ${d} ngày`),

      // ---- Toast / thông báo nhanh ----
      toastCopied: 'Đã sao chép nội dung!',
      toastCopyEmpty: 'Ghi chú đang trống',
      toastDeleted: 'Đã chuyển vào thùng rác',
      toastRestored: 'Đã khôi phục ghi chú',
      toastDeletedForever: 'Đã xoá vĩnh viễn',
      toastTrashEmptied: 'Đã dọn sạch thùng rác',
      toastPinned: 'Đã ghim ghi chú',
      toastUnpinned: 'Đã bỏ ghim',
      toastDuplicated: 'Đã nhân bản ghi chú',
      undo: 'Hoàn tác',

      // ---- Nhập / Xuất ghi chú ----
      ieLabelExport: 'Xuất ghi chú',
      ieLabelImport: 'Nhập ghi chú',
      ieExportJson: 'Xuất tất cả (.json)',
      ieExportJsonDesc: 'Sao lưu đầy đủ, có thể nhập lại',
      ieExportCsv: 'Xuất tất cả (.csv)',
      ieExportCsvDesc: 'Mở được bằng Excel, Google Sheets',
      ieExportMd: 'Xuất ghi chú này (.md)',
      ieExportMdDesc: 'Markdown, mở được mọi nơi',
      ieExportTxt: 'Xuất ghi chú này (.txt)',
      ieExportTxtDesc: 'Văn bản thuần, không định dạng',
      ieImportJson: 'Nhập từ .json',
      ieImportJsonDesc: 'Khôi phục bản sao lưu QuickNote',
      ieImportCsv: 'Nhập từ .csv',
      ieImportCsvDesc: 'Cột title, content',
      ieImportTxt: 'Nhập từ .txt / .md',
      ieImportTxtDesc: 'Tạo ghi chú mới từ tệp văn bản',
      importModalTitle: 'Nhập ghi chú?',
      importModalDesc: (n) => `Tìm thấy <strong>${n}</strong> ghi chú. Chọn cách nhập:`,
      importMerge: 'Thêm vào danh sách hiện tại',
      importReplace: 'Thay thế toàn bộ (xoá ghi chú cũ)',
      importBtn: 'Nhập',
      toastExportJson: (n) => `Đã xuất ${n} ghi chú`,
      toastExportFile: (name) => `Đã lưu "${name}"`,
      toastImportDone: (n) => `Đã nhập ${n} ghi chú`,
      toastImportErr: 'Tệp không hợp lệ hoặc sai định dạng',
      toastNoNote: 'Không có ghi chú để xuất',

      // ---- Trang Cài đặt (options.html) ----
      optionsPageTitle: 'Cài đặt · QuickNote',
      optionsHeading: 'Cài đặt',
      optionsSubheading: 'Tuỳ chỉnh QuickNote theo phong cách của bạn',
      secGeneral: 'Chung',
      secAppearance: 'Giao diện',
      secEditor: 'Soạn thảo',
      secData: 'Dữ liệu',
      secAbout: 'Giới thiệu',

      languageLabel: 'Ngôn ngữ hiển thị',
      languageDesc: 'Áp dụng cho toàn bộ giao diện QuickNote',
      themeLabel: 'Chế độ giao diện',
      themeDesc: 'Chọn Sáng, Tối, hoặc theo hệ thống của trình duyệt',
      themeSystem: 'Hệ thống',
      themeLight: 'Sáng',
      themeDark: 'Tối',

      fontSizeLabel: 'Cỡ chữ nội dung',
      fontSizeDesc: 'Áp dụng cho phần nội dung ghi chú (10–26px)',
      autosaveLabel: 'Độ trễ tự động lưu',
      autosaveDesc: 'Thời gian chờ sau khi ngừng gõ trước khi lưu (mili-giây)',
      defaultColorLabel: 'Màu nhãn mặc định',
      defaultColorDesc: 'Áp dụng cho ghi chú mới được tạo',
      sidebarDefaultLabel: 'Hiện thanh bên khi mở',
      sidebarDefaultDesc: 'Ghi nhớ trạng thái đóng/mở danh sách ghi chú',

      dataSectionDesc: 'Sao lưu, khôi phục hoặc dọn dẹp dữ liệu QuickNote của bạn. Mọi dữ liệu chỉ được lưu cục bộ trên trình duyệt của bạn.',
      exportNotesTitle: 'Xuất toàn bộ ghi chú',
      exportNotesDesc: 'Tải về tệp .json chứa tất cả ghi chú để sao lưu',
      exportNotesBtn: 'Xuất ghi chú',
      importNotesTitle: 'Nhập ghi chú',
      importNotesDesc: 'Khôi phục ghi chú từ tệp .json đã sao lưu trước đó',
      importNotesBtn: 'Chọn tệp…',
      exportSettingsTitle: 'Xuất tệp cài đặt',
      exportSettingsDesc: 'Lưu ngôn ngữ, giao diện và các tuỳ chỉnh khác ra .json',
      exportSettingsBtn: 'Xuất cài đặt',
      importSettingsTitle: 'Nhập tệp cài đặt',
      importSettingsDesc: 'Áp dụng nhanh cấu hình từ một tệp cài đặt QuickNote',
      importSettingsBtn: 'Chọn tệp…',
      resetSettingsTitle: 'Khôi phục cài đặt gốc',
      resetSettingsDesc: 'Đưa mọi tuỳ chỉnh về giá trị mặc định (không ảnh hưởng ghi chú)',
      resetSettingsBtn: 'Khôi phục mặc định',
      resetConfirmTitle: 'Khôi phục cài đặt gốc?',
      resetConfirmDesc: 'Ngôn ngữ, giao diện, cỡ chữ và các tuỳ chỉnh khác sẽ về mặc định. Ghi chú của bạn sẽ không bị ảnh hưởng.',
      resetConfirmBtn: 'Khôi phục',

      dangerZoneTitle: 'Khu vực nguy hiểm',
      dangerZoneDesc: 'Các hành động dưới đây không thể hoàn tác, hãy cân nhắc kỹ.',
      clearTrashTitle: 'Dọn sạch thùng rác',
      clearTrashDesc: 'Xoá vĩnh viễn toàn bộ ghi chú đang nằm trong thùng rác',
      clearTrashBtn: 'Dọn thùng rác',
      clearAllTitle: 'Xoá toàn bộ ghi chú',
      clearAllDesc: 'Chuyển tất cả ghi chú hiện có vào thùng rác',
      clearAllBtn: 'Xoá tất cả',
      clearAllConfirmTitle: 'Xoá toàn bộ ghi chú?',
      clearAllConfirmDesc: 'Tất cả ghi chú sẽ được chuyển vào thùng rác và có thể khôi phục trong 30 ngày.',

      aboutVersionLabel: 'Phiên bản',
      aboutAuthorLabel: 'Tác giả',
      aboutAuthorValue: 'gnort67 · cùng sự hỗ trợ của Claude AI (Anthropic)',
      aboutDesc: 'QuickNote là tiện ích ghi chú nhanh, riêng tư và không quảng cáo, được thiết kế theo ngôn ngữ Material Design 3 của Google.',
      aboutLicense: 'Phát hành theo giấy phép MIT',
      viewLandingBtn: 'Xem trang giới thiệu',
      shortcutsTitle: 'Phím tắt',
      shortcutNewNote: 'Ghi chú mới',
      shortcutCopy: 'Sao chép nội dung',
      shortcutSearch: 'Tìm kiếm',
      shortcutPin: 'Ghim / bỏ ghim',
      shortcutClose: 'Đóng bảng đang mở',

      toastSettingsExported: 'Đã xuất tệp cài đặt',
      toastSettingsImported: 'Đã áp dụng cài đặt mới',
      toastSettingsImportErr: 'Tệp cài đặt không hợp lệ',
      toastSettingsReset: 'Đã khôi phục cài đặt mặc định',
      toastNotesExported: (n) => `Đã xuất ${n} ghi chú`,
      toastTrashCleared: 'Đã dọn sạch thùng rác',
      toastAllCleared: 'Đã chuyển toàn bộ ghi chú vào thùng rác',
      saveBtn: 'Lưu thay đổi',
      backToApp: 'Mở QuickNote',

      // ---- Trang giới thiệu (landing.html) ----
      landingNavFeatures: 'Tính năng',
      landingNavPrivacy: 'Quyền riêng tư',
      landingNavAbout: 'Giới thiệu',
      landingOpenApp: 'Mở QuickNote',
      heroEyebrow: 'Xây dựng theo Material Design 3',
      heroTitle: 'Ghi lại ý tưởng, ngay khi chúng vừa xuất hiện.',
      heroSubtitle:
        'QuickNote là tiện ích ghi chú gọn nhẹ sống ngay trên thanh công cụ trình duyệt — mở tức thì, tự động lưu, và tôn trọng quyền riêng tư của bạn tuyệt đối.',
      heroCtaPrimary: 'Thêm vào trình duyệt',
      heroCtaSecondary: 'Xem hướng dẫn cài đặt',
      statNotes: 'Không giới hạn ghi chú',
      statPrivate: 'Lưu trữ cục bộ',
      statLang: 'Ngôn ngữ',
      statFree: 'Miễn phí & không quảng cáo',

      featuresHeading: 'Mọi thứ bạn cần, không gì thừa thãi',
      featuresSubheading: 'Từng chi tiết đều được chăm chút theo ngôn ngữ thiết kế Material Design 3 mới nhất của Google.',
      feat1Title: 'Mở tức thì',
      feat1Desc: 'Một cú nhấp vào biểu tượng trên thanh công cụ, bắt đầu viết ngay — không cần chờ tải trang.',
      feat2Title: 'Material Design 3',
      feat2Desc: 'Giao diện chuẩn Material You: màu sắc hài hoà, bo góc mềm mại, hiệu ứng ripple và chuyển động tinh tế.',
      feat3Title: 'Song ngữ Việt – Anh',
      feat3Desc: 'Chuyển đổi ngôn ngữ tức thì trong trang Cài đặt, hỗ trợ đầy đủ dấu tiếng Việt với font Be Vietnam Pro.',
      feat4Title: 'Ghim & gắn nhãn màu',
      feat4Desc: 'Ghim những ghi chú quan trọng lên đầu danh sách và gắn nhãn màu để phân loại trực quan.',
      feat5Title: 'Thùng rác an toàn',
      feat5Desc: 'Ghi chú đã xoá được giữ lại 30 ngày trong thùng rác, luôn có thể khôi phục nếu lỡ tay.',
      feat6Title: 'Nhập / Xuất linh hoạt',
      feat6Desc: 'Sao lưu ra .json, .csv, .md, .txt và nhập lại bất cứ lúc nào — dữ liệu luôn thuộc về bạn.',
      feat7Title: 'Riêng tư tuyệt đối',
      feat7Desc: 'Không máy chủ, không theo dõi, không quảng cáo. Toàn bộ ghi chú chỉ lưu trong trình duyệt của bạn.',
      feat8Title: 'Sáng / Tối / Hệ thống',
      feat8Desc: 'Ba chế độ giao diện, tự động đổi theo cài đặt hệ thống nếu bạn muốn.',

      installHeading: 'Cài đặt thủ công (Load unpacked)',
      installStep1Title: 'Tải & giải nén',
      installStep1Desc: 'Tải mã nguồn QuickNote và giải nén ra một thư mục bất kỳ trên máy tính.',
      installStep2Title: 'Mở trang tiện ích mở rộng',
      installStep2Desc: 'Truy cập chrome://extensions (Chrome/Brave) hoặc edge://extensions (Edge).',
      installStep3Title: 'Bật chế độ dành cho nhà phát triển',
      installStep3Desc: 'Bật công tắc “Developer mode” ở góc trên bên phải trang.',
      installStep4Title: 'Tải tiện ích chưa đóng gói',
      installStep4Desc: 'Nhấn “Load unpacked” và chọn thư mục QuickNote vừa giải nén.',
      installStep5Title: 'Ghim lên thanh công cụ',
      installStep5Desc: 'Nhấn biểu tượng hình mảnh ghép trên thanh công cụ và ghim QuickNote để truy cập nhanh.',

      privacyHeading: 'Riêng tư theo mặc định',
      privacyBody:
        'QuickNote không có máy chủ backend, không thu thập dữ liệu và không hiển thị quảng cáo. Toàn bộ ghi chú được lưu bằng chrome.storage.local — chỉ nằm trên máy của bạn, và chỉ bạn mới đọc được.',

      aboutHeading: 'Về QuickNote',
      aboutBody:
        'QuickNote được phát triển bởi gnort67, với sự hỗ trợ của Claude — trợ lý AI của Anthropic — trong việc thiết kế giao diện, viết mã và tài liệu hướng dẫn.',
      footerTagline: 'Ghi chú nhanh, gọn, đúng chất Material You.',
      footerRights: 'Đã đăng ký bản quyền theo giấy phép MIT.',
    },

    // ================================================================
    // ENGLISH
    // ================================================================
    en: {
      appName: 'QuickNote',
      appTagline: 'Fast, focused notes with a Material You feel',
      brandCredit: 'QuickNote · gnort67 & Claude AI',

      searchPlaceholder: 'Search notes…',
      newNote: 'New note',
      noNotesTitle: 'No notes yet',
      noNotesDesc: 'Tap “New note” to start writing.',
      noResults: 'No matching notes found.',
      untitled: 'Untitled',
      sortLabel: 'Sort by',
      sortUpdated: 'Recently edited',
      sortCreated: 'Newest first',
      sortTitleAz: 'Title A–Z',
      allNotes: 'All notes',
      pinnedNotes: 'Pinned',
      viewTrash: 'Trash',
      backToNotes: 'Back to notes',

      titlePlaceholder: 'Title',
      contentPlaceholder: 'Start writing…',
      saved: 'Saved',
      saving: 'Saving…',
      wordCount: (w, c) => `${w} words · ${c} chars`,
      copyContentTooltip: 'Copy content',
      pinTooltip: 'Pin note',
      unpinTooltip: 'Unpin',
      deleteTooltip: 'Delete note',
      duplicateTooltip: 'Duplicate note',
      colorTooltip: 'Colour label',
      importExportTooltip: 'Import / Export notes',
      settingsTooltip: 'Settings',
      landingTooltip: 'About QuickNote',
      sidebarOpenTooltip: 'Open notes list',
      sidebarCloseTooltip: 'Close notes list',

      colorNone: 'None',
      colorRed: 'Red',
      colorOrange: 'Orange',
      colorYellow: 'Yellow',
      colorGreen: 'Green',
      colorBlue: 'Blue',
      colorPurple: 'Purple',

      deleteTitle: 'Move to trash?',
      deleteDesc: 'The note will be moved to Trash and permanently deleted after 30 days.',
      cancel: 'Cancel',
      delete: 'Move to trash',
      trashTitle: 'Trash',
      trashDesc: 'Notes in the trash are permanently deleted after 30 days.',
      trashEmptyTitle: 'Trash is empty',
      trashEmptyDesc: 'No deleted notes here.',
      restoreNote: 'Restore',
      deleteForever: 'Delete forever',
      deleteForeverTitle: 'Delete forever?',
      deleteForeverDesc: 'This action cannot be undone. The note will be permanently deleted.',
      emptyTrashBtn: 'Empty trash',
      daysLeft: (d) => (d <= 0 ? 'Deletes today' : `${d} day${d === 1 ? '' : 's'} left`),

      toastCopied: 'Content copied!',
      toastCopyEmpty: 'Note is empty',
      toastDeleted: 'Moved to trash',
      toastRestored: 'Note restored',
      toastDeletedForever: 'Permanently deleted',
      toastTrashEmptied: 'Trash emptied',
      toastPinned: 'Note pinned',
      toastUnpinned: 'Note unpinned',
      toastDuplicated: 'Note duplicated',
      undo: 'Undo',

      ieLabelExport: 'Export notes',
      ieLabelImport: 'Import notes',
      ieExportJson: 'Export all (.json)',
      ieExportJsonDesc: 'Full backup, re-importable',
      ieExportCsv: 'Export all (.csv)',
      ieExportCsvDesc: 'Opens in Excel, Google Sheets',
      ieExportMd: 'Export this note (.md)',
      ieExportMdDesc: 'Markdown, opens anywhere',
      ieExportTxt: 'Export this note (.txt)',
      ieExportTxtDesc: 'Plain text, no formatting',
      ieImportJson: 'Import from .json',
      ieImportJsonDesc: 'Restore a QuickNote backup',
      ieImportCsv: 'Import from .csv',
      ieImportCsvDesc: 'Columns: title, content',
      ieImportTxt: 'Import from .txt / .md',
      ieImportTxtDesc: 'Create new notes from text files',
      importModalTitle: 'Import notes?',
      importModalDesc: (n) => `Found <strong>${n}</strong> note(s). Choose how to import:`,
      importMerge: 'Add to existing notes',
      importReplace: 'Replace all (delete current notes)',
      importBtn: 'Import',
      toastExportJson: (n) => `Exported ${n} notes`,
      toastExportFile: (name) => `Saved "${name}"`,
      toastImportDone: (n) => `Imported ${n} note(s)`,
      toastImportErr: 'Invalid or unsupported file',
      toastNoNote: 'No note to export',

      optionsPageTitle: 'Settings · QuickNote',
      optionsHeading: 'Settings',
      optionsSubheading: 'Make QuickNote yours',
      secGeneral: 'General',
      secAppearance: 'Appearance',
      secEditor: 'Editor',
      secData: 'Data',
      secAbout: 'About',

      languageLabel: 'Display language',
      languageDesc: 'Applies across the entire QuickNote interface',
      themeLabel: 'Theme mode',
      themeDesc: 'Choose Light, Dark, or follow your browser/system',
      themeSystem: 'System',
      themeLight: 'Light',
      themeDark: 'Dark',

      fontSizeLabel: 'Content font size',
      fontSizeDesc: 'Applies to the note body text (10–26px)',
      autosaveLabel: 'Autosave delay',
      autosaveDesc: 'How long to wait after you stop typing before saving (ms)',
      defaultColorLabel: 'Default colour label',
      defaultColorDesc: 'Applied automatically to newly created notes',
      sidebarDefaultLabel: 'Show sidebar on open',
      sidebarDefaultDesc: 'Remembers whether the notes list starts open or collapsed',

      dataSectionDesc: 'Back up, restore, or clean up your QuickNote data. Everything is stored locally in your browser only.',
      exportNotesTitle: 'Export all notes',
      exportNotesDesc: 'Download a .json file containing every note as a backup',
      exportNotesBtn: 'Export notes',
      importNotesTitle: 'Import notes',
      importNotesDesc: 'Restore notes from a previously exported .json backup',
      importNotesBtn: 'Choose file…',
      exportSettingsTitle: 'Export settings file',
      exportSettingsDesc: 'Save language, theme and other preferences to .json',
      exportSettingsBtn: 'Export settings',
      importSettingsTitle: 'Import settings file',
      importSettingsDesc: 'Quickly apply configuration from a QuickNote settings file',
      importSettingsBtn: 'Choose file…',
      resetSettingsTitle: 'Reset to defaults',
      resetSettingsDesc: 'Restore every preference to its default value (notes are not affected)',
      resetSettingsBtn: 'Reset defaults',
      resetConfirmTitle: 'Reset settings?',
      resetConfirmDesc: 'Language, theme, font size and other preferences will return to their defaults. Your notes will not be affected.',
      resetConfirmBtn: 'Reset',

      dangerZoneTitle: 'Danger zone',
      dangerZoneDesc: 'These actions cannot be undone — proceed with care.',
      clearTrashTitle: 'Empty trash',
      clearTrashDesc: 'Permanently delete every note currently in the trash',
      clearTrashBtn: 'Empty trash',
      clearAllTitle: 'Delete all notes',
      clearAllDesc: 'Move every existing note to the trash',
      clearAllBtn: 'Delete all',
      clearAllConfirmTitle: 'Delete all notes?',
      clearAllConfirmDesc: 'All notes will be moved to Trash and can be restored within 30 days.',

      aboutVersionLabel: 'Version',
      aboutAuthorLabel: 'Author',
      aboutAuthorValue: 'gnort67 · built with the help of Claude AI (Anthropic)',
      aboutDesc: 'QuickNote is a fast, private, ad-free note-taking extension designed around Google’s Material Design 3 language.',
      aboutLicense: 'Released under the MIT License',
      viewLandingBtn: 'View landing page',
      shortcutsTitle: 'Keyboard shortcuts',
      shortcutNewNote: 'New note',
      shortcutCopy: 'Copy content',
      shortcutSearch: 'Search',
      shortcutPin: 'Pin / unpin',
      shortcutClose: 'Close open panel',

      toastSettingsExported: 'Settings file exported',
      toastSettingsImported: 'Settings applied',
      toastSettingsImportErr: 'Invalid settings file',
      toastSettingsReset: 'Settings reset to defaults',
      toastNotesExported: (n) => `Exported ${n} notes`,
      toastTrashCleared: 'Trash emptied',
      toastAllCleared: 'All notes moved to trash',
      saveBtn: 'Save changes',
      backToApp: 'Open QuickNote',

      landingNavFeatures: 'Features',
      landingNavPrivacy: 'Privacy',
      landingNavAbout: 'About',
      landingOpenApp: 'Open QuickNote',
      heroEyebrow: 'Built with Material Design 3',
      heroTitle: 'Capture ideas the moment they happen.',
      heroSubtitle:
        'QuickNote is a lightweight note-taking extension that lives right in your toolbar — instant to open, always autosaving, and fully respectful of your privacy.',
      heroCtaPrimary: 'Add to your browser',
      heroCtaSecondary: 'See install guide',
      statNotes: 'Unlimited notes',
      statPrivate: 'Stored locally',
      statLang: 'Languages',
      statFree: 'Free & ad-free',

      featuresHeading: 'Everything you need, nothing you don’t',
      featuresSubheading: 'Every detail follows Google’s latest Material Design 3 design language.',
      feat1Title: 'Instant access',
      feat1Desc: 'One click on the toolbar icon and you’re writing — no page load, no waiting.',
      feat2Title: 'Material Design 3',
      feat2Desc: 'A true Material You interface: harmonious colour roles, soft shapes, ripple feedback and considered motion.',
      feat3Title: 'Vietnamese & English',
      feat3Desc: 'Switch languages instantly from Settings, with full Vietnamese diacritics via Be Vietnam Pro.',
      feat4Title: 'Pin & colour labels',
      feat4Desc: 'Pin the notes that matter to the top of the list and use colour labels to organise at a glance.',
      feat5Title: 'Safety-net trash',
      feat5Desc: 'Deleted notes stay in Trash for 30 days, so an accidental delete is never the end of the story.',
      feat6Title: 'Flexible import/export',
      feat6Desc: 'Back up to .json, .csv, .md or .txt and import them back anytime — your data always stays yours.',
      feat7Title: 'Private by design',
      feat7Desc: 'No server, no tracking, no ads. Every note is stored only inside your own browser.',
      feat8Title: 'Light / Dark / System',
      feat8Desc: 'Three theme modes, including automatically following your system preference.',

      installHeading: 'Manual install (Load unpacked)',
      installStep1Title: 'Download & unzip',
      installStep1Desc: 'Download the QuickNote source and unzip it to any folder on your computer.',
      installStep2Title: 'Open the extensions page',
      installStep2Desc: 'Go to chrome://extensions (Chrome/Brave) or edge://extensions (Edge).',
      installStep3Title: 'Turn on Developer mode',
      installStep3Desc: 'Toggle “Developer mode” on in the top-right corner of the page.',
      installStep4Title: 'Load the unpacked extension',
      installStep4Desc: 'Click “Load unpacked” and select the QuickNote folder you unzipped.',
      installStep5Title: 'Pin it to your toolbar',
      installStep5Desc: 'Click the puzzle-piece icon in your toolbar and pin QuickNote for quick access.',

      privacyHeading: 'Private by default',
      privacyBody:
        'QuickNote has no backend server, collects no data, and shows no ads. Every note lives in chrome.storage.local — on your machine, readable only by you.',

      aboutHeading: 'About QuickNote',
      aboutBody:
        'QuickNote is built by gnort67, with the help of Claude — Anthropic’s AI assistant — for interface design, code and documentation.',
      footerTagline: 'Fast, focused notes with a Material You feel.',
      footerRights: 'All rights reserved under the MIT License.',
    },
  };

  /**
   * Returns the translated string for `key` in `lang`. Falls back to
   * Vietnamese, then to the raw key itself, so a missing translation
   * never crashes the UI — it just shows something recognisable.
   * Extra arguments are forwarded to function-valued dictionary
   * entries (e.g. wordCount, daysLeft) for simple pluralisation.
   */
  function t(lang, key, ...args) {
    const dict = DICT[lang] || DICT.vi;
    const entry = key in dict ? dict[key] : DICT.vi[key];
    if (entry === undefined) return key;
    return typeof entry === 'function' ? entry(...args) : entry;
  }

  /**
   * Walks `root` (default: whole document) and fills in every element
   * that declares a data-i18n* attribute. Supports three attributes:
   *   data-i18n             → element.textContent
   *   data-i18n-placeholder  → element.placeholder
   *   data-i18n-title        → element.title (tooltip)
   * This keeps HTML declarative and keeps page scripts from having to
   * list every single element id by hand.
   */
  function apply(lang, root) {
    const scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(lang, el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(lang, el.getAttribute('data-i18n-placeholder'));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = t(lang, el.getAttribute('data-i18n-title'));
    });

    document.documentElement.lang = lang;
  }

  global.QNI18n = { t, apply, DICT };
})(window);
