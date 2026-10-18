# PixGrab — Bulk Image Downloader

<p align="center">
  <img src="icons/icon128.png" width="96" alt="PixGrab icon">
</p>

<p align="center">
  A Chrome extension that scans any webpage and downloads multiple images at once — filter by format or size, convert to JPG, and save exactly where you want.<br>
  Tiện ích Chrome giúp quét bất kỳ trang web nào và tải nhiều ảnh cùng lúc — lọc theo định dạng hoặc kích thước, chuyển đổi sang JPG, và lưu đúng nơi bạn muốn.
</p>

---

## 🇬🇧 English

### Features

- **Popup image scanner** — Opens a popup that lists every image on the current page (including CSS background-images); save one, several, or all at once
- **Format filter chips** — Narrow the list to just JPG, PNG, WebP, GIF… before doing a bulk save
- **Largest-first sorting** — Real content photos surface above tiny icons and tracking pixels automatically
- **Skip small images** — Configurable minimum size (in px) hides icons/sprites from the scan results
- **Rescan button** — Re-scan the page on demand, for lazy-loaded or infinite-scroll content that appeared after the popup opened
- **Selective JPG conversion** — Convert WebP, PNG, and/or GIF independently; turn a toggle off and that format downloads in its **original** format instead (GIFs keep their animation, PNGs keep transparency, etc.)
- **Right-click to save** — Right-click any single image on any webpage and select "Save Image with PixGrab"
- **Toolbar badge** — Shows how many images were found on the current tab at a glance
- **Live progress** — Bulk-save buttons show "Saving 3 of 12…" instead of a static spinner
- **Custom quality** — JPEG quality slider from 10–100 (default: 92), only applied to images that actually get converted
- **Custom save folder** — Save into a subfolder inside Downloads with **any name you like** — including Vietnamese/Unicode names, spaces, and nested paths like `Ảnh/Đã chuyển`
- **Filename templates** — Use variables `{original}`, `{date}`, `{time}`, `{datetime}` to name files automatically, with a live filename preview
- **Conflict action** — Choose auto-rename, overwrite, or prompt when a file already exists
- **Theme** — Light, Dark, or follow System preference, applied instantly with no flash on open
- **Language** — English, Tiếng Việt, or follow System default
- **Settings that stick** — Every preference is saved via Chrome's synced storage and remembered next time

### What changed in v2.3.0

- **Auto-exclude logos:** bulk saving (Save all / Save selected) now automatically leaves out logos, brand marks and site icons. A logo is detected from its file name (`logo`, `wordmark`, `favicon`…), `alt` text, CSS class / id / `itemprop="logo"`, wrappers such as `navbar-brand` or `client-logos`, small images that link back to the site's home page, and small images inside `header` / `nav` / `footer`. The same file used both as a logo and as content is kept.
- The popup shows how many logos were hidden (e.g. "PAGE IMAGES · 6 logos hidden"). Logos are removed before the 120-image cap, so they can't push real images out of the list.
- New **Auto-exclude logos** switch in Settings → Behaviour (on by default). The right-click "Save Image with PixGrab" action is unaffected — it always saves exactly the image you clicked.

### What changed in v2.2.0

- **Auto-fix instead of skip:** images that don't meet the 512×512 minimum or the 3:1 max aspect ratio are no longer skipped — PixGrab now automatically center-crops overly elongated images down to a 3:1 ratio and/or upscales undersized images so the shorter side reaches 512px, then saves the result. A save is only skipped now if it truly can't be processed (unreadable dimensions, or a cross-origin image that blocks canvas access).
- The popup list still flags images below 512×512/beyond 3:1 with a small in-place marker, now worded as "will be auto-cropped/resized" rather than "skipped".

### What changed in v2.1.0

