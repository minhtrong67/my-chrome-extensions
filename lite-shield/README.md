# Lite Shield

Extension Chrome (Manifest V3) chặn quảng cáo & trình theo dõi, lấy cảm hứng từ uBlock Origin Lite, viết lại từ đầu cho mục đích cá nhân. Giao diện theo **Material 3 Expressive** với màu động chọn được.

## Cài đặt

1. Giải nén thư mục `lite-shield`.
2. Mở `chrome://extensions` → bật **Chế độ nhà phát triển**.
3. Bấm **Tải tiện ích đã giải nén** → chọn thư mục `lite-shield`.
4. Ghim biểu tượng lên thanh công cụ để dùng popup.

Yêu cầu Chrome 120 trở lên.

## Tính năng

- **Chặn mạng** bằng `declarativeNetRequest` (quảng cáo ≈2.250 quy tắc, theo dõi ≈6.500, phiền toái; dựng từ EasyList + EasyPrivacy) — chạy trong trình duyệt, không có tiến trình nền đọc dữ liệu duyệt web.
- **Ẩn phần tử** (cosmetic): ~22.000 selector từ EasyList. Selector chung biên dịch thành CSS tĩnh và Chrome tự áp dụng (`registerContentScripts`) nên rất nhanh; selector riêng theo trang gửi qua content script.
- **Nhật ký chặn** (popup → *Nhật ký*): xem tên miền nào bị chặn trên trang hiện tại và bấm **Cho phép** để mở khoá riêng tên miền đó (quản lý lại ở *Cài đặt → Trang web*).
- **Tự cập nhật danh sách**: tải EasyList + EasyPrivacy mới mỗi ngày (hoặc bấm *Cập nhật ngay*), nạp vào quy tắc động thay cho bản đi kèm. Phần ẩn phần tử *chung* vẫn lấy từ bản đi kèm.
- **Quảng cáo YouTube (thử nghiệm)**: scriptlet chạy trong `MAIN world` cắt dữ liệu quảng cáo khỏi phản hồi của YouTube, tự bỏ qua quảng cáo còn sót và ẩn khung quảng cáo. YouTube đổi cấu trúc thường xuyên nên có thể cần chỉnh `scriptlets/youtube.js`.
- **Chọn & ẩn** (zapper): bấm một phần tử trên trang — bằng popup, phím tắt **Alt+Shift+X** hoặc chuột phải → *Lite Shield: Chọn & ẩn phần tử…*; chọn “chỉ phần tử này” hoặc “tất cả tương tự”, kết quả lưu thành dòng `trang##selector` trong *Bộ lọc của tôi*.
- **Bật/tắt theo trang** bằng nút nguồn lớn trong popup (áp dụng cả tên miền phụ, cả CSS ẩn chung và scriptlet).
- **Thống kê**: số yêu cầu đã chặn hôm nay và tổng cộng.
- **Bộ lọc của tôi**: viết bộ lọc cú pháp ABP/uBlock, có báo lỗi theo từng dòng.
- **Giao diện** Material 3 Expressive: sáng/tối/tự động, chọn màu hạt (bảng màu sinh bằng OKLCH, đã kiểm tra tương phản AA), tôn trọng *giảm chuyển động*. Logo xanh lá Material.
- **Sao lưu / khôi phục** toàn bộ cài đặt (gồm tên miền được cho phép) bằng một tệp JSON.

## Cấu trúc

```
manifest.json
background.js        service worker: ruleset, quy tắc động, thông điệp
content.js           ẩn phần tử khi tải trang
picker.js            trình chọn phần tử (chèn theo yêu cầu qua activeTab)
shared/filters.js    bộ phân tích ABP → DNR + cosmetic (dùng cả trong Node)
shared/theme.js      màu động M3
shared/m3.css        token & thành phần Material 3 Expressive
popup/  options/     giao diện
lists/*.txt          danh sách bộ lọc gốc (sửa được)
rulesets/*.json      kết quả biên dịch (sinh tự động)
shared/selector.js   kiểm tra selector chặt + gom nhóm CSS
shared/sources.js    nguồn danh sách (dùng cho fetch-lists và tự cập nhật)
scriptlets/          youtube.js (MAIN world)
tools/               fetch-lists.mjs, build-rulesets.mjs, test-filters.mjs, make-icons.py
```

## Cập nhật / thêm danh sách bộ lọc

```bash
node tools/fetch-lists.mjs        # tải EasyList + EasyPrivacy mới nhất vào lists/vendor/
node tools/build-rulesets.mjs     # biên dịch lại rulesets/* (JSON + CSS chung)
node tools/test-filters.mjs       # kiểm thử bộ phân tích
```

Danh sách tự viết của bạn nằm ở `lists/*.txt` (luôn được giữ); tệp trong `lists/vendor/<nhóm>/*.txt` được gộp thêm khi biên dịch. Muốn thêm nguồn khác, thả tệp `.txt` vào `lists/vendor/ads/`, `trackers/` hoặc `cosmetic-ads/`.

Sau đó vào `chrome://extensions` → bấm biểu tượng tải lại trên thẻ Lite Shield. Dòng nào chưa hỗ trợ sẽ được in ra và bỏ qua. Chrome đảm bảo 30.000 quy tắc tĩnh cho mỗi extension; các tên miền thuần (`||domain^`) được gộp thành ít quy tắc để tiết kiệm.

## Khác với uBlock Origin Lite

Chưa có: scriptlet tổng quát (`+js`; chỉ có scriptlet YouTube viết riêng), bộ lọc thủ tục (`:has-text`, `:xpath`…), `redirect`/`removeparam`/`$csp`/`$popup`, ngoại lệ `#@#` và `$generichide` cho CSS ẩn chung, các mức lọc Cơ bản/Tối ưu/Đầy đủ. Đổi lại có zapper, nhật ký chặn, cho phép theo tên miền và giao diện riêng.

## Giấy phép

Mã nguồn ở đây được viết mới, không sao chép từ uBlock Origin Lite. uBOL dùng giấy phép GPLv3, nên nếu sau này bạn chép mã từ đó vào, phần được chép sẽ theo GPLv3; các danh sách như EasyList cũng có giấy phép riêng.
