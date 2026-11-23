---
title: "Xác thực người dùng"
minutes: 18
preview: false
objectives:
  - "Phân biệt xác thực (authentication) và phân quyền (authorization)"
  - "Băm mật khẩu bằng bcrypt thay vì lưu mật khẩu gốc"
  - "Quản lý phiên đăng nhập bằng express-session và cookie an toàn"
  - "Viết middleware bắt buộc đăng nhập và áp dụng các biện pháp chống tấn công cơ bản"
quiz:
  - question: "Cách lưu mật khẩu đúng là gì?"
    options: ["Lưu nguyên văn để tiện khôi phục", "Mã hóa bằng Base64", "Băm bằng thuật toán chậm có muối như bcrypt", "Lưu trong cookie"]
    answer: 2
    explain: "bcrypt tạo hash một chiều có muối (salt) ngẫu nhiên và cố tình chậm, khiến việc dò mật khẩu bị lộ CSDL trở nên rất tốn kém. Base64 chỉ là mã hóa hai chiều, giải được ngay."
  - question: "Khi đăng nhập sai, thông báo nào an toàn hơn?"
    options: ["'Email không tồn tại'", "'Mật khẩu sai cho email này'", "'Email hoặc mật khẩu không đúng'", "Hiện cả hai thông báo"]
    answer: 2
    explain: "Thông báo chung không cho kẻ tấn công biết email nào đã đăng ký trên hệ thống."
  - question: "Vì sao gọi req.session.regenerate() ngay sau khi đăng nhập thành công?"
    options: ["Để phiên chạy nhanh hơn", "Để chống session fixation: cấp mã phiên mới thay cho mã có thể đã bị kẻ xấu biết trước", "Để xóa giỏ hàng", "Bắt buộc của Express"]
    answer: 1
    explain: "Nếu giữ nguyên mã phiên cũ, kẻ tấn công từng gài mã đó cho nạn nhân sẽ dùng chung phiên đã đăng nhập."
  - question: "Thuộc tính cookie nào ngăn JavaScript trên trang đọc được cookie phiên?"
    options: ["secure", "httpOnly", "sameSite", "maxAge"]
    answer: 1
    explain: "httpOnly giảm thiệt hại khi trang bị XSS; secure chỉ gửi qua HTTPS; sameSite giúp chống CSRF."
---

## Giải thích khái niệm

### Xác thực và phân quyền

Hai khái niệm hay bị nhầm:

- **Xác thực** (authentication): "Bạn **là ai**?" – kiểm tra danh tính, thường bằng tên đăng nhập và mật khẩu.
- **Phân quyền** (authorization): "Bạn **được làm gì**?" – sau khi biết bạn là ai, kiểm tra bạn có quyền xem trang quản trị, sửa khóa học hay không.

Ở tòa nhà văn phòng, quẹt thẻ ở cổng là xác thực; thẻ của bạn mở được tầng nào là phân quyền. Bài này tập trung vào xác thực; phần phân quyền chỉ là một middleware kiểm tra vai trò, giống `requireRole` trong dự án Cnow.

### Không bao giờ lưu mật khẩu gốc

Giả sử một ngày cơ sở dữ liệu bị lộ. Nếu mật khẩu lưu nguyên văn, kẻ tấn công có ngay mật khẩu của mọi người, và vì nhiều người dùng chung mật khẩu ở nhiều nơi, thiệt hại lan rộng. Cách đúng là **băm** (hash) mật khẩu:

- Hàm băm biến mật khẩu thành một chuỗi cố định, **không thể đảo ngược** lại mật khẩu gốc.
- Mỗi mật khẩu được trộn với một **muối** (salt) ngẫu nhiên trước khi băm, nên hai người cùng mật khẩu vẫn có hash khác nhau.
- Thuật toán phải **cố tình chậm** (như bcrypt với "cost factor"), để việc thử hàng tỉ mật khẩu trở nên quá tốn kém.

