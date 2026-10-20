<div align="center">

<img src="icons/icon128.png" alt="Logo TubeShot" width="96" height="96" />

# TubeShot

**Chụp ảnh YouTube sạch, từng khung hình.**

Tiện ích Chrome miễn phí, mã nguồn mở, giúp chụp khung hình không có thanh điều khiển từ bất kỳ video YouTube nào, với tua chính xác từng khung, huy hiệu thời gian, chú thích tuỳ chọn và giao diện Material Design 3.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-E91E63)
![Version](https://img.shields.io/badge/version-1.1.0-E91E63)
![License](https://img.shields.io/badge/license-MIT-E91E63)
![Languages](https://img.shields.io/badge/languages-EN%20%7C%20VI-E91E63)

[English](README.md) · **Tiếng Việt**

</div>

---

## Giới thiệu

Công cụ chụp màn hình thông thường chụp mọi thứ đang hiển thị: thanh điều khiển, giao diện YouTube và cả trình duyệt. TubeShot đọc trực tiếp khung hình video từ trang bằng cách vẽ phần tử `<video>` lên canvas, nên mỗi ảnh chụp chỉ có hình ảnh, ở độ phân giải gốc của video.

Mở `index.html` để xem trang giới thiệu dự án (cũng có thể mở từ **Cài đặt → Mở trang giới thiệu**).

## Ảnh chụp màn hình

| | | |
|:---:|:---:|:---:|
| <img src="screenshots/image01.png" width="260" alt="Popup chính" /><br/>Điều khiển phát và tuỳ chọn chụp | <img src="screenshots/image02.png" width="260" alt="Giao diện tối và lịch sử" /><br/>Giao diện tối, chất lượng JPEG, lịch sử | <img src="screenshots/image03.png" width="260" alt="Cài đặt" /><br/>Cài đặt: màu sắc, giao diện, ngôn ngữ |
| <img src="screenshots/image04.png" width="260" alt="Tiếng Việt nền tối xanh dương" /><br/>Tiếng Việt, nền tối, xanh dương | <img src="screenshots/image05.png" width="260" alt="Trạng thái trống" /><br/>Trạng thái trống | <img src="screenshots/image06.png" width="260" alt="Ảnh chụp mẫu" /><br/>Ảnh chụp thật kèm huy hiệu và chú thích |

### Trang giới thiệu

<p align="center">
  <img src="screenshots/image07.png" width="640" alt="Trang giới thiệu trên máy tính" />
  <img src="screenshots/image08.png" width="190" alt="Trang giới thiệu trên điện thoại" />
</p>

## Tính năng

- **Khung hình sạch.** Không thanh điều khiển, lớp phủ hay giao diện trình duyệt. Chụp ở độ phân giải gốc của video.
- **Tua chính xác từng khung hình.** Tua ±10 giây hoặc ±1 giây, bước từng khung, kéo thanh trượt hoặc gõ thời gian như `1:23`, `1:02:03`.
- **Huy hiệu thời gian và chú thích.** Đóng dấu thời gian ở góc ảnh, hoặc thêm dải gồm tiêu đề, kênh và thời gian.
- **PNG hoặc JPEG.** PNG không nén mất dữ liệu, hoặc JPEG với chất lượng tuỳ chỉnh, ở mức 100, 75, 50 hoặc 25 phần trăm.
- **Lưu hoặc sao chép.** Tải vào thư mục Downloads hoặc sao chép vào clipboard.
- **Ảnh chụp gần đây.** Mười ảnh gần nhất kèm ảnh thu nhỏ. Nhấn vào một ảnh để mở lại video đúng giây đó, hoặc xuất danh sách ra tệp `.txt`.
- **Video, Shorts và phát trực tiếp** trên `youtube.com` và `m.youtube.com`.
- **Material Design 3.** 18 màu Material, giao diện sáng, tối hoặc theo hệ thống, font mặc định của hệ thống, icon [Lucide](https://lucide.dev).
- **Tiếng Anh và Tiếng Việt.** Tự nhận diện theo ngôn ngữ trình duyệt ở lần chạy đầu.
- **Riêng tư.** Không máy chủ, không phân tích, không tài khoản. Mọi thứ ở lại trong trình duyệt.

## Cài đặt

TubeShot được nạp dưới dạng tiện ích đã giải nén trên Chrome, Edge, Brave và các trình duyệt Chromium khác.

1. Tải dự án về và giải nén.
2. Mở `chrome://extensions`.
3. Bật **Chế độ dành cho nhà phát triển** (góc trên bên phải).
4. Nhấn **Tải tiện ích đã giải nén** và chọn thư mục chứa `manifest.json`.
5. Ghim TubeShot lên thanh công cụ, mở một video YouTube và nhấn vào biểu tượng.

### Quyền truy cập

| Quyền | Lý do cần thiết |
|---|---|
| `storage` | Lưu cài đặt và lịch sử chụp trên thiết bị của bạn. |
| `downloads` | Lưu khung hình đã chụp vào thư mục Downloads. |
| `scripting` | Nạp TubeShot vào tab YouTube đã mở sẵn trước khi cài đặt. |
| `youtube.com`, `m.youtube.com` | Cho phép content script đọc khung hình video. Không thể chạy trên trang khác. |

## Công nghệ sử dụng

- **HTML, CSS và JavaScript thuần**, Manifest V3. Không framework, không bước build, không phụ thuộc thư viện chạy.
- **Canvas API** để đọc và ghép khung hình video.
- Bảng màu **Material Design 3** sinh bằng [`@material/material-color-utilities`](https://github.com/material-foundation/material-color-utilities) (chỉ khi phát triển).
- Icon **Lucide** nhúng sẵn trong `js/icons.js` (giấy phép ISC).
- `chrome.storage.local`, `chrome.downloads`, `chrome.scripting`, `chrome.tabs`.

## Phát triển

Không có gì cần biên dịch. Sửa tệp rồi nhấn nút tải lại tại `chrome://extensions`.

Để sinh lại bảng màu (`css/palettes.css` và bản nhúng trong `index.html`):

```bash
npm install --no-save @material/material-color-utilities@0.3.0
node scripts/generate-palettes.cjs
```

Cách hoạt động: popup giao tiếp với `js/content.js` qua `chrome.tabs.sendMessage`. Content script chọn `<video>` đang hiển thị, báo trạng thái, tua video và vẽ khung hình lên canvas. Giao diện và màu sắc chỉ là các thuộc tính `data-theme`, `data-color` trên `<html>`.

Trang giới thiệu `index.html` được khai báo là trang sandbox của tiện ích, nên mở được trong tab mới từ Cài đặt cùng các script nhúng của nó. Trang cũng chạy bình thường như một trang tĩnh trên bất kỳ máy chủ nào.

## Đóng gói

Không cần bước build. Để phát hành, nén thư mục dự án và bỏ `scripts/` (giữ `screenshots/` nếu bạn đưa kèm `index.html`):

```bash
zip -r tubeshot-1.1.0.zip . -x "scripts/*" "*.md" ".git/*"
```

## Cấu trúc dự án

```
tubeshot/
├── manifest.json          Manifest của tiện ích (Manifest V3)
├── popup.html             Giao diện popup: màn hình chụp và cài đặt
├── index.html             Trang giới thiệu (một tệp, Material Design 3, EN/VI)
├── README.md / README.vi.md
├── LICENSE
├── css/
│   ├── popup.css          Thành phần và bố cục Material Design 3
│   └── palettes.css       Bảng màu được sinh (18 màu x sáng/tối)
├── js/
│   ├── main.js            Logic popup, thăm dò trạng thái, chụp, cài đặt
│   ├── content.js         Chạy trên YouTube: tìm video, tua, chụp khung hình
│   ├── storage.js         Cài đặt (có kiểm tra hợp lệ) và lịch sử
│   ├── theme.js           Xử lý giao diện và màu sắc
│   ├── i18n.js            Chuỗi tiếng Anh và tiếng Việt
│   └── icons.js           Icon Lucide được nhúng
├── icons/                 Icon tiện ích (16, 32, 48, 128), nguồn SVG, ảnh chia sẻ
├── _locales/              Tên và mô tả tiện ích theo ngôn ngữ (en, vi)
├── screenshots/           image01.png ... image08.png
└── scripts/               Trình sinh bảng màu
```

## Giới hạn đã biết

- Video có bảo vệ DRM (một số phim thuê) sẽ cho ảnh đen và không tiện ích nào chụp được.
- Không hỗ trợ trình phát nhúng trên các trang web khác.
- Lịch sử chỉ lưu ảnh thu nhỏ và thông tin mô tả, không lưu ảnh độ phân giải đầy đủ.
- Nếu YouTube đổi cấu trúc trang, tiêu đề và kênh có thể quay về dùng tiêu đề trang. Bản thân khung hình không bị ảnh hưởng.

## Ghi công

Phát triển bởi **minhtrong67**, với sự hỗ trợ của AI **Claude**.

## Giấy phép

Phát hành theo [Giấy phép MIT](LICENSE). Miễn phí và mã nguồn mở.
