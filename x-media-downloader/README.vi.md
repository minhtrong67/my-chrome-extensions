# X Media Downloader

> Tải video và ảnh từ X (Twitter) và TweetDeck chỉ với một cú nhấp — không dịch vụ bên thứ ba, không crawl.

**Phiên bản** 1.2.0 · **Nền tảng** Chrome (Manifest V3, Chrome 111+) · **Ngôn ngữ** English, Tiếng Việt · **Thiết kế** Material 3 Expressive

*English: see [README.md](README.md).*

---

## Điểm nổi bật

| Tính năng | Mô tả |
| --- | --- |
| Tải một cú nhấp | Thêm nút tải vào thanh hành động của mọi bài đăng có media, kèm vòng tiến độ. |
| Bài trích dẫn | Nhận diện và tải được cả media nằm trong bài được trích dẫn. |
| Chọn từng media | Bấm chuột phải vào nút (hoặc chọn “Cho tôi chọn” trong Cài đặt) để chọn một ảnh/video trong bài nhiều media. |
| Chất lượng gốc | MP4 bitrate cao nhất cho video/GIF, `name=orig` cho ảnh. |
| Tên tệp tuỳ chỉnh | Mẫu có token và thư mục con, xem trước trực tiếp trong Cài đặt. |
| Tự hiện nội dung nhạy cảm | Tự bấm “Xem” trên media bị ẩn sau cảnh báo nhạy cảm — theo nhãn (tiếng Anh/Việt và từ bạn thêm) và theo bố cục cảnh báo, nên dùng được cả ngôn ngữ khác. |
| Phím tắt | Phím trong trang (mặc định `D`) và lệnh toàn trình duyệt (`Alt+Shift+D`). |
| Ảnh bìa video | Tuỳ chọn lưu thêm ảnh bìa cạnh video. |
| Popup nhanh | Popup trên thanh công cụ có công tắc cho nút tải, tự hiện nhạy cảm, ảnh bìa và phím tắt. |
| Nhật ký | Các lỗi gần đây và lần tự thử lại, có nút “Sao chép báo cáo”. |
| Sao lưu | Xuất / nhập / đặt lại toàn bộ cài đặt. |
| Cá nhân hoá | Giao diện sáng/tối/hệ thống, bảng màu Material, cỡ chữ, ngôn ngữ và font. |

**Cố ý không có:** crawl bài đăng, tải hàng loạt, nén tệp.

## Cài đặt (dùng cá nhân)

