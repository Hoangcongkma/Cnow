---
title: "Kết nối MongoDB với Mongoose"
minutes: 18
preview: false
objectives:
  - "Hiểu MongoDB lưu dữ liệu dạng tài liệu (document) trong bộ sưu tập (collection)"
  - "Kết nối MongoDB bằng Mongoose với chuỗi kết nối lấy từ biến môi trường"
  - "Định nghĩa schema có kiểm tra dữ liệu (validation) và tạo model"
  - "Thực hiện CRUD: tạo, đọc, cập nhật, xóa; dùng trong route Express an toàn"
quiz:
  - question: "Trong MongoDB, 'collection' tương đương gần nhất với gì trong cơ sở dữ liệu quan hệ (SQL)?"
    options: ["Một cột", "Một bảng", "Một dòng", "Một khóa chính"]
    answer: 1
    explain: "Collection chứa nhiều document, giống bảng chứa nhiều dòng; nhưng document không bắt buộc cùng cấu trúc."
  - question: "Schema Mongoose với { gia: { type: Number, min: 0 } } sẽ làm gì khi lưu gia = -5?"
    options: ["Lưu bình thường", "Tự đổi thành 0", "Báo ValidationError, không lưu", "Xóa trường gia"]
    answer: 2
    explain: "Mongoose kiểm tra dữ liệu theo schema trước khi gửi lên MongoDB và từ chối dữ liệu sai."
  - question: "Vì sao nên ép kiểu String(req.body.email) trước khi dùng trong truy vấn?"
    options: ["Để chạy nhanh hơn", "Để chặn NoSQL injection khi kẻ xấu gửi đối tượng như { \"$ne\": null }", "Vì MongoDB chỉ nhận chuỗi", "Không cần thiết"]
    answer: 1
    explain: "Nếu body là JSON, kẻ tấn công có thể gửi toán tử truy vấn thay vì giá trị; ép về chuỗi vô hiệu hóa điều đó."
  - question: "Phương thức nào cập nhật mà không cần đọc document về trước?"
    options: ["find", "updateOne", "findById", "countDocuments"]
    answer: 1
    explain: "updateOne gửi thẳng lệnh cập nhật (ví dụ $inc, $set) lên MongoDB."
---

## Giải thích khái niệm

### MongoDB: tủ hồ sơ chứa các tờ phiếu

Cơ sở dữ liệu quan hệ (như MySQL) giống một bảng tính Excel: mọi dòng có cùng các cột. **MongoDB** thì giống một tủ hồ sơ: mỗi ngăn tủ là một **collection** (bộ sưu tập), mỗi ngăn chứa nhiều tờ phiếu gọi là **document** (tài liệu). Mỗi document là một đối tượng kiểu JSON, có thể chứa mảng và đối tượng lồng bên trong, ví dụ một khóa học chứa luôn danh sách bài học.

Mỗi document có trường `_id` duy nhất do MongoDB tự tạo (kiểu ObjectId). Vì cấu trúc gần với đối tượng JavaScript, MongoDB rất tự nhiên khi dùng với Node.js. Bạn có thể cài MongoDB trên máy hoặc dùng dịch vụ đám mây MongoDB Atlas.

### Mongoose: người thủ thư cẩn thận

MongoDB không bắt buộc document có cấu trúc cố định. Tự do như vậy cũng dễ dẫn đến dữ liệu lộn xộn: chỗ ghi `gia`, chỗ ghi `giaTien`, chỗ giá là chuỗi. **Mongoose** là thư viện đứng giữa ứng dụng và MongoDB, như một thủ thư yêu cầu mọi phiếu điền đúng mẫu:

- **Schema** (lược đồ): mô tả document gồm những trường nào, kiểu gì, ràng buộc gì (bắt buộc, giá trị nhỏ nhất, danh sách cho phép…).
- **Model**: lớp được tạo từ schema, gắn với một collection, cung cấp các hàm `create`, `find`, `updateOne`, `deleteOne`…
- **Validation**: trước khi lưu, Mongoose kiểm tra dữ liệu theo schema; sai thì báo `ValidationError` và không lưu.

### Nhúng hay tham chiếu?

Khi thiết kế dữ liệu MongoDB, câu hỏi quan trọng nhất là: dữ liệu liên quan nên **nhúng** (embed) vào cùng document, hay tách ra collection riêng rồi **tham chiếu** (reference) bằng `_id`? Nhúng hợp khi phần dữ liệu con luôn được đọc cùng cha và không quá lớn, ví dụ các bài học nằm trong khóa học: mở khóa học là thấy luôn danh sách bài, chỉ cần một lần đọc. Tham chiếu hợp khi dữ liệu con tăng không giới hạn hoặc được dùng độc lập, ví dụ đơn hàng của người dùng: một người có thể có hàng nghìn đơn, và trang quản trị cần xem đơn hàng mà không cần thông tin người dùng. Dự án Cnow dùng cả hai cách: bài học được nhúng trong `Course`, còn `Order`, `Enrollment` tham chiếu tới người dùng và khóa học, rồi dùng `populate()` của Mongoose để lấy kèm thông tin khi cần.

