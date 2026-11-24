# Cnow – Hướng dẫn chi tiết

Tài liệu vận hành đầy đủ: chạy trên máy, soạn bài học, thanh toán demo, deploy, bảo mật, dữ liệu demo, kiểm thử. Tổng quan dự án xem [README](../README.md).

## Chức năng (theo slide “Phân tích yêu cầu: ba nhóm người dùng”)

- **Người học** (`role: 'user'`): đăng ký, đăng nhập, xem và tìm khóa học, học thử, mua khóa học bằng PayPal, học, bình luận, xem lịch sử thanh toán.
- **Cộng tác viên** (`role: 'collaborator'`): thêm, sửa khóa học của mình và xem danh sách người học.
- **Quản trị viên** (`role: 'admin'`): xem tổng quan doanh thu, quản lý mọi khóa học, hóa đơn và đơn hàng, thành viên, phân quyền, khóa tài khoản vi phạm, ẩn bình luận.

**Luồng thanh toán** (slide “Cơ chế thanh toán qua PayPal”):
1. Người học bấm “Mua khóa học” (`POST /pay`).
2. Server tạo đơn hàng trên PayPal **với giá lấy từ CSDL** rồi chuyển người học sang PayPal.
3. PayPal trả người học về `/pay/success?token=…`.
4. Server **capture** giao dịch và đối chiếu trạng thái, số tiền, loại tiền với đơn hàng.
5. Nếu khớp, server lưu hóa đơn và mở quyền học.

## Chạy trên máy (VS Code)

1. Cài **Node.js 22.12+** và **MongoDB** – hoặc tạo cụm miễn phí trên MongoDB Atlas.
2. Mở thư mục `cnow` bằng VS Code: **File → Open Folder…**
3. Mở terminal trong VS Code (**Ctrl+`**) và chạy:
   ```bash
   npm install
   cp .env.example .env        # Windows PowerShell: copy .env.example .env
   ```
4. Sửa file `.env`:
   - `MONGODB_URI`: chuỗi kết nối MongoDB.
   - `SESSION_SECRET`: tạo bằng lệnh `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
   - `SEED_ADMIN_PASSWORD`: mật khẩu cho tài khoản `admin` mà bước 5 tạo ra.
   - Thanh toán mặc định là cổng **demo** (`PAYMENT_MODE=demo`), không cần khóa PayPal.
5. Tạo dữ liệu mẫu (6 khóa học, tài khoản `admin`, 1 cộng tác viên mẫu), rồi đặt **mã quản trị** cho admin. Script không in mật khẩu nào ra màn hình:
   ```bash
   npm run seed
   npm run set:admin-pin
   ```
6. Chạy website:
   ```bash
   npm run dev                 # tự khởi động lại khi sửa code
   ```
   Sau đó mở http://localhost:3000.

**Debug:** vào tab **Run and Debug** (Ctrl+Shift+D), chọn **“Chạy Cnow (debug)”** và nhấn F5 để đặt breakpoint trong code.

## Nhập khóa học miễn phí từ video YouTube

```bash
npm run import:videos            # đọc data/free-videos.json (định dạng ghi ở đầu scripts/import-videos.js)
```

- Với mỗi link, script gọi YouTube oEmbed để lấy **tiêu đề và tên kênh thật**, rồi lưu vào bài học (`sourceName`, `sourceUrl`, `license`).
- Link lỗi (video riêng tư, đã xóa, cấm nhúng) bị bỏ qua kèm cảnh báo. Mã video chỉ lấy từ link trong file, không bao giờ tự tạo.
- Khóa nhập vào luôn có giá 0. Script không ghi vào khóa đã có phí.
- Trang học hiển thị “Nguồn: <tên kênh> – Xem trên YouTube”. Video chỉ được nhúng qua `youtube-nocookie.com`.
- Nhập lại không làm mất tiến độ: bài có cùng video giữ nguyên `_id`, tài liệu và trắc nghiệm.

## Bài học văn bản (content/) – cách thêm bài mới

Các khóa học có phí dùng bài đọc do Cnow tự biên soạn, lưu thành file Markdown trong `content/<slug-khóa>/`.

1. Tạo file `content/<slug-khóa>/07-ten-bai.md` (số thứ tự quyết định vị trí bài). Mẫu frontmatter:
   ```yaml
   ---
   title: "Tên bài"
   minutes: 15
   preview: false
   objectives:
     - "Mục tiêu 1"
     - "Mục tiêu 2"
     - "Mục tiêu 3"
   quiz:
     - question: "Câu hỏi?"
       options: ["A", "B", "C", "D"]
       answer: 1
       explain: "Giải thích vì sao B đúng."
   ---
   ```
   Thân bài theo các mục: Giải thích khái niệm, Code mẫu có chú thích, Lỗi hay gặp, Bài tập thực hành (lời giải trong `<details>`), Tóm tắt, Đọc thêm.
2. Chạy thử code và kiểm tra bài: `npm run check:content <slug-khóa>`. Lệnh chạy mọi khối ` ```js ` bằng Node (so khớp với khối ` ```text output `), kiểm tra cú pháp CSS/HTML/PHP, độ dài, bố cục, liên kết; bản chạy thử và báo cáo `REPORT.md` được lưu ở `content/_checks/<slug-khóa>/` (chỉ trên máy, không đưa lên repository).
3. Nạp vào CSDL: `npm run import:content <slug-khóa>` (không truyền slug = mọi khóa). Bài cũ cùng tiêu đề giữ nguyên `_id` nên tiến độ học, ghi chú, hỏi đáp không mất. Khóa học phải tồn tại trước (`npm run seed` hoặc tạo trong trang quản trị); `npm run seed` cũng tự nạp nội dung cho 6 khóa mẫu.
4. Mở `/learn/<slug-khóa>` để xem: bài đọc toàn màn hình có mục lục, nút "Sao chép" code, thanh tiến độ đọc, trắc nghiệm cuối bài.

