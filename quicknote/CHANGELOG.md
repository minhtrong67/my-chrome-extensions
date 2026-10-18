# Changelog

Tất cả thay đổi đáng chú ý của QuickNote được ghi lại tại đây.
All notable changes to QuickNote are documented here.

## [2.0.0] — Material Design 3 rewrite

### ✨ Thêm mới · Added
- Giao diện thiết kế lại hoàn toàn theo **Material Design 3** (m3.material.io), dùng font **Be Vietnam Pro** trên toàn bộ sản phẩm.
  Full **Material Design 3** redesign, using **Be Vietnam Pro** across every surface.
- **Trang Cài đặt riêng** (`options.html`) tách khỏi popup: ngôn ngữ, giao diện, cỡ chữ, độ trễ tự lưu, màu mặc định, quản lý dữ liệu, giới thiệu.
  A **dedicated Settings page** (`options.html`) separate from the popup: language, theme, font size, autosave delay, default colour, data management, about.
- **Trang giới thiệu** (`landing.html`) với tổng quan tính năng, hướng dẫn cài đặt thủ công, và cam kết quyền riêng tư.
  A **landing page** (`landing.html`) with a feature overview, manual install guide, and a privacy statement.
- **Xuất / nhập tệp cài đặt** (`.json`) — độc lập với xuất/nhập ghi chú.
  **Settings file export/import** (`.json`) — independent from note export/import.
- **Ghim ghi chú** lên đầu danh sách.
  **Pin notes** to the top of the list.
- **Nhãn màu** (7 màu) cho từng ghi chú.
  **Colour labels** (7 colours) per note.
- **Nhân bản ghi chú** chỉ với một cú nhấp.
  **Duplicate a note** in a single click.
- **Thùng rác an toàn**: ghi chú đã xoá được giữ 30 ngày, có thể khôi phục; thông báo **Hoàn tác** (Undo) hiện ngay sau khi xoá.
  **Safety-net Trash**: deleted notes are kept for 30 days and can be restored; an **Undo** snackbar appears immediately after deleting.
- **Sắp xếp** ghi chú theo ngày sửa / ngày tạo / tiêu đề A–Z.
  **Sort** notes by last edited / date created / title A–Z.
- Bảng điều khiển **Snackbar** kiểu Material thay cho toast cũ.
  A Material-style **Snackbar** replacing the old plain toast.
- Hiệu ứng **ripple** và chuyển động (motion) theo chuẩn M3 trên mọi nút bấm.
  M3-compliant **ripple** effect and motion on every button.
- Logo và bộ biểu tượng mới (16/32/48/128/512px).
  New logo and icon set (16/32/48/128/512px).
- Thêm phím tắt: Tìm kiếm (`Ctrl+Shift+F`), Ghim/bỏ ghim (`Ctrl+Shift+P`).
  New shortcuts: Search (`Ctrl+Shift+F`), Pin/unpin (`Ctrl+Shift+P`).

### ♻️ Thay đổi · Changed
- Toàn bộ mã nguồn được viết lại theo hướng module hoá (`shared/theme.css`, `shared/i18n.js`, `shared/settings.js`, `shared/ripple.js`), có chú thích đầy đủ.
  The codebase was rewritten to be modular (`shared/theme.css`, `shared/i18n.js`, `shared/settings.js`, `shared/ripple.js`) and thoroughly commented.
- Mọi nút chính đều có cả biểu tượng lẫn nhãn chữ, vùng chạm lớn hơn để thao tác dễ dàng.
  Every primary button now shows both an icon and a text label, with a larger touch target.
- README được viết lại song ngữ, chuyên nghiệp hơn.
  README rewritten to be bilingual and more professional.

### 🗑️ Loại bỏ · Removed
- Bảng cài đặt/nhập-xuất dạng popover đơn giản trong popup (được thay bằng trang Cài đặt riêng cho các tuỳ chọn nâng cao).
  The simple in-popup settings popover (replaced by the dedicated Settings page for advanced options).

---

## [1.1.0] — Bản gốc · Original baseline
- Ghi chú cơ bản, song ngữ VI/EN, giao diện sáng/tối, xuất/nhập JSON/CSV/MD/TXT.
  Basic notes, VI/EN bilingual support, light/dark themes, JSON/CSV/MD/TXT export/import.
