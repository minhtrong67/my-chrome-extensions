<div align="center">

<img src="icons/icon128.png" alt="SmartShot" width="96" height="96" />

# SmartShot — Chụp & Chú Thích Màn Hình

**Chụp vùng hiển thị, toàn trang hoặc vùng chọn — rồi chú thích và che thông tin nhạy cảm trong trình chỉnh sửa Material Design 3.**
Miễn phí, mã nguồn mở, xử lý 100% trên máy.

![Version](https://img.shields.io/badge/version-1.3.0-03A9F4)
![Manifest](https://img.shields.io/badge/Manifest-V3-03A9F4)
![License](https://img.shields.io/badge/license-MIT-03A9F4)

[English](README.md) · [Tiếng Việt](README.vi.md) · [Trang giới thiệu](index.html)

</div>

---

## Ảnh minh hoạ

| Trình chú thích | Cửa sổ chụp | Cài đặt |
|---|---|---|
| ![Editor](screenshots/image01.png) | ![Popup](screenshots/image02.png) | ![Settings](screenshots/image03.png) |

| Tối · Tiếng Việt | Editor tối · màu xanh mòng két | Landing page |
|---|---|---|
| ![Dark](screenshots/image04.png) | ![Dark editor](screenshots/image05.png) | ![Landing](screenshots/image06.png) |

## Tính năng

- **Chụp**: vùng hiển thị, toàn trang (tự cuộn và ghép liền mạch), vùng chọn có hiển thị kích thước. Mặc định ảnh chụp mở ngay trong trình chỉnh sửa; có thể tắt trong Cài đặt (**Sau khi chụp**) để tải thẳng ảnh PNG vào thư mục Downloads mặc định.
- **Chỉnh sửa**: bút, mũi tên, hình chữ nhật, elip, chữ, bút nhấn, làm mờ/che thông tin, cắt ảnh; chọn/di chuyển/đổi cỡ/đổi màu từng chú thích; hoàn tác 60 bước; phóng to thu nhỏ; dán hoặc kéo thả ảnh để chỉnh; xuất PNG/JPEG, tải xuống hoặc sao chép.
- **Cài đặt** (ngay trong popup): màu chủ đề (19 màu Material), giao diện Sáng/Tối/Hệ thống, ngôn ngữ English/Tiếng Việt/Tự động. Có thẻ tác giả và nút mở trang giới thiệu trong tab mới.
- **Riêng tư**: không theo dõi, không gọi mạng, quyền tối thiểu.

## Cài đặt

1. Tải `download/SmartShot-Setup.zip` và giải nén vào một thư mục cố định.
2. Mở `chrome://extensions`, bật **Chế độ nhà phát triển**.
3. Chọn **Tải tiện ích đã giải nén** và trỏ tới thư mục vừa giải nén.
4. Ghim biểu tượng SmartShot màu xanh lên thanh công cụ.

> Yêu cầu Chrome / Edge / Brave **109+**.

## Phát triển

```bash
npm install
npm run build:assets   # themes, icon Lucide, icon extension
npm run pack           # đóng gói zip
```

## Hạn chế đã biết

- Trang cuộn bên trong một khung con (không phải cuộn cả trang) chỉ chụp được một khung hình.
- Không chụp được trang `chrome://…` và Web Store.

## Tác giả

**minhtrong67**, với sự hỗ trợ của AI **Claude** (Anthropic). Giấy phép [MIT](LICENSE).
