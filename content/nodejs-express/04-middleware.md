---
title: "Middleware"
minutes: 17
preview: false
objectives:
  - "Hiểu middleware là chuỗi hàm xử lý yêu cầu nối tiếp nhau bằng next()"
  - "Dùng middleware có sẵn: express.json, express.urlencoded, express.static"
  - "Tự viết middleware ghi log và kiểm tra quyền truy cập"
  - "Xử lý lỗi tập trung bằng middleware 4 tham số và trang 404"
quiz:
  - question: "Trong middleware (req, res, next), gọi next() có tác dụng gì?"
    options: ["Kết thúc yêu cầu", "Chuyển yêu cầu sang middleware/route tiếp theo", "Gửi lại yêu cầu từ đầu", "Tải lại trang"]
    answer: 1
    explain: "Middleware hoặc trả lời luôn (res.send…), hoặc gọi next() để chuyển tiếp; không làm gì thì yêu cầu bị treo."
  - question: "Middleware xử lý lỗi trong Express khác middleware thường ở điểm nào?"
    options: ["Có 4 tham số (err, req, res, next)", "Phải tên là errorHandler", "Đặt ở đầu file", "Chỉ dùng được với GET"]
    answer: 0
    explain: "Express nhận diện middleware lỗi nhờ đúng 4 tham số; nó thường được đặt cuối cùng."
  - question: "Thiếu app.use(express.json()) thì req.body trong route POST nhận JSON sẽ là gì?"
    options: ["Đối tượng JSON đầy đủ", "undefined", "Chuỗi JSON", "Lỗi 500 ngay lập tức"]
    answer: 1
    explain: "Express không tự đọc body; cần middleware phân tích (parse) body tương ứng với kiểu dữ liệu gửi lên."
  - question: "Vì sao thứ tự app.use quan trọng?"
    options: ["Không quan trọng", "Middleware chạy theo đúng thứ tự khai báo; khai báo sau route thì không áp dụng cho route đó", "Middleware cuối chạy trước", "Express tự sắp xếp"]
    answer: 1
    explain: "Yêu cầu đi qua các lớp theo thứ tự khai báo, giống đi qua các trạm kiểm soát nối tiếp."
---

## Giải thích khái niệm

### Dây chuyền kiểm tra ở sân bay

Trước khi lên máy bay, bạn đi qua một chuỗi trạm: kiểm tra vé, gửi hành lý, soi chiếu an ninh, kiểm tra hộ chiếu, rồi mới tới cửa ra máy bay. Mỗi trạm làm **một việc**, rồi cho bạn đi tiếp hoặc chặn lại ("vé không hợp lệ, mời quay lại").

**Middleware** trong Express chính là các trạm đó. Mỗi middleware là một hàm `(req, res, next)` được chạy **theo thứ tự khai báo** cho mỗi yêu cầu. Nó có thể:

1. Đọc hoặc bổ sung thông tin vào `req` (ví dụ gắn `req.user` sau khi xác định người dùng).
2. **Trả lời luôn** và kết thúc (ví dụ báo 401 khi chưa đăng nhập).
3. Gọi `next()` để chuyển tiếp sang trạm sau.

Route mà bạn viết ở bài trước thực chất cũng là middleware, chỉ là "trạm cuối" chuyên trả lời một đường dẫn cụ thể.

### Gắn middleware

- `app.use(fn)`: áp dụng cho **mọi** yêu cầu.
- `app.use('/admin', fn)`: chỉ yêu cầu có đường dẫn bắt đầu bằng `/admin`.
- `app.get('/trang', fn1, fn2, xuLy)`: chỉ cho một route, chạy lần lượt `fn1`, `fn2` rồi `xuLy`.

### Middleware có sẵn và của cộng đồng

Express đi kèm vài middleware quan trọng:

| Middleware | Tác dụng |
|---|---|
| `express.json()` | đọc body dạng JSON vào `req.body` |
| `express.urlencoded({ extended: false })` | đọc body của form HTML thông thường |
| `express.static('public')` | phục vụ file tĩnh (CSS, ảnh, JS phía trình duyệt) |

Hai middleware đọc body nên đặt **giới hạn kích thước**, ví dụ `express.json({ limit: '50kb' })`, để không ai gửi một body khổng lồ làm nghẽn server. Cộng đồng còn có rất nhiều middleware: `helmet` đặt các header bảo mật, `morgan` ghi log yêu cầu, `express-session` quản lý phiên đăng nhập, `express-rate-limit` giới hạn số lần thử. Dự án Cnow dùng cả bốn.

### Xử lý lỗi tập trung

