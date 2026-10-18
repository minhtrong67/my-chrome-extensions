# Password Generator

<p align="center"><img src="icons/icon128.png" alt="Password Generator" width="96"></p>
<p align="center"><strong>Password, passphrase & PIN generator cho Chromium</strong><br>Material Design 3 · Roboto · 100% offline · English / Tiếng Việt</p>

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-156683?style=flat-square)](#tech-stack) [![Offline](https://img.shields.io/badge/privacy-100%25%20offline-2e7d32?style=flat-square)](#tính-năng) [![License: MIT](https://img.shields.io/badge/license-MIT-6750A4?style=flat-square)](#license)

## 1. Giới thiệu

**Password Generator** là extension mã nguồn mở giúp tạo mật khẩu mạnh, cụm mật khẩu dễ nhớ và mã PIN trực tiếp trong Chrome, Edge, Brave, Opera và các trình duyệt Chromium khác. Mọi dữ liệu được tạo cục bộ bằng Web Crypto API; extension chỉ yêu cầu quyền `storage` để lưu lựa chọn của bạn và lịch sử khi bạn bật tính năng này.

Tác giả: **minhtrong67** · Phát triển với sự hỗ trợ của **Claude AI**.

## 2. Screenshot

Ảnh minh họa được lưu trong thư mục `screenshots/` và dùng tên tuần tự theo yêu cầu:

| Ảnh | Mô tả |
|---|---|
| ![image01](screenshots/image01.png) | Giao diện sáng / Password |
| ![image02](screenshots/image02.png) | Giao diện tối |
| ![image03](screenshots/image03.png) | Passphrase BIP-39 |
| ![image04](screenshots/image04.png) | PIN 4–12 chữ số |
| ![image05](screenshots/image05.png) | Màn hình cài đặt |

## 3. Tính năng

- **Ba chế độ:** Password, Passphrase dựa trên wordlist BIP-39 2048 từ và PIN.
- **Ngẫu nhiên mật mã:** `crypto.getRandomValues()` + rejection sampling, không dùng `Math.random()` trong lõi bảo mật.
- **Tùy biến sâu:** độ dài, nhóm ký tự, loại ký tự dễ nhầm, tránh lặp và danh sách loại trừ thủ công.
- **Đo độ mạnh:** entropy thực tế, thanh đo 5 cấp và ước tính thời gian bẻ khóa.
- **Material Design 3:** hệ màu token, Roboto đóng gói offline, icon SVG đúng kích thước, state layer, elevation và motion.
- **Theme:** Light, Dark, System; màu chủ đề Teal, Blue, Green, Purple, Orange và Pink.
- **Song ngữ:** English / Tiếng Việt; mặc định tự nhận diện `navigator.language` của thiết bị, có thể đổi thủ công.
- **Quản lý dữ liệu:** lịch sử cục bộ, xuất `.txt`, xuất/nhập cấu hình JSON, reset an toàn.
- **Landing page:** `landing/index.html` là một file HTML độc lập, có SEO meta, Open Graph/Twitter Card, demo tương tác và responsive mobile.

## 4. Cài đặt

1. Tải hoặc clone repository.
2. Mở `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`).
3. Bật **Developer mode**.
4. Chọn **Load unpacked** và chọn thư mục chứa `manifest.json`.
5. Ghim Password Generator trên thanh công cụ để truy cập nhanh.

Extension không có `host_permissions`, không đọc nội dung website và không cần server.

## 5. Tech stack

| Thành phần | Công nghệ |
|---|---|
| Extension | Chrome Manifest V3 |
| UI | Semantic HTML5, CSS3, Material Design 3 tokens |
| Font | Roboto WOFF2 self-hosted |
| Logic | Vanilla JavaScript ES6+ |
| Security | Web Crypto API |
| Dictionary | BIP-39 English wordlist |
| Landing | Một file HTML với CSS/JS inline |

## 6. Development

Không có dependency hoặc framework bắt buộc. Chỉnh sửa file rồi reload extension tại trang Extensions.

```bash
# Xem landing page và popup bằng static server
python3 -m http.server 8000
# Mở http://localhost:8000/landing/index.html
```

Để debug popup: nhấp phải icon extension → **Inspect popup**. Kiểm tra Console, Application → Storage và responsive layout trong DevTools.

## 7. Build

Dự án không cần bundler. Trước khi đóng gói, kiểm tra `manifest.json`, reload extension và chạy kiểm tra JavaScript:

```bash
node --check js/main.js
node --check js/generator.js
node --check js/i18n.js
zip -r password-generator-2.1.0.zip manifest.json popup.html index.html css js icons fonts screenshots landing material-theme.json
```

File ZIP có thể tải lên Chrome Web Store Developer Dashboard hoặc chia sẻ như bản cài đặt unpacked.

## 8. Cấu trúc project

```text
.
├── manifest.json
├── popup.html                 # Popup generator và settings
├── index.html                 # Entry page phụ
├── landing/index.html         # Landing page self-contained
├── css/                       # Font, tokens và component styles
├── js/                        # Generator, i18n, storage, theme, app wiring
├── fonts/                     # Roboto + assets font hiện có
├── icons/                     # 16/32/48/128px và SVG
├── screenshots/               # image01.png … image05.png
└── material-theme.json
```

## License

Phát hành công khai dưới **MIT License**. Bạn được phép sử dụng, sao chép, chỉnh sửa, phân phối và thương mại hóa theo điều khoản của giấy phép MIT. Xem toàn văn tại [opensource.org/licenses/MIT](https://opensource.org/licenses/MIT).