### Chuỗi kết nối và biến môi trường

Chuỗi kết nối có dạng `mongodb://127.0.0.1:27017/ten-csdl` (máy cục bộ) hoặc `mongodb+srv://nguoi-dung:mat-khau@...` (Atlas). Vì nó có thể chứa mật khẩu, hãy luôn đọc từ biến môi trường, ví dụ `process.env.MONGODB_URI`, thay vì viết thẳng vào code.

### CRUD

CRUD là bốn thao tác cơ bản với dữ liệu: **C**reate (tạo), **R**ead (đọc), **U**pdate (cập nhật), **D**elete (xóa).

| Thao tác | Mongoose |
|---|---|
| Tạo | `Model.create({...})` |
| Đọc | `Model.find(dieuKien)`, `findOne`, `findById`, `countDocuments` |
| Cập nhật | `Model.updateOne(dieuKien, { $set: {...} })`, `$inc` để tăng giảm số |
| Xóa | `Model.deleteOne(dieuKien)`, `deleteMany` |

Điều kiện tìm kiếm cũng là đối tượng: `{ gia: 0 }` (bằng), `{ gia: { $gt: 10 } }` (lớn hơn), `{ capDo: { $in: ['Cơ bản', 'Trung cấp'] } }`. Kết quả có thể `.sort()`, `.limit()`, `.select()` để chỉ lấy vài trường.

## Code mẫu có chú thích

Định nghĩa schema, model và thực hiện CRUD:

```js db
const mongoose = require('mongoose');

const khoaHocSchema = new mongoose.Schema({
  ten: { type: String, required: true, trim: true, maxlength: 120 },
  gia: { type: Number, required: true, min: 0 },
  capDo: { type: String, enum: ['Cơ bản', 'Trung cấp', 'Nâng cao'], default: 'Cơ bản' },
  hocVien: { type: Number, default: 0 },
}, { timestamps: true });                     // tự thêm createdAt, updatedAt

const KhoaHoc = mongoose.model('KhoaHoc', khoaHocSchema);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cnow_demo');
  await KhoaHoc.deleteMany({});               // làm sạch để ví dụ chạy lại vẫn ra cùng kết quả

  // CREATE
  await KhoaHoc.create([
    { ten: 'HTML, CSS', gia: 0 },
    { ten: 'Node.js & Express', gia: 25, capDo: 'Trung cấp' },
    { ten: 'Thiết kế web', gia: 30, capDo: 'Nâng cao' },
  ]);

  // READ: khóa có phí, sắp xếp giá giảm dần, chỉ lấy vài trường
  const coPhi = await KhoaHoc.find({ gia: { $gt: 0 } }).sort({ gia: -1 }).select('ten gia');
  console.log(coPhi.map((k) => `${k.ten}: $${k.gia}`));

  // UPDATE: tăng số học viên mà không cần đọc document về
  await KhoaHoc.updateOne({ ten: 'HTML, CSS' }, { $inc: { hocVien: 2 } });
  const html = await KhoaHoc.findOne({ ten: 'HTML, CSS' });
  console.log(html.ten, 'có', html.hocVien, 'học viên, cấp độ', html.capDo);

  // DELETE
  await KhoaHoc.deleteOne({ ten: 'Thiết kế web' });
  console.log('Còn lại:', await KhoaHoc.countDocuments());

  // VALIDATION: dữ liệu sai bị từ chối
  try {
    await KhoaHoc.create({ ten: '', gia: -5, capDo: 'Siêu cấp' });
  } catch (err) {
    console.log(err.name, Object.keys(err.errors).sort());
  }
  await mongoose.disconnect();
}
main();
```

```text output
[ 'Thiết kế web: $30', 'Node.js & Express: $25' ]
HTML, CSS có 2 học viên, cấp độ Cơ bản
Còn lại: 2
ValidationError [ 'capDo', 'gia', 'ten' ]
```

Để ý: thao tác với CSDL đều trả về Promise nên luôn có `await`; cuối chương trình gọi `disconnect()` để Node.js thoát.

### Dùng trong route Express

Trong ứng dụng thật, bạn kết nối **một lần** lúc khởi động rồi dùng model trong các route. Ví dụ dưới có hai điểm an toàn quan trọng: ép kiểu dữ liệu người dùng gửi lên, và xử lý `id` sai định dạng.

