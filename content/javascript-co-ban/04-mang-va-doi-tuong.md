---
title: "Mảng và đối tượng"
minutes: 18
preview: false
objectives:
  - "Tạo và thao tác mảng (array): thêm, xóa, tìm phần tử"
  - "Dùng map, filter, reduce, find, sort để xử lý danh sách"
  - "Tạo đối tượng (object) với thuộc tính và phương thức, duyệt bằng Object.entries"
  - "Hiểu tham chiếu, sao chép bằng spread, và dùng destructuring"
quiz:
  - question: "[3, 1, 2].map(x => x * 10) trả về gì?"
    options: ["[30, 10, 20]", "60", "[10, 20, 30]", "[3, 1, 2]"]
    answer: 0
    explain: "map áp dụng hàm cho từng phần tử, giữ nguyên thứ tự, trả về mảng mới cùng độ dài."
  - question: "Phương thức nào trả về PHẦN TỬ ĐẦU TIÊN thỏa điều kiện (không phải mảng)?"
    options: ["filter", "find", "map", "some"]
    answer: 1
    explain: "find trả về phần tử đầu tiên (hoặc undefined); filter trả về mảng mọi phần tử thỏa điều kiện."
  - question: "const a = { x: 1 }; const b = a; b.x = 5; – a.x bằng bao nhiêu?"
    options: ["1", "5", "undefined", "Lỗi vì a là const"]
    answer: 1
    explain: "a và b cùng tham chiếu một đối tượng. const chỉ cấm gán lại biến, không cấm sửa nội dung đối tượng."
  - question: "[10, 9, 1].sort() trả về gì?"
    options: ["[1, 9, 10]", "[1, 10, 9]", "[10, 9, 1]", "[9, 10, 1]"]
    answer: 1
    explain: "sort mặc định so sánh dạng chuỗi ('10' < '9'). Sắp xếp số phải truyền hàm so sánh: sort((a, b) => a - b)."
  - question: "const { ten, tuoi = 18 } = { ten: 'An' } – tuoi bằng bao nhiêu?"
    options: ["undefined", "18", "null", "Lỗi"]
    answer: 1
    explain: "Destructuring cho phép giá trị mặc định khi thuộc tính không tồn tại."
---

## Giải thích khái niệm

### Mảng: danh sách có thứ tự

**Mảng** (array) là danh sách các giá trị theo thứ tự, như danh sách món trong thực đơn hay hàng người xếp hàng mua vé. Mỗi phần tử có một **chỉ số** (index) bắt đầu từ **0**. Thuộc tính `length` cho biết số phần tử; phần tử cuối có chỉ số `length - 1`.

Các thao tác cơ bản:

- `push(x)` thêm vào cuối, `pop()` lấy ra từ cuối.
- `unshift(x)` thêm vào đầu, `shift()` lấy ra từ đầu.
- `includes(x)` kiểm tra có chứa không; `indexOf(x)` cho vị trí (hoặc -1).
- `splice(viTri, soLuong)` xóa phần tử ở giữa; `slice(a, b)` lấy một đoạn mà **không** sửa mảng gốc.

### Bộ ba map, filter, reduce

Đây là những phương thức bạn sẽ dùng hằng ngày. Chúng nhận một hàm (callback) và **không sửa mảng gốc**:

- `map(fn)`: biến đổi **từng** phần tử, trả về mảng mới **cùng độ dài**. Ví dụ: danh sách giá → danh sách giá sau thuế.
- `filter(fn)`: giữ lại những phần tử mà `fn` trả về đúng. Ví dụ: chỉ lấy sản phẩm còn hàng.
- `reduce(fn, giaTriDau)`: gộp cả mảng thành **một** giá trị. Ví dụ: tổng tiền giỏ hàng.

Hình dung một dây chuyền nhà máy: `filter` là công nhân loại bỏ quả hỏng, `map` là máy gọt vỏ từng quả, `reduce` là bước cân tổng khối lượng cuối cùng. Các phương thức có thể **nối chuỗi**: `ds.filter(...).map(...).reduce(...)`.

Ngoài ra còn `find` (phần tử đầu tiên thỏa điều kiện), `some` (có ít nhất một phần tử thỏa không), `every` (mọi phần tử đều thỏa không), và `sort` (sắp xếp, **có** sửa mảng gốc).

### Đối tượng: dữ liệu có tên

Nếu mảng là danh sách đánh số, thì **đối tượng** (object) là tập các cặp **khóa – giá trị** (key – value), như một tấm hồ sơ: họ tên, tuổi, email. Truy cập bằng dấu chấm `nguoi.ten` hoặc ngoặc vuông `nguoi['ten']` (dùng ngoặc vuông khi tên khóa nằm trong biến).

Giá trị của thuộc tính có thể là hàm, khi đó gọi là **phương thức** (method). `Object.keys(obj)`, `Object.values(obj)`, `Object.entries(obj)` cho mảng các khóa, giá trị, hoặc cặp `[khóa, giá trị]` để duyệt.

### Tham chiếu và sao chép

