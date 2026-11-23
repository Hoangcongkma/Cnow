# Đối chiếu OWASP ASVS 4.0.3 – Mức 2

Ký hiệu trạng thái:
- ✅ **Đạt**
- ⚠️ **Một phần / chưa đạt**
- ➖ **Không áp dụng** (N/A)

Cột "Bằng chứng" trỏ tới code / test.

| Mã | Yêu cầu (tóm tắt) | Trạng thái | Bằng chứng |
| --- | --- | :-: | --- |
| **V1 Kiến trúc** | | | |
| 1.1.2 | Mô hình hóa mối đe dọa cho thay đổi thiết kế | ✅ | `docs/SECURITY/threat-model.md` |
| 1.2.1 | Thành phần dùng tài khoản riêng, quyền tối thiểu | ⚠️ | User MongoDB riêng cho app (README › Deploy); chưa tách user chỉ-insert cho audit log |
| 1.4.1 | Kiểm soát truy cập ở phía máy chủ, tập trung | ✅ | `src/security/rbac.js`, `test/rbac.test.js` |
| 1.5.1 | Định nghĩa rõ ràng việc kiểm tra đầu vào | ✅ | `src/validators/schemas.js` (zod cho mọi route) |
| 1.6.1 | Quản lý khóa mật mã có chính sách | ✅ | `SESSION_SECRET`, `MFA_KEY` qua biến môi trường, `config.js` kiểm tra độ dài |
| 1.14.6 | Không dùng công nghệ phía client không an toàn | ✅ | Không Flash/ActiveX; JS tự host, CSP `'self'` + nonce |
| **V2 Xác thực** | | | |
| 2.1.1 | Mật khẩu ≥ 12 ký tự (L1: ≥ 12) | ⚠️ | Tối thiểu **10** ký tự + chặn 1000 mật khẩu phổ biến (`services/password.js`) – thấp hơn khuyến nghị 12 của ASVS |
| 2.1.2 | Cho phép mật khẩu ≥ 64 ký tự | ✅ | Tối đa 72 byte (giới hạn bcrypt) |
| 2.1.7 | Chặn mật khẩu bị lộ / phổ biến | ✅ | `data/security/common-passwords.txt` (1000) + biến thể thêm số cuối |
| 2.1.9 | Không ép quy tắc thành phần ký tự | ⚠️ | Yêu cầu có cả chữ và số (giữ theo đồ án gốc) |
| 2.2.1 | Chống dò mật khẩu tự động | ✅ | Khóa lũy tiến tài khoản + IP (`services/login-guard.js`), test `sessions.test.js` |
| 2.2.3 | Thông báo người dùng khi có thay đổi bảo mật | ✅ | Đăng nhập từ IP mới → thông báo; đổi mật khẩu đăng xuất phiên khác |
| 2.4.1 | Lưu mật khẩu bằng hàm băm chậm có salt | ✅ | bcrypt cost 12 |
| 2.5.1 | Khôi phục tài khoản không gửi mật khẩu | ➖ | Chưa có chức năng quên mật khẩu (cần email) |
| 2.7/2.8 | OTP / TOTP: chống dùng lại, giới hạn thử | ✅ | `services/mfa.js` (mfaLastStep), 5 lần/phiên chờ + 30/15 phút/IP |
| 2.8.4 | Mã khôi phục dùng 1 lần, lưu băm | ✅ | SHA-256, `test/mfa.test.js` |
| 2.10.x | Bí mật dịch vụ không nằm trong code | ✅ | `.env` (gitignore), `render.yaml` `sync: false`, secretlint pre-commit + CI |
| **V3 Phiên** | | | |
| 3.2.1 | Cấp token phiên mới khi đăng nhập | ✅ | `startSession` → `regenerate` |
| 3.2.3 | Token phiên trong cookie an toàn | ✅ | HttpOnly, SameSite=Lax, Secure (HTTPS), `__Host-` ở production |
| 3.3.1 | Đăng xuất hủy phiên phía máy chủ | ✅ | `req.session.destroy` + xóa bản ghi phiên |
| 3.3.2 | Hết hạn khi không hoạt động / tuyệt đối | ✅ | 30 phút / 7 ngày (`services/sessions.js`) |
| 3.3.3 | Đăng xuất các phiên khác sau khi đổi mật khẩu | ✅ | `sessionVersion` |
| 3.3.4 | Xem và đăng xuất các phiên đang hoạt động | ✅ | `/profile/sessions` |
| 3.4.1–3.4.5 | Thuộc tính cookie (Secure, HttpOnly, SameSite, `__Host-`, Path) | ✅ | `app.js`, `config.sessionCookieName` |
| 3.5.x | Token không trạng thái (JWT) | ➖ | Không dùng JWT |
| 3.7.1 | Xác thực lại cho thao tác nhạy cảm | ✅ | Đổi mật khẩu, tắt 2FA, xóa tài khoản cần mật khẩu hiện tại |
| **V4 Kiểm soát truy cập** | | | |
| 4.1.1 | Thực thi ở máy chủ tin cậy | ✅ | `rbac.authorize` trước mọi router |
| 4.1.3 | Quyền tối thiểu | ✅ | 4 mức public/auth/staff/admin; CTV chỉ khóa của mình |
| 4.1.5 | Từ chối mặc định khi lỗi | ✅ | Thiếu quy tắc → test đỏ; không tìm thấy đối tượng → 404 |
| 4.2.1 | Chống IDOR | ✅ | Truy vấn kèm `user`; test hóa đơn / ghi chú / đơn demo của người khác → 404 |
| 4.2.2 | Chống CSRF | ✅ | Token đồng bộ trong phiên, so sánh hằng thời gian (`middlewares/security.js`) |
| 4.3.1 | Giao diện quản trị có xác thực đa yếu tố | ✅ | Mã quản trị bắt buộc / TOTP (`routes/admin-pin.js`) |
| **V5 Kiểm tra đầu vào, mã hóa đầu ra** | | | |
| 5.1.1 | Chống HTTP parameter pollution | ✅ | zod: mảng thay chuỗi → 400 |
| 5.1.2 | Chống mass assignment | ✅ | zod loại trường lạ; `test/input-validation.test.js` |
| 5.1.3 | Kiểm tra đầu vào theo whitelist | ✅ | enum, regex id/slug, giới hạn độ dài |
| 5.1.5 | Chuyển hướng chỉ tới đích tin cậy | ✅ | `utils/security.safeRedirect` (chặn `//`, `/\`) |
| 5.2.1 | Lọc HTML do người dùng soạn | ✅ | Markdown → sanitize-html whitelist |
| 5.2.4 | Không eval / mã động | ✅ | ESLint `security/detect-eval-with-expression` |
| 5.3.1 | Mã hóa đầu ra theo ngữ cảnh | ✅ | EJS `<%= %>`; `<%- %>` chỉ cho include / HTML đã lọc |
| 5.3.4 | Chống SQL/NoSQL injection | ✅ | `sanitizeFilter` + `strictQuery`, toán tử của code đánh dấu `trusted()` |
| 5.3.x | Chống CSV/formula injection | ✅ | `services/csv.js` |
| 5.5.x | Chống deserialization không tin cậy | ✅ | Chỉ `JSON.parse` dữ liệu cấu trúc khóa học (admin/CTV), có schema |
| **V7 Lỗi và nhật ký** | | | |
| 7.1.1 | Không ghi thông tin đăng nhập / phiên vào log | ✅ | pino `redact`, không query string; `test/monitoring.test.js` |
| 7.1.2 | Không ghi dữ liệu nhạy cảm khác | ✅ | Email bị che (`utils/mask.js`) trong log và audit |
| 7.1.3 | Ghi sự kiện bảo mật (xác thực, quyền, …) | ✅ | `AUDIT_ACTIONS` (hơn 30 loại) |
| 7.1.4 | Log có đủ thông tin điều tra | ✅ | Thời gian, actor, target, IP, UA, `requestId` |
| 7.3.3 | Bảo vệ log khỏi sửa đổi | ⚠️ | Hook chỉ-ghi-thêm ở tầng ứng dụng; chưa có user DB chỉ-insert |
| 7.4.1 | Thông báo lỗi chung, không lộ thông tin | ✅ | Error handler tập trung, có test 500 không stack |
| **V8 Bảo vệ dữ liệu** | | | |
| 8.1.1 | Không lưu đệm dữ liệu nhạy cảm | ✅ | `Cache-Control: no-store` cho hóa đơn, 2FA, phiên, xuất dữ liệu |
| 8.2.x | Dữ liệu nhạy cảm không trong URL | ✅ | Mật khẩu / mã luôn qua POST body |
| 8.3.1 | Danh mục dữ liệu cá nhân, thời gian lưu | ✅ | `docs/SECURITY/data-inventory.md` |
| 8.3.2 | Người dùng tải / xóa dữ liệu của mình | ✅ | `/profile/export.json`, `/profile/delete` |
| 8.3.4 | Sao lưu có quy trình | ⚠️ | `npm run backup/restore` có test; **chưa đặt lịch tự động** |
| **V9 Truyền thông** | | | |
| 9.1.1 | TLS cho mọi kết nối | ✅ | Render HTTPS, HSTS 1 năm, `upgrade-insecure-requests`; Atlas TLS |
| 9.2.x | Kết nối ra ngoài dùng TLS, kiểm tra chứng chỉ | ✅ | YouTube oEmbed / PayPal qua https mặc định |
| **V10 Mã độc / chuỗi cung ứng** | | | |
| 10.3.2 | Phụ thuộc được khóa phiên bản, cập nhật | ✅ | `package-lock.json` + `npm ci`, Dependabot, `npm audit` trong CI |
| 10.3.3 | Không có mã / thư viện không dùng | ✅ | depcheck đã dọn |
| **V11 Logic nghiệp vụ** | | | |
| 11.1.2 | Giới hạn tần suất theo luồng nghiệp vụ | ✅ | Rate limit theo nhóm (MongoDB): đăng ký, bình luận, thanh toán, xuất dữ liệu, tra cứu |
| 11.1.4 | Chống tự động hóa quá mức / gian lận | ✅ | Quiz 3 lần/giờ; mã giảm giá giữ lượt nguyên tử; chống bấm 2 lần thanh toán |
| **V12 File và tài nguyên** | | | |
| 12.1.1 | Giới hạn kích thước upload | ✅ | 2MB, ≤ 4096px, ≤ 16MP |
| 12.2.1 | Kiểm tra loại file bằng nội dung | ✅ | Magic bytes + sharp re-encode |
| 12.3.1 | Không dùng tên file người dùng | ✅ | Tên ngẫu nhiên 32 hex, lưu GridFS |
| 12.5.2 | File tải lên không chạy được / phục vụ an toàn | ✅ | `image/webp`, `nosniff`, `Content-Disposition: inline` |
| **V13 API** | | | |
| 13.2.x | REST/JSON API | ➖ | Không có API JSON công khai (ngoài `/healthz`, xuất dữ liệu của chính mình) |
| 13.4.x | GraphQL | ➖ | Không dùng |
| **V14 Cấu hình** | | | |
| 14.1.1 | Build lặp lại được, an toàn | ✅ | `npm ci`, CI GitHub Actions |
| 14.2.1 | Thành phần cập nhật, không lỗ hổng đã biết | ✅ | `npm audit` = 0 lỗ hổng; Dependabot |
| 14.3.2 | Tắt chế độ debug ở production | ✅ | `NODE_ENV=production`, log mức info, không stack |
| 14.3.3 | Header HTTP không lộ phiên bản | ✅ | Không `X-Powered-By`; `/healthz` không lộ phiên bản |
| 14.4.1–14.4.7 | Header bảo mật (Content-Type, CSP, nosniff, HSTS, Referrer-Policy, frame-ancestors) | ✅ | Helmet + `test/hardening-infra.test.js` |
| 14.4.3 | CSP không `unsafe-inline` / `unsafe-eval` | ✅ | nonce + `'strict-dynamic'` |
| 14.5.3 | Không phản chiếu Origin tùy ý (CORS) | ✅ | Không bật CORS; Socket.IO chỉ nhận Origin = `BASE_URL` |

## Tóm tắt

| Trạng thái | Số yêu cầu đã đối chiếu |
| --- | --- |
| ✅ Đạt | 63 |
| ⚠️ Một phần / chưa đạt | 5 |
| ➖ Không áp dụng | 4 |

Các mục ⚠️ được ghi trong phần "rủi ro còn lại" của báo cáo tổng kết. Ba mục quan trọng nhất là:
- độ dài mật khẩu tối thiểu 10 (ASVS khuyến nghị 12);
- audit log chưa có user DB chỉ-insert;
- sao lưu chưa có lịch tự động.