1. Tải và giải nén thư mục này.
2. Mở `chrome://extensions` và bật **Developer mode**.
3. Bấm **Load unpacked** rồi chọn thư mục `x-media-downloader`.
4. Mở [x.com](https://x.com): các bài đăng có media sẽ có nút tải.

> Sau khi sửa file, bấm biểu tượng tải lại trên thẻ extension và refresh các tab X đang mở.

## Cách dùng

- **Nút tải:** bấm biểu tượng tải trên thanh hành động. Vòng tròn cho biết tiến độ và chuyển thành dấu tích khi xong. Mặc định bài nhiều media sẽ tải tất cả; **bấm chuột phải** vào nút để chọn từng mục (hoặc đổi sang *Cho tôi chọn* trong Cài đặt). Trong khung xem ảnh chỉ tải đúng ảnh đang xem.
- **Phím tắt:** rê chuột lên bài đăng (hoặc chọn bằng `J` / `K`) rồi nhấn phím tắt. Đổi trong *Cài đặt → Tải xuống*.
- **Phím tắt toàn trình duyệt:** đặt tại `chrome://extensions/shortcuts` (mặc định `Alt+Shift+D`).

### Token tên tệp

| Token | Ví dụ | Ý nghĩa |
| --- | --- | --- |
| `{username}` | `minhtrong67` | Tên tài khoản |
| `{name}` | `Minh Trọng` | Tên hiển thị |
| `{tweetId}` | `1850012345678901234` | ID bài đăng |
| `{index}` | `1` | Số thứ tự media trong bài |
| `{date}` / `{time}` | `20261102` / `143005` | Ngày / giờ đăng (giờ máy) |
| `{text}` | `Sample post text` | 40 ký tự đầu của bài |
| `{type}` | `photo`, `video`, `gif` | Loại media |
| `{filename}` | `G3xAbCdEfGh` | Tên gốc của media |

Cài đặt có sẵn các mẫu, và mục **Thử với liên kết bài đăng** cho xem trước đúng tên tệp của một bài thật. Dùng `/` để tạo thư mục, ví dụ `X/{username}/{date}-{tweetId}-{index}`. Phần mở rộng được thêm tự động, ký tự không hợp lệ được thay thế và tệp có sẵn không bao giờ bị ghi đè.

## Cài đặt

- **Giao diện:** chế độ sáng/tối/hệ thống, 12 màu Material, cỡ chữ (nhỏ/vừa/lớn), ngôn ngữ (English/Tiếng Việt) và font (System, Google Sans Flex, Roboto Flex, Roboto, Arial, Inter, Be Vietnam Pro).
- **Tải xuống:** mẫu tên tệp và mẫu có sẵn, tự hiện nhạy cảm (kèm nhãn “Xem” bổ sung), ảnh bìa video, cách xử lý bài nhiều media, phím tắt.
- **Nhật ký:** các sự cố và lần thử lại gần đây (lưu cục bộ, tối đa 60 mục).
- **Giới thiệu → Sao lưu:** xuất/nhập cài đặt dạng JSON hoặc đặt lại tất cả.
- **Đồng bộ:** cài đặt lưu bằng `chrome.storage.sync`; nhật ký chỉ nằm trên máy này.
- **Font:** font web nạp từ Google Fonts khi có mạng, offline sẽ dùng font hệ thống.

## Cách hoạt động

```
Trang x.com ──► inject.js (MAIN world) ──postMessage──► content.js ──message──► background.js ──► chrome.downloads
   │  hook fetch/XHR GraphQL             │ bộ nhớ đệm, nút, phím tắt, toast        │ tạo tên tệp + tải
   └── đọc URL media từ phản hồi         └── dự phòng: API syndication qua background ◄─┘
```

- `src/inject.js` đọc phản hồi GraphQL của chính trang X để lấy URL media; nội dung nhạy cảm hoặc cần đăng nhập vẫn lấy được vì trang đã có sẵn dữ liệu.
- Nếu bài đăng chưa có trong bộ nhớ đệm, `background.js` hỏi API syndication công khai làm dự phòng (chỉ bài công khai).
- Xử lý nặng được hoãn và theo từng phần: chỉ phân tích phản hồi dưới 6 MB, chỉ quét bài đăng mới và dữ liệu bài đăng trong bộ nhớ đệm hết hạn sau 30 phút.
- Việc tải đi qua hàng đợi nhỏ (tối đa 3 tệp cùng lúc). Nếu tải lỗi do mạng/máy chủ, liên kết media được làm mới qua tra cứu dự phòng và thử lại một lần; kết quả được ghi trong *Nhật ký*.

## Quyền truy cập

| Quyền | Lý do |
| --- | --- |
| `downloads` | Lưu tệp qua trình quản lý tải xuống của Chrome. |
| `storage` | Lưu cài đặt (đồng bộ). |
| `x.com`, `twitter.com` (và tên miền con) | Thêm nút và đọc dữ liệu media trên các trang này. |
| `cdn.syndication.twimg.com` | Tra cứu dự phòng cho bài công khai. |

Không có analytics, không máy chủ bên ngoài; không có dữ liệu nào rời trình duyệt ngoài các yêu cầu của chính X và các tệp bạn tải.

## Xử lý sự cố

| Vấn đề | Cách thử |
| --- | --- |
| Không thấy nút | Tải lại extension và tab. Nút chỉ hiện ở bài có ảnh/video. |
| “Không tìm thấy media để tải” | Mở bài đăng một lần để X tải dữ liệu rồi thử lại. Bài bị khoá/giới hạn tuổi cần đăng nhập. |
| Không tự hiện nội dung nhạy cảm | Thêm từ “Xem” của ngôn ngữ bạn (cách nhau bằng dấu phẩy) tại *Cài đặt → Tải xuống → Nhãn “Xem” bổ sung*. Nhận diện theo bố cục là heuristic, có thể cần chỉnh nếu X đổi giao diện. |
| Tải xuống bị lỗi | Tắt các extension quản lý tải xuống khác trên X vì có thể xung đột. |
| Một lượt tải bị lỗi | Mở *Cài đặt → Nhật ký* để xem lý do (liên kết hết hạn, mạng, hệ thống tệp) và dùng **Sao chép báo cáo** khi cần hỗ trợ. |
| Trình duyệt chậm | Mở `chrome://extensions` → *Errors* của extension và Task Manager của Chrome để xem tab nào đang nặng, rồi báo lại. |

## Phát triển

Không cần bước build để chạy. `src/mcu.js` là bản bundle của [`@material/material-color-utilities`](https://github.com/material-foundation/material-color-utilities) dùng để sinh bảng màu Material 3; cách build lại xem phần *Development* trong [README.md](README.md#development).

## Ghi chú bảo trì

- X thỉnh thoảng đổi giao diện. Mọi selector extension phụ thuộc đều nằm trong đối tượng `SEL` ở đầu `src/content.js`; hãy sửa tại đó nếu nút không còn xuất hiện.
- Nhận diện nhạy cảm theo bố cục dựa trên cấu trúc cảnh báo (nút ngắn cạnh đoạn cảnh báo dài) và chưa được kiểm chứng với mọi biến thể giao diện của X.

## Miễn trừ trách nhiệm

Đây là dự án cá nhân độc lập, không liên kết hay được X Corp bảo trợ. Hãy tôn trọng quyền của người sáng tạo và điều khoản của X; chỉ tải nội dung bạn được phép lưu.

## Ghi công

Tạo bởi **minhtrong67** với sự hỗ trợ của **Claude**, trợ lý AI của Anthropic.