- **Format restriction:** PixGrab now only scans and downloads **PNG, JPG/JPEG, or WebP** images. GIF, SVG, AVIF, BMP, and images whose URL has no recognizable extension are excluded from the popup scanner and rejected (with a notification) if attempted via the right-click menu.
- **Size/ratio requirement enforced everywhere:** every download — popup bulk-save, single-image save, and right-click — is checked against the image's real decoded pixels: at least 512×512, and no more elongated than 3:1 (longer side : shorter side).
- Removed the "Convert GIF" setting, since GIF is no longer a supported download format.

### What changed in v2.0.0

- **Fixed:** the "Convert WebP / PNG / GIF" toggles in Settings were saved but silently ignored — every image was always force-converted to JPG regardless of these switches. They now work correctly, and unconverted images keep their real extension and quality (GIFs keep animating).
- **Fixed:** the right-click menu and the popup's bulk-save used two separate, slowly-diverging copies of the save logic. They now share one implementation (`shared.js`), so behavior is guaranteed to be identical everywhere.
- Renamed from *JPG Snap* to **PixGrab** to better reflect its main job: grabbing many images off a page, not just converting one.
- Added format filter chips, size-based sorting, a rescan button, a toolbar badge, live bulk-save progress, and a configurable minimum-image-size filter.

### Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `pixgrab` folder
6. The extension icon will appear in your toolbar

### Usage

**Method 1 — Popup scanner (bulk download):**
1. Click the extension icon in your toolbar
2. The popup lists every image found on the current page, largest first
3. Optionally tap a format chip (JPG / PNG / WebP…) to narrow the list
4. Tap individual images to select them, or use **Select all**
5. Click **Save selected** or **Save all** — the button shows live progress while it works
6. If the page loads more images after you opened the popup (infinite scroll, lazy loading), tap the refresh icon to rescan

**Method 2 — Right-click a single image:**
1. Right-click any image on a webpage
2. Select **"Save Image with PixGrab"**
3. It's saved to your Downloads (or configured subfolder), converted to JPG only if that format's toggle is enabled in Settings

**Settings:**
- Click the gear icon in the popup header, or
- Go to `chrome://extensions/` → Find the extension → **Details** → **Extension options**

### Filename Template Variables

| Variable | Description | Example |
|---|---|---|
| `{original}` | Original filename without extension | `photo_sunset` |
| `{date}` | Current date (YYYYMMDD) | `20250115` |
| `{time}` | Current time (HHmmss) | `143022` |
| `{datetime}` | Date and time combined | `20250115_143022` |

### Permissions

| Permission | Reason |
|---|---|
| `contextMenus` | Add "Save Image with PixGrab" to the right-click menu |
| `downloads` | Save images to disk |
| `storage` | Persist your settings across sessions |
| `activeTab` | Access the current tab to scan images |
| `scripting` | Inject canvas conversion code into the page when converting to JPG |
| `host_permissions: <all_urls>` | Allow scanning and converting images on any website |

### Known Limitations

- Only PNG, JPG/JPEG, and WebP images are downloadable; GIF, SVG, AVIF, BMP, and extension-less image URLs are excluded
- Images under 512×512px or more elongated than 3:1 are automatically center-cropped and/or upscaled to fit before saving — upscaling a very small image will look softer than a native high-res photo
- Images with strict CORS policies that block auto-fixing are skipped rather than saved non-conforming; ones that already meet the requirement but only need JPG conversion fall back to a direct, unconverted download instead
- Data URIs embedded in pages are excluded from the scanner
- The toolbar badge count reflects the last time the popup was opened for that tab, not a live watch of the page

---

## 🇻🇳 Tiếng Việt

### Tính năng

