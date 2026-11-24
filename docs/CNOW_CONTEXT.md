# CNOW – Tệp ghi nhớ dự án (bối cảnh cho Claude)

> Khi người dùng nhắc "Cnow", đọc tệp này trước. Không chứa bí mật (mật khẩu, URI, khóa) – tuyệt đối không yêu cầu dán bí mật vào chat.

## 1. Dự án là gì
- Website học trực tuyến **Cnow**, dựng từ slide đồ án tốt nghiệp. Mục đích hiện tại: **bản kỷ niệm cá nhân** (không phải bài thi).
- Chủ dự án: GitHub **Hoangcongkma**. Repo: https://github.com/Hoangcongkma/Cnow (**Public** – giữ Public để GitHub Advanced Security miễn phí).
- Web đang chạy: **https://cnow.onrender.com**
- Thư mục trên máy: **F:\cnow** (Windows, PowerShell, Git ở E:\Git, VS Code + Claude Code).

## 2. Công nghệ
- Node 22, Express 5, EJS, Mongoose 9, MongoDB.
- Phiên: express-session + connect-mongo. Bảo mật: helmet CSP chặt (không wildcard), CSRF token, express-rate-limit, bcrypt, zod validate, sanitizeFilter, pino log, audit log.
- Đăng nhập: TOTP 2FA (tùy chọn) + **mã PIN quản trị** bắt buộc cho admin (lưu dạng bcrypt hash, đặt bằng `npm run set:admin-pin`, nhập ẩn).
- Ảnh đại diện lưu GridFS.
- Bài học: **nội dung dạng văn bản tự viết** (không nhúng video YouTube của người khác).
- Thanh toán: **CHỈ DEMO** – `PAYMENT_MODE=demo`, cổng giả lập PayPal/VNPay/MoMo; code PayPal Orders v2 thật vẫn giữ nhưng không bật.

## 3. Hạ tầng (tất cả MIỄN PHÍ – đã kiểm tra 24/11/2026)
| Dịch vụ | Gói | Ghi chú |
|---|---|---|
| MongoDB Atlas | M0 FREE, 512 MB, Singapore | Org "Duong's Org – 2026-11-24", Project 0, cluster Cnow. DB user ứng dụng: `cnow_app`. Không có Payment Method, $0. |
| Render | Hobby + Web Service Free | Blueprint `render.yaml` (plan free, NODE_VERSION=22, healthCheckPath /healthz). Ngủ sau 15 phút, khởi động ~50 s. 750 giờ/tháng. No card on file. |
| GitHub | Free, repo Public | Actions CI, CodeQL, ZAP baseline (.zap/rules.tsv phải được track), Dependabot (gom nhóm), secret scanning + push protection, ruleset `bao-ve-main`. |

**Quy tắc vàng:** không bấm Add Card / Add Payment Method / Upgrade ở bất kỳ đâu.

Biến môi trường trên Render (chỉ tên, không giá trị): `MONGODB_URI` (chuỗi mongodb+srv sạch, không ngoặc/khoảng trắng), `SESSION_SECRET`, `MFA_KEY`, `PAYMENT_MODE=demo`, `NODE_ENV=production`, `BASE_URL=https://cnow.onrender.com`.

## 4. Lệnh hay dùng (chạy trong F:\cnow)
- Chạy local: `npm run dev` (lỗi EADDRINUSE 3000 → tắt tiến trình cũ bằng Ctrl+C).
- Dữ liệu: `npm run seed`, `npm run import:content`, `npm run setup:prod`.
- Dữ liệu demo (~500 học viên, bình luận, đánh giá, hỏi đáp, đơn hàng/doanh thu): `npm run seed:demo` / `npm run unseed:demo` (lên cloud cần `--allow-production`).
- Đặt PIN admin: `npm run set:admin-pin`.
- Đẩy code: `git add -A` → `git commit -m "..."` → `git push` (người dùng tự push; Claude Code bị chặn push).
- Husky: `.husky/install.mjs` bỏ qua khi NODE_ENV=production hoặc CI=true (sửa lỗi build Render "husky: not found").
- Atlas từ máy local: nếu `querySrv ECONNREFUSED` (DNS) → dùng chuỗi kết nối legacy `mongodb://...`; trong PowerShell bọc URI bằng nháy đơn '...'.

## 5. Cấu hình Claude Code (.claude/settings.json)
- Allow: WebSearch, WebFetch, PowerShell npm/node/git status/diff/log/add/commit/curl.
- Deny: đọc `./.env`, `git push`, `git reset --hard`, `Remove-Item -Recurse`, `rm -r`, `winget`.
- Tệp tiến độ: `PROGRESS.md`, `CLAUDE.md`, `PROMPTS.md` (gitignored).

## 6. Ràng buộc người dùng đã chọn
- Mọi thứ phải miễn phí; repo giữ Public.
- Không dán bí mật vào chat; không ghi mật khẩu demo/admin vào tài liệu.
- Chạy `cls` trước khi chụp màn hình terminal.
- Trả lời bằng **tiếng Việt**, hướng dẫn từng bước, kèm câu lệnh copy được.

## 7. Trạng thái & việc còn lại (tính đến 24/11/2026)
- [x] Web live, kết nối Atlas, dữ liệu demo đã nạp, CI/CodeQL/ZAP xanh, 0 vulnerabilities.
- [x] Xác nhận Atlas $0 / Render Hobby no card / GitHub Free.
- [ ] Đổi mật khẩu `cnow_app` (đã lộ trong ảnh chụp) → cập nhật `MONGODB_URI` trên Render.
- [ ] Đổi `MFA_KEY` trên Render (đã lộ) → admin bật lại 2FA nếu dùng.
- [ ] Xác minh email + bật MFA cho Atlas, Render, GitHub.
- [ ] GitHub About → Website = https://cnow.onrender.com (tùy chọn).
- [ ] `powercfg /change standby-timeout-ac 30` (trả lại chế độ ngủ máy).
- [ ] Xóa tag local `backup-lich-su-cu` khi không cần.

## 8. Khi cập nhật tính năng mới
1. Mở F:\cnow trong VS Code → Claude Code (chế độ Plan trước, rồi Edit automatically).
2. Mô tả tính năng; yêu cầu cập nhật `PROGRESS.md` và chạy test/lint.
3. Chạy thử local → tự `git push` → Render tự deploy → kiểm tra Logs "Your service is live".
