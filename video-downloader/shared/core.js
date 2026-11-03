/* Shared: defaults, i18n, fonts, helpers */
const DEFAULTS = {
  theme: 'system',            // light | dark | system
  seed: '#6750A4',            // Material theme color
  fontSize: 'medium',         // small | medium | large
  font: 'system',
  folder: '',                 // sub-folder inside the browser Downloads folder
  askWhere: false,
  lang: (navigator.language || 'en').toLowerCase().startsWith('vi') ? 'vi' : 'en',
  showButton: true,
  btnPos: 'right',            // left | right
  btnShow: 'hover',           // hover | always
  nameTpl: '',                // empty = automatic; tokens {title} {site} {id} {date} {quality}
  siteFolder: false,          // save into a sub-folder per website
  quality: 'hd'               // hd | sd (sites that offer both)
};
function getSettings() { return chrome.storage.local.get(DEFAULTS); }

const SYS = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
const FONTS = {
  system: { css: SYS },
  'google-sans-flex': { name: 'Google Sans Flex', gf: 'Google+Sans+Flex' },
  'roboto-flex': { name: 'Roboto Flex', gf: 'Roboto+Flex' },
  roboto: { name: 'Roboto', gf: 'Roboto' },
  arial: { name: 'Arial', css: 'Arial,Helvetica,sans-serif' },
  inter: { name: 'Inter', gf: 'Inter' },
  'be-vietnam-pro': { name: 'Be Vietnam Pro', gf: 'Be+Vietnam+Pro' }
};
function fontCss(id) {
  const f = FONTS[id] || FONTS.system;
  return f.css || `"${f.name}",${SYS}`;
}

