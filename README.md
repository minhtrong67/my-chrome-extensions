<div align="center">

# 🚀 My Chrome Extensions

**Bộ sưu tập 10 tiện ích mở rộng Chromium (Manifest V3) mạnh mẽ, hiện đại, bảo mật và hoàn toàn ngoại tuyến.**  
*A curated suite of 10 high-performance, privacy-first Chromium extensions styled with Material 3 Expressive.*

---

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-10B981?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Chromium Compatible](https://img.shields.io/badge/Chromium-Compatible-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](#-khả-năng-tương-thích)
[![Privacy 100% On-Device](https://img.shields.io/badge/Privacy-100%25%20On--Device-success?style=for-the-badge&logo=shield)](https://github.com/minhtrong67/my-chrome-extensions)
[![Design Material 3 Expressive](https://img.shields.io/badge/UI-Material%203%20Expressive-7C3AED?style=for-the-badge&logo=materialdesign)](https://m3.material.io/)
[![Bilingual](https://img.shields.io/badge/i18n-English%20%7C%20Tiếng%20Việt-3B82F6?style=for-the-badge)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

[🌟 Giới thiệu](#-giới-thiệu) • [📦 Danh sách Tiện ích](#-danh-sách-10-tiện-ích) • [⚡ Hướng dẫn Cài đặt](#-hướng-dẫn-cài-đặt-installation) • [🛡️ Triết lý Cốt lõi](#-triết-lý-cốt-lõi) • [📁 Cấu trúc Thư mục](#-cấu-trúc-thư-mục) • [👤 Tác giả](#-tác-giả--bản-quyền)

</div>

---

## 🌟 Giới thiệu

**My Chrome Extensions** là kho lưu trữ mã nguồn mở tập hợp **10 tiện ích mở rộng** cho trình duyệt Google Chrome và các trình duyệt họ Chromium (Edge, Brave, Opera, Vivaldi, Cốc Cốc...). Toàn bộ tiện ích đều được xây dựng trên nền tảng **Manifest V3** mới nhất và ngôn ngữ thiết kế **Material 3 Expressive (2026)**.

### 💎 Điểm nổi bật:
- 🔒 **100% Offline & Bảo mật tuyệt đối**: Mọi tác vụ được xử lý cục bộ ngay trên trình duyệt của bạn qua HTML5 Canvas, Web Crypto API và Chrome APIs. Không thu thập dữ liệu (0 Telemetry), không gửi request ra máy chủ bên thứ ba, không chèn quảng cáo.
- 🎨 **Material 3 Expressive UI**: Ngôn ngữ thiết kế thế hệ mới với các hình khối bo góc mềm mại, bảng màu tương phản linh hoạt, chuyển động mượt mà và tự động thích ứng với chế độ Sáng / Tối (Light & Dark theme).
- 🌐 **Hỗ trợ Song ngữ Toàn diện**: Mọi tiện ích đều hỗ trợ hoàn chỉnh cả **Tiếng Việt** và **English**.
- ⚡ **Tối ưu Hiệu năng & RAM**: Sử dụng Background Service Workers tự động giải phóng bộ nhớ khi rảnh, khởi chạy tức thì và không làm chậm trình duyệt.

---

## 📦 Danh sách 10 Tiện ích

| # | Tiện ích | Phiên bản | Danh mục | Mô tả nổi bật | Phím tắt mặc định | Thư mục |
| :-: | :--- | :---: | :---: | :--- | :---: | :---: |
| 1 | **📸 SmartShot** | `v1.3.0` | Media | Chụp màn hình (vùng thấy, vùng chọn, toàn trang), chú thích mũi tên/chữ/bước & làm mờ bảo mật | `Alt + Shift + S` | [`/smartshot`](./smartshot) |
| 2 | **📝 QuickNote** | `v3.0.0` | Năng suất | Sổ tay ghi chú tức thì, tự động lưu cục bộ, tìm kiếm, ghim ưu tiên & sao lưu JSON/TXT | `Alt + Shift + N` | [`/quicknote`](./quicknote) |
| 3 | **🔖 TagMark** | `v2.0.0` | Năng suất | Quản lý Bookmark Chrome bằng thẻ (tags), ghi chú riêng tư, lọc nhanh & phát hiện link trùng | `Alt + Shift + M` | [`/bookmark-manager`](./bookmark-manager) |
| 4 | **📺 YouTube Grid** | `v3.0.0` | YouTube | Tùy biến số cột video YouTube (2–8+ cột), ẩn Shorts, bình luận và đề xuất rác | Tự động | [`/youtube-grid`](./youtube-grid) |
| 5 | **🎬 TubeShot** | `v1.1.0` | YouTube | Chụp khung hình YouTube sạch ở độ phân giải gốc cao nhất, tua frame mili-giây, đóng dấu thời gian | Nút Player | [`/youtube-screenshot`](./youtube-screenshot) |
| 6 | **🔐 Password Generator** | `v3.0.0` | Bảo mật | Tạo mật khẩu, passphrase Diceware và mã PIN ngân hàng bằng Web Crypto API an toàn cao | Popup | [`/password-generator`](./password-generator) |
| 7 | **🔄 Photo Converter** | `v3.0.0` | Media | Click phải lưu ảnh thành PNG/JPEG/WEBP hoặc kéo thả chuyển đổi hàng loạt nén file `.zip` | Context Menu | [`/photo-converter`](./photo-converter) |
| 8 | **🖼️ Multi Downloader** | `v3.0.0` | Media | Quét toàn trang tải ảnh hàng loạt, lọc dung lượng/kích thước, auto-crop 512×512 cho huấn luyện AI | Popup | [`/multi-downloader`](./multi-downloader) |
| 9 | **🔤 Case Converter** | `v1.0.0` | Năng suất | Chuyển đổi hơn 9 kiểu chữ (UPPER, camelCase, snake_case...) ngay tại chỗ hoặc popup | Phím tắt / Popup | [`/case-converter`](./case-converter) |
| 10 | **⌨️ Settings Shortcuts** | `v1.0.0` | Tiện ích | Mở tức thì các trang cài đặt và nội bộ của Chrome (`chrome://...`) bằng phím tắt cá nhân hóa | `Alt + Shift + S` | [`/chrome-shortcuts`](./chrome-shortcuts) |

---

## 🔍 Chi tiết Tính năng Từng Tiện ích

<details open>
<summary><h3>1. 📸 SmartShot — Screenshot & Annotate (v1.3.0)</h3></summary>

Giải pháp chụp ảnh màn hình và biên tập chú thích chuyên sâu, xử lý 100% cục bộ trong tab trình duyệt.

- **3 Chế độ chụp ảnh:**
  - *Visible Area:* Chụp tức thì vùng hiển thị hiện tại của màn hình.
  - *Selected Area:* Kéo chuột chọn chính xác phân vùng mong muốn.
  - *Full Page:* Tự động cuộn trang thông minh và ghép thành ảnh chụp toàn bộ website.
- **Bộ công cụ chú thích phong phú:** Bút vẽ tự do, mũi tên chỉ dẫn, hình chữ nhật/elip, văn bản tùy biến và đánh số thứ tự bước (1, 2, 3...).
- **Che mờ thông tin bảo mật:** Công cụ Blur và Pixelate giúp bạn dễ dàng làm mờ mật khẩu, thông tin cá nhân hoặc dữ liệu nhạy cảm trước khi chia sẻ.
- **Xuất ảnh đa năng:** Tải tệp PNG chất lượng cao hoặc sao chép thẳng vào Clipboard để dán nhanh vào Chat/Email.

👉 Thư mục mã nguồn: [`/smartshot`](./smartshot)
</details>

<details>
<summary><h3>2. 📝 QuickNote — Instant Material 3 Scratchpad (v3.0.0)</h3></summary>

Sổ tay ghi chú tức thì phong cách Material Design 3 Expressive, giúp bạn ghi lại ý tưởng, việc cần làm mà không làm gián đoạn luồng làm việc.

- **Tự động lưu tức thì:** Mọi ký tự gõ vào đều được lưu ngay lập tức vào `chrome.storage.local`.
- **Quản lý danh sách linh hoạt:** Hỗ trợ tạo nhiều ghi chú độc lập, tìm kiếm thời gian thực theo tiêu đề và nội dung.
- **Ghim quan trọng (Pin):** Đưa các ghi chú khẩn cấp hoặc quan trọng lên đầu danh sách.
- **Sao lưu & Phục hồi:** Xuất và nhập dữ liệu dễ dàng dưới định dạng JSON hoặc Plain Text.

👉 Thư mục mã nguồn: [`/quicknote`](./quicknote)
</details>

<details>
<summary><h3>3. 🔖 TagMark — Smart Bookmark Manager (v2.0.0)</h3></summary>

Nâng tầm trình quản lý bookmark mặc định của trình duyệt với khả năng phân loại bằng thẻ đa tầng.

- **Đồng bộ trực tiếp:** Đọc và ghi trực tiếp vào cơ sở dữ liệu Chrome Bookmarks của bạn (`chrome://bookmarks`).
- **Gắn thẻ đa năng (Multi-Tagging):** Phân loại bookmark bằng nhiều nhãn linh hoạt kèm ghi chú riêng tư.
- **Phát hiện URL trùng lặp:** Tự động cảnh báo khi bạn chuẩn bị lưu lại một liên kết đã tồn tại.
- **Thao tác hàng loạt (Bulk Actions):** Chọn nhiều bookmark cùng lúc để gắn thẻ chung hoặc dọn dẹp hàng loạt.
- **Phím tắt nhanh:** Nhấn `Alt + Shift + M` để mở trình quản lý ở bất kỳ đâu.

👉 Thư mục mã nguồn: [`/bookmark-manager`](./bookmark-manager)
</details>

<details>
<summary><h3>4. 📺 YouTube Grid — Grid Adjuster & Cleaner (v3.0.0)</h3></summary>

Giành lại toàn quyền kiểm soát bố cục hiển thị video trên YouTube, tối ưu hoàn hảo cho màn hình lớn, 2K, 4K hoặc Ultrawide.

- **Tùy chỉnh số cột linh hoạt:** Đặt số cột hiển thị từ 2 đến 8+ cột độc lập cho Trang chủ (Home), Kênh đăng ký (Subscriptions) và Trang chi tiết Kênh (Channel pages).
- **Bộ dọn dẹp giao diện (Declutter):**
  - Ẩn hoàn toàn định dạng video ngắn YouTube Shorts.
  - Ẩn khu vực bình luận (Comments) để tập trung nội dung.
  - Ẩn thẻ đề xuất cuối video (End-screen cards).
- **Áp dụng tức thì:** Lưu cài đặt và cập nhật CSS ngay lập tức mà không cần tải lại trang.

👉 Thư mục mã nguồn: [`/youtube-grid`](./youtube-grid)
</details>

<details>
<summary><h3>5. 🎬 TubeShot — YouTube Clean Screenshot (v1.1.0)</h3></summary>

Trích xuất ảnh tĩnh từ video YouTube ở độ phân giải gốc cao nhất mà không bị vướng thanh tiến trình hay nút tạm dừng.

- **Khung hình 100% sạch sẽ:** Lấy trực tiếp từ luồng video HTML5, loại bỏ hoàn toàn giao diện điều khiển của YouTube Player.
- **Tua từng khung hình (Frame-by-Frame):** Phím tắt điều hướng tiến/lùi từng frame để bắt trọn khoảnh khắc chính xác từng mili-giây.
- **Huy hiệu thời gian:** Tùy chọn đóng dấu mốc thời gian (Timestamp) và tiêu đề video lên ảnh chụp.
- **Nút bấm tích hợp:** Tích hợp trực tiếp nút chụp chuyên dụng ngay trên thanh công cụ phát video của YouTube.

👉 Thư mục mã nguồn: [`/youtube-screenshot`](./youtube-screenshot)
</details>

<details>
<summary><h3>6. 🔐 Password Generator — Secure Passwords & PINs (v3.0.0)</h3></summary>

Công cụ tạo mật khẩu mạnh mẽ, cụm mật khẩu (Passphrase) và mã PIN chuẩn bảo mật mật mã học.

- **3 Chế độ linh hoạt:**
  1. *Password:* Ký tự ngẫu nhiên kiểm soát chữ hoa, chữ thường, chữ số và ký hiệu đặc biệt.
  2. *Passphrase:* Tạo cụm từ ngẫu nhiên theo chuẩn Diceware, cực kỳ dễ nhớ đối với con người nhưng bất khả thi khi tấn công brute-force.
  3. *PIN:* Mã PIN an toàn từ 4 đến 12 số dùng cho thẻ hoặc bảo mật 2 lớp.
- **Web Crypto API:** Sử dụng entropy phần cứng `crypto.getRandomValues()` thay vì thuật toán giả ngẫu nhiên thông thường.
- **Đo độ mạnh trực quan:** Hiển thị thang điểm bảo mật kèm ước tính thời gian máy tính cần để bẻ khóa.
- **Loại bỏ ký tự dễ nhầm:** Tùy chọn loại bỏ các ký tự tương đồng như `l`, `1`, `I`, `O`, `0`.

👉 Thư mục mã nguồn: [`/password-generator`](./password-generator)
</details>

<details>
<summary><h3>7. 🔄 Photo Converter — Instant Image Transformer (v3.0.0)</h3></summary>

Chuyển đổi định dạng ảnh nhanh chóng ngay trên trình duyệt mà không cần tải lên các dịch vụ chuyển đổi đám mây của bên thứ ba.

- **Menu ngữ cảnh chuột phải:** Nhấp chuột phải vào bất kỳ bức ảnh nào trên mạng để lưu trực tiếp thành định dạng PNG, JPEG hoặc WEBP.
- **Chuyển đổi hàng loạt (Batch Converter):** Kéo thả nhiều ảnh cùng lúc từ máy tính vào popup để chuyển đổi đồng loạt và tải về thành tệp `.zip`.
- **Điều chỉnh chất lượng:** Tích hợp thanh trượt kiểm soát tỷ lệ nén và chất lượng ảnh đầu ra.
- **An toàn tuyệt đối:** Sử dụng HTML5 Canvas API cục bộ, 0 kết nối mạng ngoài.

👉 Thư mục mã nguồn: [`/photo-converter`](./photo-converter)
</details>

<details>
<summary><h3>8. 🖼️ Multi Downloader — Bulk Image Downloader & AI Cropper (v3.0.0)</h3></summary>

Quét và tải về hàng loạt hình ảnh từ bất kỳ trang web nào chỉ với 1 cú click, kèm chế độ chuẩn hóa cho mô hình AI.

- **Quét sâu toàn diện:** Nhận diện toàn bộ ảnh từ thẻ `<img>`, hình nền CSS `background-image` và thuộc tính `srcset`.
- **Bộ lọc thông minh:** Lọc theo kích thước (chiều rộng/cao tối thiểu), dung lượng và định dạng tệp; tự động bỏ qua các icon trang web hay avatar nhỏ.
- **AI / LoRA Ready:** Tự động cắt (crop) và đổi kích thước về tỷ lệ chuẩn 512×512 (hạn mức tỷ lệ 3:1) phục vụ huấn luyện mô hình thị giác máy tính.
- **Tải linh hoạt:** Tải thẳng về thư mục con riêng biệt hoặc đóng gói tệp nén `.zip`.

👉 Thư mục mã nguồn: [`/multi-downloader`](./multi-downloader)
</details>

<details>
<summary><h3>9. 🔤 Case Converter — Text Case Transformer (v1.0.0)</h3></summary>

Tiện ích chuyển đổi định dạng chữ tức thì dành cho lập trình viên, content creator và dân văn phòng.

- **Đa dạng kiểu chữ thông dụng:**
  - `UPPERCASE` / `lowercase` / `Title Case` / `Sentence case`
  - `camelCase` / `PascalCase` / `snake_case` / `kebab-case` / `CONSTANT_CASE`
- **Chuyển đổi ngay tại chỗ:** Bôi đen văn bản trên trang và nhấn phím tắt để thay đổi nội dung tức thì hoặc dùng popup.
- **Hỗ trợ Unicode tiếng Việt:** Xử lý chính xác 100% các nguyên âm tiếng Việt có dấu (`à`, `á`, `ả`, `ã`, `ạ`, `ê`, `ô`, `ơ`, `ư`...).

👉 Thư mục mã nguồn: [`/case-converter`](./case-converter)
</details>

<details>
<summary><h3>10. ⌨️ Settings Shortcuts — Chrome Internal Launcher (v1.0.0)</h3></summary>

Mở nhanh các trang cài đặt và tính năng nội bộ cốt lõi của Chrome thông qua hệ thống phím tắt bàn phím tùy biến.

- **Truy cập siêu tốc:** Gán phím tắt để bật ngay các trang `chrome://settings`, `chrome://extensions`, `chrome://downloads`, `chrome://history`, `chrome://bookmarks`...
- **Tùy biến không giới hạn:** Trang Options trực quan cho phép gán và thay đổi phím tắt theo thói quen sử dụng cá nhân.
- **Cực nhẹ & Tức thì:** Không duy trì service worker chạy ngầm, không tốn tài nguyên RAM.

👉 Thư mục mã nguồn: [`/chrome-shortcuts`](./chrome-shortcuts)
</details>

---

## ⚡ Hướng dẫn Cài đặt (Installation)

Các tiện ích trong kho lưu trữ này đều ở dạng mã nguồn mở sẵn sàng sử dụng (**Unpacked Extension**). Bạn không cần cài đặt Node.js hay chạy bất kỳ lệnh build nào:

### Bước 1: Tải mã nguồn về máy tính
Mở Terminal hoặc Command Prompt và clone kho lưu trữ:
```bash
git clone https://github.com/minhtrong67/my-chrome-extensions.git
```
*(Hoặc nhấn nút **Code** > **Download ZIP** ở đầu trang GitHub này rồi giải nén thư mục ra ổ đĩa của bạn).*

### Bước 2: Truy cập trang quản lý Extension
Mở trình duyệt của bạn và nhập địa chỉ tương ứng:
- **Google Chrome:** `chrome://extensions`
- **Microsoft Edge:** `edge://extensions`
- **Brave Browser:** `brave://extensions`
- **Cốc Cốc:** `coccoc://extensions`
- **Opera / Vivaldi:** `opera://extensions` hoặc `vivaldi://extensions`

### Bước 3: Bật "Developer Mode" (Chế độ nhà phát triển)
- Gạt thanh bật **"Developer mode"** ở góc trên cùng bên phải màn hình sang trạng thái **Bật** (màu xanh).

### Bước 4: Tải tiện ích vào trình duyệt (Load Unpacked)
1. Nhấp vào nút **"Load unpacked"** (Tải tiện ích đã giải nén) ở góc trên bên trái.
2. Tìm đến thư mục `my-chrome-extensions` vừa tải về.
3. Chọn thư mục của tiện ích bạn muốn cài đặt (ví dụ: `smartshot`, `quicknote`, `bookmark-manager`...).
4. Nhấn **Select Folder** (Chọn thư mục). Tiện ích sẽ được nạp và hoạt động ngay lập tức!

> 💡 **Mẹo:** Nhấp vào biểu tượng **Mảnh ghép** (Extensions Menu) trên thanh công cụ của trình duyệt và nhấn biểu tượng chiếc **Ghim** (📌 Pin) để đưa tiện ích ra ngoài thanh công cụ giúp thao tác thuận tiện nhất.

---

## ⌨️ Cài đặt Phím tắt (Shortcuts)

Bạn có thể tùy biến phím tắt của tất cả các tiện ích theo ý thích:
1. Truy cập `chrome://extensions/shortcuts` trên thanh địa chỉ.
2. Tìm tiện ích tương ứng (ví dụ: *SmartShot*, *QuickNote*, *TagMark*, *Settings Shortcuts*).
3. Nhấp vào biểu tượng chiếc bút chì và ấn tổ hợp phím mong muốn (Ví dụ: `Alt + S`, `Ctrl + Shift + Y`...).

---

## 🛡️ Triết lý Cốt lõi & Bảo mật

```
┌─────────────────────────────────────────────────────────────────┐
│                    MY CHROME EXTENSIONS                         │
│                                                                 │
│   🔒 Privacy First      ⚡ Manifest V3      🎨 Material 3       │
│      100% Cục bộ           Service Workers    Expressive UI     │
│      Zero Telemetry        Siêu nhẹ, 0 lag    Light / Dark      │
│      Không quảng cáo       Bảo mật đa lớp     EN / VI Song ngữ  │
└─────────────────────────────────────────────────────────────────┘
```

1. **Zero Data Collection (Không thu thập dữ liệu)**
   - Không chứa bất kỳ mã theo dõi (Google Analytics, Mixpanel, Sentry...).
   - Không gửi dữ liệu người dùng ra bên ngoài Internet.
   - Chỉ yêu cầu các quyền hạn (`permissions`) tối thiểu tuyệt đối cần thiết để thực thi tính năng.

2. **Tiêu chuẩn Hiện đại Manifest V3**
   - Sử dụng `Service Workers` thế hệ mới thay thế cho background pages cũ, tự động ngắt kết nối và giải phóng RAM khi không có sự kiện.
   - Tuân thủ nghiêm ngặt các quy định bảo mật mới nhất của Chromium Web Store.

3. **Material 3 Expressive Design System**
   - Tông màu chuyển động linh hoạt (Dynamic Color), độ tương phản cao, bo góc mềm mại đặc trưng Material 3.
   - Tự động đồng bộ với cài đặt hệ điều hành (Sáng / Tối / Tự động).

---

## 🌐 Khả năng Tương thích

Tất cả các tiện ích đã được thử nghiệm và hoạt động mượt mà trên nền tảng **Chromium Engine** (phiên bản 100+):

| Trình duyệt | Trạng thái | Đánh giá |
| :--- | :---: | :--- |
| **Google Chrome** | ✅ Tương thích 100% | Hoàn hảo trên phiên bản 114+ trở lên |
| **Microsoft Edge** | ✅ Tương thích 100% | Hoạt động mượt mà với đầy đủ tính năng |
| **Brave Browser** | ✅ Tương thích 100% | Bảo mật tối đa, tương thích hoàn toàn |
| **Opera & Opera GX**| ✅ Tương thích 100% | Bật Developer Mode trong trang tiện ích |
| **Vivaldi** | ✅ Tương thích 100% | Tương thích đầy đủ |
| **Cốc Cốc** | ✅ Tương thích 100% | Tương thích đầy đủ trên nhân Chromium |

---

## 📁 Cấu trúc Thư mục

```text
my-chrome-extensions/
├── bookmark-manager/     # TagMark — Quản lý dấu trang Chrome bằng thẻ tag
├── case-converter/       # Case Converter — Chuyển đổi định dạng chữ đa năng
├── chrome-shortcuts/     # Settings Shortcuts — Phím tắt mở nhanh trang cài đặt Chrome
├── multi-downloader/     # Multi Downloader — Quét & tải ảnh hàng loạt, AI crop
├── password-generator/   # Password Generator — Tạo mật khẩu & PIN ngoại tuyến an toàn
├── photo-converter/      # Photo Converter — Đổi đuôi ảnh tức thì (PNG/JPEG/WEBP)
├── quicknote/            # QuickNote — Sổ tay ghi chú tức thì Material 3
├── smartshot/            # SmartShot — Chụp & chú thích ảnh màn hình chuyên sâu
├── youtube-grid/         # YouTube Grid — Tùy biến số cột video YouTube & dọn Shorts
├── youtube-screenshot/   # TubeShot — Chụp ảnh video YouTube sạch khung hình
├── index.html            # Trang Landing Page Material 3 Expressive giới thiệu sản phẩm
└── README.md             # Tài liệu hướng dẫn chính thức của dự án
```

---

## 🛠️ Đóng góp & Phát triển

Mọi ý kiến đóng góp, phát hiện lỗi hoặc đề xuất cải tiến đều được hoan nghênh:

1. **Fork** kho lưu trữ về tài khoản GitHub của bạn: `https://github.com/minhtrong67/my-chrome-extensions`.
2. Tạo nhánh tính năng mới (`git checkout -b feature/AmazingFeature`).
3. Cam kết thay đổi (`git commit -m 'Add some AmazingFeature'`).
4. Đẩy mã lên nhánh của bạn (`git push origin feature/AmazingFeature`).
5. Mở một **Pull Request** trên GitHub.

---

## 👤 Tác giả & Bản quyền

- **Tác giả:** [minhtrong67](https://github.com/minhtrong67)
- **Email liên hệ:** [minhtrong9760@gmail.com](mailto:minhtrong9760@gmail.com)
- **GitHub Profile:** [@minhtrong67](https://github.com/minhtrong67)
- **Repository:** [https://github.com/minhtrong67/my-chrome-extensions](https://github.com/minhtrong67/my-chrome-extensions)

Dự án được phân phối dưới giấy phép **MIT License**. Bạn có toàn quyền sử dụng, sửa đổi và tích hợp vào các dự án cá nhân cũng như thương mại. Xem chi tiết tại tệp [LICENSE](LICENSE).

<div align="center">

⭐ **Nếu bạn yêu thích hoặc thấy bộ tiện ích này hữu ích, hãy tặng dự án một ngôi sao (Star) trên GitHub nhé!** ⭐

</div>