## Trắc nghiệm cuối bài

```bash
npm run import:quiz              # nạp data/quiz-javascript.json (3 câu/bài) cho khóa "JavaScript cho người mới"
```

- Câu hỏi khớp bài học theo mã video. Đáp án chỉ nằm ở server; người học cần đúng ≥ 70% mới được “Đánh dấu đã học”.
- Quản trị viên/cộng tác viên soạn tài liệu Markdown và trắc nghiệm ở **Quản trị → Khóa học → Sửa → Tài liệu & quiz**.

## Migration dữ liệu

`npm run migrate` (cũng tự chạy mỗi lần khởi động server). Các migration nằm trong `src/migrations.js`, chạy lại nhiều lần vẫn an toàn.

## Thanh toán (chế độ demo)

Website chạy **`PAYMENT_MODE=demo`** (mặc định): cổng thanh toán **mô phỏng** PayPal / VNPay / MoMo, **không trừ tiền thật**, chạy được cả khi `NODE_ENV=production` và không cần biến `PAYPAL_*`.

- Mỗi trang đều có dải thông báo *“Website demo đồ án – thanh toán là mô phỏng, không phát sinh giao dịch thật”*. Trang chọn cổng và trang xác nhận ghi **“MÔI TRƯỜNG DEMO – KHÔNG TRỪ TIỀN THẬT”**. Giao diện dùng biểu tượng chung, không dùng logo hay giao diện của các thương hiệu, và **không có ô nhập số thẻ, mật khẩu hay OTP**.
- Giá lưu bằng USD và hiển thị kèm VND theo tỉ giá demo `DEMO_USD_VND` (mặc định 26000). Cổng PayPal demo thu USD; VNPay/MoMo demo thu VND (`order.amountVnd`, tính ở server lúc tạo đơn).
- Server kiểm tra:
  - đơn phải thuộc người dùng;
  - số tiền và loại tiền "cổng" trả về phải khớp với đơn (sửa form → đơn FAILED `amount_mismatch`);
  - chống bấm 2 lần: trạng thái chuyển nguyên tử từ `CREATED`;
  - chỉ mở khóa học khi thành công.

  Mã giao dịch có dạng `DEMO-XXXXXXXX`.
- Đơn và hóa đơn demo ghi rõ **“DEMO – không phải giao dịch thật”** ở trang kết quả, lịch sử thanh toán, `/admin/orders`, file CSV và PDF.
- **Hoàn tiền (demo)**: admin bấm nút ở `/admin/orders` → đơn chuyển `REFUNDED`, quyền học bị thu hồi, ghi audit log `order.refund` và gửi thông báo cho học viên. Học viên mua lại được.
- Code PayPal thật (Orders API v2) vẫn giữ và chỉ dùng khi `PAYMENT_MODE=paypal` (cần `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`). Theo quyết định của dự án, thanh toán **chỉ demo**: các mục PayPal thật (4.1, 4.2, 4.5, hoàn tiền PayPal) không làm.

