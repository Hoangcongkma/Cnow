---
title: "Express routing"
minutes: 17
preview: false
objectives:
  - "Tạo ứng dụng Express và hiểu vòng đời một yêu cầu: request → route → response"
  - "Định nghĩa route theo phương thức HTTP (GET, POST, PUT, DELETE) và đường dẫn"
  - "Đọc tham số đường dẫn (req.params) và chuỗi truy vấn (req.query)"
  - "Trả JSON đúng mã trạng thái và tách route ra file bằng express.Router"
quiz:
  - question: "Với route app.get('/khoa-hoc/:slug'), truy cập /khoa-hoc/nodejs thì req.params.slug bằng gì?"
    options: ["':slug'", "'nodejs'", "'/khoa-hoc/nodejs'", "undefined"]
    answer: 1
    explain: "Phần bắt đầu bằng dấu : trong đường dẫn là tham số; giá trị thật nằm trong req.params."
  - question: "Yêu cầu GET /san-pham?trang=2&sapxep=gia thì req.query.trang có kiểu gì?"
    options: ["number", "string", "boolean", "array"]
    answer: 1
    explain: "Mọi giá trị trong chuỗi truy vấn đều là chuỗi; cần Number() và kiểm tra trước khi dùng."
  - question: "Mã trạng thái nào phù hợp khi tạo mới tài nguyên thành công?"
    options: ["200", "201", "404", "500"]
    answer: 1
    explain: "201 Created cho tạo mới; 200 OK cho thành công chung; 404 không tìm thấy; 500 lỗi server."
  - question: "Express chọn route nào khi có nhiều route khớp cùng một yêu cầu?"
    options: ["Route khai báo cuối cùng", "Route khai báo đầu tiên khớp (và gửi response)", "Route có đường dẫn dài nhất", "Ngẫu nhiên"]
    answer: 1
    explain: "Express duyệt theo thứ tự khai báo; route đầu tiên khớp và trả response sẽ kết thúc yêu cầu."
---

## Giải thích khái niệm

### Express là gì?

Ở bài trước, bạn đã viết server bằng module `http` thuần và thấy phải tự so sánh `req.url`, tự đặt header. Khi có hàng chục trang, cách đó nhanh chóng rối. **Express** là framework web tối giản, phổ biến nhất cho Node.js, giúp bạn:

- Khai báo **route** (tuyến đường) gọn gàng theo phương thức HTTP và đường dẫn.
- Đọc dữ liệu yêu cầu dễ dàng: tham số, chuỗi truy vấn, dữ liệu form, JSON.
- Ghép các bước xử lý dùng chung thành **middleware** (bài sau).

Cài bằng `npm install express`. Website Cnow mà bạn đang học được xây bằng chính Express.

### Tổng đài viên phân luồng cuộc gọi

Hãy hình dung tổng đài chăm sóc khách hàng: "Bấm 1 để gặp phòng kinh doanh, bấm 2 để báo hỏng". Mỗi cuộc gọi đến được chuyển cho đúng bộ phận. **Routing** (định tuyến) trong Express cũng vậy: mỗi yêu cầu (request) có một **phương thức** và một **đường dẫn**, Express tìm hàm xử lý (handler) phù hợp và giao cho nó.

### Phương thức HTTP

| Phương thức | Ý nghĩa | Ví dụ |
|---|---|---|
| `GET` | lấy dữ liệu, không thay đổi gì | xem danh sách khóa học |
| `POST` | tạo mới, gửi form | đăng ký tài khoản |
| `PUT` / `PATCH` | cập nhật toàn bộ / một phần | sửa hồ sơ |
| `DELETE` | xóa | xóa bình luận |

Quy tắc an toàn: **GET không bao giờ được thay đổi dữ liệu**. Trình duyệt, công cụ tìm kiếm có thể tự gọi GET bất cứ lúc nào (tải trước trang, lưu đệm), nên một liên kết `GET /xoa-tai-khoan` là thảm họa.

### Request và response

Mỗi hàm xử lý nhận hai đối tượng chính:

- `req` (request – yêu cầu): `req.params` (tham số trong đường dẫn), `req.query` (chuỗi truy vấn sau dấu `?`), `req.body` (dữ liệu gửi lên, cần middleware đọc body), `req.get('tên-header')`.
- `res` (response – phản hồi): `res.send()` gửi văn bản/HTML, `res.json()` gửi JSON, `res.status(404)` đặt mã trạng thái, `res.redirect('/duong-dan')` chuyển hướng.

Mỗi yêu cầu phải được trả lời **đúng một lần**. Quên trả lời thì trình duyệt quay vòng chờ mãi; trả lời hai lần thì Express báo lỗi.

