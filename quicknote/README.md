<div align="center">

<img src="icons/icon128.png" width="88" height="88" alt="QuickNote logo" />

# QuickNote

**Ghi chú nhanh, riêng tư, theo phong cách Material Design 3**
**A fast, private note-taking extension styled with Material Design 3**

[Tính năng](#-tính-năng--features) ·
[Cài đặt](#-cài-đặt--installation) ·
[Sử dụng](#-sử-dụng--usage) ·
[Cấu trúc dự án](#-cấu-trúc-dự-án--project-structure) ·
[Quyền riêng tư](#-quyền-riêng-tư--privacy) ·
[Giấy phép](#-giấy-phép--license)

</div>

---

> 🇻🇳 Tài liệu này gồm hai phần: **Tiếng Việt** trước, **English** sau mỗi mục.
> 🇬🇧 This document is bilingual: **Vietnamese** first, **English** right after each section.

## ✨ Tính năng · Features

| | Tiếng Việt | English |
|---|---|---|
| ⚡ | Mở tức thì từ thanh công cụ trình duyệt, tự động lưu khi gõ | Instant access from the toolbar, autosaves as you type |
| 🎨 | Giao diện chuẩn **Material Design 3** — màu sắc hài hoà, bo góc mềm, hiệu ứng ripple | True **Material Design 3** interface — harmonious colour roles, soft shapes, ripple feedback |
| 🌐 | Song ngữ **Tiếng Việt / English**, chuyển đổi tức thì, font **Be Vietnam Pro** | Bilingual **Vietnamese / English**, instant switching, **Be Vietnam Pro** font |
| 📌 | Ghim ghi chú quan trọng lên đầu danh sách | Pin important notes to the top of the list |
| 🏷️ | Gắn nhãn màu (7 màu) để phân loại trực quan | 7 colour labels for at-a-glance organisation |
| 🗑️ | Thùng rác an toàn — khôi phục trong vòng 30 ngày, có nút **Hoàn tác** ngay sau khi xoá | Safety-net Trash — restore within 30 days, with an **Undo** action right after deleting |
| 🔀 | Sắp xếp theo ngày sửa, ngày tạo hoặc tiêu đề A–Z | Sort by last edited, date created, or title A–Z |
| 📄 | Nhân bản ghi chú chỉ với một cú nhấp | Duplicate a note in a single click |
| 📤 | Xuất/nhập ghi chú: `.json`, `.csv`, `.md`, `.txt` | Import/export notes: `.json`, `.csv`, `.md`, `.txt` |
| ⚙️ | **Trang Cài đặt riêng** — ngôn ngữ, giao diện, cỡ chữ, độ trễ tự lưu, màu mặc định | **Dedicated Settings page** — language, theme, font size, autosave delay, default colour |
| 💾 | **Xuất / nhập tệp cài đặt** để đồng bộ nhanh giữa các máy | **Export/import a settings file** to sync preferences across machines |
| 🌗 | 3 chế độ giao diện: Sáng / Tối / Theo hệ thống | 3 theme modes: Light / Dark / Follow system |
| ⌨️ | Phím tắt cho các thao tác thường dùng | Keyboard shortcuts for common actions |
| 🔒 | Không máy chủ, không theo dõi, không quảng cáo — mọi dữ liệu chỉ lưu cục bộ | No server, no tracking, no ads — everything stays on your device |

---

## 📦 Cài đặt · Installation

QuickNote hiện được phân phối dưới dạng mã nguồn (chưa phát hành trên Chrome Web Store), vì vậy hãy cài đặt theo kiểu **tiện ích chưa đóng gói (Load unpacked)**:
QuickNote currently ships as source code (not yet published on the Chrome Web Store), so install it as an **unpacked extension**:

1. **Tải & giải nén** dự án này ra một thư mục bất kỳ.
   **Download & unzip** this project to any folder.
2. Mở `chrome://extensions` (Chrome/Brave) hoặc `edge://extensions` (Edge).
   Open `chrome://extensions` (Chrome/Brave) or `edge://extensions` (Edge).
3. Bật **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
   Turn on **Developer mode** in the top-right corner.
4. Nhấn **Load unpacked** và chọn thư mục `quicknote-extension` vừa giải nén.
   Click **Load unpacked** and select the unzipped `quicknote-extension` folder.
5. Ghim QuickNote lên thanh công cụ để truy cập nhanh.
   Pin QuickNote to your toolbar for quick access.

A step-by-step visual guide is also built into the extension itself — click the ℹ️ **About** icon in the popup toolbar to open the landing page, which includes the same instructions.

---

## 🚀 Sử dụng · Usage

### Ghi chú (Popup) · Notes (Popup)

- **Ghi chú mới / New note** — nút nổi ở cuối thanh bên · the extended button at the bottom of the sidebar.
- **Tìm kiếm / Search** — lọc theo tiêu đề và nội dung · filters by title and content.
- **Tất cả / Đã ghim / Thùng rác** — ba thẻ lọc (chip) phía trên danh sách · three filter chips above the list.
- **Ghim, gắn nhãn màu, nhân bản, sao chép nội dung** — các biểu tượng trên thanh công cụ của trình soạn thảo · **Pin, colour label, duplicate, copy content** — icons on the editor toolbar.
- **Xoá** chuyển ghi chú vào **Thùng rác** (giữ 30 ngày, có thể khôi phục); một thông báo **Hoàn tác** hiện ra ngay lập tức. **Delete** moves a note to **Trash** (kept 30 days, restorable); an **Undo** snackbar appears immediately.

### ⌨️ Phím tắt · Keyboard shortcuts

| Thao tác · Action | Phím · Shortcut |
|---|---|
| Ghi chú mới · New note | `Ctrl/⌘ + Shift + N` |
| Sao chép nội dung · Copy content | `Ctrl/⌘ + Shift + C` |
| Tìm kiếm · Focus search | `Ctrl/⌘ + Shift + F` |
| Ghim / bỏ ghim · Pin / unpin | `Ctrl/⌘ + Shift + P` |
| Đóng bảng đang mở · Close open panel | `Esc` |

### ⚙️ Trang Cài đặt · Settings page

Nhấn biểu tượng **bánh răng** trong popup để mở trang Cài đặt đầy đủ (một tab riêng), gồm:
Click the **gear** icon in the popup to open the full Settings page (a separate tab), covering:

- **Chung / General** — ngôn ngữ hiển thị, hiện/ẩn thanh bên mặc định · display language, default sidebar visibility.
- **Giao diện / Appearance** — Sáng / Tối / Theo hệ thống, màu nhãn mặc định cho ghi chú mới · Light / Dark / System, default colour label for new notes.
- **Soạn thảo / Editor** — cỡ chữ nội dung, độ trễ tự động lưu, xem trước trực tiếp · content font size, autosave delay, live preview.
- **Dữ liệu / Data** — xuất/nhập ghi chú, **xuất/nhập tệp cài đặt**, khôi phục cài đặt mặc định, dọn thùng rác, xoá toàn bộ ghi chú · export/import notes, **export/import a settings file**, reset to defaults, empty trash, delete all notes.
- **Giới thiệu / About** — phiên bản, tác giả, giấy phép, liên kết tới trang giới thiệu, danh sách phím tắt · version, author, license, link to the landing page, shortcut list.

### 🌐 Trang giới thiệu · Landing page

Nhấn biểu tượng ⓘ trong popup (hoặc nút **Xem trang giới thiệu** trong Cài đặt) để mở một trang giới thiệu đầy đủ về QuickNote: tính năng, hướng dẫn cài đặt, và cam kết quyền riêng tư.
Click the ⓘ icon in the popup (or the **View landing page** button in Settings) to open a full introduction to QuickNote: features, install guide, and privacy commitment.

---

## 🗂 Cấu trúc dự án · Project structure

```
quicknote-extension/
├── manifest.json          # Cấu hình Manifest V3 · MV3 configuration
├── popup.html/.css/.js    # Giao diện chính (ghi chú) · Main UI (notes)
├── options.html/.css/.js  # Trang Cài đặt riêng · Dedicated Settings page
├── landing.html/.css/.js  # Trang giới thiệu · Landing / about page
├── shared/
│   ├── theme.css           # Design tokens Material Design 3 dùng chung
│   ├── i18n.js              # Từ điển song ngữ VI/EN + hàm dịch
│   ├── settings.js          # Giá trị mặc định & truy cập chrome.storage
│   └── ripple.js            # Hiệu ứng ripple Material dùng chung
├── icons/                  # Biểu tượng ứng dụng (16/32/48/128/512px)
└── LICENSE
```

Toàn bộ mã nguồn được viết mới hoàn toàn theo hướng **module hoá và có chú thích đầy đủ**: mỗi tệp có một khối mô tả ở đầu file, mỗi hàm có một dòng giải thích mục đích. Các hằng số và chuỗi văn bản được tập trung tại `shared/settings.js` và `shared/i18n.js` để tránh trùng lặp giữa popup, trang cài đặt và trang giới thiệu.

The codebase was rewritten from the ground up to be **modular and thoroughly commented**: every file opens with a short description block, and every function has a one-line explanation of its purpose. Constants and strings are centralised in `shared/settings.js` and `shared/i18n.js` so popup, options and landing never drift out of sync.

---

## 🔐 Quyền riêng tư · Privacy

QuickNote không có máy chủ backend, không thu thập dữ liệu người dùng và không hiển thị quảng cáo. Toàn bộ ghi chú và cài đặt được lưu bằng `chrome.storage.local` — chỉ tồn tại trên máy của bạn.

QuickNote has no backend server, collects no user data, and shows no ads. All notes and settings are stored via `chrome.storage.local` — they exist only on your machine.

**Quyền được yêu cầu · Permissions requested:** `storage` — chỉ để lưu ghi chú và tuỳ chỉnh cục bộ · only to save notes and preferences locally.

---

## 🛠 Công nghệ · Built with

- HTML / CSS / vanilla JavaScript (không phụ thuộc thư viện ngoài · no external runtime dependencies)
- [Material Design 3](https://m3.material.io/) — ngôn ngữ thiết kế · design language
- [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro) — phông chữ · typeface
- Manifest V3 (Chrome / Edge / Brave / các trình duyệt gốc Chromium khác)

---

## 👤 Tác giả · Author

**gnort67**, với sự hỗ trợ của **Claude** — trợ lý AI của Anthropic — trong việc thiết kế giao diện, viết mã, sinh biểu tượng và biên soạn tài liệu.

**gnort67**, with the help of **Claude** — Anthropic's AI assistant — for interface design, code, icon generation and documentation.

---

## 📄 Giấy phép · License

Phát hành theo giấy phép **MIT** — xem [`LICENSE`](./LICENSE).
Released under the **MIT License** — see [`LICENSE`](./LICENSE).
