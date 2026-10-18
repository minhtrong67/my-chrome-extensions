<div align="center">

# 🚀 My Extension Pack

**Bộ sưu tập các tiện ích mở rộng Chromium (Manifest V3) mạnh mẽ, hiện đại và bảo mật.**  
*A curated suite of high-performance, privacy-focused Chromium extensions styled with Material Design 3.*

---

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-10B981?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Chromium Compatible](https://img.shields.io/badge/Chromium-Compatible-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](#-khả-năng-tương-thích)
[![Privacy 100% On-Device](https://img.shields.io/badge/Privacy-100%25%20On--Device-success?style=for-the-badge&logo=shield)](https://github.com/minhtrong67/my-extension-pack)
[![Design Material 3](https://img.shields.io/badge/UI-Material%20Design%203-7C3AED?style=for-the-badge&logo=materialdesign)](https://m3.material.io/)
[![Bilingual](https://img.shields.io/badge/i18n-English%20%7C%20Tiếng%20Việt-3B82F6?style=for-the-badge)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

[🌟 Giới thiệu](#-giới-thiệu) • [📦 Danh sách Tiện ích](#-danh-sách-tiện-ích-extensions) • [⚡ Hướng dẫn Cài đặt](#-hướng-dẫn-cài-đặt-installation) • [🛡️ Triết lý Cốt lõi](#-triết-lý-cốt-lõi) • [📁 Cấu trúc Thư mục](#-cấu-trúc-thư-mục) • [👤 Tác giả](#-tác-giả--bản-quyền)

</div>

---

## 🌟 Giới thiệu

**My Extension Pack** là kho lưu trữ tổng hợp các tiện ích mở rộng Chrome/Chromium được xây dựng với tiêu chuẩn hiện đại nhất (**Manifest V3**). Toàn bộ các extension trong bộ công cụ này đều tuân theo nguyên tắc:

- **100% Offline & Bảo mật**: Mọi tác vụ xử lý hoàn toàn cục bộ trên thiết bị của bạn. Không gửi telemetry, không theo dõi, không quảng cáo và không máy chủ trung gian.
- **Material Design 3**: Trải nghiệm giao diện đồng nhất, tinh tế, tự động tương thích chủ đề Sáng / Tối (Light & Dark theme).
- **Hỗ trợ Song ngữ Hoàn chỉnh**: Tích hợp sẵn Tiếng Việt và English.
- **Nhẹ & Nhanh**: Tối ưu hóa tối đa lượng RAM và tài nguyên tiêu thụ trên trình duyệt.

---

## 📦 Danh sách Tiện ích (Extensions)

Dưới đây là 9 tiện ích độc lập sẵn sàng sử dụng:

| Tiện ích | Phiên bản | Mô tả tóm tắt | Điểm đặc sắc nổi bật | Thư mục |
| :--- | :---: | :--- | :--- | :---: |
| **🔖 TagMark** | `v1.1.0` | Quản lý Bookmark thông minh | Gắn thẻ, ghi chú, tìm kiếm nhanh, phát hiện trùng lặp | [`/bookmark-manager-ext`](./bookmark-manager-ext) |
| **🖼️ PixGrab** | `v2.3.0` | Tải ảnh hàng loạt thông minh | Quét toàn trang, lọc kích thước/định dạng, auto-crop 512x512 | [`/bulk-image-downloader-ext`](./bulk-image-downloader-ext) |
| **🔤 Case Converter** | `v1.0.0` | Chuyển đổi kiểu chữ đa năng | UPPER, lower, camelCase, snake_case... ngay tại chỗ hoặc popup | [`/case-converter`](./case-converter) |
| **🔄 PixFlip** | `v2.0.0` | Chuyển đổi định dạng ảnh | Chuột phải lưu PNG/JPEG/WEBP hoặc kéo thả chuyển đổi đóng gói .zip | [`/image-format-converter-ext`](./image-format-converter-ext) |
| **🔐 Password Generator** | `v2.1.0` | Tạo mật khẩu & mã PIN an toàn | Web Crypto API, passphrase dễ nhớ, đo độ mạnh, 100% offline | [`/password-generator`](./password-generator) |
| **📝 QuickNote** | `v2.0.0` | Sổ tay ghi chú tức thì | Tự động lưu, quản lý danh sách ghi chú, phong cách MD3 | [`/quicknote`](./quicknote) |
| **📸 SmartShot** | `v1.1.0` | Chụp màn hình & Chú thích | Chụp toàn trang/vùng chọn, vẽ mũi tên, văn bản, làm mờ (blur) | [`/smartshot`](./smartshot) |
| **📺 YouTube Column Adjuster** | `v2.0.0` | Tùy chỉnh cột video YouTube | Chỉnh số cột linh hoạt (2–8+ cột), ẩn Shorts & dọn rác giao diện | [`/youtube-column-ajuster-ext`](./youtube-column-ajuster-ext) |
| **🎬 TubeShot** | `v1.0.0` | Chụp ảnh YouTube sạch khung hình | Chụp frame chuẩn xác, không dính UI player, chỉnh từng frame | [`/youtube-screenshot-ext`](./youtube-screenshot-ext) |

---

## 🔍 Chi tiết Từng Tiện ích

<details open>
<summary><h3>1. 🔖 TagMark — Smart Bookmark Manager (v1.1.0)</h3></summary>

Quản lý dấu trang trực tiếp với Chrome Bookmarks API nhưng mạnh mẽ và thông minh hơn rất nhiều so với trình quản lý mặc định.

- **Đồng bộ thực tế**: Đọc và ghi thẳng vào dữ liệu Chrome Bookmarks của bạn (`chrome://bookmarks`).
- **Thẻ (Tags) & Ghi chú (Notes)**: Thêm nhãn danh mục và ghi chú riêng tư cho từng bookmark.
- **Phát hiện liên kết trùng lặp**: Tự động phát hiện và cảnh báo khi bạn lưu một URL nhiều lần.
- **Thao tác hàng loạt (Bulk Actions)**: Chọn nhiều dấu trang cùng lúc để gắn thẻ hoặc xóa nhanh.
- **Phím tắt nhanh**: Nhấn `Alt + Shift + M` để bookmark ngay trang hiện tại ở bất kỳ đâu.
- **Badge Toolbar**: Hiển thị tổng số bookmark trực quan trên thanh công cụ.

👉 Xem chi tiết tại: [bookmark-manager-ext/README.md](./bookmark-manager-ext/README.md)
</details>

<details>
<summary><h3>2. 🖼️ PixGrab — Bulk Image Downloader (v2.3.0)</h3></summary>

Quét và tải về hàng loạt hình ảnh từ bất kỳ trang web nào chỉ với 1 cú click.

- **Quét thông minh**: Tự động nhận diện ảnh `<img>`, hình nền CSS `background-image` và các nguồn `srcset`.
- **Lọc mạnh mẽ**: Lọc ảnh theo chiều rộng/cao, dung lượng và định dạng (PNG, JPG, WebP, SVG...).
- **Chế độ chuẩn hóa (AI/LoRA Training Ready)**: Tự động crop và resize về kích thước tối thiểu 512x512 với tỷ lệ khung hình lên đến 3:1.
- **Tải về linh hoạt**: Tải về thư mục con riêng biệt hoặc đóng gói thành tệp nén `.zip`.

👉 Xem chi tiết tại: [bulk-image-downloader-ext/README.md](./bulk-image-downloader-ext/README.md)
</details>

<details>
<summary><h3>3. 🔤 Case Converter — Chuyển đổi định dạng chữ (v1.0.0)</h3></summary>

Công cụ biến đổi kiểu chữ cực nhanh dành cho lập trình viên, content writer và người dùng văn phòng.

- **Đa dạng kiểu chữ**:
  - `UPPERCASE` / `lowercase` / `Title Case` / `Sentence case`
  - `camelCase` / `PascalCase` / `snake_case` / `kebab-case` / `CONSTANT_CASE`
- **Chuyển đổi tức thì**: Bôi đen văn bản trên bất kỳ trang web nào và chuyển đổi ngay tại chỗ hoặc qua popup.
- **Hỗ trợ tiếng Việt có dấu**: Đảm bảo xử lý chính xác bảng mã Unicode tiếng Việt.

👉 Xem chi tiết tại: [case-converter/README.md](./case-converter/README.md)
</details>

<details>
<summary><h3>4. 🔄 PixFlip — Image Format Converter (v2.0.0)</h3></summary>

Chuyển đổi định dạng ảnh nhanh chóng ngay trên trình duyệt mà không cần tải lên các trang web chuyển đổi online của bên thứ ba.

- **Menu ngữ cảnh chuột phải**: Click phải vào bất kỳ hình ảnh nào trên web để chọn "Save Image As..." thành PNG, JPEG hoặc WEBP.
- **Chuyển đổi hàng loạt (Batch Converter)**: Kéo thả nhiều tệp ảnh từ máy tính vào popup, chuyển đổi đồng loạt và tải về thành tệp `.zip`.
- **An toàn tuyệt đối**: Sử dụng HTML5 Canvas API cục bộ, 0 network request.

👉 Xem chi tiết tại: [image-format-converter-ext/README.md](./image-format-converter-ext/README.md)
</details>

<details>
<summary><h3>5. 🔐 Password Generator — Trình tạo mật khẩu an toàn (v2.1.0)</h3></summary>

Tạo mật khẩu mạnh, cụm mật khẩu (Passphrase) và mã PIN an toàn cao theo tiêu chuẩn mã hóa.

- **3 Chế độ linh hoạt**:
  1. *Password*: Ký tự ngẫu nhiên với độ dài tùy chọn, kiểm soát chữ hoa/thường, số và ký tự đặc biệt.
  2. *Passphrase*: Tạo cụm từ theo phong cách Diceware, dễ nhớ nhưng cực kỳ bảo mật trước tấn công brute-force.
  3. *PIN*: Tạo mã PIN ngân hàng, thẻ từ 4 đến 12 số.
- **Chuẩn an toàn Web Crypto API**: Sử dụng `crypto.getRandomValues()` thay vì `Math.random()`.
- **Thanh đo độ mạnh trực quan**: Đánh giá độ bảo mật và thời gian bẻ khóa ước tính.

👉 Xem chi tiết tại: [password-generator/README.md](./password-generator/README.md)
</details>

<details>
<summary><h3>6. 📝 QuickNote — Ghi chú nhanh Material Design 3 (v2.0.0)</h3></summary>

Ghi lại ý tưởng, việc cần làm hoặc nội dung tạm thời ngay khi đang lướt web mà không làm gián đoạn công việc.

- **Lưu tự động tức thì**: Mọi thay đổi đều được lưu tức thời vào `chrome.storage.local`.
- **Quản lý danh sách**: Hỗ trợ tạo nhiều ghi chú, tìm kiếm theo tiêu đề và nội dung.
- **Ghim quan trọng**: Đưa các ghi chú ưu tiên lên đầu danh sách.
- **Xuất / Nhập dữ liệu**: Sao lưu hoặc phục hồi ghi chú dễ dàng dưới dạng tệp JSON hoặc Text.

👉 Xem chi tiết tại: [quicknote/README.md](./quicknote/README.md)
</details>

<details>
<summary><h3>7. 📸 SmartShot — Screenshot & Annotate (v1.1.0)</h3></summary>

Giải pháp chụp ảnh màn hình và chỉnh sửa chú thích chuyên nghiệp 100% trên trình duyệt.

- **3 Chế độ chụp ảnh**:
  - *Visible Area*: Chụp vùng nhìn thấy của tab hiện tại.
  - *Selected Area*: Kéo chuột chọn một vùng tùy ý trên trang.
  - *Full Page*: Tự động cuộn trang và ghép thành ảnh chụp toàn bộ website.
- **Bộ công cụ chú thích phong phú**: Bút vẽ tự do, vẽ mũi tên chỉ dẫn, hình khối (chữ nhật, elip), thêm văn bản, đánh số thứ tự bước (1, 2, 3...) và **làm mờ (Blur/Pixelate)** để che thông tin nhạy cảm.
- **Xuất file linh hoạt**: Sao chép ảnh trực tiếp vào Clipboard hoặc tải về tệp PNG chất lượng cao.

👉 Xem chi tiết tại: [smartshot/README.md](./smartshot/README.md)
</details>

<details>
<summary><h3>8. 📺 YouTube Column Adjuster (v2.0.0)</h3></summary>

Giành lại quyền kiểm soát giao diện lưới video YouTube, tối ưu cho màn hình lớn hoặc màn hình Ultrawide.

- **Tùy chỉnh số cột linh hoạt**: Đặt số cột hiển thị video (từ 2 đến 8+ cột) độc lập cho Trang chủ (Home), Kênh đăng ký (Subscriptions) và Trang chi tiết Kênh (Channel pages).
- **Bộ dọn dẹp giao diện (Declutter)**:
  - Ẩn toàn bộ video ngắn YouTube Shorts.
  - Ẩn phần bình luận (Comments) để tập trung xem video.
  - Ẩn thẻ đề xuất cuối video (End-screen cards).
  - Ẩn các khối gợi ý không mong muốn.

👉 Xem chi tiết tại: [youtube-column-ajuster-ext/README.md](./youtube-column-ajuster-ext/README.md)
</details>

<details>
<summary><h3>9. 🎬 TubeShot — YouTube Clean Screenshot (v1.0.0)</h3></summary>

Chụp lại những khoảnh khắc đẹp nhất trên video YouTube ở độ phân giải gốc cao nhất mà không bị vướng thanh điều khiển hay nút tạm dừng.

- **Không vướng giao diện**: Chỉ trích xuất đúng khung hình video gốc, loại bỏ hoàn toàn controls của YouTube player.
- **Tua từng khung hình (Frame-by-Frame)**: Phím điều hướng tiến/lùi từng frame để bắt trúng khoảnh khắc chuẩn xác đến từng mili-giây.
- **Tùy chọn đóng dấu thông minh**: Thêm timestamp thời gian hoặc tiêu đề video vào ảnh chụp.
- **Phím tắt tiện lợi**: Bấm phím tắt hoặc nút chuyên dụng ngay trên thanh điều khiển YouTube.

👉 Xem chi tiết tại: [youtube-screenshot-ext/README.md](./youtube-screenshot-ext/README.md)
</details>

---

## ⚡ Hướng dẫn Cài đặt (Installation)

Các tiện ích đều ở dạng mã nguồn mở sẵn sàng sử dụng (Unpacked Extension). Bạn có thể cài đặt bất kỳ tiện ích nào vào trình duyệt theo các bước đơn giản sau:

### Bước 1: Tải mã nguồn về máy
```bash
# Clone kho lưu trữ này về máy tính của bạn
git clone https://github.com/minhtrong67/my-extension-pack.git
```
*(Hoặc nhấn nút **Code** > **Download ZIP** trên GitHub rồi giải nén thư mục).*

### Bước 2: Mở trang quản lý tiện ích trên trình duyệt
Mở trình duyệt của bạn và nhập đường dẫn sau vào thanh địa chỉ:
- **Google Chrome**: `chrome://extensions`
- **Microsoft Edge**: `edge://extensions`
- **Brave Browser**: `brave://extensions`
- **Cốc Cốc**: `coccoc://extensions`

### Bước 3: Bật chế độ nhà phát triển (Developer Mode)
- Tìm thanh gạt **"Developer mode"** (Chế độ dành cho nhà phát triển) ở góc trên bên phải màn hình và bật lên (Chuyển sang màu xanh).

### Bước 4: Tải tiện ích vào trình duyệt
1. Nhấn vào nút **"Load unpacked"** (Tải tiện ích đã giải nén) ở góc trên bên trái.
2. Điều hướng đến thư mục `my-extension-pack` và chọn thư mục của extension bạn muốn cài (Ví dụ: `my-extension-pack/smartshot` hoặc `my-extension-pack/bookmark-manager-ext`).
3. Nhấn **Select Folder** (Chọn thư mục).
4. Extension sẽ xuất hiện ngay trên danh sách tiện ích và thanh công cụ của bạn!

> 💡 **Mẹo:** Nhấn vào biểu tượng mảnh ghép (Extensions Puzzle Icon) trên thanh công cụ của trình duyệt và nhấn biểu tượng chiếc ghim (📌 Pin) để ghim tiện ích ra ngoài cho thuận tiện sử dụng.

---

## ⌨️ Cài đặt Phím tắt (Shortcuts)

Bạn có thể tùy biến phím tắt cho tất cả các tiện ích bằng cách:
1. Truy cập `chrome://extensions/shortcuts` trên thanh địa chỉ.
2. Tìm tiện ích tương ứng (Ví dụ: *SmartShot*, *TagMark*, *TubeShot*).
3. Nhấp vào biểu tượng chiếc bút chì và bấm tổ hợp phím mong muốn (Ví dụ: `Alt + S`, `Ctrl + Shift + K`...).

---

## 🛡️ Triết lý Cốt lõi

```
┌─────────────────────────────────────────────────────────────┐
│                    MY EXTENSION PACK                        │
│                                                             │
│   🔒 Privacy First    ⚡ Manifest V3    🎨 Material M3      │
│     100% Offline       Modern API        Light / Dark       │
│     Zero Telemetry     Lightweight       EN / VI Bilingual  │
└─────────────────────────────────────────────────────────────┘
```

1. **Bảo mật & Quyền riêng tư (Zero Data Collection)**
   - Không chứa mã theo dõi bên thứ ba (Google Analytics, Mixpanel, v.v.).
   - Không gửi dữ liệu người dùng ra bên ngoài.
   - Chỉ yêu cầu các quyền hạn (`permissions`) thực sự cần thiết cho hoạt động của tiện ích.

2. **Tiêu chuẩn Google Manifest V3**
   - Sử dụng `Service Workers` nền thay thế cho background pages cũ, giúp giải phóng RAM khi không có tác vụ.
   - Tuân thủ đầy đủ chính sách của Chrome Web Store.

3. **Ngôn ngữ Thiết kế Material Design 3**
   - Hệ thống bảng màu linh hoạt, góc bo tròn mềm mại, độ tương phản trực quan.
   - Hỗ trợ mượt mà chế độ Sáng/Tối theo cài đặt hệ điều hành hoặc tùy chỉnh thủ công.

---

## 🌐 Khả năng Tương thích

Các tiện ích này tương thích hoàn toàn với tất cả các trình duyệt hiện đại chạy trên nền tảng **Chromium Engine**:

| Trình duyệt | Trạng thái | Ghi chú |
| :--- | :---: | :--- |
| **Google Chrome** | ✅ Hoàn toàn tương thích | Phiên bản 100+ (Khuyến nghị 114+) |
| **Microsoft Edge** | ✅ Hoàn toàn tương thích | Tất cả tính năng hoạt động mượt mà |
| **Brave Browser** | ✅ Hoàn toàn tương thích | Tương thích 100%, bảo mật cao |
| **Opera / Opera GX** | ✅ Hoàn toàn tương thích | Bật Developer Mode trong Extensions |
| **Vivaldi** | ✅ Hoàn toàn tương thích | Tương thích đầy đủ |
| **Cốc Cốc** | ✅ Hoàn toàn tương thích | Tương thích đầy đủ |

---

## 📁 Cấu trúc Thư mục

```text
my-extension-pack/
├── bookmark-manager-ext/       # TagMark — Quản lý dấu trang Chrome thông minh
├── bulk-image-downloader-ext/  # PixGrab — Quét và tải ảnh hàng loạt
├── case-converter/             # Case Converter — Chuyển đổi định dạng chữ
├── image-format-converter-ext/ # PixFlip — Chuyển đổi định dạng ảnh (PNG/JPG/WebP)
├── password-generator/         # Password Generator — Tạo mật khẩu & PIN an toàn
├── quicknote/                  # QuickNote — Ghi chú nhanh Material Design 3
├── smartshot/                  # SmartShot — Chụp màn hình & Chú thích chuyên sâu
├── youtube-column-ajuster-ext/ # YouTube Column Adjuster — Tùy biến lưới video YouTube
├── youtube-screenshot-ext/     # TubeShot — Chụp khung hình YouTube sắc nét
└── README.md                   # Tài liệu hướng dẫn chính của bộ tiện ích
```

Mỗi thư mục con là một tiện ích độc lập chứa đầy đủ tệp `manifest.json`, mã nguồn HTML/CSS/JavaScript, thư mục biểu tượng `icons/` và tệp hướng dẫn sử dụng chi tiết `README.md`.

---

## 🛠️ Phát triển & Đóng góp

Nếu bạn muốn đóng góp tính năng mới hoặc báo cáo lỗi (issues):

1. **Fork** kho lưu trữ này về tài khoản GitHub của bạn.
2. Tạo một nhánh mới (`git checkout -b feature/AmazingFeature`).
3. Thực hiện thay đổi và commit (`git commit -m 'Add some AmazingFeature'`).
4. Đẩy mã lên nhánh của bạn (`git push origin feature/AmazingFeature`).
5. Mở một **Pull Request** trên GitHub.

Mọi ý kiến đóng góp, báo lỗi hoặc đề xuất tính năng mới đều luôn được hoan nghênh!

---

## 👤 Tác giả & Bản quyền

- **Tác giả:** [minhtrong67](https://github.com/minhtrong67)
- **Email:** [minhtrong9760@gmail.com](mailto:minhtrong9760@gmail.com)
- **GitHub:** [@minhtrong67](https://github.com/minhtrong67)

Dự án được phân phối dưới giấy phép **MIT License**. Bạn hoàn toàn có thể tự do sử dụng, chỉnh sửa và phân phối cho mục đích cá nhân cũng như thương mại. Chi tiết xem tại [LICENSE](LICENSE).

<div align="center">

⭐ **Nếu bạn thấy bộ tiện ích này hữu ích, hãy tặng dự án 1 Star trên GitHub nhé!** ⭐

</div>