- **Quét ảnh từ popup** — Mở popup để xem toàn bộ ảnh trên trang hiện tại (kể cả ảnh nền CSS); lưu từng ảnh, nhiều ảnh đã chọn, hoặc tất cả cùng lúc
- **Bộ lọc định dạng** — Thu hẹp danh sách chỉ còn JPG, PNG, WebP, GIF… trước khi lưu hàng loạt
- **Sắp xếp ảnh lớn trước** — Ảnh nội dung thật tự động nổi lên trên icon và pixel theo dõi nhỏ
- **Ẩn ảnh nhỏ** — Kích thước tối thiểu (px) có thể tuỳ chỉnh để ẩn icon/sprite khỏi kết quả quét
- **Nút quét lại** — Quét lại trang theo yêu cầu, hữu ích với nội dung tải chậm hoặc cuộn vô hạn xuất hiện sau khi mở popup
- **Chuyển đổi JPG có chọn lọc** — Bật/tắt chuyển đổi WebP, PNG, GIF độc lập; tắt một định dạng thì ảnh đó sẽ tải về **đúng định dạng gốc** (GIF vẫn hoạt ảnh, PNG vẫn trong suốt…)
- **Chuột phải để lưu** — Chuột phải vào một ảnh bất kỳ và chọn "Save Image with PixGrab"
- **Huy hiệu trên thanh công cụ** — Hiển thị số ảnh tìm thấy trên tab hiện tại
- **Tiến trình trực tiếp** — Nút lưu hàng loạt hiện "Đang lưu 3/12…" thay vì chỉ xoay vòng tĩnh
- **Chất lượng tuỳ chỉnh** — Thanh trượt chất lượng JPEG từ 10–100 (mặc định: 92), chỉ áp dụng cho ảnh thực sự được chuyển đổi
- **Thư mục lưu tuỳ chỉnh** — Lưu vào thư mục con trong Downloads với **tên tuỳ ý** — kể cả tiếng Việt có dấu
- **Mẫu tên tệp** — Dùng biến `{original}`, `{date}`, `{time}`, `{datetime}` kèm xem trước theo thời gian thực
- **Xử lý trùng tên** — Tự đổi tên, ghi đè, hoặc hỏi khi tệp đã tồn tại
- **Giao diện** — Sáng, Tối, hoặc theo hệ thống
- **Ngôn ngữ** — English, Tiếng Việt, hoặc theo mặc định hệ thống

### Thay đổi trong v2.3.0

- **Tự động loại bỏ logo:** khi tải hàng loạt (Lưu tất cả / Lưu đã chọn), PixGrab tự bỏ qua logo, biểu tượng thương hiệu và icon trang web. Logo được nhận diện qua tên tệp (`logo`, `wordmark`, `favicon`…), văn bản `alt`, class / id CSS / `itemprop="logo"`, các khung bao như `navbar-brand` hay `client-logos`, ảnh nhỏ có liên kết về trang chủ, và ảnh nhỏ nằm trong `header` / `nav` / `footer`. Cùng một tệp vừa dùng làm logo vừa làm ảnh nội dung sẽ được giữ lại.
- Popup hiển thị số logo đã ẩn (vd: "ẢNH TRÊN TRANG NÀY · đã ẩn 6 logo"). Logo bị loại trước giới hạn 120 ảnh nên không chiếm chỗ của ảnh nội dung.
- Thêm công tắc **Tự động loại bỏ logo** trong Cài đặt → Hành vi (mặc định bật). Menu chuột phải "Save Image with PixGrab" không bị ảnh hưởng — luôn lưu đúng ảnh bạn bấm.

### Thay đổi trong v2.0.0

- **Đã sửa:** các công tắc "Chuyển đổi WebP / PNG / GIF" trong Cài đặt trước đây được lưu nhưng bị bỏ qua hoàn toàn — mọi ảnh đều bị ép chuyển sang JPG bất kể trạng thái công tắc. Nay đã hoạt động đúng: ảnh không được chuyển đổi sẽ giữ nguyên định dạng và chất lượng gốc (GIF vẫn hoạt ảnh).
- **Đã sửa:** menu chuột phải và tính năng lưu hàng loạt trong popup trước đây dùng hai bản sao logic riêng biệt, dễ lệch nhau theo thời gian. Nay dùng chung một logic duy nhất (`shared.js`).
- Đổi tên từ *JPG Snap* thành **PixGrab** để phản ánh đúng chức năng chính: tải nhiều ảnh từ một trang, không chỉ chuyển đổi một ảnh.
- Thêm bộ lọc định dạng, sắp xếp theo kích thước, nút quét lại, huy hiệu trên thanh công cụ, tiến trình lưu hàng loạt trực tiếp, và tuỳ chỉnh kích thước ảnh tối thiểu.

