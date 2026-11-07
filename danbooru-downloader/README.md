# Danbooru Downloader

Chrome extension (Manifest V3) that scans Danbooru pages and bulk-downloads images.
Material 3 Expressive UI · English / Tiếng Việt.

## Cài đặt / Install
1. Giải nén thư mục / unzip the folder.
2. Mở `chrome://extensions`, bật **Developer mode**.
3. Chọn **Load unpacked** và trỏ tới thư mục `danbooru-downloader`.
4. Mở một trang Danbooru (danh sách ảnh, pool, favorites, bài đăng) → nhấn biểu tượng tiện ích.

## Tính năng / Features
- Quét trang hiện tại hoặc nhiều trang liên tiếp (tự đi theo nút "next"), có độ trễ giữa các request.
- Lọc logo: theo tag (`logo, *_logo` – chỉnh được, hỗ trợ `*`), theo kích thước nhỏ, theo tỉ lệ khung hình bất thường.
- Lọc thêm theo rating, điểm tối thiểu, loại file (JPG/PNG/GIF/WebP/AVIF/video/ugoira).
- Chọn ảnh bằng click, Shift+click chọn dải; tất cả / bỏ chọn / đảo chọn.
- Hàng đợi tải chạy nền (đóng popup vẫn tiếp tục), badge đếm còn lại, thông báo khi xong.
- Tên file và thư mục theo mẫu: `{id} {md5} {artist} {character} {copyright} {query} {rating} {score} {width} {height} {date} {index} {ext}`.
- Cài đặt: sáng/tối/hệ thống, 19 màu Material + màu tuỳ chọn, cỡ chữ, ngôn ngữ, font
  (System / Google Sans Flex / Roboto Flex / Roboto / Arial / Inter / Be Vietnam Pro), xuất/nhập cài đặt.

## Lưu ý / Notes
- Chrome chỉ cho extension lưu vào **thư mục con của Downloads**. Đổi thư mục gốc tại `chrome://settings/downloads`.
- Các token `{artist}`, `{character}`, `{copyright}` cần thêm 1 request/ảnh (có giãn cách) để đọc tag.
- Font được đóng gói sẵn (SIL OFL, nguồn Fontsource), dùng được khi offline.
- Một số bài bị ẩn với tài khoản chưa đăng nhập sẽ bị bỏ qua (có thông báo trong popup).