### Mã trạng thái

Mã trạng thái (status code) cho người gọi biết kết quả: nhóm **2xx** thành công (200 OK, 201 Created), **3xx** chuyển hướng, **4xx** lỗi phía người gọi (400 dữ liệu sai, 401 chưa đăng nhập, 403 không có quyền, 404 không tìm thấy), **5xx** lỗi phía server. Trả đúng mã giúp ứng dụng khác (và chính bạn khi gỡ lỗi) hiểu chuyện gì đã xảy ra.

### Express Router: tách route theo chủ đề

Khi ứng dụng lớn lên, đặt mọi route trong một file là không ổn. `express.Router()` tạo một "ứng dụng con" chứa nhóm route liên quan, ví dụ mọi route về khóa học, rồi gắn vào ứng dụng chính tại một tiền tố: `app.use('/khoa-hoc', routerKhoaHoc)`. Dự án Cnow tổ chức đúng như vậy với các file trong thư mục `src/routes`.

## Code mẫu có chú thích

Một server Express nhỏ quản lý danh sách khóa học trong bộ nhớ:

```js server
const express = require('express');
const app = express();

const khoaHoc = [
  { slug: 'html-css', ten: 'HTML, CSS', gia: 0 },
  { slug: 'nodejs', ten: 'Node.js & Express', gia: 25 },
];

app.get('/', (req, res) => {
  res.send('Chào mừng tới API khóa học. Thử /khoa-hoc');
});

// Danh sách, có lọc theo chuỗi truy vấn: /khoa-hoc?mienPhi=1
app.get('/khoa-hoc', (req, res) => {
  const ds = req.query.mienPhi === '1' ? khoaHoc.filter((k) => k.gia === 0) : khoaHoc;
  res.json(ds);
});

// Chi tiết theo tham số đường dẫn
app.get('/khoa-hoc/:slug', (req, res) => {
  const kh = khoaHoc.find((k) => k.slug === req.params.slug);
  if (!kh) return res.status(404).json({ loi: 'Không tìm thấy khóa học' }); // return để dừng hàm
  res.json(kh);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mở http://localhost:${PORT}`));
```

Mở địa chỉ `localhost:3000/khoa-hoc/nodejs` trên trình duyệt để thấy JSON trả về.

### Tự kiểm tra API bằng fetch

Thay vì mở trình duyệt, bạn có thể để chương trình **tự gọi** API của chính nó để kiểm tra. Ví dụ dưới khởi động server ở một cổng ngẫu nhiên còn trống (`listen(0)`), gửi vài yêu cầu bằng `fetch` (có sẵn trong Node.js 18+), in kết quả rồi tắt server. Đây cũng là ý tưởng của kiểm thử tự động mà bạn sẽ gặp sau này.

```js
const express = require('express');
const app = express();
app.use(express.json());                     // đọc body JSON (chi tiết ở bài Middleware)

const ds = [{ id: 1, ten: 'HTML' }];

app.get('/khoa-hoc', (req, res) => res.json(ds));
app.post('/khoa-hoc', (req, res) => {
  const ten = String(req.body.ten || '').trim();
  if (ten.length < 2) return res.status(400).json({ loi: 'Tên quá ngắn' });
  const moi = { id: ds.length + 1, ten };
  ds.push(moi);
  res.status(201).json(moi);                 // 201: đã tạo mới
});
app.delete('/khoa-hoc/:id', (req, res) => {
  const i = ds.findIndex((k) => k.id === Number(req.params.id)); // params luôn là chuỗi
  if (i === -1) return res.status(404).json({ loi: 'Không có' });
  ds.splice(i, 1);
  res.status(204).end();                     // 204: thành công, không có nội dung
});

const server = app.listen(0, async () => {
  const goc = `http://localhost:${server.address().port}`;
  const gui = (method, url, body) => fetch(goc + url, {
    method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body),
  });

  let r = await gui('POST', '/khoa-hoc', { ten: 'Node.js' });
  console.log(r.status, await r.json());
  r = await gui('POST', '/khoa-hoc', { ten: 'x' });
  console.log(r.status, await r.json());
  r = await gui('DELETE', '/khoa-hoc/1');
  console.log(r.status);
  r = await gui('GET', '/khoa-hoc');
  console.log(r.status, await r.json());
  server.close();
});
```

```text output
201 { id: 2, ten: 'Node.js' }
400 { loi: 'Tên quá ngắn' }
204
200 [ { id: 2, ten: 'Node.js' } ]
```

Tách route ra file bằng Router:

```js file=routes-khoa-hoc.js
// routes-khoa-hoc.js – nhóm route về khóa học
const router = require('express').Router();