Khi đăng nhập, ta không "giải mã" gì cả, mà băm mật khẩu vừa nhập rồi **so sánh** với hash đã lưu. Thư viện `bcryptjs` lo trọn phần này với hai hàm `hash` và `compare`. Đừng tự chế thuật toán, và đừng dùng hàm băm nhanh như MD5 hay SHA-256 thuần cho mật khẩu.

### Phiên đăng nhập và cookie

HTTP **không có trí nhớ**: mỗi yêu cầu độc lập, server không tự biết hai yêu cầu đến từ cùng một người. **Phiên** (session) giải quyết điều này như vé gửi xe: lần đầu đăng nhập đúng, server tạo một bản ghi phiên (ghi "phiên số X là của người dùng 42") và đưa cho trình duyệt một **cookie** chứa mã phiên ngẫu nhiên. Các yêu cầu sau, trình duyệt tự gửi kèm cookie; server tra mã đó để biết bạn là ai.

Middleware `express-session` làm việc này. Cookie phiên cần các thuộc tính an toàn:

- `httpOnly: true` – JavaScript trên trang không đọc được cookie, giảm thiệt hại khi bị XSS.
- `secure: true` (khi chạy HTTPS) – cookie chỉ được gửi qua kết nối mã hóa.
- `sameSite: 'lax'` – hạn chế gửi cookie từ trang web khác, giúp chống CSRF.

Mặc định, `express-session` lưu phiên trong bộ nhớ, mất hết khi khởi động lại server và không dùng được khi chạy nhiều máy. Thực tế cần lưu phiên vào CSDL; Cnow dùng `connect-mongo` để lưu phiên trong MongoDB.

### Những biện pháp chống tấn công cơ bản

1. **Thông báo lỗi chung**: "Email hoặc mật khẩu không đúng", không nói rõ sai ở đâu.
2. **Cấp phiên mới sau khi đăng nhập** (`req.session.regenerate`) để chống *session fixation*.
3. **Giới hạn số lần thử** (rate limit), ví dụ 5 lần sai trong 15 phút, chống dò mật khẩu.
4. **Đăng xuất phải hủy phiên** ở server (`req.session.destroy`), không chỉ xóa cookie.
5. **Chống CSRF** cho mọi form POST bằng token (Cnow dùng trường ẩn `_csrf`).

## Code mẫu có chú thích

Băm và kiểm tra mật khẩu với `bcryptjs`:

```js
const bcrypt = require('bcryptjs');

async function main() {
  const matKhau = 'MeoMeo2026!';
  const hash1 = await bcrypt.hash(matKhau, 10);   // 10 = cost factor; thực tế nên 10–12
  const hash2 = await bcrypt.hash(matKhau, 10);

  console.log(hash1.startsWith('$2'), hash1.length);   // định dạng bcrypt, dài 60 ký tự
  console.log('Hai hash giống nhau?', hash1 === hash2);  // khác nhau nhờ muối ngẫu nhiên
  console.log('Đúng mật khẩu:', await bcrypt.compare(matKhau, hash1));
  console.log('Sai mật khẩu:', await bcrypt.compare('meomeo2026!', hash1));
}
main();
```

```text output
true 60
Hai hash giống nhau? false
Đúng mật khẩu: true
Sai mật khẩu: false
```

Luồng đăng nhập hoàn chỉnh với `express-session`, tự kiểm tra bằng `fetch` (trình duyệt tự lưu cookie, còn ở đây ta tự chuyển cookie giữa các lần gọi):