### Kịch bản demo thanh toán (trình bày trước hội đồng)

Chuẩn bị: 1 tài khoản học viên, 1 tài khoản admin (đã đặt mã quản trị), 1 mã giảm giá (ví dụ `HOIDONG30` giảm 30%, tạo ở `/admin/coupons`).

1. **Mua thành công:** đăng nhập học viên → mở một khóa có phí (giá hiển thị cả USD và ≈ VND) → **Mua khóa học** → trang *Chọn phương thức* → **VNPay (mô phỏng)** → số tiền hiển thị bằng VND → **Thanh toán thành công** → trang kết quả ghi DEMO, mã `DEMO-XXXXXXXX` → **Vào học ngay**. Chuông thông báo có “Thanh toán thành công … (demo)”.
2. **Thanh toán thất bại:** mua khóa khác → **Ví MoMo (mô phỏng)** → **Thanh toán thất bại** → khóa học vẫn khóa; `/orders` hiện trạng thái *Thất bại*.
3. **Hủy giao dịch:** mua lại → **PayPal (mô phỏng)** → **Hủy giao dịch** → *Đã hủy*. Chưa mở khóa.
4. **Dùng mã giảm giá:** ở trang khóa học nhập `HOIDONG30` → **Áp dụng** (giá cũ gạch ngang, giá mới, ≈ VND) → mua qua cổng bất kỳ → `/orders` hiện mã và số tiền được giảm → tải **PDF** (có dấu DEMO và dòng giảm giá).
5. **(Tùy chọn) Chống gian lận:** mở DevTools, sửa ô ẩn `amount` trên trang xác nhận rồi bấm thành công → bị từ chối vì số tiền không khớp, khóa học không mở.
6. **Admin hoàn tiền:** đăng nhập admin (mật khẩu → mã quản trị) → `/admin/orders` → **↩ Hoàn tiền (demo)** ở đơn của bước 1 → đơn chuyển *Đã hoàn tiền*. Học viên mất quyền học và nhận thông báo; `/admin/audit` có sự kiện *Hoàn tiền*; biểu đồ doanh thu `/admin` không còn tính đơn này.

## Kết nối PayPal Sandbox (chỉ khi `PAYMENT_MODE=paypal`)

1. Đăng nhập https://developer.paypal.com, vào **Apps & Credentials**, chọn chế độ **Sandbox** rồi **Create App**.
2. Chép **Client ID** và **Secret** vào `.env`, đặt `PAYMENT_MODE=paypal`, `PAYPAL_MODE=sandbox`.
3. Vào **Testing Tools → Sandbox Accounts** để lấy tài khoản *Personal* (người mua) dùng khi thanh toán thử.
4. Chạy lại `npm run dev`. Khi bấm “Mua khóa học”, bạn sẽ được chuyển sang trang thật của PayPal Sandbox.

PayPal không hỗ trợ VND, nên giá khóa học tính bằng USD.

## Deploy (Render + MongoDB Atlas, bản demo)

Bản demo chạy `NODE_ENV=production` với **`PAYMENT_MODE=demo`**: thanh toán mô phỏng, không cần tài khoản PayPal.

Các thành phần sẵn có trong repo:
- `render.yaml` (Blueprint, gói **free**: không disk, không dịch vụ trả phí; `NODE_VERSION=22` → bản 22.x mới nhất), `"engines": { "node": ">=22.12" }`;
- `GET /healthz` (200 khi kết nối được MongoDB, 503 khi không);
- `trust proxy`; cookie `Secure` + `SameSite=Lax`; CSP `upgrade-insecure-requests`; nén gzip;
- log gọn, không có chuỗi truy vấn hay bí mật; `PORT` đọc từ môi trường;
- index MongoDB tự tạo khi khởi động;
- ảnh đại diện lưu trong **MongoDB GridFS**: website không ghi file nào ra đĩa, nên ổ đĩa tạm của Render không ảnh hưởng.

### 1. MongoDB Atlas