Như bài Kiểu dữ liệu đã nói, biến chứa **tham chiếu** tới mảng, đối tượng. `const b = a` không tạo bản sao, chỉ thêm một cái tên cho cùng một đối tượng. Muốn sao chép, dùng **toán tử spread** `...`: `[...mang]`, `{ ...doiTuong }`. Lưu ý đây là **sao chép nông** (shallow copy): đối tượng lồng bên trong vẫn dùng chung. Khi cần sao chép sâu dữ liệu thuần, có hàm `structuredClone(obj)`.

### Mảng hay đối tượng?

Câu hỏi người mới hay gặp: dữ liệu này nên để trong mảng hay đối tượng? Quy tắc đơn giản: nếu bạn có **nhiều thứ cùng loại** và quan tâm đến thứ tự hoặc số lượng (danh sách học viên, các bài học, lịch sử đơn hàng) thì dùng mảng. Nếu bạn có **một thứ với nhiều đặc điểm có tên** (một học viên với họ tên, email, ngày sinh) thì dùng đối tượng. Dữ liệu thực tế thường kết hợp cả hai: **mảng các đối tượng**, như danh sách sản phẩm trong ví dụ dưới đây, mỗi sản phẩm là một đối tượng.

Một gợi ý khác: khi cần tra cứu nhanh theo mã (ví dụ tìm sản phẩm theo mã `A1` hàng nghìn lần), hãy chuyển mảng thành đối tượng có khóa là mã, hoặc dùng cấu trúc `Map`. Tra cứu theo khóa nhanh hơn nhiều so với gọi `find` duyệt cả mảng mỗi lần.

### Destructuring

**Destructuring** (phân rã) là cú pháp gọn để lấy dữ liệu ra biến: `const { ten, tuoi } = nguoi;` hay `const [dau, thuHai] = mang;`. Có thể đặt giá trị mặc định và đổi tên. Cú pháp này xuất hiện rất nhiều trong code hiện đại, nhất là ở tham số hàm.

## Code mẫu có chú thích

Xử lý một danh sách sản phẩm:

```js
const sanPham = [
  { ten: 'Áo thun', gia: 150000, conHang: true, loai: 'áo' },
  { ten: 'Quần jean', gia: 420000, conHang: false, loai: 'quần' },
  { ten: 'Áo khoác', gia: 650000, conHang: true, loai: 'áo' },
  { ten: 'Mũ lưỡi trai', gia: 90000, conHang: true, loai: 'phụ kiện' },
];

// filter + map: tên các sản phẩm còn hàng
const tenConHang = sanPham.filter((sp) => sp.conHang).map((sp) => sp.ten);
console.log(tenConHang);

// reduce: tổng giá trị hàng còn trong kho
const tongKho = sanPham.filter((sp) => sp.conHang).reduce((tong, sp) => tong + sp.gia, 0);
console.log('Tổng kho:', tongKho);

// find và some
console.log(sanPham.find((sp) => sp.gia > 500000).ten);
console.log('Có hàng dưới 100k?', sanPham.some((sp) => sp.gia < 100000));

// sort với hàm so sánh: sao chép trước để không làm đổi thứ tự mảng gốc
const reNhatTruoc = [...sanPham].sort((a, b) => a.gia - b.gia).map((sp) => sp.gia);
console.log(reNhatTruoc, sanPham[0].ten);
```

```text output
[ 'Áo thun', 'Áo khoác', 'Mũ lưỡi trai' ]
Tổng kho: 890000
Áo khoác
Có hàng dưới 100k? true
[ 90000, 150000, 420000, 650000 ] Áo thun
```

Đối tượng có phương thức, duyệt và nhóm dữ liệu:

```js
const hocVien = {
  ten: 'Lan',
  diem: { html: 8, css: 7, js: 9 },
  trungBinh() {                       // phương thức: hàm là thuộc tính của đối tượng
    const ds = Object.values(this.diem);
    return ds.reduce((t, d) => t + d, 0) / ds.length;
  },
};

console.log(hocVien.trungBinh());
for (const [mon, diem] of Object.entries(hocVien.diem)) {
  console.log(`${mon}: ${diem}`);
}

// Nhóm sản phẩm theo loại bằng reduce, kết quả là một đối tượng
const ds = [{ ten: 'Áo thun', loai: 'áo' }, { ten: 'Áo khoác', loai: 'áo' }, { ten: 'Mũ', loai: 'phụ kiện' }];
const theoLoai = ds.reduce((nhom, sp) => {
  (nhom[sp.loai] ??= []).push(sp.ten);   // ??= : gán nếu chưa có
  return nhom;
}, {});
console.log(theoLoai);
```

```text output
8
html: 8
css: 7
js: 9
{ 'áo': [ 'Áo thun', 'Áo khoác' ], 'phụ kiện': [ 'Mũ' ] }
```

Tham chiếu, spread và destructuring:

