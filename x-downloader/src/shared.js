// Dùng chung cho service worker, content script, popup và trang cài đặt.
// Không đụng tới DOM ở cấp cao nhất để importScripts() trong background hoạt động.
(() => {
  const lang = (navigator.language || 'en').toLowerCase().startsWith('vi') ? 'vi' : 'en';

  const DEFAULTS = {
    themeMode: 'system',
    language: lang,
    filenameTemplate: '{username}-{tweetId}-{index}',
    saveFolder: '',
    askWhere: false,
    downloadThumbnail: false,
    multiMode: 'all',
    autoReveal: true,
    shortcutEnabled: true,
    shortcut: { code: 'KeyD', label: 'D', ctrl: false, alt: false, shift: false },
    enabled: true,
    onboarded: false
  };

  const I18N = {
    en: {
      'nav.download': 'Download', 'nav.appearance': 'Appearance', 'nav.activity': 'Activity', 'nav.about': 'About',
      'app.settings': 'Settings', 'autosave': 'Saved automatically',

      'grp.save': 'Saving', 'grp.behavior': 'When downloading', 'grp.shortcut': 'Shortcut',
      'path.title': 'Save folder',
      'path.desc': 'A sub-folder inside Downloads. Leave empty to save straight into Downloads.',
      'path.full': 'Saved to {path}',
      'path.abs': 'Chrome doesn’t allow absolute paths like C:/Pictures. Use a sub-folder, or turn on “Ask where to save”.',
      'path.chrome': 'Change the Downloads folder in Chrome settings',
      'file.title': 'File name',
      'file.desc': 'Example: {name}',
      'file.template': 'Template',
      'file.help': 'Combine tokens and text. Use “/” to create folders. The extension is added automatically.',
      'file.tokens': 'Click a token to insert it', 'file.reset': 'Reset',
      'tok.username': 'Account handle', 'tok.name': 'Display name', 'tok.tweetId': 'Post ID', 'tok.index': 'Media number',
      'tok.date': 'Post date (YYYYMMDD)', 'tok.time': 'Post time (HHmmss)', 'tok.text': 'First words of the post',
      'tok.type': 'photo, video or gif', 'tok.filename': 'Original media name',
      'ask.title': 'Ask where to save each file', 'ask.desc': 'Chrome shows its Save dialog for every file.',
      'thumb.title': 'Also save video thumbnail', 'thumb.desc': 'Saves the cover image next to each video or GIF.',
      'multi.title': 'Posts with several media', 'multi.desc': 'You can always right-click the button to pick items.',
      'multi.all': 'Download all', 'multi.menu': 'Let me choose',
      'reveal.title': 'Auto-reveal sensitive content', 'reveal.desc': 'Clicks “View” for media hidden behind a warning.',
      'sc.title': 'Keyboard shortcut', 'sc.desc': 'Hover over a post and press the key to download its media.',
      'sc.key': 'Shortcut key', 'sc.change': 'Change', 'sc.press': 'Press keys…', 'sc.record': 'Press a new key combination',
      'sc.browser': 'Browser-wide shortcut', 'sc.browserDesc': 'A shortcut that works anywhere in Chrome.', 'sc.open': 'Open',

      'ap.mode': 'Theme', 'ap.modeDesc': 'Choose how the extension looks.',
      'mode.light': 'Light', 'mode.dark': 'Dark', 'mode.system': 'System',
      'ap.lang': 'Language', 'ap.langDesc': 'Language of the extension.',

      'act.title': 'Activity', 'act.empty': 'All good', 'act.emptyDesc': 'Problems and automatic retries will show up here.',
      'act.clear': 'Clear', 'act.copy': 'Copy report',
      'act.race': 'Other download-manager extensions running at the same time can interfere. Turn them off for X if downloads misbehave.',
      'lvl.error': 'Error', 'lvl.warning': 'Warning', 'lvl.info': 'Info',
      'log.SERVER_FORBIDDEN': 'The media link was refused or has expired.', 'log.SERVER_BAD_CONTENT': 'The file no longer exists on the server.',
      'log.SERVER_FAILED': 'The server returned an error.', 'log.NETWORK': 'Network problem while downloading.',
      'log.FILE': 'Couldn’t write the file (permission, name or disk space).', 'log.USER_CANCELED': 'The download was cancelled.',
      'log.NO_MEDIA': 'No downloadable media was found in the post.', 'log.LOOKUP': 'Couldn’t look up the post (it may be private or deleted).',
      'log.RETRY_OK': 'The link was refreshed and the download was retried.', 'log.UNKNOWN': 'Unexpected error.',

      'ab.tagline': 'Download videos and images from X with one click.', 'ab.version': 'Version',
      'ab.local': 'Everything runs on your device — no accounts, no tracking.',
      'ab.author': 'Author', 'ab.ai': 'Built with AI assistance from Claude', 'ab.aiSub': 'Claude, an AI assistant by Anthropic',
      'ab.data': 'Your settings',
      'bk.export': 'Export settings', 'bk.exportDesc': 'Save your settings to a JSON file.', 'bk.exportBtn': 'Export',
      'bk.import': 'Import settings', 'bk.importDesc': 'Load settings from a file you exported before.', 'bk.importBtn': 'Import',
      'ab.reset': 'Reset all settings', 'ab.resetDesc': 'Restore every option to its default value.', 'ab.resetBtn': 'Reset',
      'dlg.resetTitle': 'Reset all settings?', 'dlg.resetBody': 'Every option goes back to its default value. Your activity log is kept.', 'dlg.cancel': 'Cancel',

      'popup.enable': 'Download button on X', 'popup.settings': 'Settings', 'popup.settingsDesc': 'Save folder, file name, shortcut and more', 'popup.errors': '{n} recent error(s)', 'popup.view': 'View',
      'tip.title': 'Quick start',
      'tip.body': 'Open x.com and click the download icon in a post’s action bar. Hover a post and press {key} to download faster; right-click the icon to pick single items.',
      'tip.ok': 'Got it',

      'toast.copied': 'Report copied', 'toast.imported': 'Settings imported', 'toast.reset': 'All settings were reset',
      'err.import': 'That file isn’t a valid settings export.', 'err.save': 'Couldn’t save your settings. Please try again.',
      'warn.xkey': '“{key}” is also an X shortcut, and this will override it. Add Alt or Ctrl to avoid the clash.',
      'warn.shortcutPage': 'Couldn’t open the page. Go to chrome://extensions/shortcuts manually.',
      'warn.chromeSettings': 'Couldn’t open the page. Go to chrome://settings/downloads manually.',

      'btn.download': 'Download media', 'tip.rightClick': 'Right-click to choose items',
      'menu.all': 'Download all ({n})', 'menu.photo': 'Photo {n}', 'menu.video': 'Video {n}', 'menu.gif': 'GIF {n}', 'menu.quote': 'Quoted post',
      'toast.none': 'No downloadable media found in this post', 'toast.fail': 'Download failed. Try again.'
    },
    vi: {
      'nav.download': 'Tải xuống', 'nav.appearance': 'Giao diện', 'nav.activity': 'Nhật ký', 'nav.about': 'Giới thiệu',
      'app.settings': 'Cài đặt', 'autosave': 'Tự động lưu',

      'grp.save': 'Lưu tệp', 'grp.behavior': 'Khi tải', 'grp.shortcut': 'Phím tắt',
      'path.title': 'Thư mục lưu',
      'path.desc': 'Thư mục con trong Downloads. Để trống để lưu thẳng vào Downloads.',
      'path.full': 'Lưu tại {path}',
      'path.abs': 'Chrome không cho dùng đường dẫn tuyệt đối như C:/Pictures. Hãy dùng thư mục con hoặc bật “Hỏi nơi lưu”.',
      'path.chrome': 'Đổi thư mục Downloads trong cài đặt Chrome',
      'file.title': 'Tên tệp',
      'file.desc': 'Ví dụ: {name}',
      'file.template': 'Mẫu tên tệp',
      'file.help': 'Kết hợp token và văn bản. Dùng “/” để tạo thư mục. Phần mở rộng được thêm tự động.',
      'file.tokens': 'Bấm vào token để chèn', 'file.reset': 'Đặt lại',
      'tok.username': 'Tên tài khoản', 'tok.name': 'Tên hiển thị', 'tok.tweetId': 'ID bài đăng', 'tok.index': 'Số thứ tự media',
      'tok.date': 'Ngày đăng (YYYYMMDD)', 'tok.time': 'Giờ đăng (HHmmss)', 'tok.text': 'Vài chữ đầu của bài đăng',
      'tok.type': 'photo, video hoặc gif', 'tok.filename': 'Tên gốc của media',
      'ask.title': 'Hỏi nơi lưu cho từng tệp', 'ask.desc': 'Chrome hiện hộp thoại Lưu cho mỗi tệp.',
      'thumb.title': 'Tải thêm ảnh bìa video', 'thumb.desc': 'Lưu ảnh bìa cạnh mỗi video hoặc GIF.',
      'multi.title': 'Bài có nhiều media', 'multi.desc': 'Bạn luôn có thể bấm chuột phải vào nút để chọn từng mục.',
      'multi.all': 'Tải tất cả', 'multi.menu': 'Cho tôi chọn',
      'reveal.title': 'Tự động hiện nội dung nhạy cảm', 'reveal.desc': 'Tự bấm “Xem” trên media bị ẩn sau cảnh báo.',
      'sc.title': 'Phím tắt', 'sc.desc': 'Rê chuột lên bài đăng rồi nhấn phím để tải media của bài.',
      'sc.key': 'Phím hiện tại', 'sc.change': 'Đổi', 'sc.press': 'Nhấn phím…', 'sc.record': 'Nhấn tổ hợp phím mới',
      'sc.browser': 'Phím tắt toàn trình duyệt', 'sc.browserDesc': 'Phím tắt dùng được ở bất cứ đâu trong Chrome.', 'sc.open': 'Mở',

      'ap.mode': 'Chế độ giao diện', 'ap.modeDesc': 'Chọn cách extension hiển thị.',
      'mode.light': 'Sáng', 'mode.dark': 'Tối', 'mode.system': 'Hệ thống',
      'ap.lang': 'Ngôn ngữ', 'ap.langDesc': 'Ngôn ngữ của extension.',

      'act.title': 'Nhật ký', 'act.empty': 'Mọi thứ đều ổn', 'act.emptyDesc': 'Sự cố và các lần thử lại tự động sẽ hiện ở đây.',
      'act.clear': 'Xoá', 'act.copy': 'Sao chép báo cáo',
      'act.race': 'Các extension quản lý tải xuống khác chạy cùng lúc có thể gây xung đột. Hãy tắt chúng trên X nếu việc tải bị lỗi.',
      'lvl.error': 'Lỗi', 'lvl.warning': 'Cảnh báo', 'lvl.info': 'Thông tin',
      'log.SERVER_FORBIDDEN': 'Liên kết media bị từ chối hoặc đã hết hạn.', 'log.SERVER_BAD_CONTENT': 'Tệp không còn trên máy chủ.',
      'log.SERVER_FAILED': 'Máy chủ trả về lỗi.', 'log.NETWORK': 'Sự cố mạng khi đang tải.',
      'log.FILE': 'Không ghi được tệp (quyền truy cập, tên tệp hoặc dung lượng ổ đĩa).', 'log.USER_CANCELED': 'Lượt tải đã bị huỷ.',
      'log.NO_MEDIA': 'Không tìm thấy media để tải trong bài đăng.', 'log.LOOKUP': 'Không tra cứu được bài đăng (có thể là bài riêng tư hoặc đã xoá).',
      'log.RETRY_OK': 'Đã làm mới liên kết và thử tải lại.', 'log.UNKNOWN': 'Lỗi không xác định.',

      'ab.tagline': 'Tải video và ảnh từ X chỉ với một cú nhấp.', 'ab.version': 'Phiên bản',
      'ab.local': 'Mọi thứ chạy ngay trên máy bạn — không tài khoản, không theo dõi.',
      'ab.author': 'Tác giả', 'ab.ai': 'Có sự hỗ trợ của AI Claude', 'ab.aiSub': 'Claude, trợ lý AI của Anthropic',
      'ab.data': 'Cài đặt của bạn',
      'bk.export': 'Xuất cài đặt', 'bk.exportDesc': 'Lưu cài đặt ra tệp JSON.', 'bk.exportBtn': 'Xuất',
      'bk.import': 'Nhập cài đặt', 'bk.importDesc': 'Nạp cài đặt từ tệp đã xuất trước đó.', 'bk.importBtn': 'Nhập',
      'ab.reset': 'Đặt lại toàn bộ cài đặt', 'ab.resetDesc': 'Khôi phục mọi tuỳ chọn về giá trị mặc định.', 'ab.resetBtn': 'Đặt lại',
      'dlg.resetTitle': 'Đặt lại toàn bộ cài đặt?', 'dlg.resetBody': 'Mọi tuỳ chọn trở về giá trị mặc định. Nhật ký hoạt động vẫn được giữ lại.', 'dlg.cancel': 'Huỷ',

      'popup.enable': 'Nút tải trên X', 'popup.settings': 'Cài đặt', 'popup.settingsDesc': 'Thư mục lưu, tên tệp, phím tắt và hơn nữa', 'popup.errors': '{n} lỗi gần đây', 'popup.view': 'Xem',
      'tip.title': 'Bắt đầu nhanh',
      'tip.body': 'Mở x.com và bấm biểu tượng tải trong thanh hành động của bài đăng. Rê chuột lên bài rồi nhấn {key} để tải nhanh; bấm chuột phải vào biểu tượng để chọn từng mục.',
      'tip.ok': 'Đã hiểu',

      'toast.copied': 'Đã sao chép báo cáo', 'toast.imported': 'Đã nhập cài đặt', 'toast.reset': 'Đã đặt lại toàn bộ cài đặt',
      'err.import': 'Tệp này không phải bản xuất cài đặt hợp lệ.', 'err.save': 'Không thể lưu cài đặt. Vui lòng thử lại.',
      'warn.xkey': '“{key}” cũng là phím tắt của X và sẽ bị ghi đè. Thêm Alt hoặc Ctrl để tránh trùng.',
      'warn.shortcutPage': 'Không mở được trang. Hãy vào chrome://extensions/shortcuts thủ công.',
      'warn.chromeSettings': 'Không mở được trang. Hãy vào chrome://settings/downloads thủ công.',

      'btn.download': 'Tải media', 'tip.rightClick': 'Chuột phải để chọn từng mục',
      'menu.all': 'Tải tất cả ({n})', 'menu.photo': 'Ảnh {n}', 'menu.video': 'Video {n}', 'menu.gif': 'GIF {n}', 'menu.quote': 'Bài được trích dẫn',
      'toast.none': 'Không tìm thấy media để tải trong bài đăng này', 'toast.fail': 'Tải xuống thất bại. Hãy thử lại.'
    }
  };

  const t = (l, key, vars) => {
    let s = (I18N[l] && I18N[l][key]) || I18N.en[key] || key;
    if (vars) for (const k in vars) s = s.split(`{${k}}`).join(vars[k]);
    return s;
  };

  // Chuyển mã lỗi (chrome.downloads / nội bộ) thành khoá i18n
  const logKey = (code) => {
    const c = String(code || '');
    if (/^NETWORK_/.test(c)) return 'log.NETWORK';
    if (/^FILE_/.test(c)) return 'log.FILE';
    return I18N.en['log.' + c] ? 'log.' + c : 'log.UNKNOWN';
  };

  // ---------- tên tệp / thư mục ----------
  const sanitize = (s) =>
    String(s ?? '').replace(/\s+/g, ' ').replace(/[<>:"\\|?*\u0000-\u001f]/g, '_').trim();

  function renderParts(tpl, c) {
    let d = c.createdAt ? new Date(c.createdAt) : new Date();
    if (isNaN(d)) d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const map = {
      username: c.username, name: c.name, tweetId: c.tweetId, index: c.index,
      date: `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`,
      time: `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`,
      text: (c.text || '').replace(/https?:\/\/\S+/g, '').trim().slice(0, 40),
      type: c.type, filename: c.filename
    };
    const raw = String(tpl || '').replace(/\{(\w+)\}/g, (_, k) =>
      k in map ? sanitize(map[k]).replace(/[\\/]/g, '_') : '');
    return raw.replace(/^\s*[a-zA-Z]:/, '').split(/[\\/]+/)
      .map((x) => sanitize(x).replace(/^\.+|[. ]+$/g, '')).filter(Boolean);
  }
  const isAbsolutePath = (v) => /^\s*([a-zA-Z]:|[\\/]|~)/.test(String(v || ''));
  function buildFilename(tpl, c) {
    const parts = renderParts(tpl, c);
    return parts.length ? parts.join('/') : `${c.username || 'x'}-${c.tweetId}-${c.index}`;
  }
  // Thư mục con bên trong Downloads ('' nếu để trống); luôn là đường dẫn tương đối
  const buildFolder = (tpl, c) => renderParts(tpl, c).join('/');

  // Chuẩn hoá media entry của X/syndication về dạng gọn
  function slimMedia(m) {
    if (!m) return null;
    if (m.type === 'photo') return { type: 'photo', url: m.media_url_https, thumb: m.media_url_https };
    const v = (m.video_info?.variants || []).filter((x) => x.content_type === 'video/mp4')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    return v ? { type: m.type === 'animated_gif' ? 'gif' : 'video', url: v.url, thumb: m.media_url_https } : null;
  }

  const isDarkMode = (s) => s.themeMode === 'dark' || (s.themeMode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const fmtShortcut = (sc) => [sc.ctrl && 'Ctrl', sc.alt && 'Alt', sc.shift && 'Shift', sc.label].filter(Boolean).join('+');

  globalThis.XD = Object.assign(globalThis.XD || {}, {
    DEFAULTS, I18N, t, logKey, sanitize, buildFilename, buildFolder, isAbsolutePath, slimMedia, isDarkMode, fmtShortcut
  });
})();