1. Đăng ký https://www.mongodb.com/cloud/atlas → **Create** → chọn gói **M0 (Free)**, vùng gần Việt Nam (ví dụ Singapore).
2. **Database Access** → *Add New Database User*: tạo user/mật khẩu riêng cho Cnow (quyền *Read and write to any database*).
3. **Network Access** → *Add IP Address* → `0.0.0.0/0` (Render bản free không có IP tĩnh; dữ liệu vẫn được bảo vệ bằng user/mật khẩu + TLS).
4. **Connect → Drivers** → chép chuỗi kết nối `mongodb+srv://…` Atlas cấp (đã có tên đăng nhập và mật khẩu), rồi thêm tên CSDL `/cnow` ngay trước dấu `?`, ví dụ phần cuối chuỗi: `….mongodb.net/cnow?retryWrites=true&w=majority`

### 2. Render

1. Đẩy code lên GitHub (bạn tự `git push`).
2. https://dashboard.render.com → **New → Blueprint** → chọn repo. Render đọc `render.yaml` và tạo Web Service `cnow`:
   - build: `npm ci`, start: `npm start`, health check: `/healthz`;
   - biến cố định: `NODE_VERSION=22`, `NODE_ENV=production`, `PAYMENT_MODE=demo`, `DEMO_USD_VND=26000`, `DEMO_NOINDEX=true`.
3. Render hỏi giá trị các biến bí mật (khai báo `sync: false`, không lưu trong Git). Điền theo bảng dưới. `BASE_URL` là địa chỉ Render cấp, ví dụ `https://cnow.onrender.com`; nếu chưa biết, điền tạm rồi sửa sau khi tạo xong.
4. Đợi deploy xong → mở `https://<ten>.onrender.com/healthz` phải thấy `{"status":"ok","db":"up",…}`.
5. Gói free: website ngủ sau 15 phút không có truy cập, lần truy cập đầu tiên sau đó mất khoảng 1 phút để khởi động lại (dữ liệu trên Atlas không mất).

### 3. Biến môi trường