router.get('/', (req, res) => res.json(['html-css', 'nodejs']));
router.get('/:slug', (req, res) => res.json({ slug: req.params.slug }));

module.exports = router;
```

```js
const express = require('express');
const app = express();
app.use('/khoa-hoc', require('./routes-khoa-hoc')); // mọi route trong file có tiền tố /khoa-hoc

const server = app.listen(0, async () => {
  const goc = `http://localhost:${server.address().port}`;
  console.log(await (await fetch(goc + '/khoa-hoc')).json());
  console.log(await (await fetch(goc + '/khoa-hoc/nodejs')).json());
  server.close();
});
```

```text output
[ 'html-css', 'nodejs' ]
{ slug: 'nodejs' }
```

## Lỗi hay gặp

**1. Gửi phản hồi hai lần.** Quên `return` sau `res.status(404).json(...)` khiến code chạy tiếp xuống `res.json(kh)` và Express báo `Cannot set headers after they are sent to the client`. Luôn `return` khi trả lời sớm.

**2. So sánh tham số với số.** `req.params.id` luôn là chuỗi, nên `k.id === req.params.id` (so số với chuỗi) không bao giờ đúng. Chuyển bằng `Number()` và kiểm tra hợp lệ.

**3. Thứ tự route.** Khai báo `app.get('/khoa-hoc/:slug')` **trước** `app.get('/khoa-hoc/moi')` thì yêu cầu `/khoa-hoc/moi` rơi vào route đầu với `slug = 'moi'`. Đặt route cụ thể lên trước route có tham số.

**4. Tin dữ liệu người dùng.** `req.query`, `req.params`, `req.body` đều do người gọi gửi lên, có thể sai kiểu hoặc cố tình độc hại. Luôn ép kiểu, giới hạn độ dài và kiểm tra trước khi dùng (như `String(...).trim()` trong ví dụ).

## Bài tập thực hành

Viết API ghi chú trong bộ nhớ với các route: `GET /ghi-chu` (danh sách, hỗ trợ `?tim=từ khóa` lọc theo nội dung), `POST /ghi-chu` (tạo mới, nội dung 1–200 ký tự, trả 201), `GET /ghi-chu/:id` (404 nếu không có). Tự kiểm tra bằng `fetch` như ví dụ.

Gợi ý: dùng `includes` để lọc; `id` tự tăng bằng một biến đếm.

<details>
<summary>Xem lời giải</summary>

```js
const express = require('express');
const app = express();
app.use(express.json());
const ghiChu = []; let idTiepTheo = 1;

app.get('/ghi-chu', (req, res) => {
  const tim = String(req.query.tim || '').toLowerCase();
  res.json(ghiChu.filter((g) => g.noiDung.toLowerCase().includes(tim)));
});
app.post('/ghi-chu', (req, res) => {
  const noiDung = String(req.body.noiDung || '').trim();
  if (noiDung.length < 1 || noiDung.length > 200) return res.status(400).json({ loi: 'Nội dung 1–200 ký tự' });
  const g = { id: idTiepTheo++, noiDung };
  ghiChu.push(g);
  res.status(201).json(g);
});
app.get('/ghi-chu/:id', (req, res) => {
  const g = ghiChu.find((x) => x.id === Number(req.params.id));
  return g ? res.json(g) : res.status(404).json({ loi: 'Không có' });
});

const server = app.listen(0, async () => {
  const goc = `http://localhost:${server.address().port}`;
  const post = (noiDung) => fetch(goc + '/ghi-chu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noiDung }) });
  await post('Học routing'); await post('Đi chợ');
  console.log(await (await fetch(goc + '/ghi-chu?tim=học')).json());
  console.log((await fetch(goc + '/ghi-chu/9')).status);
  server.close();
});
```

```text output
[ { id: 1, noiDung: 'Học routing' } ]
404
```

</details>

## Tóm tắt

- Express giúp khai báo route theo phương thức HTTP và đường dẫn: `app.get`, `app.post`, `app.delete`…
- `req.params`, `req.query`, `req.body` là dữ liệu từ người gọi: luôn là chuỗi hoặc chưa tin cậy, cần kiểm tra.
- `res.json`, `res.send`, `res.status`, `res.redirect`; mỗi yêu cầu trả lời đúng một lần, `return` khi trả lời sớm.
- Dùng đúng mã trạng thái: 200, 201, 204, 400, 404…; GET không thay đổi dữ liệu.
- `express.Router()` tách route theo chủ đề; route khai báo trước được ưu tiên.

## Đọc thêm

- [Routing – expressjs.com](https://expressjs.com/en/guide/routing.html)
- [Hello world với Express – expressjs.com](https://expressjs.com/en/starter/hello-world.html)
