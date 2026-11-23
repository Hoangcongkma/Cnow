---
title: "Kiểu dữ liệu và toán tử"
minutes: 16
preview: false
objectives:
  - "Phân biệt kiểu nguyên thủy (primitive) và kiểu đối tượng (object)"
  - "Hiểu các điểm đặc biệt của số: số thực, NaN, làm tròn khi tính tiền"
  - "Sử dụng các phương thức chuỗi thông dụng"
  - "Dùng đúng toán tử so sánh, logic, ?? và ?. để viết điều kiện an toàn"
quiz:
  - question: "0.1 + 0.2 === 0.3 cho kết quả gì trong JavaScript?"
    options: ["true", "false", "Lỗi", "undefined"]
    answer: 1
    explain: "Số thực được lưu dạng nhị phân nên 0.1 + 0.2 thực chất là 0.30000000000000004. Khi tính tiền nên quy về đơn vị nhỏ nhất (đồng, xu) dạng số nguyên."
  - question: "Giá trị của 0 ?? 10 là bao nhiêu?"
    options: ["0", "10", "null", "undefined"]
    answer: 0
    explain: "?? chỉ thay thế khi vế trái là null hoặc undefined. 0 là giá trị hợp lệ nên được giữ nguyên (khác với 0 || 10 cho ra 10)."
  - question: "user?.diaChi?.thanhPho trả về gì khi user.diaChi không tồn tại?"
    options: ["Báo lỗi TypeError", "undefined", "null", "Chuỗi rỗng"]
    answer: 1
    explain: "Toán tử ?. dừng lại và trả về undefined thay vì báo lỗi khi gặp null hoặc undefined."
  - question: "typeof null trả về gì?"
    options: ["'null'", "'undefined'", "'object'", "'empty'"]
    answer: 2
    explain: "Đây là một lỗi lịch sử của ngôn ngữ được giữ lại để tương thích. Kiểm tra null hãy dùng giaTri === null."
  - question: "'JavaScript'.slice(0, 4) trả về gì?"
    options: ["'Java'", "'Scri'", "'JavaS'", "'ript'"]
    answer: 0
    explain: "slice(bắt đầu, kết thúc) lấy từ vị trí 0 đến trước vị trí 4."
---

## Giải thích khái niệm

### Hai nhóm kiểu dữ liệu

JavaScript có hai nhóm kiểu dữ liệu, khác nhau ở cách chúng được lưu và sao chép:

- **Kiểu nguyên thủy** (primitive): `number`, `string`, `boolean`, `undefined`, `null`, `bigint`, `symbol`. Mỗi giá trị là một "tờ giấy ghi số": khi gán sang biến khác, bạn được một **bản sao** riêng.
- **Kiểu đối tượng** (object): đối tượng, mảng, hàm… Biến không chứa chính đối tượng mà chứa một **tham chiếu** (reference), giống như giữ địa chỉ của một ngôi nhà. Gán sang biến khác là đưa thêm một người địa chỉ của **cùng ngôi nhà**; ai sửa nhà thì người kia cũng thấy.

Bài "Mảng và đối tượng" sẽ đi sâu vào nhóm thứ hai. Bài này tập trung vào các kiểu nguyên thủy và toán tử làm việc với chúng.

### Số: những điều cần biết

JavaScript dùng một kiểu `number` chung cho số nguyên và số thực. Có ba điểm bạn sẽ gặp sớm:

1. **Sai số số thực.** Máy lưu số thực ở dạng nhị phân, nên một số phân số thập phân không biểu diễn chính xác được, giống như 1/3 không viết hết được bằng số thập phân. Hệ quả nổi tiếng: `0.1 + 0.2` ra `0.30000000000000004`. Khi làm việc với tiền, hãy tính bằng **đơn vị nhỏ nhất** (đồng, xu) ở dạng số nguyên, chỉ đổi ra dạng hiển thị ở bước cuối.
2. **NaN** (Not a Number) xuất hiện khi phép tính không có nghĩa, ví dụ `Number('abc')`. Đặc biệt `NaN === NaN` lại là `false`; kiểm tra bằng `Number.isNaN(x)`.
3. **Làm tròn**: `Math.round()` làm tròn đến số nguyên gần nhất, `Math.floor()` làm tròn xuống, `Math.ceil()` làm tròn lên; `x.toFixed(2)` cho chuỗi có 2 chữ số thập phân.