```js
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');

// "CSDL" người dùng trong bộ nhớ cho gọn ví dụ
const nguoiDung = [{ id: 1, email: 'an@example.com', ten: 'An', hash: bcrypt.hashSync('MatKhau123', 10) }];

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(session({
  name: 'demo.sid',
  secret: process.env.SESSION_SECRET || 'chi-dung-khi-hoc-hay-dat-bien-moi-truong',
  resave: false,
  saveUninitialized: false,                 // chưa đăng nhập thì không tạo phiên
  cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 60 * 60 * 1000 },
}));

// Middleware bắt buộc đăng nhập
function canDangNhap(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ loi: 'Vui lòng đăng nhập' });
  next();
}

app.post('/dang-nhap', async (req, res, next) => {
  const email = String(req.body.email || '').trim().toLowerCase(); // ép kiểu chống NoSQL injection
  const user = nguoiDung.find((u) => u.email === email);
  const dung = user && await bcrypt.compare(String(req.body.matKhau || ''), user.hash);
  if (!dung) return res.status(401).json({ loi: 'Email hoặc mật khẩu không đúng' }); // thông báo chung
  req.session.regenerate((err) => {         // cấp mã phiên mới: chống session fixation
    if (err) return next(err);
    req.session.userId = user.id;
    res.json({ chao: user.ten });
  });
});

app.get('/ho-so', canDangNhap, (req, res) => {
  const user = nguoiDung.find((u) => u.id === req.session.userId);
  res.json({ ten: user.ten, email: user.email });
});

app.post('/dang-xuat', (req, res) => {
  req.session.destroy(() => {               // hủy phiên ở server
    res.clearCookie('demo.sid');
    res.json({ ok: true });
  });
});

const server = app.listen(0, async () => {
  const goc = `http://localhost:${server.address().port}`;
  let cookie = '';
  const goi = async (method, url, body) => {
    const r = await fetch(goc + url, {
      method, headers: { 'Content-Type': 'application/json', cookie }, body: body && JSON.stringify(body),
    });
    const moi = r.headers.getSetCookie().find((c) => c.startsWith('demo.sid='));
    if (moi) cookie = moi.split(';')[0];    // giữ cookie phiên như trình duyệt
    return `${r.status} ${JSON.stringify(await r.json())}`;
  };
  console.log(await goi('GET', '/ho-so'));
  console.log(await goi('POST', '/dang-nhap', { email: 'an@example.com', matKhau: 'sai' }));
  console.log(await goi('POST', '/dang-nhap', { email: { $ne: null }, matKhau: 'MatKhau123' }));
  console.log(await goi('POST', '/dang-nhap', { email: 'AN@example.com', matKhau: 'MatKhau123' }));
  console.log(await goi('GET', '/ho-so'));
  console.log(await goi('POST', '/dang-xuat'));
  console.log(await goi('GET', '/ho-so'));
  server.close();
});
```

```text output
401 {"loi":"Vui lòng đăng nhập"}
401 {"loi":"Email hoặc mật khẩu không đúng"}
401 {"loi":"Email hoặc mật khẩu không đúng"}
200 {"chao":"An"}
200 {"ten":"An","email":"an@example.com"}
200 {"ok":true}
401 {"loi":"Vui lòng đăng nhập"}
```

Dòng thứ ba cho thấy việc ép `String(...)` vô hiệu hóa ý đồ gửi toán tử `$ne` thay cho email.

## Lỗi hay gặp

**1. So sánh mật khẩu bằng `===`.** `user.hash === matKhau` luôn sai vì hash khác mật khẩu gốc; còn nếu bạn lưu mật khẩu gốc để so được bằng `===` thì đó là lỗi bảo mật nghiêm trọng. Dùng `bcrypt.compare`.

**2. Viết thẳng secret vào code.** `secret: 'abc'` đưa lên Git là ai cũng biết, có thể giả mạo cookie phiên. Đọc từ `process.env.SESSION_SECRET`, chuỗi dài ít nhất 32 ký tự ngẫu nhiên. Cnow từ chối khởi động production nếu secret quá ngắn.

**3. Chỉ ẩn nút trên giao diện mà không kiểm tra ở server.** Ẩn nút "Quản trị" với người dùng thường là chưa đủ: ai cũng gõ thẳng địa chỉ được. Mọi route cần bảo vệ phải có middleware kiểm tra ở server.

**4. Dùng hàm băm đồng bộ trong route.** `bcrypt.hashSync` chạy trên luồng chính, có thể làm chậm cả server khi nhiều người đăng ký cùng lúc. Trong route hãy dùng bản `async` (`await bcrypt.hash`).

## Bài tập thực hành

Mở rộng ví dụ trên: thêm route `POST /dang-ky` nhận `email`, `ten`, `matKhau` (tối thiểu 8 ký tự, có cả chữ và số), trả 409 nếu email đã tồn tại, 201 nếu thành công; mật khẩu phải được băm trước khi lưu. Sau đó viết middleware `chiQuanTri` cho route `GET /quan-tri`, chỉ cho phép người dùng có `vaiTro: 'admin'`, trả 403 nếu đăng nhập rồi nhưng không đủ quyền.

Gợi ý: tách hàm `kiemTraMatKhau(s)` trả về chuỗi lỗi hoặc `null`; middleware phân quyền đặt **sau** `canDangNhap`.

<details>
<summary>Xem lời giải</summary>

```js
const bcrypt = require('bcryptjs');

