# Video Downloader

Hover over any video, click the floating download icon, done. Material 3 Expressive design, English / Tiếng Việt.

*Rê chuột vào video, bấm icon tải nổi là tải ngay. Thiết kế Material 3 Expressive, hỗ trợ tiếng Anh / tiếng Việt.*

## Features / Tính năng
- Floating icon-only button on any `<video>` (also inside shadow DOM and iframes); shown on hover or always.
- One click downloads the video you are watching. Toolbar popup lists every video found on the tab, with thumbnail, progress, cancel and "show in folder".
- Direct files (MP4/WebM/…) and HLS (`.m3u8`, AES-128). Separate video + sound tracks are merged with a bundled ffmpeg.wasm.
- Reads playable links from page data on Facebook, Instagram, Threads, TikTok, X and Vimeo (HD/SD preference). Reddit, Twitch clips, Dailymotion and most other sites work through the generic detection.
- Context menu "Download this video" and shortcut `Alt+Shift+D`.
- Settings: theme (light/dark/system), 12 Material colors, text size, 7 fonts, language, save sub-folder, per-site folders, file-name template, quality, button position/visibility.

## Install / Cài đặt
`chrome://extensions` → *Developer mode* → *Load unpacked* → select this folder.

## Permissions
| Permission | Why |
|---|---|
| `<all_urls>` host access | show the button on any site, detect video requests, fetch streams |
| `webRequest` | see video/stream responses (read-only) |
| `downloads` | save files |
| `storage` | settings and the per-tab list of found videos |
| `offscreen` | assemble HLS, merge tracks with ffmpeg.wasm, make thumbnails |
| `declarativeNetRequest` | add the page's Referer to the extension's own download requests |
| `contextMenus` | right-click "Download this video" |

## Limits
- DRM-protected video (Netflix, Disney+…) and YouTube are not supported (the button is not shown on YouTube).
- Not covered yet: Bilibili, Douyin and other sites that serve `.m4s` DASH tracks.
- Chrome only lets extensions save inside the Downloads folder (sub-folders allowed).
- DASH (`.mpd`) streams are not supported. Site page-data formats change; if a site stops working, update `pagehook.js`.
- Large streams are assembled in the browser; very long videos need a lot of memory.

Author: **minhtrong67** · built with the help of Claude AI.