### Chuỗi và các phương thức

Chuỗi (string) có rất nhiều **phương thức** (method), tức hàm gắn sẵn, gọi bằng dấu chấm. Chuỗi là **bất biến** (immutable): mọi phương thức đều trả về chuỗi mới, không sửa chuỗi gốc.

| Phương thức | Ví dụ | Kết quả |
|---|---|---|
| `length` (thuộc tính) | `'Cnow'.length` | `4` |
| `toUpperCase()` | `'cnow'.toUpperCase()` | `'CNOW'` |
| `trim()` | `'  a  '.trim()` | `'a'` |
| `includes()` | `'Hà Nội'.includes('Nội')` | `true` |
| `slice(a, b)` | `'JavaScript'.slice(4)` | `'Script'` |
| `split()` | `'a,b,c'.split(',')` | `['a', 'b', 'c']` |
| `replaceAll()` | `'a-b-c'.replaceAll('-', '/')` | `'a/b/c'` |

### Toán tử so sánh và logic

Nhắc lại quy tắc vàng: luôn dùng `===` và `!==` để so sánh, tránh `==` vì nó tự đổi kiểu một cách khó đoán.

Toán tử logic trong JavaScript có một đặc điểm thú vị: `||` và `&&` **trả về một trong hai giá trị**, không nhất thiết là `true`/`false`. `a || b` trả về `a` nếu `a` "đúng" (truthy), ngược lại trả về `b`. Người ta hay dùng nó để đặt giá trị mặc định. Nhưng `||` coi `0` và `''` là "sai", nên `soLuong || 1` sẽ biến số lượng 0 thành 1, một lỗi khá phổ biến.

Vì vậy JavaScript hiện đại có hai toán tử an toàn hơn:

- `??` (nullish coalescing): `a ?? b` chỉ dùng `b` khi `a` là `null` hoặc `undefined`. `0 ?? 1` vẫn là `0`.
- `?.` (optional chaining): `a?.b` trả về `undefined` thay vì báo lỗi khi `a` là `null` hoặc `undefined`. Rất hữu ích khi dữ liệu có thể thiếu.

## Code mẫu có chú thích

Tính tiền an toàn bằng số nguyên:

```js
console.log(0.1 + 0.2);                 // sai số số thực

// Giá tính bằng đồng (số nguyên) nên không có sai số
const gia = [19900, 45500, 5000];
const tong = gia.reduce((t, x) => t + x, 0); // reduce: cộng dồn (học kỹ ở bài Mảng)
console.log(tong);

// Định dạng tiền Việt Nam để hiển thị
console.log(tong.toLocaleString('vi-VN') + ' đ');

console.log(Math.round(4.5), Math.floor(4.9), Math.ceil(4.1), (2 / 3).toFixed(2));
console.log(Number.isNaN(Number('abc')));
```

```text output
0.30000000000000004
70400
70.400 đ
5 4 5 0.67
true
```

Xử lý chuỗi người dùng nhập vào:

```js
const nhap = '   Nguyen Van An   ';
const ten = nhap.trim();                       // bỏ khoảng trắng thừa hai đầu
console.log(ten.length, ten.toUpperCase());

const cacTu = ten.split(' ');                  // tách theo dấu cách
console.log(cacTu, 'Tên gọi:', cacTu[cacTu.length - 1]);

const email = 'An.Nguyen@Example.COM';
console.log(email.toLowerCase(), email.includes('@'));
```

```text output
13 NGUYEN VAN AN
[ 'Nguyen', 'Van', 'An' ] Tên gọi: An
an.nguyen@example.com true
```

Giá trị mặc định và dữ liệu có thể thiếu:

```js
const donHang = { soLuong: 0, khachHang: { ten: 'Bình' } };

console.log(donHang.soLuong || 1);   // sai: 0 bị coi là "không có"
console.log(donHang.soLuong ?? 1);   // đúng: 0 được giữ

console.log(donHang.khachHang?.ten);         // có dữ liệu
console.log(donHang.giaoHang?.diaChi);       // thiếu dữ liệu → undefined, không lỗi
console.log(donHang.giaoHang?.diaChi ?? 'Chưa có địa chỉ');

console.log(typeof null, null === null);     // điểm kỳ lạ lịch sử của typeof
```

