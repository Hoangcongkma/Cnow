# Tài liệu bảo mật

| Tài liệu | Nội dung |
| --- | --- |
| [threat-model.md](threat-model.md) | Sơ đồ luồng dữ liệu, ranh giới tin cậy, tài sản, phân tích STRIDE, danh sách việc T-01…T-22 |
| [rbac.md](rbac.md) | Bảng phân quyền tập trung, mức truy cập, kiểm tra theo đối tượng |
| [data-inventory.md](data-inventory.md) | Danh mục dữ liệu cá nhân, phân loại, thời gian lưu, quyền của người dùng |
| [backup.md](backup.md) | Sao lưu / khôi phục MongoDB |
| [checklist-asvs.md](checklist-asvs.md) | Đối chiếu OWASP ASVS 4.0.3 mức 2: Đạt / Một phần / Không áp dụng, kèm vị trí trong code |
| [../../SECURITY.md](../../SECURITY.md) | Chính sách báo cáo lỗ hổng |

## Các lớp phòng thủ và vị trí trong code

Mỗi request lần lượt đi qua các lớp dưới đây (`src/app.js`: nhật ký và header đứng đầu, rồi giới hạn tần suất → phiên → CSRF → phân quyền; kiểm tra đầu vào gắn ở từng route). Route chỉ nhận dữ liệu đã được kiểm tra; nghiệp vụ nằm trong `src/services/`.

| # | Lớp | Ở đâu | Ghi chú |
| --- | --- | --- | --- |
| 0 | Cấu hình | `src/config.js` | zod kiểm tra mọi biến môi trường khi khởi động; an toàn mặc định đóng (production bắt buộc `MONGODB_URI`, `BASE_URL`, `SESSION_SECRET` ≥ 32); thông báo lỗi không in giá trị |
| 1 | Header + CSP | `src/app.js` (helmet) | nonce mỗi request + `strict-dynamic`, HSTS (production), `frame-ancestors 'none'`, COOP/CORP, Permissions-Policy |
| 2 | Nhật ký | `src/logger.js` | pino JSON, `requestId` (nhận `X-Request-Id` hợp lệ), ẩn cookie/token/mật khẩu, che email, không ghi query string |
| 3 | Giới hạn tần suất | `src/security/rate-limit.js` | lưu MongoDB (đúng khi chạy nhiều tiến trình), nhóm riêng cho đăng ký, thanh toán, xuất dữ liệu, 2FA, mã quản trị… |
| 4 | Phiên | `src/middlewares/auth.js`, `src/services/sessions.js` | regenerate khi đăng nhập, hết hạn 30 phút / 7 ngày, `sessionVersion` hủy phiên khác khi đổi mật khẩu, đổi quyền, bật 2FA, xóa tài khoản |
| 5 | CSRF | `src/middlewares/security.js` | token đồng bộ trong phiên, nhận từ `_csrf` hoặc header `x-csrf-token` |
| 6 | Phân quyền | `src/security/rbac.js` | bảng RULES tập trung; test bắt buộc mọi route khai báo đều có luật và chạy mọi luật × 4 vai trò (đường dẫn không có luật → 404) |
| 7 | Kiểm tra đầu vào | `src/validators/` | schema zod cho từng route: params sai → 404, body sai → 400, trường lạ bị bỏ |
| 8 | Truy vấn | `src/models/index.js` | `sanitizeFilter` + `strictQuery`: toán tử MongoDB do người dùng gửi bị vô hiệu; toán tử của server phải bọc `trusted()` |
| 9 | Đầu ra | views EJS, `src/services/markdown.js` | `<%= %>` luôn escape; Markdown qua sanitize-html; chuyển hướng qua `safeRedirect` |
| 10 | Lỗi | `src/app.js` (cuối) | xử lý lỗi tập trung: không lộ stack trace, mã lỗi đúng (400/403/404/413/415/503) |

## Kiểm tra tự động

- `npm test`: các file `test/security.test.js`, `input-validation.test.js`, `rbac.test.js`, `sessions.test.js`, `privacy.test.js`, `hardening*.test.js`, `monitoring.test.js`, `config.test.js`.
- CI (`.github/workflows/`): lint (eslint-plugin-security), test + độ phủ ≥ 80%, `npm audit --audit-level=high`, CodeQL, OWASP ZAP baseline (`.zap/rules.tsv`).
- Pre-commit: lint-staged + secretlint.