```js db
const express = require('express');
const mongoose = require('mongoose');

const SanPham = mongoose.model('SanPham', new mongoose.Schema({
  ten: { type: String, required: true, maxlength: 100 },
  gia: { type: Number, min: 0, required: true },
}));

const app = express();
app.use(express.json({ limit: '10kb' }));

app.post('/san-pham', async (req, res) => {
  try {
    // Ép kiểu: kể cả khi kẻ xấu gửi { "ten": { "$gt": "" } } thì cũng chỉ là chuỗi
    const sp = await SanPham.create({ ten: String(req.body.ten ?? ''), gia: Number(req.body.gia) });
    res.status(201).json({ id: sp.id, ten: sp.ten });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ loi: 'Dữ liệu không hợp lệ' });
    throw err;                                  // lỗi khác: để middleware lỗi xử lý
  }
});

app.get('/san-pham/:id', async (req, res) => {
  // id sai định dạng ObjectId sẽ làm findById ném lỗi → coi như không tìm thấy
  const sp = await SanPham.findById(req.params.id).catch(() => null);
  if (!sp) return res.status(404).json({ loi: 'Không tìm thấy' });
  res.json({ ten: sp.ten, gia: sp.gia });
});

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cnow_demo');
  await SanPham.deleteMany({});
  const server = app.listen(0, async () => {
    const goc = `http://localhost:${server.address().port}`;
    const post = (body) => fetch(goc + '/san-pham', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const r1 = await post({ ten: 'Bàn phím', gia: 450000 });
    const { id } = await r1.json();
    console.log(r1.status, (await post({ ten: 'Lỗi', gia: -1 })).status);
    console.log(await (await fetch(`${goc}/san-pham/${id}`)).json());
    console.log((await fetch(`${goc}/san-pham/khong-phai-id`)).status);
    server.close();
    await mongoose.disconnect();
  });
}
main();
```

```text output
201 400
{ ten: 'Bàn phím', gia: 450000 }
404
```

## Lỗi hay gặp

**1. Quên `await`.** `const ds = KhoaHoc.find()` cho ra một đối tượng truy vấn (Query), không phải mảng kết quả. In ra sẽ thấy một đống thông tin lạ thay vì dữ liệu. Luôn `await` thao tác CSDL.

**2. Khởi động server trước khi kết nối.** Nếu route chạy khi kết nối chưa sẵn sàng, Mongoose sẽ xếp hàng chờ và có thể báo lỗi hết thời gian. Kết nối xong rồi mới `listen` (Cnow làm đúng như vậy trong `server.js`).

**3. NoSQL injection.** Với body JSON, kẻ xấu có thể gửi `{ "email": { "$ne": null } }` để biến điều kiện `findOne({ email })` thành "email khác null", tức khớp với người dùng đầu tiên. Luôn ép kiểu `String(...)`, `Number(...)` dữ liệu từ người dùng trước khi đưa vào truy vấn.

**4. Dùng `_id` không hợp lệ.** `findById('abc')` ném lỗi `CastError`. Bắt lỗi và trả 404 như ví dụ, thay vì để server trả 500.

## Bài tập thực hành

Tạo model `GhiChu` với `noiDung` (bắt buộc, tối đa 200 ký tự) và `ghim` (boolean, mặc định `false`). Viết chương trình: tạo 3 ghi chú (một cái được ghim), cập nhật ghim cho một ghi chú khác, rồi in danh sách đã sắp xếp: ghi chú được ghim lên trước, sau đó theo nội dung A–Z.

Gợi ý: `.sort({ ghim: -1, noiDung: 1 })`; nhớ `deleteMany({})` ở đầu để chạy lại vẫn ra cùng kết quả.

<details>
<summary>Xem lời giải</summary>

```js db
const mongoose = require('mongoose');
const GhiChu = mongoose.model('GhiChu', new mongoose.Schema({
  noiDung: { type: String, required: true, maxlength: 200 },
  ghim: { type: Boolean, default: false },
}));

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cnow_demo');
  await GhiChu.deleteMany({});
  await GhiChu.create([{ noiDung: 'Mua sữa' }, { noiDung: 'Học Mongoose', ghim: true }, { noiDung: 'Gọi mẹ' }]);
  await GhiChu.updateOne({ noiDung: 'Gọi mẹ' }, { $set: { ghim: true } });
  const ds = await GhiChu.find().sort({ ghim: -1, noiDung: 1 });
  console.log(ds.map((g) => `${g.ghim ? '📌' : '  '} ${g.noiDung}`).join('\n'));
  await mongoose.disconnect();
}
main();
```

```text output
📌 Gọi mẹ
📌 Học Mongoose
   Mua sữa
```

</details>

## Tóm tắt

- MongoDB lưu document (giống JSON) trong collection; mỗi document có `_id` duy nhất.
- Mongoose: schema mô tả và kiểm tra dữ liệu, model cung cấp các hàm truy vấn.
- Chuỗi kết nối đọc từ `process.env.MONGODB_URI`; kết nối xong rồi mới khởi động server.
- CRUD: `create`, `find`/`findOne`/`findById`, `updateOne` với `$set`/`$inc`, `deleteOne`; luôn `await`.
- Ép kiểu dữ liệu người dùng để chống NoSQL injection; bắt lỗi `id` sai định dạng để trả 404.

## Đọc thêm

- [Thao tác CRUD trong MongoDB – mongodb.com](https://www.mongodb.com/docs/manual/crud/)
- [Toán tử truy vấn – mongodb.com](https://www.mongodb.com/docs/manual/reference/operator/query/)
- [Mô hình hóa dữ liệu – mongodb.com](https://www.mongodb.com/docs/manual/data-modeling/)
