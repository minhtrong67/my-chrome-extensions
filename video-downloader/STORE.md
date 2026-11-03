# Chrome Web Store listing

## Name
Video Downloader

## Short description (≤132 chars)
EN: Hover any video and click the floating icon to download it. Material 3 design, English and Vietnamese.
VI: Rê chuột vào video, bấm icon nổi để tải về. Giao diện Material 3, hỗ trợ tiếng Anh và tiếng Việt.

## Detailed description (EN)
Video Downloader puts a small download button on top of any video. Hover the video and click the button: the video you are watching is saved to your Downloads folder.

• Works on many sites: Facebook, Instagram, Threads, TikTok, X, Vimeo and any site that serves direct MP4/WebM or HLS (.m3u8) video
• Merges separate video and sound tracks into one file
• Popup lists every video found on the tab, with thumbnail, progress, cancel and "show in folder"
• Right-click "Download this video" and the Alt+Shift+D shortcut
• Settings: light/dark/system, 12 Material theme colors, text size, 7 fonts, English/Vietnamese, save sub-folder, folder per website, file-name template, HD/SD preference
• No account, no tracking, no remote server

Not supported: DRM-protected video (Netflix, Disney+ …) and YouTube. Please download only content you have the right to save.

## Mô tả chi tiết (VI)
Video Downloader đặt một nút tải nhỏ trên mọi video. Rê chuột vào video rồi bấm nút: video bạn đang xem được lưu vào thư mục Tải xuống.

• Chạy trên nhiều trang: Facebook, Instagram, Threads, TikTok, X, Vimeo và mọi trang có video MP4/WebM trực tiếp hoặc HLS (.m3u8)
• Ghép video và âm thanh tách riêng thành một file
• Popup liệt kê mọi video tìm thấy trong tab, kèm ảnh thu nhỏ, tiến trình, nút hủy và mở thư mục chứa file
• Menu chuột phải "Tải video này" và phím tắt Alt+Shift+D
• Cài đặt: sáng/tối/hệ thống, 12 màu chủ đề Material, cỡ chữ, 7 font, tiếng Anh/tiếng Việt, thư mục con, thư mục theo từng website, mẫu tên file, ưu tiên HD/SD
• Không cần tài khoản, không theo dõi, không có máy chủ

Không hỗ trợ: video có DRM (Netflix, Disney+ …) và YouTube. Chỉ tải nội dung bạn có quyền lưu.

## Single purpose
Download the video the user is watching on the current web page.

## Permission justifications
- Host access `<all_urls>`: the download button must appear on videos of any website, and the extension needs to detect video/stream requests and fetch the selected stream.
- webRequest: read-only observation of response headers to recognise video/HLS responses.
- downloads: save the selected video file.
- storage: save settings; keep the per-tab list of found videos for the current session.
- offscreen: assemble HLS segments, merge separate video/sound tracks with the bundled ffmpeg.wasm and create thumbnails (needs DOM/Blob/Worker APIs unavailable in the service worker).
- declarativeNetRequest: add the page's Referer header to the extension's own download requests, which many CDNs require.
- contextMenus: the "Download this video" menu item.
- `wasm-unsafe-eval` (CSP): required to run the bundled ffmpeg.wasm; no remote code is loaded.

## Remote code
None. All scripts and ffmpeg.wasm are packaged in the extension.

## Assets still to prepare
Screenshots (1280×800), 440×280 small promo tile, 128×128 icon (included: icons/icon128.png), hosted privacy-policy URL (PRIVACY.md).
