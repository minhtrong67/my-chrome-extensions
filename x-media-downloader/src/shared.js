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
    enabled: true,
    multiMode: 'all',
    revealKeywords: '',
    saveFolder: '',
    askWhere: false,
    onboarded: false,
    themeCache: null
  };

  // 19 màu Material Design (Purple dùng tông tím chuẩn của Material 3 baseline)
  const COLORS = [
    { id: 'red', hex: '#F44336' }, { id: 'pink', hex: '#E91E63' }, { id: 'purple', hex: '#6750A4' },
    { id: 'deepPurple', hex: '#673AB7' }, { id: 'indigo', hex: '#3F51B5' }, { id: 'blue', hex: '#2196F3' },
    { id: 'lightBlue', hex: '#03A9F4' }, { id: 'cyan', hex: '#00BCD4' }, { id: 'teal', hex: '#009688' },
    { id: 'green', hex: '#4CAF50' }, { id: 'lightGreen', hex: '#8BC34A' }, { id: 'lime', hex: '#CDDC39' },
    { id: 'yellow', hex: '#FFEB3B' }, { id: 'amber', hex: '#FFC107' }, { id: 'orange', hex: '#FF9800' },
    { id: 'deepOrange', hex: '#FF5722' }, { id: 'brown', hex: '#795548' }, { id: 'grey', hex: '#9E9E9E' },
    { id: 'blueGrey', hex: '#607D8B' }
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
      'sc.current': 'Current shortcut',
      'tip.rightClick': 'Right-click to choose items',
      'dlg.resetTitle': 'Reset all settings?', 'dlg.resetBody': 'Every option goes back to its default value. Your activity log is kept.', 'dlg.cancel': 'Cancel',
      'ob.title': 'Welcome — you’re set in 3 steps',
      'ob.s1': 'Open x.com or TweetDeck and scroll to a post with a photo or video.',
      'ob.s2': 'Click the download icon in the post’s action bar. A ring shows the progress.',
      'ob.s3': 'Hover a post and press {key} for a one-key download. Right-click the icon to pick single items.',
      'ob.open': 'Open x.com', 'ob.done': 'Got it',
      'sec.save': 'Where to save', 'sec.name': 'File name', 'sec.behavior': 'Behavior', 'sec.shortcut': 'Shortcut',
      'autosave': 'Changes are saved automatically',
      'pvm.name': 'Sample account', 'pvm.text': 'This is how the download button looks on a post.',
      'pvm.hint': 'Hover for the tooltip, click to see progress, right-click for the menu.', 'pvm.toasts': 'Notification styles',
      'pvm.t.info': 'This is an info message.', 'pvm.t.success': 'This is a success message.', 'pvm.t.warning': 'This is a warning message.', 'pvm.t.error': 'This is an error message.',
      'popup.errors': '{n} recent error(s)', 'popup.view': 'View',
      'color.deepPurple': 'Deep purple', 'color.lightBlue': 'Light blue', 'color.lightGreen': 'Light green', 'color.amber': 'Amber',
      'color.brown': 'Brown', 'color.grey': 'Grey', 'color.blueGrey': 'Blue grey', 'color.custom': 'Custom',
      'path.title': 'Save location',
      'path.desc': 'Chrome only lets extensions save inside its Downloads folder, so choose a sub-folder here. Tokens such as {username} and {date} work too.',
      'path.label': 'Sub-folder inside Downloads', 'path.full': 'Saved to',
      'path.hint': 'Leave empty to save straight into Downloads. Use / to nest folders.',
      'path.abs': 'Chrome doesn’t allow absolute paths like C:/Pictures. Use a sub-folder, or turn on “Ask where to save”.',
      'ask.title': 'Ask where to save each file', 'ask.desc': 'Chrome shows its Save dialog for every file, so you can pick any folder on your computer.',
      'dlset.title': 'Default Downloads folder', 'dlset.desc': 'To move the main Downloads folder itself, change it in Chrome’s settings.', 'dlset.btn': 'Open Chrome settings',
      'warn.chromeSettings': 'Couldn’t open the page. Go to chrome://settings/downloads manually.',
      'nav.activity': 'Activity',
      'file.presets': 'Presets', 'file.try': 'Try with a post link', 'file.tryBtn': 'Preview', 'file.tryBusy': 'Looking up…',
      'file.tryNone': 'No media found for this link.', 'file.tryBad': 'That doesn’t look like a post link.',
      'multi.title': 'Posts with several media', 'multi.desc': 'Choose what the button does. Right-click it at any time to pick individual items.',
      'multi.all': 'Download all', 'multi.menu': 'Let me choose',
      'reveal.keywords': 'Extra “View” labels',
      'reveal.keywordsDesc': 'Comma-separated words for other languages, e.g. Ver, Afficher. Common English and Vietnamese labels and the warning layout are detected automatically.',
      'popup.enable': 'Show download button', 'popup.settings': 'Open settings',
      'act.title': 'Activity', 'act.subtitle': 'Recent problems and retries, so you can see what went wrong.',
      'act.empty': 'Nothing to report. All good!', 'act.clear': 'Clear', 'act.copy': 'Copy report', 'toast.copied': 'Report copied',
      'lvl.error': 'Error', 'lvl.warning': 'Warning', 'lvl.info': 'Info',
      'log.SERVER_FORBIDDEN': 'The media link was refused or has expired.', 'log.SERVER_BAD_CONTENT': 'The file no longer exists on the server.',
      'log.SERVER_FAILED': 'The server returned an error.', 'log.NETWORK': 'Network problem while downloading.',
      'log.FILE': 'Couldn’t write the file (permission, name or disk space).', 'log.USER_CANCELED': 'The download was cancelled.',
      'log.NO_MEDIA': 'No downloadable media was found in the post.', 'log.LOOKUP': 'Couldn’t look up the post (it may be private or deleted).',
      'log.RETRY_OK': 'The link was refreshed and the download was retried.', 'log.UNKNOWN': 'Unexpected error.',
      'bk.export': 'Export settings', 'bk.exportDesc': 'Save your settings to a JSON file.', 'bk.exportBtn': 'Export',
      'bk.import': 'Import settings', 'bk.importDesc': 'Load settings from a JSON file you exported before.', 'bk.importBtn': 'Import',
      'toast.imported': 'Settings imported', 'err.import': 'That file isn’t a valid settings export.',
      'menu.all': 'Download all ({n})', 'menu.photo': 'Photo {n}', 'menu.video': 'Video {n}', 'menu.gif': 'GIF {n}', 'menu.quote': 'Quoted post',
      'tip.reset': 'Restore the default template', 'tip.record': 'Press a new key combination', 'tip.open': 'Open Chrome’s shortcut settings',
      'ab.author': 'Author', 'ab.ai': 'Built with the support of Claude, an AI assistant by Anthropic.',
      'ab.reset': 'Reset all settings', 'ab.resetDesc': 'Restore every option to its default value.', 'ab.resetBtn': 'Reset',
      'reset.confirm': 'Reset all settings to their defaults?', 'toast.reset': 'All settings were reset',
      'warn.xkey': '“{key}” is also an X shortcut, and this will override it. Add Alt or Ctrl to avoid the clash.',
      'err.save': 'Couldn’t save your settings. Please try again.',
      'warn.shortcutPage': 'Couldn’t open the page. Go to chrome://extensions/shortcuts manually.',
      'info.font': '“{font}” isn’t available right now (you may be offline). A fallback font is used.',
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
      'sc.current': 'Phím tắt hiện tại',
      'tip.rightClick': 'Chuột phải để chọn từng mục',
      'dlg.resetTitle': 'Đặt lại toàn bộ cài đặt?', 'dlg.resetBody': 'Mọi tuỳ chọn trở về giá trị mặc định. Nhật ký hoạt động vẫn được giữ lại.', 'dlg.cancel': 'Huỷ',
      'ob.title': 'Chào mừng — chỉ cần 3 bước',
      'ob.s1': 'Mở x.com hoặc TweetDeck và cuộn tới một bài có ảnh hoặc video.',
      'ob.s2': 'Bấm biểu tượng tải trong thanh hành động của bài. Vòng tròn cho biết tiến độ.',
      'ob.s3': 'Rê chuột lên bài rồi nhấn {key} để tải bằng một phím. Bấm chuột phải vào biểu tượng để chọn từng mục.',
      'ob.open': 'Mở x.com', 'ob.done': 'Đã hiểu',
      'sec.save': 'Nơi lưu', 'sec.name': 'Tên tệp', 'sec.behavior': 'Hành vi', 'sec.shortcut': 'Phím tắt',
      'autosave': 'Thay đổi được lưu tự động',
      'pvm.name': 'Tài khoản mẫu', 'pvm.text': 'Đây là giao diện nút tải trên một bài đăng.',
      'pvm.hint': 'Rê chuột để xem tooltip, bấm để xem tiến độ, bấm chuột phải để mở menu.', 'pvm.toasts': 'Kiểu thông báo',
      'pvm.t.info': 'Đây là thông báo thông tin.', 'pvm.t.success': 'Đây là thông báo thành công.', 'pvm.t.warning': 'Đây là thông báo cảnh báo.', 'pvm.t.error': 'Đây là thông báo lỗi.',
      'popup.errors': '{n} lỗi gần đây', 'popup.view': 'Xem',
      'color.deepPurple': 'Tím đậm', 'color.lightBlue': 'Xanh dương nhạt', 'color.lightGreen': 'Xanh lá nhạt', 'color.amber': 'Hổ phách',
      'color.brown': 'Nâu', 'color.grey': 'Xám', 'color.blueGrey': 'Xám xanh', 'color.custom': 'Tuỳ chọn',
      'path.title': 'Đường dẫn lưu',
      'path.desc': 'Chrome chỉ cho extension lưu bên trong thư mục Downloads, nên hãy chọn thư mục con tại đây. Có thể dùng token như {username} và {date}.',
      'path.label': 'Thư mục con trong Downloads', 'path.full': 'Lưu tại',
      'path.hint': 'Để trống để lưu thẳng vào Downloads. Dùng / để lồng thư mục.',
      'path.abs': 'Chrome không cho dùng đường dẫn tuyệt đối như C:/Pictures. Hãy dùng thư mục con hoặc bật “Hỏi nơi lưu”.',
      'ask.title': 'Hỏi nơi lưu cho từng tệp', 'ask.desc': 'Chrome hiện hộp thoại Lưu cho mỗi tệp để bạn chọn bất kỳ thư mục nào trên máy.',
      'dlset.title': 'Thư mục Downloads mặc định', 'dlset.desc': 'Muốn đổi chính thư mục Downloads, hãy đổi trong cài đặt của Chrome.', 'dlset.btn': 'Mở cài đặt Chrome',
      'warn.chromeSettings': 'Không mở được trang. Hãy vào chrome://settings/downloads thủ công.',
      'nav.activity': 'Nhật ký',
      'file.presets': 'Mẫu có sẵn', 'file.try': 'Thử với liên kết bài đăng', 'file.tryBtn': 'Xem thử', 'file.tryBusy': 'Đang tra cứu…',
      'file.tryNone': 'Không tìm thấy media cho liên kết này.', 'file.tryBad': 'Đây không giống liên kết bài đăng.',
      'multi.title': 'Bài có nhiều media', 'multi.desc': 'Chọn hành vi của nút. Bấm chuột phải vào nút bất cứ lúc nào để chọn từng mục.',
      'multi.all': 'Tải tất cả', 'multi.menu': 'Cho tôi chọn',
      'reveal.keywords': 'Nhãn “Xem” bổ sung',
      'reveal.keywordsDesc': 'Các từ cách nhau bằng dấu phẩy cho ngôn ngữ khác, ví dụ Ver, Afficher. Nhãn tiếng Anh, tiếng Việt thông dụng và bố cục cảnh báo được nhận diện tự động.',
      'popup.enable': 'Hiện nút tải xuống', 'popup.settings': 'Mở cài đặt',
      'act.title': 'Nhật ký', 'act.subtitle': 'Các sự cố và lần thử lại gần đây để bạn biết điều gì đã xảy ra.',
      'act.empty': 'Không có gì để báo cáo. Mọi thứ đều ổn!', 'act.clear': 'Xoá', 'act.copy': 'Sao chép báo cáo', 'toast.copied': 'Đã sao chép báo cáo',
      'lvl.error': 'Lỗi', 'lvl.warning': 'Cảnh báo', 'lvl.info': 'Thông tin',
      'log.SERVER_FORBIDDEN': 'Liên kết media bị từ chối hoặc đã hết hạn.', 'log.SERVER_BAD_CONTENT': 'Tệp không còn trên máy chủ.',
      'log.SERVER_FAILED': 'Máy chủ trả về lỗi.', 'log.NETWORK': 'Sự cố mạng khi đang tải.',
      'log.FILE': 'Không ghi được tệp (quyền truy cập, tên tệp hoặc dung lượng ổ đĩa).', 'log.USER_CANCELED': 'Lượt tải đã bị huỷ.',
      'log.NO_MEDIA': 'Không tìm thấy media để tải trong bài đăng.', 'log.LOOKUP': 'Không tra cứu được bài đăng (có thể là bài riêng tư hoặc đã xoá).',
      'log.RETRY_OK': 'Đã làm mới liên kết và thử tải lại.', 'log.UNKNOWN': 'Lỗi không xác định.',
      'bk.export': 'Xuất cài đặt', 'bk.exportDesc': 'Lưu cài đặt ra tệp JSON.', 'bk.exportBtn': 'Xuất',
      'bk.import': 'Nhập cài đặt', 'bk.importDesc': 'Nạp cài đặt từ tệp JSON đã xuất trước đó.', 'bk.importBtn': 'Nhập',
      'toast.imported': 'Đã nhập cài đặt', 'err.import': 'Tệp này không phải bản xuất cài đặt hợp lệ.',
      'menu.all': 'Tải tất cả ({n})', 'menu.photo': 'Ảnh {n}', 'menu.video': 'Video {n}', 'menu.gif': 'GIF {n}', 'menu.quote': 'Bài được trích dẫn',
      'tip.reset': 'Khôi phục mẫu mặc định', 'tip.record': 'Nhấn tổ hợp phím mới', 'tip.open': 'Mở cài đặt phím tắt của Chrome',
      'ab.author': 'Tác giả', 'ab.ai': 'Xây dựng với sự hỗ trợ của Claude, trợ lý AI của Anthropic.',
      'ab.reset': 'Đặt lại toàn bộ cài đặt', 'ab.resetDesc': 'Khôi phục mọi tuỳ chọn về giá trị mặc định.', 'ab.resetBtn': 'Đặt lại',
      'reset.confirm': 'Đặt lại toàn bộ cài đặt về mặc định?', 'toast.reset': 'Đã đặt lại toàn bộ cài đặt',
      'warn.xkey': '“{key}” cũng là phím tắt của X và sẽ bị ghi đè. Thêm Alt hoặc Ctrl để tránh trùng.',
      'err.save': 'Không thể lưu cài đặt. Vui lòng thử lại.',
      'warn.shortcutPage': 'Không mở được trang. Hãy vào chrome://extensions/shortcuts thủ công.',
      'info.font': '“{font}” hiện chưa dùng được (có thể bạn đang offline). Đang dùng font dự phòng.',
      'btn.download': 'Tải media',
      'toast.start': 'Đang tải {n} tệp…', 'toast.none': 'Không tìm thấy media để tải trong bài đăng này', 'toast.fail': 'Tải xuống thất bại. Hãy thử lại.'
    }
  };

  const t = (l, key, vars) => {
    let s = (I18N[l] && I18N[l][key]) || I18N.en[key] || key;
    if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
    return s;
  };

  // Chuyển mã lỗi (chrome.downloads / nội bộ) thành khoá i18n
  const logKey = (code) => {
    const c = String(code || '');
    if (/^NETWORK_/.test(c)) return 'log.NETWORK';
    if (/^FILE_/.test(c)) return 'log.FILE';
    return I18N.en['log.' + c] ? 'log.' + c : 'log.UNKNOWN';
  };

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

  // ---------- theme tokens ----------
  const FALLBACK = {
    light: { primary: '#65558f', onPrimary: '#ffffff', onSurfaceVariant: '#49454f', primaryContainer: '#e9ddff', onPrimaryContainer: '#201047', secondaryContainer: '#e8def8', onSecondaryContainer: '#1d192b', surfaceContainerHigh: '#ece6ee', onSurface: '#1d1b20', outlineVariant: '#cac4cf', inverseSurface: '#322f35', inverseOnSurface: '#f5eff7', inversePrimary: '#cfbdfe' },
    dark: { primary: '#cfbdfe', onPrimary: '#36275d', onSurfaceVariant: '#cac4cf', primaryContainer: '#4d3d76', onPrimaryContainer: '#e9ddff', secondaryContainer: '#4a4458', onSecondaryContainer: '#e8def8', surfaceContainerHigh: '#2b2930', onSurface: '#e6e0e9', outlineVariant: '#49454f', inverseSurface: '#e6e0e9', inverseOnSurface: '#322f35', inversePrimary: '#65558f' }
  };
  const getTokens = (s, dark) => ({ ...FALLBACK[dark ? 'dark' : 'light'], ...((s && s.themeCache && s.themeCache[dark ? 'dark' : 'light']) || {}) });
  const isDarkMode = (s) => s.themeMode === 'dark' || (s.themeMode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const fmtShortcut = (sc) => [sc.ctrl && 'Ctrl', sc.alt && 'Alt', sc.shift && 'Shift', sc.label].filter(Boolean).join('+');

  // ---------- toast (info / success / warning / error) ----------
  const TOAST_ICONS = {
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    success: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m8 12.5 3 3 5-6"/></svg>',
    warning: '<svg viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    error: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>'
  };
  const STATUS = {
    light: { success: { bg: '#d9f4df', fg: '#0a3a18', accent: '#1b7f3b' }, warning: { bg: '#ffecbf', fg: '#3a2800', accent: '#a86400' }, error: { bg: '#ffdad6', fg: '#410002', accent: '#ba1a1a' } },
    dark: { success: { bg: '#173d27', fg: '#c6f1cf', accent: '#7fdc97' }, warning: { bg: '#4a3700', fg: '#ffe2a3', accent: '#f2c15a' }, error: { bg: '#6b0a12', fg: '#ffdad6', accent: '#ffb4ab' } }
  };
  const toastPalette = (v, dark, tk) => v === 'info'
    ? { bg: tk.primaryContainer, fg: tk.onPrimaryContainer, accent: tk.primary }
    : STATUS[dark ? 'dark' : 'light'][v] || STATUS.light.error;

  // getCtx() -> { dark, tokens, font, fs, fsSm }
  function createToaster(getCtx) {
    let el, timer;
    return function show(msg, variant = 'info', ms) {
      const host = document.body || document.documentElement;
      if (!host) return;
      const c = getCtx();
      const p = toastPalette(variant, c.dark, c.tokens);
      if (!el || !el.isConnected) { el = document.createElement('div'); el.className = 'xmd-toast'; host.append(el); }
      const st = el.style;
      st.setProperty('--tt-bg', p.bg); st.setProperty('--tt-fg', p.fg); st.setProperty('--tt-accent', p.accent);
      st.setProperty('--xmd-font', c.font); st.setProperty('--xmd-fs', c.fs);
      el.dataset.variant = variant;
      el.setAttribute('role', variant === 'error' || variant === 'warning' ? 'alert' : 'status');
      const ico = document.createElement('span'); ico.className = 'xmd-ico'; ico.innerHTML = TOAST_ICONS[variant] || TOAST_ICONS.info;
      const tx = document.createElement('span'); tx.textContent = msg;
      el.replaceChildren(ico, tx);
      requestAnimationFrame(() => el.classList.add('show'));
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('show'), ms || (variant === 'error' || variant === 'warning' ? 5000 : 3000));
    };
  }

  // ---------- tooltip: gắn thuộc tính data-xmd-tip ----------
  function initTooltips(getCtx) {
    const SEL = '[data-xmd-tip]';
    let tip, timer, cur;
    const hide = () => { clearTimeout(timer); cur = null; if (tip) tip.classList.remove('show'); };
    const show = (el) => {
      const text = el.getAttribute('data-xmd-tip');
      if (!text || !el.isConnected) return;
      const c = getCtx();
      if (!tip || !tip.isConnected) {
        tip = document.createElement('div'); tip.className = 'xmd-tip'; tip.setAttribute('role', 'tooltip');
        (document.body || document.documentElement).append(tip);
      }
      cur = el;
      tip.style.setProperty('--tt-bg', c.tokens.inverseSurface);
      tip.style.setProperty('--tt-fg', c.tokens.inverseOnSurface);
      tip.style.setProperty('--xmd-font', c.font);
      tip.style.setProperty('--xmd-fs-sm', c.fsSm);
      tip.textContent = text;
      tip.classList.remove('show');
      tip.style.left = '0px'; tip.style.top = '0px';
      const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      const x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
      let y = r.top - h - 10, below = false;
      if (y < 8) { y = r.bottom + 10; below = true; }
      tip.dataset.pos = below ? 'below' : 'above';
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
      tip.style.transformOrigin = `${Math.round(r.left + r.width / 2 - x)}px ${below ? '0' : '100%'}`;
      requestAnimationFrame(() => { if (cur === el) tip.classList.add('show'); });
    };
    const target = (e) => (e.target && e.target.closest ? e.target.closest(SEL) : null);
    document.addEventListener('mouseover', (e) => {
      const el = target(e);
      if (!el || el === cur) return;
      clearTimeout(timer);
      timer = setTimeout(() => show(el), 380);
    }, true);
    document.addEventListener('mouseout', (e) => {
      const el = target(e);
      if (el && !el.contains(e.relatedTarget)) hide();
    }, true);
    document.addEventListener('focusin', (e) => {
      const el = target(e);
      if (el && el.matches(':focus-visible')) show(el);
    }, true);
    document.addEventListener('focusout', hide, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); }, true);
    document.addEventListener('pointerdown', hide, true);
    window.addEventListener('scroll', hide, { capture: true, passive: true });
    window.addEventListener('blur', hide);
  }

  // ---------- menu (M3) dùng chung cho trang X và trang cài đặt ----------
  const MENU_FILE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
  function createMenu(getCtx) {
    let el = null;
    const close = () => {
      if (!el) return;
      el.remove(); el = null;
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onKey, true);
    };
    const onOutside = (e) => { if (el && !el.contains(e.target)) close(); };
    const onKey = (e) => {
      if (!el) return;
      const its = [...el.querySelectorAll('.xmd-mi')];
      const i = its.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); its[(i + 1) % its.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); its[(i - 1 + its.length) % its.length].focus(); }
    };
    // rows: [{ label, sub?, thumb?, onPick }]
    function open(anchor, rows) {
      close();
      const c = getCtx(), tk = c.tokens;
      el = document.createElement('div');
      el.className = 'xmd-menu';
      el.setAttribute('role', 'menu');
      const st = el.style;
      st.setProperty('--mn-bg', tk.surfaceContainerHigh); st.setProperty('--mn-fg', tk.onSurface);
      st.setProperty('--mn-sel', tk.secondaryContainer); st.setProperty('--mn-on-sel', tk.onSecondaryContainer);
      st.setProperty('--mn-line', tk.outlineVariant); st.setProperty('--xmd-font', c.font); st.setProperty('--xmd-fs', c.fs);
      for (const r of rows) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'xmd-mi'; b.setAttribute('role', 'menuitem');
        if (r.thumb) { const im = document.createElement('img'); im.src = r.thumb; im.alt = ''; im.referrerPolicy = 'no-referrer'; b.append(im); }
        else { const ic = document.createElement('span'); ic.className = 'xmd-mi-ic'; ic.innerHTML = MENU_FILE; b.append(ic); }
        const tx = document.createElement('span'); tx.className = 'xmd-mi-tx';
        const l1 = document.createElement('span'); l1.textContent = r.label; tx.append(l1);
        if (r.sub) { const l2 = document.createElement('small'); l2.textContent = r.sub; tx.append(l2); }
        b.append(tx);
        b.addEventListener('click', (e) => { e.stopPropagation(); close(); r.onPick(); });
        el.append(b);
      }
      (document.body || document.documentElement).append(el);
      const rc = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
      const x = Math.min(innerWidth - w - 8, Math.max(8, rc.right - w));
      let y = rc.bottom + 6, below = true;
      if (y + h > innerHeight - 8) { y = rc.top - h - 6; below = false; }
      el.style.left = x + 'px'; el.style.top = Math.max(8, y) + 'px';
      el.style.transformOrigin = `${Math.round(rc.right - x)}px ${below ? '0' : '100%'}`;
      requestAnimationFrame(() => { if (el) { el.classList.add('show'); const f = el.querySelector('.xmd-mi'); if (f) f.focus(); } });
      document.addEventListener('pointerdown', onOutside, true);
      document.addEventListener('keydown', onKey, true);
    }
    return { open, close, isOpen: () => !!el };
  }

  // ---------- hộp thoại xác nhận M3: trả về Promise<boolean> ----------
  function confirmDialog(getCtx, { title, body, ok, cancel }) {
    return new Promise((resolve) => {
      const c = getCtx(), tk = c.tokens, prev = document.activeElement;
      const scrim = document.createElement('div');
      scrim.className = 'xmd-scrim';
      const dlg = document.createElement('div');
      dlg.className = 'xmd-dialog';
      dlg.setAttribute('role', 'alertdialog'); dlg.setAttribute('aria-modal', 'true');
      dlg.setAttribute('aria-labelledby', 'xmd-dlg-t'); dlg.setAttribute('aria-describedby', 'xmd-dlg-b');
      const st = dlg.style;
      st.setProperty('--dg-bg', tk.surfaceContainerHigh); st.setProperty('--dg-fg', tk.onSurface); st.setProperty('--dg-sub', tk.onSurfaceVariant);
      st.setProperty('--dg-pri', tk.primary); st.setProperty('--dg-on-pri', tk.onPrimary);
      st.setProperty('--xmd-font', c.font); st.setProperty('--xmd-fs', c.fs);
      dlg.innerHTML = '<h2 id="xmd-dlg-t"></h2><p id="xmd-dlg-b"></p><div class="xmd-dlg-actions"><button type="button" class="xmd-dlg-btn text"></button><button type="button" class="xmd-dlg-btn filled"></button></div>';
      dlg.querySelector('h2').textContent = title;
      dlg.querySelector('p').textContent = body;
      const [bNo, bYes] = dlg.querySelectorAll('button');
      bNo.textContent = cancel; bYes.textContent = ok;
      const done = (v) => {
        document.removeEventListener('keydown', onKey, true);
        scrim.classList.remove('show');
        setTimeout(() => scrim.remove(), 200);
        if (prev && prev.focus) prev.focus();
        resolve(v);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); }
        else if (e.key === 'Tab') {   // giữ focus trong hộp thoại
          e.preventDefault();
          (document.activeElement === bNo ? bYes : bNo).focus();
        }
      };
      bNo.addEventListener('click', () => done(false));
      bYes.addEventListener('click', () => done(true));
      scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) done(false); });
      scrim.append(dlg);
      document.body.append(scrim);
      document.addEventListener('keydown', onKey, true);
      requestAnimationFrame(() => { scrim.classList.add('show'); bYes.focus(); });
    });
  }

  globalThis.XMD = { DEFAULTS, COLORS, FONTS, SIZES, I18N, t, sanitize, buildFilename, buildFolder, isAbsolutePath, slimMedia, getTokens, isDarkMode, logKey, toastPalette, fmtShortcut, createToaster, initTooltips, createMenu, confirmDialog };
})();
