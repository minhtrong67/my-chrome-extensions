<div align="center">

<img src="icons/icon128.png" alt="Logo Password Generator" width="96" height="96" />

# Password Generator

**Trình tạo mật khẩu, cụm từ mật khẩu và mã PIN an toàn, ngoại tuyến cho trình duyệt Chromium.**

Material Design 3 · Icon Lucide · Sáng / Tối / Hệ thống · English & Tiếng Việt

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-009688?style=flat-square)](manifest.json)
[![Offline](https://img.shields.io/badge/riêng%20tư-100%25%20ngoại%20tuyến-2e7d32?style=flat-square)](#riêng-tư--bảo-mật)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

[English](README.md) · [Trang giới thiệu](index.html)

</div>

---

## Giới thiệu

**Password Generator** là tiện ích mở rộng miễn phí, mã nguồn mở cho Chrome, Edge, Brave, Opera và các trình duyệt Chromium khác. Tiện ích tạo mật khẩu mạnh, cụm từ dễ nhớ và mã PIN hoàn toàn trên thiết bị của bạn bằng Web Crypto API. Không máy chủ, không tài khoản, không theo dõi — extension chỉ xin quyền `storage` để ghi nhớ tùy chọn của bạn.

> Tác giả: **minhtrong67** · Phát triển với sự hỗ trợ của **Claude** (AI của Anthropic).

## Ảnh chụp màn hình

<table>
  <tr>
    <td align="center"><img src="screenshots/image01.png" width="240" alt="Chế độ mật khẩu, giao diện sáng" /><br /><sub>Mật khẩu · Sáng</sub></td>
    <td align="center"><img src="screenshots/image02.png" width="240" alt="Chế độ mật khẩu, giao diện tối" /><br /><sub>Mật khẩu · Tối</sub></td>
    <td align="center"><img src="screenshots/image03.png" width="240" alt="Chế độ cụm từ" /><br /><sub>Cụm từ</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="screenshots/image04.png" width="240" alt="Chế độ PIN" /><br /><sub>PIN</sub></td>
    <td align="center"><img src="screenshots/image05.png" width="240" alt="Tùy chọn nâng cao" /><br /><sub>Tùy chọn nâng cao</sub></td>
    <td align="center"><img src="screenshots/image06.png" width="240" alt="Trang cài đặt" /><br /><sub>Cài đặt</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="screenshots/image07.png" width="240" alt="Cài đặt tiếng Việt, giao diện tối" /><br /><sub>Cài đặt · Tối · Tiếng Việt</sub></td>
    <td align="center" colspan="2"><img src="screenshots/image08.png" width="500" alt="Landing page" /><br /><sub>Landing page (máy tính)</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="screenshots/image09.png" width="240" alt="Landing page trên điện thoại" /><br /><sub>Landing page (điện thoại · tối)</sub></td>
    <td align="center" colspan="2"><img src="screenshots/image10.png" width="500" alt="Landing page tiếng Việt" /><br /><sub>Landing page · Tiếng Việt · Chàm</sub></td>
  </tr>
</table>

## Tính năng

- **Ba chế độ** — mật khẩu (4–64 ký tự), cụm từ BIP‑39 (3–10 từ) và PIN (4–12 chữ số).
- **Tùy biến chi tiết** — nhóm ký tự, loại ký tự dễ nhầm (`I l 1 O 0`), không lặp ký tự và danh sách loại trừ riêng. Mỗi nhóm được bật luôn xuất hiện ít nhất một lần.
- **Đo độ mạnh trực tiếp** — entropy tính từ tập ký tự thực tế, 5 mức và thời gian bẻ khóa ước tính (10 tỷ lượt thử/giây).
- **An toàn mật mã** — `crypto.getRandomValues()` cùng rejection sampling và xáo trộn Fisher–Yates; không dùng `Math.random()`.
- **Material Design 3** — bề mặt tonal, state layer, segmented button, chip, switch và chuyển động mượt; tôn trọng chế độ *giảm chuyển động*.
- **Trang cài đặt gọn gàng** (mở ngay trong popup, không cần tab mới):
  - **Màu sắc** — 18 màu Material Design (Đỏ … Xám xanh), mỗi màu có bảng tonal M3 đầy đủ.
  - **Giao diện** — Sáng, Tối hoặc Hệ thống (tự theo hệ điều hành).
  - **Ngôn ngữ** — English, Tiếng Việt hoặc Tự động (nhận diện theo trình duyệt).
  - **Giới thiệu** — tác giả, ghi nhận AI và nút mở landing page trong tab mới.
- **Lịch sử gần đây** — chỉ lưu trong session storage và tự xóa khi đóng trình duyệt; giá trị bạn đã sao chép luôn được lưu lại.
- **Landing page** — một file `index.html` độc lập, có meta SEO & chia sẻ mạng xã hội, hiệu ứng cuộn, demo trực tiếp, đổi giao diện/màu/ngôn ngữ và responsive đầy đủ.

## Cài đặt

1. Tải hoặc clone repository.
2. Mở `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`).
3. Bật **Chế độ nhà phát triển (Developer mode)**.
4. Chọn **Tải tiện ích đã giải nén (Load unpacked)** và chọn thư mục chứa `manifest.json`.
5. Ghim **Password Generator** lên thanh công cụ.

## Sử dụng

1. Chọn **Mật khẩu**, **Cụm từ** hoặc **PIN**.
2. Điều chỉnh tùy chọn — kết quả và thanh độ mạnh cập nhật ngay.
3. Nhấn **Tạo** (hoặc biểu tượng làm mới) để có giá trị mới, rồi **Sao chép**.
4. Mở **Cài đặt** (biểu tượng bánh răng) để đổi màu, giao diện hoặc ngôn ngữ.

## Riêng tư & bảo mật

| | |
|---|---|
| Quyền | Chỉ `storage` — không host permission, không tabs, không content script |
| Mạng | Không có. Không request, telemetry hay mã từ xa |
| Cài đặt | `chrome.storage.local` |
| Lịch sử | `chrome.storage.session` — chỉ trong bộ nhớ, xóa khi đóng trình duyệt |
| Ngẫu nhiên | `crypto.getRandomValues()` + rejection sampling (không lệch modulo) |
| Cụm từ | Danh sách BIP‑39 tiếng Anh, 2.048 từ (11 bit mỗi từ) |

## Công nghệ

| Hạng mục | Công nghệ |
|---|---|
| Nền tảng | Chrome Extension, Manifest V3 |
| Giao diện | HTML ngữ nghĩa, CSS custom properties, Material Design 3 |
| Icon | [Lucide](https://lucide.dev) (SVG nhúng sẵn, dùng được ngoại tuyến) |
| Font | Font mặc định của hệ thống |
| Màu | Bảng tonal sinh bằng `@material/material-color-utilities` |
| Logic | JavaScript thuần (ES2020), không framework, không bundler |

## Cấu trúc dự án

```text
.
├── manifest.json        # Manifest MV3 (landing page khai báo là sandbox page)
├── popup.html           # Popup: trình tạo + màn hình cài đặt
├── index.html           # Landing page (1 file: HTML + CSS + JS)
├── css/                 # colors.css (token M3, 18 màu × sáng/tối), popup.css
├── js/                  # boot, icons, i18n, storage, theme, generator, wordlist, main
├── icons/               # Icon extension 16/32/48/128 px + SVG nguồn, màu #009688
├── _locales/            # Tên & mô tả extension (en, vi)
└── screenshots/         # image01.png … image10.png
```

## Landing page

`index.html` nằm ở thư mục gốc. Trong extension, **Cài đặt → Mở trang giới thiệu** mở file này ở tab mới qua `chrome.runtime.getURL("index.html")` — không cần URL deploy — và truyền theme, màu, ngôn ngữ hiện tại qua URL hash để hai trang đồng bộ. File được khai báo là `sandbox` page trong manifest để script inline chạy được dưới CSP của Manifest V3.

Để đưa lên web, host thư mục gốc (ví dụ GitHub Pages) rồi cập nhật các URL `canonical`, `og:url`, `og:image`, `twitter:image` trong `<head>` của `index.html` (hiện giả định là `https://minhtrong67.github.io/password-generator/`).

## Phát triển

Không cần build. Sửa file rồi nhấn **Reload** ở trang tiện ích.

```bash
python3 -m http.server 8000      # xem landing page tại http://localhost:8000/
for f in js/*.js; do node --check "$f"; done
```

Đóng gói phát hành:

```bash
zip -r password-generator-3.0.0.zip manifest.json popup.html index.html css js icons _locales
```

## Ghi công

- Tác giả: **minhtrong67**
- Phát triển với sự hỗ trợ của **Claude** (Anthropic)
- Icon: [Lucide](https://lucide.dev) (ISC) · Wordlist: [BIP‑39](https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt)

## Giấy phép

Phát hành theo [MIT License](LICENSE).
