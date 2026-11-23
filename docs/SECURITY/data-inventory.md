# Danh mục dữ liệu cá nhân

Phân loại: **C1** – bí mật xác thực (lộ là mất tài khoản) · **C2** – dữ liệu cá nhân định danh · **C3** – dữ liệu cá nhân hành vi / học tập · **C4** – dữ liệu vận hành ít nhạy cảm.

Nguyên tắc: chỉ lưu dữ liệu cần cho chức năng; bí mật chỉ lưu dạng băm/mã hóa; không có dữ liệu thẻ thanh toán.

| Collection.trường | Loại | Mục đích | Bảo vệ | Thời gian lưu | Khi người dùng xóa tài khoản |
| --- | --- | --- | --- | --- | --- |
| `users.passwordHash` | C1 | Đăng nhập | bcrypt cost 12; không bao giờ trả về view (`select('-passwordHash')`) | Đến khi đổi | Thay bằng băm ngẫu nhiên |
| `users.mfaSecret` | C1 | TOTP | AES-256-GCM (`MFA_KEY`), `select: false` | Đến khi tắt 2FA | Xóa |
| `users.mfaRecovery` | C1 | Mã khôi phục 2FA | SHA-256, `select: false` | Đến khi tạo lại / tắt | Xóa |
| `users.adminPinHash` | C1 | Mã quản trị | bcrypt 12, `select: false`, chỉ đặt qua CLI | Đến khi đổi | Xóa |
| `sessions` (cookie `cnow.sid` / `__Host-cnow.sid`) | C1 | Phiên đăng nhập | Cookie HttpOnly, SameSite=Lax, Secure; ký bằng `SESSION_SECRET` | 2 giờ (khách), 7 ngày tuyệt đối, 30 phút không hoạt động | Hủy mọi phiên |
| `usersessions.sid` | C1 | Đăng xuất từ xa | `select: false`, không hiển thị | Tới hạn phiên (TTL) | Xóa |
| `users.name`, `username`, `email` | C2 | Tài khoản, hiển thị tên | Email chỉ hiện cho chính mình, admin, CTV (học viên khóa của CTV) | Đến khi xóa tài khoản | Ẩn danh hóa (`Người dùng đã xóa`, `del_<id>`, `deleted-<id>@deleted.invalid`) |
| `users.avatar` (GridFS) | C2 | Ảnh đại diện | Re-encode WebP, bỏ EXIF/GPS | Đến khi xóa ảnh | Xóa khỏi GridFS |
| `users.bio` | C2 | Giới thiệu | Escape khi hiển thị | Đến khi xóa | Xóa |
| `users.knownIpHashes` | C3 | Phát hiện đăng nhập từ IP mới | HMAC-SHA256 (không lưu IP gốc), 20 giá trị gần nhất | Xoay vòng | Xóa |
| `usersessions.ip`, `userAgent` | C3 | Trang "Phiên đăng nhập" | Chỉ chủ tài khoản xem | Tới hạn phiên (TTL 7 ngày) | Xóa |
| `auditlogs` (actor, target, ip, userAgent, meta) | C3 | Phát hiện / điều tra xâm nhập | Chỉ admin xem; meta theo whitelist; **email trong meta bị che** (`c***@gmail.com`); không sửa/xóa qua giao diện | 12 tháng (khuyến nghị dọn định kỳ) | Giữ (lợi ích chính đáng: an ninh) |
| `enrollments`, `progresses`, `notes`, `certificates` | C3 | Chức năng học tập | Truy vấn luôn theo chủ sở hữu | Đến khi xóa tài khoản | Xóa |
| `reviews` | C3 | Đánh giá khóa học | Công khai (tên + nội dung) | Đến khi xóa | Xóa, tính lại điểm khóa học |
| `posts`, `coursecomments`, `chatmessages` | C3 | Nội dung cộng đồng tự đăng | Escape XSS, kiểm duyệt | Đến khi xóa / bị ẩn | Giữ, hiển thị "Người dùng đã xóa" |
| `notifications` | C3 | Thông báo | Chỉ chủ tài khoản | 90 ngày (TTL) | Xóa |
| `orders` | C3/C4 | Quyền học, hóa đơn, doanh thu | Chủ đơn + admin; không có dữ liệu thẻ; `payerEmail` chỉ có với PayPal thật | Lâu dài (thống kê) | Giữ dạng ẩn danh, xóa `payerEmail` |
| `loginthrottles` (`a:<tên đăng nhập>`, `i:<ip>`) | C4 | Khóa đăng nhập lũy tiến | Không hiển thị cho người dùng | 24 giờ (TTL) | Tự hết hạn |
| Log truy cập (stdout) | C4 | Vận hành | Không có query string, cookie, body; không ghi `/healthz` | Theo nền tảng (Render) | – |

## Không thu thập

- Thông tin thẻ, tài khoản ngân hàng, OTP: thanh toán demo không có ô nhập.
- Ngày sinh, số điện thoại, địa chỉ, giấy tờ tùy thân.
- Cookie quảng cáo / theo dõi, công cụ phân tích của bên thứ ba.

## Quyền của người dùng (đã hiện thực)

| Quyền | Nơi thực hiện |
| --- | --- |
| Xem, sửa hồ sơ | `/profile` |
| Tải toàn bộ dữ liệu (JSON) | `/profile/export.json` (audit `data.export`) |
| Xóa tài khoản | `/profile/delete`: mật khẩu + gõ "XÓA TÀI KHOẢN"; audit `account.delete` |
| Kiểm soát phiên đăng nhập | `/profile/sessions` |
| Được thông báo khi đăng nhập từ IP lạ | Chuông thông báo + `login.new_ip` |
| Đọc chính sách | `/chinh-sach-bao-mat` |

## Sao lưu

Xem [backup.md](backup.md). Bản sao lưu chứa toàn bộ dữ liệu ở trên, nên phải được bảo vệ ngang với CSDL.
