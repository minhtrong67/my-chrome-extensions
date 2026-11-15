/* Shared by content script, service worker and options page. */
(function (g) {
  'use strict';

  const DEFAULTS = {
    language: 'auto',          // auto | en | vi
    theme: 'system',           // system | light | dark
    includeEmbeds: true,       // also grab images from embeds (pasted image links)
    showToast: true,           // show Fluent toast with progress
    subfolder: 'Discord',      // inside Downloads; empty = save straight into Downloads
    filenameTemplate: '{user}/{date}_{index}_{name}'
  };

  const STRINGS = {
    en: {
      menuAll: 'Download all images',
      menuAll_one: 'Download image',
      toastProgressTitle: 'Downloading {n} images',
      toastProgressTitle_one: 'Downloading image',
      toastProgressSub: '{done} of {total}',
      toastDoneTitle: 'Downloaded {n} images',
      toastDoneTitle_one: 'Downloaded image',
      toastDoneSub: 'Saved to Downloads/{folder}',
      toastDoneSubRoot: 'Saved to Downloads',
      toastPartialTitle: 'Downloaded {done} of {total} images',
      toastPartialSub: '{failed} failed. Try again.',
      toastErrorTitle: 'Couldn’t download images',
      toastErrorSub: 'Reload the Discord tab and try again.',
      toastShow: 'Show in folder',
      toastClose: 'Close',
      toastNoImages: 'No images found in this message',
      toastReload: 'The extension was updated. Reload this Discord tab.',

      optSubtitle: 'Settings',
      tip: 'Right-click a message with images in Discord, then choose “Download all images”.',
      grpAppearance: 'Appearance',
      language: 'Language',
      languageDesc: 'Language of the menu item and notifications',
      auto: 'Auto',
      theme: 'Theme',
      themeDesc: 'Applies to this page and the download notification',
      system: 'System',
      light: 'Light',
      dark: 'Dark',
      grpDownloads: 'Downloads',
      includeEmbeds: 'Include link preview images',
      includeEmbedsDesc: 'Also download images from embeds, such as pasted image links',
      showToast: 'Show download notification',
      showToastDesc: 'Display progress at the bottom right of Discord',
      subfolder: 'Subfolder',
      subfolderDesc: 'Subfolder in Downloads. Leave empty to save directly to Downloads.',
      template: 'File name',
      templateDesc: 'Pattern used inside the subfolder. Use / to create more folders.',
      insert: 'Insert',
      preview: 'Preview',
      grpAbout: 'About',
      author: 'Author',
      aiCredit: 'Built with the help of Claude AI',
      version: 'Version',
      restore: 'Restore defaults',
      saved: 'Saved',
      on: 'On',
      off: 'Off'
    },
    vi: {
      menuAll: 'Tải tất cả ảnh',
      menuAll_one: 'Tải ảnh',
      toastProgressTitle: 'Đang tải {n} ảnh',
      toastProgressTitle_one: 'Đang tải ảnh',
      toastProgressSub: '{done} / {total}',
      toastDoneTitle: 'Đã tải {n} ảnh',
      toastDoneTitle_one: 'Đã tải ảnh',
      toastDoneSub: 'Đã lưu vào Downloads/{folder}',
      toastDoneSubRoot: 'Đã lưu vào Downloads',
      toastPartialTitle: 'Đã tải {done}/{total} ảnh',
      toastPartialSub: 'Có {failed} ảnh bị lỗi. Hãy thử lại.',
      toastErrorTitle: 'Không tải được ảnh',
      toastErrorSub: 'Hãy tải lại tab Discord rồi thử lại.',
      toastShow: 'Hiện trong thư mục',
      toastClose: 'Đóng',
      toastNoImages: 'Không tìm thấy ảnh trong tin nhắn này',
      toastReload: 'Extension vừa được cập nhật. Hãy tải lại tab Discord.',

      optSubtitle: 'Cài đặt',
      tip: 'Nhấp chuột phải vào tin nhắn có ảnh trong Discord, rồi chọn “Tải tất cả ảnh”.',
      grpAppearance: 'Giao diện',
      language: 'Ngôn ngữ',
      languageDesc: 'Ngôn ngữ của mục menu và thông báo',
      auto: 'Tự động',
      theme: 'Chủ đề',
      themeDesc: 'Áp dụng cho trang này và thông báo tải xuống',
      system: 'Theo hệ thống',
      light: 'Sáng',
      dark: 'Tối',
      grpDownloads: 'Tải xuống',
      includeEmbeds: 'Gồm cả ảnh xem trước liên kết',
      includeEmbedsDesc: 'Tải cả ảnh trong embed, ví dụ link ảnh được dán vào tin nhắn',
      showToast: 'Hiện thông báo tải xuống',
      showToastDesc: 'Hiển thị tiến trình ở góc dưới bên phải Discord',
      subfolder: 'Thư mục con',
      subfolderDesc: 'Thư mục con trong Downloads. Để trống để lưu thẳng vào Downloads.',
      template: 'Tên tệp',
      templateDesc: 'Mẫu đặt tên bên trong thư mục con. Dùng / để tạo thêm thư mục.',
      insert: 'Chèn',
      preview: 'Xem trước',
      grpAbout: 'Giới thiệu',
      author: 'Tác giả',
      aiCredit: 'Được hỗ trợ bởi Claude AI',
      version: 'Phiên bản',
      restore: 'Khôi phục mặc định',
      saved: 'Đã lưu',
      on: 'Bật',
      off: 'Tắt'
    }
  };

  function resolveLang(setting, hint) {
    if (setting === 'vi' || setting === 'en') return setting;
    return String(hint || '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
  }

  function t(lang, key, vars) {
    const dict = STRINGS[lang] || STRINGS.en;
    let k = key;
    if (vars && vars.n === 1 && dict[key + '_one']) k = key + '_one';
    const s = dict[k] ?? STRINGS.en[k] ?? key;
    return s.replace(/\{(\w+)\}/g, (m, v) => (vars && v in vars ? vars[v] : m));
  }

  function sanitizeSegment(s) {
    return String(s ?? '')
      .replace(/[<>:"\/\\|?*\u0000-\u001f]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[. ]+$/, '')
      .slice(0, 80);
  }

  /** vars: user, date, time, index, name, messageId → relative path for chrome.downloads */
  function buildFilename(template, vars, subfolder) {
    const clean = {};
    for (const k in vars) clean[k] = sanitizeSegment(vars[k]);
    const base = String(subfolder ?? '').trim();
    const full = (base ? base + '/' : '') + String(template || DEFAULTS.filenameTemplate);
    const filled = full.replace(/\{(\w+)\}/g, (m, k) => clean[k] ?? '');
    let parts = filled
      .split(/[\/\\]+/)
      .map(sanitizeSegment)
      .filter((p) => p && p !== '.' && p !== '..');
    if (!parts.length) parts = [clean.name || 'image'];
    let last = parts[parts.length - 1];
    if (!/\.[A-Za-z0-9]{2,5}$/.test(last)) {
      const m = /(\.[A-Za-z0-9]{2,5})$/.exec(clean.name || '');
      last += m ? m[1] : '.png';
    }
    parts[parts.length - 1] = last;
    return parts.join('/');
  }

  function dirname(path) {
    const i = path.lastIndexOf('/');
    return i < 0 ? '' : path.slice(0, i);
  }

  /** v1.0 stored 'Discord/' inside the template; it is now a separate setting. */
  function migrate(s) {
    if (s.filenameTemplate === 'Discord/{user}/{date}_{index}_{name}') {
      s.filenameTemplate = DEFAULTS.filenameTemplate;
    }
    return s;
  }

  g.DLA = { DEFAULTS, STRINGS, resolveLang, t, sanitizeSegment, buildFilename, dirname, migrate };
})(globalThis);
