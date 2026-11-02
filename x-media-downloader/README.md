# X Media Downloader

Extension Chrome (Manifest V3) dùng cá nhân: tải video/ảnh từ X (Twitter) và TweetDeck chỉ với một cú nhấp.

## Cài đặt
1. Mở `chrome://extensions`, bật **Developer mode**.
2. Bấm **Load unpacked** và chọn thư mục này.
3. Mở x.com: các bài đăng có media sẽ có thêm nút tải ở thanh hành động.

## Cách hoạt động
- `src/inject.js` (MAIN world) đọc phản hồi API của chính trang X để lấy URL media chất lượng cao nhất (video mp4 bitrate cao nhất, ảnh `name=orig`).
- Nếu bài đăng chưa có trong bộ nhớ đệm, `background.js` gọi API syndication công khai làm dự phòng.
- Tải xuống bằng `chrome.downloads`, không qua dịch vụ bên thứ ba.

## Phím tắt
- Trong trang: mặc định `D` (đổi được trong Cài đặt), áp dụng cho bài đang rê chuột / đang chọn.
- Toàn trình duyệt: `Alt+Shift+D` (đổi tại `chrome://extensions/shortcuts`).

## Token tên tệp
`{username} {name} {tweetId} {index} {date} {time} {text} {type} {filename}`; dùng `/` để tạo thư mục con.

## Lưu ý
- Đừng bật song song extension quản lý tải xuống khác (có thể gây race condition).
- Font Google Sans Flex / Roboto Flex / Inter / Be Vietnam Pro / Roboto được nạp từ Google Fonts khi có mạng; offline sẽ rơi về font hệ thống.
- `src/mcu.js` là bản bundle của `@material/material-color-utilities` (tạo bảng màu Material 3).
