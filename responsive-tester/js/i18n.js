'use strict';
(function () {
  const EN = {
    appName: 'Responsive Tester', responsive: 'Responsive', responsiveSub: 'Drag the edges to resize freely',
    devices: 'Devices', single: 'Single', compare: 'Compare', search: 'Search devices', all: 'All',
    phones: 'Phones', tablets: 'Tablets', foldables: 'Foldables', watches: 'Watches', desktops: 'Desktops', custom: 'Custom',
    breakpoints: 'Breakpoints', addDevice: 'Add device', editDevice: 'Edit device', newDevice: 'New device',
    urlPlaceholder: 'Enter a URL to preview', back: 'Back', forward: 'Forward', reload: 'Reload', openReal: 'Open in a normal tab',
    settings: 'Settings', rotate: 'Rotate', width: 'Width', height: 'Height', zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'Fit',
    touch: 'Touch emulation', frame: 'Device frame', screenshot: 'Screenshot', record: 'Record', stop: 'Stop recording',
    recordAs: 'Record as', menu: 'Devices panel', close: 'Close', save: 'Save', cancel: 'Cancel', delete: 'Delete', remove: 'Remove from compare',
    name: 'Name', type: 'Type', os: 'System', dpr: 'Pixel ratio', phone: 'Phone', tablet: 'Tablet', desktop: 'Desktop', watch: 'Watch', foldable: 'Foldable',
    ios: 'iOS', android: 'Android', other: 'Other', loading: 'Loading', ready: 'Preview any page',
    emptyTitle: 'What do you want to test?', emptyBody: 'Paste a URL above, or open a page and click the toolbar icon.',
    appearance: 'Appearance', themeMode: 'Theme', system: 'System', light: 'Light', dark: 'Dark', color: 'Color', language: 'Language',
    simulation: 'Simulation', capture: 'Capture', shortcuts: 'Shortcuts', about: 'About',
    touchDefault: 'Touch emulation', touchHint: 'Drag to scroll and fire touch events',
    hideScroll: 'Hide scrollbars', hideScrollHint: 'Mobile browsers use overlay scrollbars',
    spoofUA: 'Send a mobile User-Agent', spoofUAHint: 'For sites that detect devices on the server',
    bypass: 'Allow sites that block embedding', bypassHint: 'Removes X-Frame-Options and CSP frame rules for this tab',
    syncScroll: 'Sync scrolling and navigation', syncScrollHint: 'In compare mode, every device follows',
    openIn: 'Toolbar button opens', newTab: 'New tab', sameTab: 'Same tab', copyShot: 'Copy screenshots to clipboard', copyShotHint: 'In addition to saving the file',
    aboutBody: 'Responsive Tester resizes real pages inside a frame, so CSS media queries and breakpoints behave exactly as on a phone-sized viewport. It is a simulator, not a real device: always confirm important flows on hardware.',
    limits: 'Known limits: device pixel ratio and touch are emulated in JavaScript only, CSS hover and pointer media queries follow your real mouse, and the meta viewport tag is ignored.',
    kbRotate: 'Rotate', kbFit: 'Fit to screen', kbCompare: 'Toggle compare', kbShot: 'Screenshot', kbPanel: 'Devices panel', kbUrl: 'Focus the URL field', kbZoom: 'Zoom',
    shotSaved: 'Screenshot saved', shotCopied: 'Copied to clipboard', copy: 'Copy', shotFail: 'Could not capture the screenshot',
    shotCrop: 'Zoom out so the whole device is visible, then try again', recStarted: 'Recording started', recSaved: 'Recording saved', recFail: 'Recording was cancelled',
    encoding: 'Encoding GIF…', recAutoStop: 'Stopped after 60 seconds', needUrl: 'Enter a URL first', cantEmbed: 'Browser pages cannot be previewed',
    deviceSaved: 'Device saved', deviceDeleted: 'Device deleted', maxCompare: 'Compare up to 6 devices', minCompare: 'Keep at least one device',
    uaNote: 'Server-side detection follows the first device', zoom: 'Zoom', selected: 'selected', noResults: 'No devices match', favorites: 'Compare set',
    resetView: 'Reset view', closeSim: 'Close simulator', rulesFail: 'Could not set request rules', blockedHint: 'This page did not respond inside the frame. The site may forbid embedding itself (CSP frame-src).', iframeHint: 'Some sites refuse to be embedded. Turn on “Allow sites that block embedding” in settings.'
  };
  const VI = {
    appName: 'Responsive Tester', responsive: 'Responsive', responsiveSub: 'Kéo cạnh để đổi kích thước tự do',
    devices: 'Thiết bị', single: 'Đơn', compare: 'So sánh', search: 'Tìm thiết bị', all: 'Tất cả',
    phones: 'Điện thoại', tablets: 'Máy tính bảng', foldables: 'Màn hình gập', watches: 'Đồng hồ', desktops: 'Máy tính', custom: 'Tùy chỉnh',
    breakpoints: 'Breakpoint', addDevice: 'Thêm thiết bị', editDevice: 'Sửa thiết bị', newDevice: 'Thiết bị mới',
    urlPlaceholder: 'Nhập URL để xem trước', back: 'Quay lại', forward: 'Tiến tới', reload: 'Tải lại', openReal: 'Mở trong tab thường',
    settings: 'Cài đặt', rotate: 'Xoay', width: 'Rộng', height: 'Cao', zoomIn: 'Phóng to', zoomOut: 'Thu nhỏ', fit: 'Vừa khung',
    touch: 'Giả lập cảm ứng', frame: 'Khung thiết bị', screenshot: 'Chụp ảnh', record: 'Quay video', stop: 'Dừng quay',
    recordAs: 'Quay dưới dạng', menu: 'Bảng thiết bị', close: 'Đóng', save: 'Lưu', cancel: 'Hủy', delete: 'Xóa', remove: 'Bỏ khỏi so sánh',
    name: 'Tên', type: 'Loại', os: 'Hệ điều hành', dpr: 'Tỷ lệ điểm ảnh', phone: 'Điện thoại', tablet: 'Máy tính bảng', desktop: 'Máy tính', watch: 'Đồng hồ', foldable: 'Màn hình gập',
    ios: 'iOS', android: 'Android', other: 'Khác', loading: 'Đang tải', ready: 'Xem trước mọi trang',
    emptyTitle: 'Bạn muốn kiểm thử trang nào?', emptyBody: 'Dán URL vào ô phía trên, hoặc mở một trang rồi bấm biểu tượng tiện ích.',
    appearance: 'Giao diện', themeMode: 'Chủ đề', system: 'Theo hệ thống', light: 'Sáng', dark: 'Tối', color: 'Màu sắc', language: 'Ngôn ngữ',
    simulation: 'Mô phỏng', capture: 'Ghi hình', shortcuts: 'Phím tắt', about: 'Giới thiệu',
    touchDefault: 'Giả lập cảm ứng', touchHint: 'Kéo chuột để cuộn và gửi sự kiện touch',
    hideScroll: 'Ẩn thanh cuộn', hideScrollHint: 'Trình duyệt di động dùng thanh cuộn nổi',
    spoofUA: 'Gửi User-Agent di động', spoofUAHint: 'Cho các trang nhận diện thiết bị phía máy chủ',
    bypass: 'Cho phép trang chặn nhúng', bypassHint: 'Gỡ X-Frame-Options và quy tắc frame của CSP trong tab này',
    syncScroll: 'Đồng bộ cuộn và điều hướng', syncScrollHint: 'Ở chế độ so sánh, mọi thiết bị cùng di chuyển',
    openIn: 'Nút trên thanh công cụ mở', newTab: 'Tab mới', sameTab: 'Tab hiện tại', copyShot: 'Sao chép ảnh chụp vào clipboard', copyShotHint: 'Ngoài việc lưu thành tệp',
    aboutBody: 'Responsive Tester hiển thị trang thật trong một khung có kích thước thiết bị, nên media query và breakpoint hoạt động đúng như trên màn hình điện thoại. Đây là trình mô phỏng, không phải thiết bị thật: hãy kiểm tra lại các luồng quan trọng trên máy thật.',
    limits: 'Giới hạn: tỷ lệ điểm ảnh và cảm ứng chỉ được giả lập bằng JavaScript, media query hover/pointer của CSS vẫn theo chuột thật, và thẻ meta viewport bị bỏ qua.',
    kbRotate: 'Xoay', kbFit: 'Vừa khung', kbCompare: 'Bật/tắt so sánh', kbShot: 'Chụp ảnh', kbPanel: 'Bảng thiết bị', kbUrl: 'Chọn ô URL', kbZoom: 'Thu phóng',
    shotSaved: 'Đã lưu ảnh chụp', shotCopied: 'Đã sao chép vào clipboard', copy: 'Sao chép', shotFail: 'Không thể chụp ảnh',
    shotCrop: 'Hãy thu nhỏ để thấy toàn bộ thiết bị rồi thử lại', recStarted: 'Bắt đầu quay', recSaved: 'Đã lưu video', recFail: 'Đã hủy quay video',
    encoding: 'Đang mã hóa GIF…', recAutoStop: 'Tự dừng sau 60 giây', needUrl: 'Hãy nhập URL trước', cantEmbed: 'Không thể xem trước trang của trình duyệt',
    deviceSaved: 'Đã lưu thiết bị', deviceDeleted: 'Đã xóa thiết bị', maxCompare: 'So sánh tối đa 6 thiết bị', minCompare: 'Cần giữ ít nhất một thiết bị',
    uaNote: 'Nhận diện phía máy chủ theo thiết bị đầu tiên', zoom: 'Thu phóng', selected: 'đã chọn', noResults: 'Không có thiết bị phù hợp', favorites: 'Bộ so sánh',
    resetView: 'Đặt lại', closeSim: 'Đóng trình mô phỏng', rulesFail: 'Không thể đặt quy tắc yêu cầu', blockedHint: 'Trang không phản hồi trong khung. Có thể trang này cấm tự nhúng (CSP frame-src).', iframeHint: 'Một số trang từ chối bị nhúng. Hãy bật “Cho phép trang chặn nhúng” trong cài đặt.'
  };
  let cur = EN;
  window.RT_I18N = {
    set(lang) { cur = lang === 'vi' ? VI : EN; document.documentElement.lang = lang === 'vi' ? 'vi' : 'en'; },
    detect() { return (chrome.i18n.getUILanguage() || 'en').toLowerCase().startsWith('vi') ? 'vi' : 'en'; }
  };
  window.t = (k) => cur[k] || EN[k] || k;
})();