### Cài đặt (Chế độ Developer)

1. Tải hoặc clone repository này
2. Mở Chrome và truy cập `chrome://extensions/`
3. Bật **Developer mode**
4. Nhấn **Load unpacked**
5. Chọn thư mục `pixgrab`
6. Biểu tượng tiện ích sẽ xuất hiện trên thanh công cụ

### Cách sử dụng

**Phương thức 1 — Popup quét ảnh (tải hàng loạt):**
1. Nhấn vào biểu tượng tiện ích trên thanh công cụ
2. Popup liệt kê mọi ảnh tìm thấy trên trang, ảnh lớn hiện trước
3. Có thể nhấn chip định dạng (JPG / PNG / WebP…) để lọc danh sách
4. Nhấn từng ảnh để chọn, hoặc dùng **Chọn tất cả**
5. Nhấn **Lưu đã chọn** hoặc **Lưu tất cả** — nút sẽ hiện tiến trình trực tiếp
6. Nếu trang tải thêm ảnh sau khi mở popup (cuộn vô hạn, tải chậm), nhấn biểu tượng làm mới để quét lại

**Phương thức 2 — Chuột phải vào một ảnh:**
1. Chuột phải vào ảnh trên trang web
2. Chọn **"Save Image with PixGrab"**
3. Ảnh được lưu vào Downloads (hoặc thư mục đã cấu hình), chỉ chuyển sang JPG nếu công tắc định dạng đó đang bật trong Cài đặt

### Quyền truy cập

| Quyền | Lý do |
|---|---|
| `contextMenus` | Thêm "Save Image with PixGrab" vào menu chuột phải |
| `downloads` | Lưu ảnh ra đĩa |
| `storage` | Lưu cài đặt giữa các phiên |
| `activeTab` | Truy cập tab hiện tại để quét ảnh |
| `scripting` | Chèn mã chuyển đổi canvas khi cần chuyển sang JPG |
| `host_permissions: <all_urls>` | Cho phép quét và chuyển đổi ảnh trên mọi trang web |

### Hạn chế đã biết

- Chỉ có thể tải ảnh định dạng PNG, JPG/JPEG và WebP; GIF, SVG, AVIF, BMP và URL ảnh không có phần mở rộng sẽ bị loại
- Ảnh nhỏ hơn 512×512px hoặc dài hơn tỷ lệ 3:1 sẽ tự động được crop giữa ảnh và/hoặc phóng to cho vừa yêu cầu trước khi lưu — phóng to ảnh quá nhỏ sẽ làm ảnh mờ hơn so với ảnh gốc độ phân giải cao
- Ảnh có chính sách CORS nghiêm ngặt khiến không thể tự động xử lý sẽ bị bỏ qua thay vì lưu ảnh không đạt yêu cầu; ảnh đã đạt yêu cầu nhưng chỉ cần chuyển sang JPG sẽ tự động fallback về tải trực tiếp (không chuyển đổi) nếu việc chuyển đổi thất bại
- Ảnh Data URI nhúng trong trang bị loại trừ khỏi bộ quét
- Huy hiệu trên thanh công cụ phản ánh lần quét gần nhất khi popup được mở, không theo dõi trang theo thời gian thực

---

## Tech Stack

- Manifest V3 · Vanilla JS · Canvas API · Chrome Downloads API
- Material Design 3 tokens · Be Vietnam Pro font · Material Icons Round
- No external dependencies at runtime

## Credits

Built by **trongsigmaprovip** · Powered by **Claude AI**

---

*MIT License*