```js
const goc = { ten: 'Cnow', diaChi: { thanhPho: 'Huế' } };
const banSao = { ...goc, ten: 'Cnow Pro' };   // sao chép nông + ghi đè ten
banSao.diaChi.thanhPho = 'Đà Nẵng';            // đối tượng lồng vẫn dùng chung!
console.log(goc.ten, goc.diaChi.thanhPho);

const sauSac = structuredClone(goc);           // sao chép sâu
sauSac.diaChi.thanhPho = 'Hà Nội';
console.log(goc.diaChi.thanhPho);

// Destructuring trong tham số hàm, có giá trị mặc định và đổi tên
function moTa({ ten, gia, giamGia: phanTram = 0 }) {
  return `${ten}: ${gia - (gia * phanTram) / 100}đ`;
}
console.log(moTa({ ten: 'Áo', gia: 200000, giamGia: 10 }), moTa({ ten: 'Mũ', gia: 90000 }));
const [dau, ...conLai] = [1, 2, 3, 4];
console.log(dau, conLai);
```

```text output
Cnow Đà Nẵng
Đà Nẵng
Áo: 180000đ Mũ: 90000đ
1 [ 2, 3, 4 ]
```

## Lỗi hay gặp

**1. Sắp xếp số bằng `sort()` không có hàm so sánh.** Mặc định `sort` so sánh như chuỗi, nên `[10, 9, 1].sort()` ra `[1, 10, 9]`. Luôn viết `sort((a, b) => a - b)` cho số.

**2. Nhầm `find` với `filter`.** `filter` luôn trả về **mảng** (có thể rỗng); `find` trả về **một phần tử** hoặc `undefined`. Viết `ds.filter(...).ten` sẽ ra `undefined` vì mảng không có thuộc tính `ten`.

**3. Tưởng `const` làm đối tượng bất biến.** `const` chỉ ngăn gán lại biến. `ds.push(...)`, `obj.x = 1` vẫn hợp lệ. Cố gán lại thì mới lỗi:

```js error
const gioHang = [];
gioHang.push('Áo');   // hợp lệ: sửa nội dung
gioHang = ['Quần'];   // TypeError: Assignment to constant variable.
```

**4. Quên giá trị khởi đầu của `reduce`.** `[].reduce((t, x) => t + x)` báo lỗi với mảng rỗng. Luôn truyền tham số thứ hai, ví dụ `0` cho tổng, `{}` cho nhóm.

## Bài tập thực hành

Cho danh sách đơn hàng:

```js
const donHang = [
  { ma: 'A1', khach: 'An', tong: 250000, trangThai: 'xong' },
  { ma: 'A2', khach: 'Bình', tong: 120000, trangThai: 'huy' },
  { ma: 'A3', khach: 'An', tong: 90000, trangThai: 'xong' },
  { ma: 'A4', khach: 'Chi', tong: 400000, trangThai: 'xong' },
];
```

**Bài 1.** Tính doanh thu (tổng tiền các đơn có trạng thái `'xong'`).

**Bài 2.** Tạo đối tượng tổng tiền đã mua theo từng khách (chỉ đơn `'xong'`), ví dụ `{ An: 340000, Chi: 400000 }`.

**Bài 3.** Lấy mã đơn của đơn có giá trị lớn nhất mà không làm thay đổi mảng `donHang`.

<details>
<summary>Xem lời giải</summary>

```js
const donHang = [
  { ma: 'A1', khach: 'An', tong: 250000, trangThai: 'xong' },
  { ma: 'A2', khach: 'Bình', tong: 120000, trangThai: 'huy' },
  { ma: 'A3', khach: 'An', tong: 90000, trangThai: 'xong' },
  { ma: 'A4', khach: 'Chi', tong: 400000, trangThai: 'xong' },
];
const xong = donHang.filter((d) => d.trangThai === 'xong');

// Bài 1
console.log(xong.reduce((t, d) => t + d.tong, 0));

// Bài 2
const theoKhach = xong.reduce((kq, d) => {
  kq[d.khach] = (kq[d.khach] ?? 0) + d.tong;
  return kq;
}, {});
console.log(theoKhach);

// Bài 3: reduce tìm phần tử lớn nhất, không sắp xếp mảng gốc
const lonNhat = donHang.reduce((max, d) => (d.tong > max.tong ? d : max));
console.log(lonNhat.ma, donHang[0].ma);
```

```text output
740000
{ An: 340000, Chi: 400000 }
A4 A1
```

</details>

## Tóm tắt

- Mảng: danh sách có thứ tự, chỉ số từ 0; `push`/`pop`, `includes`, `slice`, `splice`.
- `map` biến đổi, `filter` lọc, `reduce` gộp, `find`/`some`/`every` tìm và kiểm tra; nối chuỗi được.
- `sort` sửa mảng gốc và cần hàm so sánh cho số.
- Đối tượng: cặp khóa – giá trị, có phương thức; duyệt bằng `Object.entries`.
- Biến chứa tham chiếu: sao chép bằng spread (nông) hoặc `structuredClone` (sâu); destructuring lấy dữ liệu gọn gàng.

## Đọc thêm

- [Mảng (Array) – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [Làm việc với đối tượng – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects)
- [Destructuring – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring)