Thay vì mỗi route tự `try...catch` và tự trả trang lỗi, Express cho phép một **middleware lỗi** đặt cuối cùng, nhận 4 tham số `(err, req, res, next)`. Khi một route ném lỗi, hoặc gọi `next(err)`, Express bỏ qua các middleware thường còn lại và nhảy thẳng tới middleware lỗi. Từ **Express 5**, lỗi ném ra trong hàm `async` cũng được tự động chuyển tới đây, nên code route gọn hơn hẳn.

Middleware lỗi là nơi **ghi log chi tiết cho lập trình viên** nhưng chỉ trả **thông báo chung** cho người dùng. Không bao giờ gửi `err.stack` hay thông tin nội bộ ra ngoài, vì kẻ tấn công có thể lợi dụng.

Cuối cùng, một middleware thường đặt **sau mọi route** đóng vai trò "trang 404": nếu yêu cầu đi hết dây chuyền mà không route nào trả lời, nó sẽ đến đây.

## Code mẫu có chú thích

Một ứng dụng có đủ các loại middleware, tự kiểm tra bằng `fetch`:

```js
const express = require('express');
const app = express();
const nhatKy = [];                              // thay cho console để kết quả gọn

// 1. Middleware ghi log: chạy cho MỌI yêu cầu, rồi chuyển tiếp
app.use((req, res, next) => {
  nhatKy.push(`${req.method} ${req.path}`);
  next();
});

// 2. Đọc body JSON, giới hạn 10kb
app.use(express.json({ limit: '10kb' }));

// 3. Middleware kiểm tra "khóa API" – chỉ áp dụng cho route cần bảo vệ
function canKhoa(req, res, next) {
  if (req.get('x-api-key') !== 'khoa-bi-mat-demo') {
    return res.status(401).json({ loi: 'Thiếu hoặc sai khóa API' }); // chặn lại, không gọi next
  }
  req.nguoiGoi = 'ung-dung-noi-bo';            // gắn thêm thông tin cho các bước sau
  next();
}

app.get('/cong-khai', (req, res) => res.json({ ok: true }));
app.post('/bi-mat', canKhoa, (req, res) => res.json({ nhan: req.body, tu: req.nguoiGoi }));

// 4. Route ném lỗi trong hàm async: Express 5 tự chuyển tới middleware lỗi
app.get('/loi', async () => {
  throw new Error('Mất kết nối CSDL (giả lập)');
});

// 5. Trang 404: đặt sau mọi route
app.use((req, res) => res.status(404).json({ loi: 'Không tìm thấy' }));

// 6. Middleware lỗi: đúng 4 tham số, đặt cuối cùng
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  nhatKy.push(`LỖI: ${err.message}`);          // log chi tiết cho lập trình viên
  res.status(500).json({ loi: 'Đã có lỗi xảy ra' }); // người dùng chỉ thấy thông báo chung
});

const server = app.listen(0, async () => {
  const goc = `http://localhost:${server.address().port}`;
  const kq = async (r) => `${r.status} ${JSON.stringify(await r.json())}`;
  console.log(await kq(await fetch(goc + '/cong-khai')));
  console.log(await kq(await fetch(goc + '/bi-mat', { method: 'POST' })));
  console.log(await kq(await fetch(goc + '/bi-mat', {
    method: 'POST',
    headers: { 'x-api-key': 'khoa-bi-mat-demo', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tin: 'xin chào' }),
  })));
  console.log(await kq(await fetch(goc + '/loi')));
  console.log(await kq(await fetch(goc + '/khong-co')));
  console.log(nhatKy);
  server.close();
});
```

```text output
200 {"ok":true}
401 {"loi":"Thiếu hoặc sai khóa API"}
200 {"nhan":{"tin":"xin chào"},"tu":"ung-dung-noi-bo"}
500 {"loi":"Đã có lỗi xảy ra"}
404 {"loi":"Không tìm thấy"}
[
  'GET /cong-khai',
  'POST /bi-mat',
  'POST /bi-mat',
  'GET /loi',
  'LỖI: Mất kết nối CSDL (giả lập)',
  'GET /khong-co'
]
```

Theo dõi kết quả: yêu cầu thứ hai bị `canKhoa` chặn nên route không chạy; lỗi của `/loi` không làm sập server mà được middleware lỗi xử lý; đường dẫn lạ rơi vào trang 404.

### Middleware đo thời gian xử lý

Middleware cũng có thể làm việc **sau khi** response đã gửi, bằng cách lắng nghe sự kiện `finish` của `res`. Mẫu sau đo thời gian phục vụ mỗi yêu cầu, rất hữu ích để tìm route chậm:

```js
const express = require('express');
const app = express();

