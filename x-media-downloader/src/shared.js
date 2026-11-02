(() => {
  const lang = (navigator.language || 'en').toLowerCase().startsWith('vi') ? 'vi' : 'en';

  const DEFAULTS = {
    themeMode: 'system',
    themeColor: '#6750A4',
    fontSize: 'medium',
    language: lang,
    font: 'system',
    filenameTemplate: '{username}-{tweetId}-{index}',
    autoReveal: true,
    downloadThumbnail: false,
    shortcutEnabled: true,
    shortcut: { code: 'KeyD', label: 'D', ctrl: false, alt: false, shift: false },
    themeCache: null
  };

  const COLORS = [
    { id: 'purple', hex: '#6750A4' },
    { id: 'indigo', hex: '#3F51B5' },
    { id: 'blue', hex: '#2196F3' },
    { id: 'cyan', hex: '#00BCD4' },
    { id: 'teal', hex: '#009688' },
    { id: 'green', hex: '#4CAF50' },
    { id: 'lime', hex: '#CDDC39' },
    { id: 'yellow', hex: '#FFEB3B' },
    { id: 'orange', hex: '#FF9800' },
    { id: 'deepOrange', hex: '#FF5722' },
    { id: 'red', hex: '#F44336' },
    { id: 'pink', hex: '#E91E63' }
  ];

  const SYS = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
  const FONTS = [
    { id: 'system', name: null, stack: SYS },
    { id: 'google-sans-flex', name: 'Google Sans Flex', stack: `"Google Sans Flex","Google Sans",${SYS}` },
    { id: 'roboto-flex', name: 'Roboto Flex', stack: `"Roboto Flex",Roboto,${SYS}` },
    { id: 'roboto', name: 'Roboto', stack: `Roboto,${SYS}` },
    { id: 'arial', name: 'Arial', stack: 'Arial,"Helvetica Neue",Helvetica,sans-serif' },
    { id: 'inter', name: 'Inter', stack: `Inter,${SYS}` },
    { id: 'be-vietnam-pro', name: 'Be Vietnam Pro', stack: `"Be Vietnam Pro",${SYS}` }
  ];

  const SIZES = { small: '14px', medium: '16px', large: '18px' };

  const I18N = {
    en: {
      'nav.download': 'Download', 'nav.appearance': 'Appearance', 'nav.about': 'About',
      'dl.title': 'Download', 'dl.subtitle': 'Control how files are named and saved.',
      'file.title': 'Custom filename',
      'file.desc': 'Combine tokens and text. Use “/” to save into folders. The file extension is added automatically.',
      'file.template': 'Filename template', 'file.preview': 'Preview', 'file.reset': 'Reset',
      'tok.username': 'Account handle', 'tok.name': 'Display name', 'tok.tweetId': 'Post ID', 'tok.index': 'Media number',
      'tok.date': 'Post date (YYYYMMDD)', 'tok.time': 'Post time (HHmmss)', 'tok.text': 'First words of the post',
      'tok.type': 'photo, video or gif', 'tok.filename': 'Original media name',
      'reveal.title': 'Auto reveal sensitive content',
      'reveal.desc': 'Clicks “View” for you on media hidden behind a sensitive-content warning.',
      'thumb.title': 'Download video thumbnail',
      'thumb.desc': 'Also saves the cover image when you download a video or GIF.',
      'sc.title': 'Keyboard shortcut',
      'sc.desc': 'Press it while hovering over a post (or after selecting it with J / K) to download its media.',
      'sc.enable': 'Enable shortcut', 'sc.change': 'Change', 'sc.press': 'Press keys…', 'sc.browser': 'Browser-wide shortcut',
      'sc.browserDesc': 'Set a shortcut that works anywhere in Chrome.', 'sc.open': 'Open',
      'ap.title': 'Appearance', 'ap.subtitle': 'Make the extension look the way you like.',
      'ap.mode': 'Theme', 'mode.light': 'Light', 'mode.dark': 'Dark', 'mode.system': 'System',
      'ap.color': 'Theme color', 'ap.size': 'Text size', 'size.small': 'Small', 'size.medium': 'Medium', 'size.large': 'Large',
      'ap.lang': 'Language', 'ap.font': 'Font', 'font.system': 'System', 'ap.preview': 'Preview',
      'pv.head': 'Download in one click', 'pv.body': 'Videos and images from X, saved straight to your computer.',
      'pv.filled': 'Download', 'pv.tonal': 'Settings', 'pv.outlined': 'Cancel',
      'color.purple': 'Purple', 'color.indigo': 'Indigo', 'color.blue': 'Blue', 'color.cyan': 'Cyan', 'color.teal': 'Teal',
      'color.green': 'Green', 'color.lime': 'Lime', 'color.yellow': 'Yellow', 'color.orange': 'Orange',
      'color.deepOrange': 'Deep orange', 'color.red': 'Red', 'color.pink': 'Pink',
      'ab.title': 'About', 'ab.tagline': 'Download videos and images from X with one click.',
      'ab.desc': 'A personal-use extension that saves videos and images from X (Twitter) and TweetDeck without any third-party service.',
      'ab.does': 'What it does', 'ab.doesnt': 'What it doesn’t do',
      'ab.d1': 'Custom filename', 'ab.d2': 'Auto reveal sensitive content', 'ab.d3': 'Keyboard shortcut', 'ab.d4': 'Download video thumbnail',
      'ab.n1': 'Tweet crawling', 'ab.n2': 'Batch download', 'ab.n3': 'File compression',
      'ab.race': 'Other download-manager extensions running at the same time can cause race conditions. Turn them off for X if downloads misbehave.',
      'ab.version': 'Version',
      'saved': 'Saved',
      'btn.download': 'Download media',
      'toast.start': 'Downloading {n} file(s)…', 'toast.none': 'No downloadable media found in this post', 'toast.fail': 'Download failed. Try again.'
    },
    vi: {
      'nav.download': 'Tải xuống', 'nav.appearance': 'Giao diện', 'nav.about': 'Giới thiệu',
      'dl.title': 'Tải xuống', 'dl.subtitle': 'Tuỳ chỉnh cách đặt tên và lưu tệp.',
      'file.title': 'Tên tệp tuỳ chỉnh',
      'file.desc': 'Kết hợp token và văn bản. Dùng “/” để lưu vào thư mục con. Phần mở rộng tệp được thêm tự động.',
      'file.template': 'Mẫu tên tệp', 'file.preview': 'Xem trước', 'file.reset': 'Đặt lại',
      'tok.username': 'Tên tài khoản', 'tok.name': 'Tên hiển thị', 'tok.tweetId': 'ID bài đăng', 'tok.index': 'Số thứ tự media',
      'tok.date': 'Ngày đăng (YYYYMMDD)', 'tok.time': 'Giờ đăng (HHmmss)', 'tok.text': 'Vài chữ đầu của bài đăng',
      'tok.type': 'photo, video hoặc gif', 'tok.filename': 'Tên gốc của media',
      'reveal.title': 'Tự động hiện nội dung nhạy cảm',
      'reveal.desc': 'Tự bấm “Xem” trên media bị ẩn sau cảnh báo nội dung nhạy cảm.',
      'thumb.title': 'Tải ảnh bìa của video',
      'thumb.desc': 'Lưu thêm ảnh bìa khi tải video hoặc GIF.',
      'sc.title': 'Phím tắt',
      'sc.desc': 'Nhấn khi rê chuột lên một bài đăng (hoặc chọn bằng J / K) để tải media của bài đó.',
      'sc.enable': 'Bật phím tắt', 'sc.change': 'Đổi', 'sc.press': 'Nhấn phím…', 'sc.browser': 'Phím tắt toàn trình duyệt',
      'sc.browserDesc': 'Đặt phím tắt dùng được ở bất cứ đâu trong Chrome.', 'sc.open': 'Mở',
      'ap.title': 'Giao diện', 'ap.subtitle': 'Tuỳ biến extension theo ý bạn.',
      'ap.mode': 'Chế độ giao diện', 'mode.light': 'Sáng', 'mode.dark': 'Tối', 'mode.system': 'Hệ thống',
      'ap.color': 'Màu chủ đề', 'ap.size': 'Cỡ chữ', 'size.small': 'Nhỏ', 'size.medium': 'Vừa', 'size.large': 'Lớn',
      'ap.lang': 'Ngôn ngữ', 'ap.font': 'Font chữ', 'font.system': 'Hệ thống', 'ap.preview': 'Xem trước',
      'pv.head': 'Tải xuống chỉ với một cú nhấp', 'pv.body': 'Video và ảnh từ X, lưu thẳng về máy của bạn.',
      'pv.filled': 'Tải xuống', 'pv.tonal': 'Cài đặt', 'pv.outlined': 'Huỷ',
      'color.purple': 'Tím', 'color.indigo': 'Chàm', 'color.blue': 'Xanh dương', 'color.cyan': 'Lục lam', 'color.teal': 'Xanh mòng két',
      'color.green': 'Xanh lá', 'color.lime': 'Xanh chanh', 'color.yellow': 'Vàng', 'color.orange': 'Cam',
      'color.deepOrange': 'Cam đậm', 'color.red': 'Đỏ', 'color.pink': 'Hồng',
      'ab.title': 'Giới thiệu', 'ab.tagline': 'Tải video và ảnh từ X chỉ với một cú nhấp.',
      'ab.desc': 'Extension dùng cá nhân, lưu video và ảnh từ X (Twitter) và TweetDeck mà không cần dịch vụ bên thứ ba.',
      'ab.does': 'Có làm', 'ab.doesnt': 'Không làm',
      'ab.d1': 'Tên tệp tuỳ chỉnh', 'ab.d2': 'Tự động hiện nội dung nhạy cảm', 'ab.d3': 'Phím tắt', 'ab.d4': 'Tải ảnh bìa video',
      'ab.n1': 'Quét bài đăng (crawl)', 'ab.n2': 'Tải hàng loạt', 'ab.n3': 'Nén tệp',
      'ab.race': 'Các extension quản lý tải xuống khác chạy cùng lúc có thể gây xung đột (race condition). Hãy tắt chúng trên X nếu việc tải bị lỗi.',
      'ab.version': 'Phiên bản',
      'saved': 'Đã lưu',
      'btn.download': 'Tải media',
      'toast.start': 'Đang tải {n} tệp…', 'toast.none': 'Không tìm thấy media để tải trong bài đăng này', 'toast.fail': 'Tải xuống thất bại. Hãy thử lại.'
    }
  };

  const t = (l, key, vars) => {
    let s = (I18N[l] && I18N[l][key]) || I18N.en[key] || key;
    if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
    return s;
  };

  const sanitize = (s) =>
    String(s ?? '').replace(/\s+/g, ' ').replace(/[<>:"\\|?*\u0000-\u001f]/g, '_').trim();

  function buildFilename(tpl, c) {
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
      k in map ? sanitize(map[k]).replace(/\//g, '_') : '');
    const parts = raw.split('/').map((x) => sanitize(x).replace(/^\.+|[. ]+$/g, '')).filter(Boolean);
    return parts.length ? parts.join('/') : `${c.username || 'x'}-${c.tweetId}-${c.index}`;
  }

  // Chuẩn hoá media entry của X/syndication về dạng gọn
  function slimMedia(m) {
    if (!m) return null;
    if (m.type === 'photo') return { type: 'photo', url: m.media_url_https, thumb: m.media_url_https };
    const v = (m.video_info?.variants || []).filter((x) => x.content_type === 'video/mp4')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    return v ? { type: m.type === 'animated_gif' ? 'gif' : 'video', url: v.url, thumb: m.media_url_https } : null;
  }

  globalThis.XMD = { DEFAULTS, COLORS, FONTS, SIZES, I18N, t, sanitize, buildFilename, slimMedia };
})();