| Tên | Ví dụ | Bắt buộc? |
| --- | --- | --- |
| `NODE_VERSION` | `22` | Có (có sẵn trong `render.yaml`; Render dùng bản 22.x mới nhất, cần ≥ 22.12) |
| `NODE_ENV` | `production` | Có (có sẵn trong `render.yaml`) |
| `MONGODB_URI` | `mongodb+srv://cnow_app:…@cluster0.xxxxx.mongodb.net/cnow` | **Có** – thiếu thì server không khởi động |
| `BASE_URL` | `https://cnow.onrender.com` | **Có** – địa chỉ public, dùng cho cookie Secure, CSP WebSocket, sitemap |
| `SESSION_SECRET` | 64 ký tự hex ngẫu nhiên | **Có**, ≥ 32 ký tự |
| `MFA_KEY` | chuỗi ngẫu nhiên khác `SESSION_SECRET` | Nên có (khóa mã hóa bí mật 2FA; trống thì suy ra từ `SESSION_SECRET`) |
| `PAYMENT_MODE` | `demo` | Không (mặc định `demo`) |
| `DEMO_USD_VND` | `26000` | Không (mặc định 26000) |
| `DEMO_NOINDEX` | `true` | Không – `true` thì thêm meta robots `noindex`, header `X-Robots-Tag`, robots.txt `Disallow: /` |
| `SEED_ADMIN_EMAIL` | `admin@ten-mien.vn` | Không (mặc định `admin@cnow.local`) |
| `SEED_ADMIN_PASSWORD` | mật khẩu mạnh của bạn | **Có khi chạy `setup:prod` lần đầu** (tạo tài khoản `admin`) |
| `SEED_COLLAB_PASSWORD` | mật khẩu CTV mẫu | Không (trống → mật khẩu ngẫu nhiên, không in ra) |
| `PORT` | do Render tự cấp | Không |
| `TRUST_PROXY`, `GLOBAL_RATE_LIMIT` | `1`, `600` | Không (production luôn `trust proxy 1`) |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE` | – | Chỉ khi `PAYMENT_MODE=paypal` (bản demo không dùng) |

Tạo chuỗi ngẫu nhiên: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

### 4. Tạo dữ liệu ban đầu: `npm run setup:prod`

`setup:prod` = `seed` (tài khoản `admin`, CTV mẫu, 6 khóa học; chạy lại không tạo trùng) + `import:content` (nạp bài học văn bản từ `content/`, giữ `_id` bài cũ). Script **không in mật khẩu nào**; mật khẩu admin lấy từ `SEED_ADMIN_PASSWORD`.

Render bản free không có Shell, nên chạy **từ máy của bạn**, trỏ vào Atlas (PowerShell):

```powershell
$env:NODE_ENV="production"; $env:BASE_URL="https://cnow.onrender.com"; $env:SESSION_SECRET="<giống trên Render>"
$env:MONGODB_URI="<chuỗi Atlas>"; $env:SEED_ADMIN_PASSWORD="<mật khẩu admin mạnh>"
npm run setup:prod
npm run set:admin-pin    # đặt MÃ QUẢN TRỊ cho "admin" (nhập ẩn 2 lần) – bắt buộc trước khi vào /admin
```

(Gói Render trả phí có **Shell**: chạy hai lệnh trên ngay trong Shell, các biến đã có sẵn.) Sau đó đăng nhập `admin` → mật khẩu → mã quản trị. Đóng cửa sổ terminal để xóa các biến vừa đặt.

### 5. Cập nhật website

- Sửa code → `git push` lên nhánh đã kết nối → Render **tự build và deploy** (`autoDeploy: true`). Migration CSDL (`src/migrations.js`) và index tự chạy khi khởi động; health check `/healthz` đạt thì bản mới mới nhận lưu lượng.
- Thêm/sửa bài học trong `content/`: `npm run check:content <slug>` → commit, push → chạy `npm run import:content` (từ máy, trỏ `MONGODB_URI` vào Atlas như mục 4).
- Kiểm tra bản production ngay trên máy: đặt các biến như mục 4 (với `MONGODB_URI` là một CSDL thử) rồi chạy `npm start`.

## Hóa đơn PDF

Đơn đã thanh toán (cổng demo, PayPal, hoặc miễn phí nhờ mã giảm giá; kể cả đơn đã hoàn tiền) có link **Hóa đơn** trong `/orders` và trong cột mã đơn ở `/admin/orders`.

- PDF được tạo thẳng vào response bằng pdfkit (`src/services/invoice.js`), không ghi file ra đĩa.
- Font DejaVu Sans nằm trong `assets/fonts/` (có giấy phép kèm theo) để hiển thị đủ tiếng Việt.
- Chỉ chủ đơn hàng hoặc admin tải được.
- Đơn demo có khung **DEMO** và ghi chú “không phải giao dịch thật”.
- Đây là biên nhận điện tử, không thay thế hóa đơn GTGT.

## Xác thực hai lớp (2FA)

- Người dùng bật trong **Hồ sơ → Xác thực hai lớp** (`/profile/2fa`): quét mã QR bằng Google/Microsoft Authenticator, nhập mã 6 số để xác nhận, sau đó **lưu 8 mã khôi phục** (chỉ hiện một lần, mỗi mã dùng một lần).
- Khi đăng nhập: đúng mật khẩu → trang nhập mã (5 phút, tối đa 5 lần sai). Mất điện thoại thì nhập mã khôi phục.
- TOTP là **tùy chọn** cho mọi vai trò, kể cả admin. Admin đã bật TOTP thì mã 6 số thay cho mã quản trị (xem mục dưới).
- Bí mật TOTP được mã hóa AES-256-GCM bằng `MFA_KEY` (hoặc suy ra từ `SESSION_SECRET`); mã khôi phục chỉ lưu bản băm. Mọi sự kiện 2FA được ghi vào `/admin/audit`.

## Mã quản trị

Tài khoản `role=admin` **bắt buộc** có bước xác thực thứ hai: mã quản trị (admin PIN), hoặc TOTP nếu admin đã bật 2FA.

- **Đặt / đổi / lấy lại khi quên:** chạy trên máy có quyền truy cập CSDL (cùng `MONGODB_URI` với website):

  ```bash
  npm run set:admin-pin
  ```

  Script hỏi tên đăng nhập admin, rồi nhập mã **2 lần ở chế độ ẩn ký tự**. Mã không nhận qua tham số dòng lệnh hay biến môi trường. Yêu cầu: ≥ 10 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt. Đặt xong in `Đã đặt mã quản trị cho <username>`; các phiên admin đang mở của tài khoản đó bị đăng xuất. Trên Render: chạy từ máy với MONGODB_URI của Atlas (xem mục Deploy), hoặc dùng **Shell** nếu là gói trả phí.
- **Đăng nhập admin:** đúng mật khẩu → trang **Nhập mã quản trị** (5 phút) → đúng mã mới có phiên đăng nhập (phiên mới, chống session fixation). Admin chưa đặt mã: không đăng nhập được, trang hiện hướng dẫn chạy script.
- **Chống dò:** tối đa 5 lần sai / 15 phút cho **mỗi tài khoản** (lưu trong CSDL, giữ lượt nguyên tử nên gửi đồng thời không vượt) và **mỗi IP**; vượt quá → khóa bước này 15 phút. Thông báo lỗi chung "Mã quản trị không đúng". Nhật ký `/admin/audit`: `ADMIN_PIN_OK`, `ADMIN_PIN_FAIL`, `ADMIN_PIN_LOCKED` (không ghi giá trị mã).
- **Lưu trữ:** chỉ `adminPinHash` (bcrypt cost 12, `select: false`) trong document User. Không lưu mã dạng rõ ở code, `.env`, log, git hay seed.
- Người được nâng quyền lên admin khi đang đăng nhập sẽ bị đăng xuất, và lần sau phải qua bước mã quản trị (cần đặt mã trước).

## Phòng chat khóa học (Socket.IO)

- Mỗi khóa học có phòng chat tại `/courses/<slug>/chat` (link trong trang học và trang khóa học) cho học viên đã ghi danh và giảng viên (tác giả khóa học, admin).
- Socket.IO chạy chung cổng với website, xác thực bằng chính phiên đăng nhập; chỉ nhận kết nối WebSocket có `Origin` đúng `BASE_URL` (chống chiếm phiên qua trang khác). Khi deploy sau reverse proxy cần bật hỗ trợ WebSocket.
- Lưu 200 tin gần nhất mỗi khóa, tối đa 5 tin/10 giây/người, tin dài 1–500 ký tự; giảng viên/admin xóa được tin vi phạm.

## Dữ liệu demo

Để trình diễn trang quản trị, biểu đồ, phân trang… với dữ liệu “có hồn”, chạy:

```bash
npm run seed          # cần có 6 khóa học trước
npm run seed:demo     # mặc định --seed=2026 --users=500; chạy lại không nhân đôi
npm run unseed:demo   # xóa SẠCH mọi bản ghi demo, in số lượng đã xóa
```

- **Đánh dấu và an toàn:**
  - Mọi bản ghi tạo ra có `isDemo: true` (người dùng, đơn hàng, mã giảm giá, ghi danh, tiến độ, chứng nhận, đánh giá, hỏi – đáp, bình luận, chat, thông báo, nhật ký liên quan).
  - Học viên demo dùng email `@demo.cnow.local`. Tất cả dùng chung 1 mật khẩu ngẫu nhiên, chỉ băm 1 lần và không in ra (không ai đăng nhập bằng tài khoản demo).
  - `seed:demo` luôn xóa demo cũ rồi tạo mới. Cùng `--seed` → cùng bộ dữ liệu (ngày tháng tính lùi từ hôm nay).
  - Từ chối chạy khi `NODE_ENV=production`, trừ khi thêm `-- --allow-production`.
- **Quy mô (500 học viên):**

  | Loại | Số lượng |
  | --- | --- |
  | Học viên | 500, tên tiếng Việt hư cấu (ghép họ + đệm + tên phổ biến), đăng ký rải 12 tháng, ~5% bị khóa |
  | Cộng tác viên | 10 |
  | Đơn hàng | ~1.650: 85% thành công / 8% thất bại / 5% hủy / 2% hoàn tiền; ~15% dùng mã giảm giá |
  | Cổng thanh toán | PayPal / VNPay / MoMo mô phỏng |
  | Ghi danh | trung bình 2–3 khóa mỗi người; ~25% chỉ học khóa miễn phí |
  | Hỏi – Đáp | ~300 câu hỏi (~70% có trả lời, ~25–30% có câu “hay nhất” của cộng tác viên) |
  | Bình luận / đánh giá / chat | ~400 bình luận (18 bị ẩn để demo kiểm duyệt), 350 đánh giá, 20–40 tin chat ở 3 khóa đông nhất |

  Doanh thu tăng dần, cao điểm tháng 9 (nhập học) và tháng 12. Số tiền tính đúng như luồng thật (giá khóa − mã giảm giá, theo cent). Đơn hoàn tiền thì thu hồi quyền học; ai học xong 100% có chứng nhận.
- **Nội dung cộng đồng** (câu hỏi, trả lời, bình luận, đánh giá, chat) được viết sẵn bằng tiếng Việt theo đúng nội dung từng bài, lưu trong `data/demo/<slug>.json`.
- **Minh bạch:** đánh giá, hỏi – đáp, bình luận và chat của người dùng demo luôn có nhãn nhỏ **“Dữ liệu mẫu”** cạnh tên. Website demo công khai không trình bày đánh giá ảo như đánh giá thật.
- **Trang quản trị với dữ liệu lớn:**
  - `/admin/users`, `/admin/learners`, `/admin/orders`, `/admin/qa`, `/admin/comments` phân trang 25 dòng.
  - Có ô tìm kiếm (tên / email / tên đăng nhập; chuỗi tìm kiếm được escape), lọc theo khóa học, vai trò, trạng thái, phương thức thanh toán, và sắp xếp theo ngày.
  - Nút **Xuất CSV** xuất đúng theo bộ lọc hiện tại.
  - Biểu đồ `/admin` dùng aggregate; index cho các trường lọc/sắp xếp. Đo trên máy với bộ dữ liệu này: `/admin` ~17 ms.
## Kiểm thử và chất lượng code

```bash
npm test               # 151 kiểm thử: xác thực, phiên, phân quyền mọi route × vai trò, kiểm tra đầu vào, thanh toán, dữ liệu cá nhân…
npm run test:coverage  # như trên + báo cáo độ phủ (CI yêu cầu ≥ 80% số dòng)
npm run lint           # ESLint (kèm eslint-plugin-security, eslint-plugin-n) + Prettier --check, không cho phép cảnh báo
npm run lint:secrets   # secretlint: chặn lỡ commit khóa bí mật (cũng chạy trong pre-commit)
npm run format         # tự định dạng code
```

- Test dùng MongoDB trong bộ nhớ (`mongodb-memory-server`, lần đầu tự tải binary MongoDB), không đụng tới dữ liệu thật và không đọc `.env`.
- PayPal được giả lập bằng cách thay `fetch`, kiểm tra cả trường hợp số tiền/loại tiền/trạng thái không khớp thì **không** mở khóa học.
- GitHub Actions: `ci.yml` (lint + test + độ phủ + `npm audit` trên Node 22 và 24), `codeql.yml` (phân tích tĩnh), `zap.yml` (OWASP ZAP baseline với server chạy thật).

## Cấu trúc thư mục

Quy ước: **route mỏng** (kiểm tra đầu vào bằng schema → gọi service → render/redirect), nghiệp vụ nằm trong **services/**, truy cập dữ liệu qua **models/**. Hàm giữ dưới 50 dòng; service và middleware công khai có JSDoc.

```
src/
  server.js              kết nối MongoDB rồi mới nạp app, tạo index, chạy migration
  app.js                 Express: Helmet/CSP nonce, log, rate limit, session, CSRF, RBAC, xử lý lỗi tập trung
  config.js              đọc + kiểm tra biến môi trường bằng zod (sai → dừng khi khởi động, không in giá trị)
  logger.js              pino: JSON, requestId, ẩn bí mật, che email
  realtime.js            Socket.IO: phòng chat khóa học
  migrations.js          migration idempotent
  models/index.js        mọi model Mongoose (sanitizeFilter, nhật ký bảo mật chỉ ghi thêm)
  middlewares/           auth (loadUser, startSession, renewSession), security (CSRF, giới hạn đăng ký/toàn cục)
  security/              rbac.js (bảng phân quyền tập trung), rate-limit.js (lưu MongoDB)
  validators/            validate() + schemas.js (schema zod cho từng route)
  utils/                 security.js (safeRedirect, escapeRegex), mask.js (che email)
  services/              nghiệp vụ: checkout, refund, course-editor, reporting, admin-queries, privacy,
                         sessions, login-guard, mfa, admin-pin, coupon, quiz, invoice, markdown, content…
  routes/                auth, courses, qa, reviews, comments, pay, profile, mfa, admin-pin, pages, seo, health
  routes/admin/          dashboard, courses, lessons, people, orders, exports, coupons, audit, moderation
  views/                 giao diện EJS
public/                  CSS, JS (không inline), thư viện tự host (vendor/)
content/                 bài học văn bản (Markdown)
scripts/                 seed, seed-demo, import-content, check-content, backup/restore, set-admin-pin…
docs/SECURITY/           mô hình mối đe dọa, RBAC, danh mục dữ liệu, sao lưu, đối chiếu ASVS
test/                    node:test + supertest, mỗi file một CSDL trong bộ nhớ
```