app.use((req, res, next) => {
  const batDau = process.hrtime.bigint();
  res.on('finish', () => {                     // chạy khi response đã gửi xong
    const ms = Number(process.hrtime.bigint() - batDau) / 1e6;
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${ms < 1000 ? 'nhanh' : 'chậm'})`);
  });
  next();
});
app.get('/', (req, res) => res.send('ok'));

const server = app.listen(0, async () => {
  await fetch(`http://localhost:${server.address().port}/?trang=1`);
  server.close();
});
```

```text output
GET /?trang=1 → 200 (nhanh)
```

## Lỗi hay gặp

**1. Quên gọi `next()` hoặc quên trả lời.** Middleware không gọi `next()` và cũng không gửi response thì yêu cầu bị "treo", trình duyệt quay vòng tới khi hết thời gian chờ. Mỗi nhánh của middleware phải kết thúc bằng **một trong hai**.

**2. Đặt middleware sau route.** `app.use(express.json())` viết **sau** `app.post(...)` thì route đó nhận `req.body` là `undefined`. Middleware đọc body, ghi log, bảo mật phải đặt **trước** các route.

**3. Middleware lỗi thiếu tham số.** Viết `(err, req, res) => {...}` (3 tham số) thì Express coi đó là middleware thường, lỗi không được bắt đúng chỗ. Phải đủ 4 tham số, kể cả khi không dùng `next`.

**4. Lộ thông tin lỗi.** Trả `res.status(500).send(err.stack)` cho người dùng làm lộ đường dẫn file, phiên bản thư viện, có khi cả câu truy vấn CSDL. Ghi chi tiết vào log phía server, trả thông báo chung cho người dùng.

## Bài tập thực hành

Viết middleware `gioiHanKichThuoc` từ chối (mã 413) mọi yêu cầu POST có header `content-length` lớn hơn 1000 byte, và middleware `chiGioHanhChinh(gioMo, gioDong)` nhận tham số, trả 503 nếu giờ hiện tại (truyền vào để dễ kiểm tra) nằm ngoài khoảng. Tự kiểm tra bằng `fetch`.

Gợi ý: middleware có tham số là một **hàm trả về middleware** – đúng kiểu closure ở khóa JavaScript.

<details>
<summary>Xem lời giải</summary>

```js
const express = require('express');
const app = express();

function gioiHanKichThuoc(req, res, next) {
  if (req.method === 'POST' && Number(req.get('content-length') || 0) > 1000) {
    return res.status(413).send('Dữ liệu quá lớn');
  }
  next();
}
// Hàm tạo middleware: nhận cấu hình, trả về (req, res, next)
const chiGioHanhChinh = (gioMo, gioDong, layGio = () => new Date().getHours()) => (req, res, next) => {
  const gio = layGio();
  if (gio < gioMo || gio >= gioDong) return res.status(503).send('Ngoài giờ làm việc');
  next();
};

app.use(gioiHanKichThuoc);
app.get('/ban-ngay', chiGioHanhChinh(8, 17, () => 10), (req, res) => res.send('Đang mở cửa'));
app.get('/ban-dem', chiGioHanhChinh(8, 17, () => 22), (req, res) => res.send('Đang mở cửa'));
app.post('/gui', (req, res) => res.send('Đã nhận'));

const server = app.listen(0, async () => {
  const goc = `http://localhost:${server.address().port}`;
  for (const [m, url, body] of [['GET', '/ban-ngay'], ['GET', '/ban-dem'], ['POST', '/gui', 'x'.repeat(2000)], ['POST', '/gui', 'nhỏ']]) {
    const r = await fetch(goc + url, { method: m, body });
    console.log(m, url, r.status, await r.text());
  }
  server.close();
});
```

```text output
GET /ban-ngay 200 Đang mở cửa
GET /ban-dem 503 Ngoài giờ làm việc
POST /gui 413 Dữ liệu quá lớn
POST /gui 200 Đã nhận
```

</details>

## Tóm tắt

- Middleware là chuỗi hàm `(req, res, next)` chạy theo thứ tự khai báo; mỗi hàm trả lời luôn hoặc gọi `next()`.
- Gắn toàn cục bằng `app.use`, theo đường dẫn, hoặc cho từng route.
- Middleware có sẵn: `express.json`, `express.urlencoded` (đặt giới hạn kích thước), `express.static`.
- Trang 404 đặt sau mọi route; middleware lỗi 4 tham số đặt cuối cùng, log chi tiết nhưng trả thông báo chung.
- Express 5 tự chuyển lỗi của hàm `async` tới middleware lỗi.

## Đọc thêm

- [Sử dụng middleware – expressjs.com](https://expressjs.com/en/guide/using-middleware.html)
- [Viết middleware – expressjs.com](https://expressjs.com/en/guide/writing-middleware.html)
- [Xử lý lỗi – expressjs.com](https://expressjs.com/en/guide/error-handling.html)
