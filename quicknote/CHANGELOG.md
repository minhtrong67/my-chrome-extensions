# Changelog

## [3.0.0]
### Changed · Thay đổi
- Giao diện viết lại theo chuẩn Material Design 3, dùng font mặc định hệ thống và icon Lucide (cục bộ). · UI rebuilt in Material Design 3 with the system font and local Lucide icons.
- Trang cài đặt gọn: màu sắc (18 màu Material), giao diện (sáng/tối/hệ thống), ngôn ngữ (vi/en, tự nhận diện), giới thiệu. Mở ngay trong popup. · Compact settings page, opens inside the popup.
- Tác giả đổi thành `minhtrong67` + hỗ trợ AI Claude. · Author is now `minhtrong67` with AI support from Claude.
- Icon mới màu `#00BCD4` (16/32/48/128/512). · New `#00BCD4` icons.
- `landing.html` gom thành 1 file ở thư mục gốc, đủ meta SEO/OG/Twitter. · Single-file landing page at the root with full SEO/social meta.

### Fixed · Sửa lỗi
- Mất nội dung khi đóng popup trước lúc tự lưu (nay lưu ngay khi đóng/chuyển ghi chú). · Edits lost when the popup closed before autosave.
- Phím tắt Ctrl+Shift+N/C/P bị trình duyệt chặn → dùng Alt+N/F/P. · Browser-reserved shortcuts replaced.
- Xuất CSV báo sai nội dung; tải xuống có thể bị huỷ do thu hồi URL quá sớm. · Wrong CSV toast; premature `revokeObjectURL`.
- Chọn ghi chú kế tiếp sai khi xoá trong chế độ lọc; tìm kiếm không hỗ trợ không dấu. · Wrong next note after delete; accent-insensitive search added.
- Sao chép clipboard lỗi im lặng; chuỗi “(copy)”/thời gian cứng tiếng Anh/Việt. · Silent clipboard failure; hardcoded strings.
- Thêm `unlimitedStorage` để không đầy bộ nhớ; hiển thị lỗi khi lưu thất bại. · Added `unlimitedStorage` and save-error feedback.

### Removed · Đã gỡ
- Cỡ chữ, độ trễ tự lưu, màu mặc định, xuất/nhập tệp cài đặt (đơn giản hoá cài đặt). · Font size, autosave delay, default colour and settings import/export.