```text output
1
0
Bình
undefined
Chưa có địa chỉ
object true
```

## Lỗi hay gặp

**1. Truy cập thuộc tính của `undefined`.** Đây là lỗi JavaScript phổ biến bậc nhất:

```js error
const sanPham = {};
console.log(sanPham.nhaCungCap.ten); // TypeError: Cannot read properties of undefined (reading 'ten')
```

Đọc thông báo: "không đọc được thuộc tính `ten` của `undefined`", tức `sanPham.nhaCungCap` không tồn tại. Dùng `sanPham.nhaCungCap?.ten` hoặc kiểm tra trước.

**2. So sánh số thực bằng `===`.** `0.1 + 0.2 === 0.3` là `false`. Dùng số nguyên cho tiền, hoặc so sánh hiệu nhỏ hơn một sai số rất bé.

**3. Dùng `||` cho giá trị mặc định khi 0 hoặc chuỗi rỗng là hợp lệ.** Số lượng 0, giảm giá 0%, ghi chú rỗng đều bị thay mất. Dùng `??`.

**4. Nghĩ rằng phương thức chuỗi sửa chuỗi gốc.** `ten.trim();` đứng một mình không làm gì cả; phải gán kết quả: `ten = ten.trim();` (với biến `let`) hoặc dùng biến mới.

## Bài tập thực hành

**Bài 1.** Viết hàm `chuanHoaTen(s)` nhận một chuỗi họ tên lộn xộn như `'  nGUYEN   thi   hoa '` và trả về `'Nguyen Thi Hoa'`: bỏ khoảng trắng thừa, mỗi từ viết hoa chữ cái đầu.

**Bài 2.** Cho đối tượng cấu hình có thể thiếu trường: `{ giaoDien: { mau: null }, soBaiMoiTrang: 0 }`. In ra màu giao diện (mặc định `'sáng'` nếu không có), số bài mỗi trang (mặc định 12 nếu không có, nhưng 0 vẫn được giữ), và tên phông chữ ở `giaoDien.phongChu.ten` (mặc định `'system-ui'`).

Gợi ý bài 1: `split(' ')` rồi lọc bỏ phần tử rỗng bằng `filter(Boolean)`, viết hoa chữ đầu bằng `tu[0].toUpperCase() + tu.slice(1).toLowerCase()`, cuối cùng `join(' ')`.

<details>
<summary>Xem lời giải</summary>

```js
// Bài 1
function chuanHoaTen(s) {
  return s.trim().split(' ').filter(Boolean)
    .map((tu) => tu[0].toUpperCase() + tu.slice(1).toLowerCase())
    .join(' ');
}
console.log(chuanHoaTen('  nGUYEN   thi   hoa '));

// Bài 2
const cauHinh = { giaoDien: { mau: null }, soBaiMoiTrang: 0 };
console.log(cauHinh.giaoDien?.mau ?? 'sáng');
console.log(cauHinh.soBaiMoiTrang ?? 12);
console.log(cauHinh.giaoDien?.phongChu?.ten ?? 'system-ui');
```

```text output
Nguyen Thi Hoa
sáng
0
system-ui
```

</details>

## Tóm tắt

- Kiểu nguyên thủy được sao chép theo giá trị; đối tượng được truyền theo tham chiếu.
- Số thực có sai số: tính tiền bằng số nguyên đơn vị nhỏ nhất; kiểm tra NaN bằng `Number.isNaN`.
- Chuỗi bất biến; các phương thức `trim`, `split`, `slice`, `includes`… trả về giá trị mới.
- Luôn dùng `===`; `||`, `&&` trả về một trong hai vế.
- `??` đặt mặc định chỉ khi null/undefined; `?.` đọc dữ liệu có thể thiếu mà không lỗi.

## Đọc thêm

- [Kiểu dữ liệu và cấu trúc dữ liệu – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures)
- [Nullish coalescing (??) – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)
- [Optional chaining (?.) – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