const I18N = {
  en: {
    appName: 'Video Downloader', videosOnPage: 'Videos on this page', found: '{n} found',
    emptyTitle: 'No videos yet', emptyDesc: 'Play a video on this page and it will show up here.',
    download: 'Download', started: 'Download started', saved: 'Saved to your computer',
    preparing: 'Preparing… {n}%', failed: 'Download failed', noSource: 'No downloadable source found. Try playing the video first.',
    drm: 'This video is protected (DRM) and can’t be downloaded.', pickVideo: 'Choose a video',
    stream: 'Stream', settings: 'Settings', back: 'Back',
    appearance: 'Appearance', mode: 'Theme mode', light: 'Light', dark: 'Dark', system: 'System',
    themeColor: 'Theme color', text: 'Text', fontSize: 'Text size', small: 'Small', medium: 'Medium', large: 'Large',
    font: 'Font', fontSystem: 'System', downloads: 'Downloads', saveFolder: 'Save folder',
    saveFolderHint: 'A subfolder inside Downloads, e.g. Videos/Web. Leave empty to save directly in Downloads.', saveTo: 'Saves to', downloading: 'Downloading…', downloadingPct: 'Downloading… {n}%', savedNoAudio: 'Saved without sound', ctxDownload: 'Download this video', nameTpl: 'File name', nameTplHint: 'Leave empty for automatic. Tokens: {title} {site} {id} {date} {quality}', siteFolder: 'Save into a folder per website', quality: 'Preferred quality', cancel: 'Cancel', reset: 'Reset all settings', showMore: 'Show {n} more', showLess: 'Show less', showInFolder: 'Show in folder', btnShow: 'Button visibility', hoverOnly: 'On hover', always: 'Always', openChromeDl: 'Change Chrome’s default download location',
    askWhere: 'Ask where to save each time', showButton: 'Show button on videos', btnPos: 'Button position',
    left: 'Top left', right: 'Top right', language: 'Language', author: 'Author', poweredBy: 'Built with the help of Claude AI',
    colors: { '#6750A4': 'Purple', '#3F51B5': 'Indigo', '#0B57D0': 'Blue', '#00838F': 'Cyan', '#00796B': 'Teal', '#2E7D32': 'Green', '#9E9D24': 'Lime', '#F9A825': 'Yellow', '#E65100': 'Orange', '#B3261E': 'Red', '#C2185B': 'Pink', '#546E7A': 'Blue grey' }
  },
  vi: {
    appName: 'Video Downloader', videosOnPage: 'Video trên trang này', found: 'Tìm thấy {n}',
    emptyTitle: 'Chưa có video', emptyDesc: 'Hãy phát một video trên trang, video sẽ xuất hiện ở đây.',
    download: 'Tải xuống', started: 'Đã bắt đầu tải xuống', saved: 'Đã lưu vào máy',
    preparing: 'Đang chuẩn bị… {n}%', failed: 'Tải xuống thất bại', noSource: 'Không tìm thấy nguồn video có thể tải. Hãy thử phát video trước.',
    drm: 'Video được bảo vệ bản quyền (DRM) nên không thể tải.', pickVideo: 'Chọn video',
    stream: 'Luồng', settings: 'Cài đặt', back: 'Quay lại',
    appearance: 'Giao diện', mode: 'Chế độ giao diện', light: 'Sáng', dark: 'Tối', system: 'Hệ thống',
    themeColor: 'Màu chủ đề', text: 'Chữ', fontSize: 'Cỡ chữ', small: 'Nhỏ', medium: 'Vừa', large: 'Lớn',
    font: 'Font chữ', fontSystem: 'Hệ thống', downloads: 'Tải xuống', saveFolder: 'Thư mục lưu',
    saveFolderHint: 'Thư mục con trong Downloads, ví dụ: Videos/Web. Để trống để lưu thẳng vào Downloads.', saveTo: 'Sẽ lưu vào', downloading: 'Đang tải…', downloadingPct: 'Đang tải… {n}%', savedNoAudio: 'Đã lưu (không có tiếng)', ctxDownload: 'Tải video này', nameTpl: 'Tên file', nameTplHint: 'Để trống để tự động. Mẫu: {title} {site} {id} {date} {quality}', siteFolder: 'Lưu vào thư mục theo từng website', quality: 'Chất lượng ưu tiên', cancel: 'Hủy', reset: 'Khôi phục cài đặt mặc định', showMore: 'Xem thêm {n} video', showLess: 'Thu gọn', showInFolder: 'Mở thư mục chứa file', btnShow: 'Hiển thị nút', hoverOnly: 'Khi rê chuột', always: 'Luôn hiện', openChromeDl: 'Đổi thư mục tải mặc định của Chrome',
    askWhere: 'Hỏi nơi lưu mỗi lần tải', showButton: 'Hiện nút tải trên video', btnPos: 'Vị trí nút',
    left: 'Trên trái', right: 'Trên phải', language: 'Ngôn ngữ', author: 'Tác giả', poweredBy: 'Với sự hỗ trợ của AI Claude',
    colors: { '#6750A4': 'Tím', '#3F51B5': 'Chàm', '#0B57D0': 'Xanh dương', '#00838F': 'Xanh lơ', '#00796B': 'Xanh ngọc', '#2E7D32': 'Xanh lá', '#9E9D24': 'Xanh chanh', '#F9A825': 'Vàng', '#E65100': 'Cam', '#B3261E': 'Đỏ', '#C2185B': 'Hồng', '#546E7A': 'Xám xanh' }
  }
};
function tr(lang, key, vars = {}) {
  const v = (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? key;
  return typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : v;
}

const SIZE_PX = { small: 13, medium: 15, large: 17 };    // popup root size
const OVERLAY_PX = { small: 12, medium: 13.5, large: 15 };

function fmtSize(b) {
  if (!b) return '';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0;
  while (b >= 1024 && i < 3) { b /= 1024; i++; }
  return `${b.toFixed(b >= 100 || i === 0 ? 0 : 1)} ${u[i]}`;
}
function extOf(item) {
  const m = (item.url || '').split(/[?#]/)[0].match(/\.(mp4|webm|mkv|mov|m4v|flv|avi|ogv)$/i);
  if (m) return m[1].toLowerCase();
  const map = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/x-matroska': 'mkv', 'video/quicktime': 'mov', 'video/ogg': 'ogv', 'video/x-flv': 'flv' };
  return map[item.mime] || 'mp4';
}
function nameFromUrl(u) {
  try {
    const url = new URL(u);
    const last = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
    return last || url.hostname;
  } catch { return u; }
}
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