const ds = [];
const kiemTraMatKhau = (s) => (s.length < 8 ? 'Mật khẩu tối thiểu 8 ký tự'
  : !/[A-Za-z]/.test(s) || !/\d/.test(s) ? 'Mật khẩu cần cả chữ và số' : null);

async function dangKy({ email, ten, matKhau }) {
  email = String(email || '').trim().toLowerCase();
  const loi = kiemTraMatKhau(String(matKhau || ''));
  if (loi) return { status: 400, loi };
  if (ds.some((u) => u.email === email)) return { status: 409, loi: 'Email đã được dùng' };
  ds.push({ id: ds.length + 1, email, ten: String(ten || ''), vaiTro: 'user', hash: await bcrypt.hash(matKhau, 10) });
  return { status: 201 };
}

// Middleware phân quyền: dùng sau canDangNhap
const chiQuanTri = (layNguoiDung) => (req, res, next) => {
  const u = layNguoiDung(req.session.userId);
  if (!u || u.vaiTro !== 'admin') return res.status(403).json({ loi: 'Không có quyền' });
  next();
};

(async () => {
  console.log((await dangKy({ email: 'b@example.com', ten: 'Bình', matKhau: 'ngan' })).status);
  console.log((await dangKy({ email: 'b@example.com', ten: 'Bình', matKhau: 'MatKhau99' })).status);
  console.log((await dangKy({ email: 'B@example.com', ten: 'Bình 2', matKhau: 'MatKhau99' })).status);
  console.log(ds[0].hash !== 'MatKhau99', typeof chiQuanTri(() => null));
})();
```

```text output
400
201
409
true function
```

</details>

## Tóm tắt

- Xác thực: bạn là ai; phân quyền: bạn được làm gì. Cả hai phải kiểm tra ở server.
- Băm mật khẩu bằng bcrypt (có muối, cố tình chậm); kiểm tra bằng `bcrypt.compare`, không bao giờ lưu mật khẩu gốc.
- Phiên đăng nhập dùng cookie chứa mã phiên ngẫu nhiên; cookie `httpOnly`, `secure`, `sameSite`.
- Sau đăng nhập gọi `regenerate`, đăng xuất gọi `destroy`; thông báo lỗi chung; giới hạn số lần thử.
- Secret đọc từ biến môi trường; ép kiểu dữ liệu đăng nhập để chống NoSQL injection.

## Đọc thêm

- [Thực hành bảo mật cho Express – expressjs.com](https://expressjs.com/en/advanced/best-practice-security.html)
- [Middleware express-session – expressjs.com](https://expressjs.com/en/resources/middleware/session.html)
- [Module crypto – nodejs.org](https://nodejs.org/api/crypto.html)
