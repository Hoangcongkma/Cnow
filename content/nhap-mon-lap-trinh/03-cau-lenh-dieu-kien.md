---
title: "Câu lệnh điều kiện"
minutes: 15
preview: false
objectives:
  - "Dùng toán tử so sánh để tạo ra giá trị true/false"
  - "Viết câu lệnh if, else if, else để chương trình tự ra quyết định"
  - "Kết hợp nhiều điều kiện bằng && (và), || (hoặc), ! (phủ định)"
  - "Tránh các lỗi kinh điển: nhầm = với ===, sai thứ tự điều kiện"
quiz:
  - question: "Biểu thức 5 === '5' cho kết quả gì?"
    options: ["true", "false", "'5'", "Lỗi"]
    answer: 1
    explain: "=== so sánh cả giá trị lẫn kiểu. 5 là number, '5' là string nên kết quả là false."
  - question: "Với diem = 8, đoạn if (diem >= 9) {A} else if (diem >= 7) {B} else {C} chạy nhánh nào?"
    options: ["A", "B", "C", "Cả B và C"]
    answer: 1
    explain: "Điều kiện đầu sai (8 < 9), điều kiện thứ hai đúng (8 >= 7) nên chạy B và bỏ qua các nhánh còn lại."
  - question: "Điều kiện tuoi >= 18 && coVe chỉ đúng khi nào?"
    options: ["Khi một trong hai vế đúng", "Khi cả hai vế đều đúng", "Khi cả hai vế đều sai", "Luôn đúng"]
    answer: 1
    explain: "&& (và) cần tất cả các vế đều đúng; || (hoặc) chỉ cần ít nhất một vế đúng."
  - question: "Giá trị nào dưới đây được coi là 'sai' (falsy) trong câu if?"
    options: ["'0'", "' ' (một dấu cách)", "0", "'false'"]
    answer: 2
    explain: "Các giá trị falsy gồm false, 0, '' (chuỗi rỗng), null, undefined và NaN. Mọi chuỗi có ký tự, kể cả '0', đều là truthy."
---

## Giải thích khái niệm

### Chương trình cũng cần biết "nếu… thì…"

Mỗi sáng bạn đều ra quyết định: **nếu** trời mưa **thì** mang áo mưa, **ngược lại** thì đội mũ. Chương trình cũng vậy. Một ứng dụng đặt vé phải kiểm tra: nếu còn ghế thì cho đặt, nếu hết thì báo "hết vé". Không có câu lệnh điều kiện, chương trình chỉ chạy một đường thẳng từ trên xuống, không thể phản ứng với tình huống khác nhau.

**Câu lệnh điều kiện** (conditional statement) cho phép chương trình chọn đường đi dựa trên một câu hỏi có câu trả lời **đúng** (`true`) hoặc **sai** (`false`).

### Toán tử so sánh

Câu hỏi trong điều kiện thường được tạo từ **toán tử so sánh** (comparison operator):

| Toán tử | Ý nghĩa | Ví dụ | Kết quả |
|---|---|---|---|
| `===` | bằng (cả giá trị và kiểu) | `3 === 3` | `true` |
| `!==` | khác | `3 !== 4` | `true` |
| `>` / `<` | lớn hơn / nhỏ hơn | `5 > 8` | `false` |
| `>=` / `<=` | lớn hơn hoặc bằng / nhỏ hơn hoặc bằng | `7 >= 7` | `true` |

Bạn có thể gặp `==` (hai dấu bằng). Nó tự đổi kiểu trước khi so sánh nên `5 == '5'` lại là `true`, dễ gây bất ngờ. Hãy luôn dùng `===` và `!==`.

### Cấu trúc if – else if – else

```
if (điều kiện 1) {
  // chạy khi điều kiện 1 đúng
} else if (điều kiện 2) {
  // chạy khi điều kiện 1 sai và điều kiện 2 đúng
} else {
  // chạy khi tất cả điều kiện trên đều sai
}
```

Máy kiểm tra **từ trên xuống**, gặp điều kiện đúng đầu tiên thì chạy khối lệnh đó và **bỏ qua phần còn lại**. Vì vậy thứ tự điều kiện rất quan trọng.

### Kết hợp điều kiện

Đời thực hiếm khi chỉ có một điều kiện. Bạn được vào rạp khi **đủ 18 tuổi và có vé**; được giảm giá khi **là sinh viên hoặc trên 60 tuổi**. JavaScript có **toán tử logic** (logical operator):

- `&&` (và): đúng khi **tất cả** các vế đều đúng.
- `||` (hoặc): đúng khi **ít nhất một** vế đúng.
- `!` (phủ định): đảo ngược, `!true` là `false`.

### Lồng điều kiện và giữ code "phẳng"

Bạn có thể đặt một câu `if` bên trong một câu `if` khác, gọi là **lồng điều kiện** (nested condition). Ví dụ: nếu người dùng đã đăng nhập, thì kiểm tra tiếp xem họ có phải quản trị viên không. Cách này hợp lý khi điều kiện thứ hai chỉ có nghĩa sau khi điều kiện thứ nhất đúng.

Tuy nhiên, lồng quá nhiều tầng khiến code thụt vào sâu như bậc thang, rất khó đọc. Hai mẹo giúp code gọn hơn. Thứ nhất, gộp các điều kiện liên quan bằng `&&` thay vì lồng hai câu `if`. Thứ hai, xử lý **trường hợp đặc biệt trước** rồi dừng sớm, phần chính để ở cuối. Trong bài về hàm, bạn sẽ thấy cách "trả về sớm" này được dùng rất thường xuyên. Một quy tắc đơn giản: nếu phải thụt vào quá ba tầng, hãy dừng lại và nghĩ cách viết lại cho phẳng hơn.

## Code mẫu có chú thích

Xếp loại học lực theo điểm:

```js
const diem = 8.2;

if (diem >= 9) {
  console.log('Xuất sắc');
} else if (diem >= 8) {     // chỉ được kiểm tra khi điểm < 9
  console.log('Giỏi');
} else if (diem >= 6.5) {
  console.log('Khá');
} else {
  console.log('Cần cố gắng thêm');
}
```

```text output
Giỏi
```

Kiểm tra điều kiện vào rạp, kết hợp `&&`, `||` và `!`:

```js
const tuoi = 20;
const coVe = true;
const laSinhVien = true;

if (tuoi >= 18 && coVe) {
  console.log('Mời bạn vào rạp');
}

const duocGiamGia = laSinhVien || tuoi >= 60;
console.log('Được giảm giá:', duocGiamGia);

const hetVe = false;
if (!hetVe) {               // "nếu KHÔNG hết vé"
  console.log('Vẫn còn vé cho suất sau');
}
```

```text output
Mời bạn vào rạp
Được giảm giá: true
Vẫn còn vé cho suất sau
```

### Toán tử ba ngôi cho quyết định ngắn

Khi chỉ cần chọn giữa hai giá trị, bạn có thể dùng **toán tử ba ngôi** (ternary operator) `điều kiện ? giá trị nếu đúng : giá trị nếu sai`:

```js
const soDu = 150000;
const giaVe = 120000;
const thongBao = soDu >= giaVe ? 'Đủ tiền mua vé' : 'Không đủ tiền';
console.log(thongBao);
```

```text output
Đủ tiền mua vé
```

## Lỗi hay gặp

**1. Dùng `=` thay cho `===`.** Một dấu bằng là **gán**, không phải so sánh. `if (diem = 10)` gán 10 vào biến rồi luôn coi là đúng. Nếu `diem` khai báo bằng `const`, chương trình còn dừng lại vì lỗi:

```js error
const diem = 5;
if (diem = 10) { // gán chứ không so sánh → TypeError: Assignment to constant variable.
  console.log('Điểm tối đa');
}
```

**2. Sắp xếp điều kiện sai thứ tự.** Nếu viết `if (diem >= 6.5)` trước `if (diem >= 9)`, học sinh 9.5 điểm cũng chỉ được xếp "Khá" vì nhánh đầu tiên đúng đã chặn các nhánh sau. Hãy đặt điều kiện **chặt nhất** lên trước.

**3. Quên rằng chuỗi `'0'` là "đúng".** Trong câu `if`, giá trị `0`, `''`, `null`, `undefined`, `NaN` bị coi là sai (gọi là falsy). Nhưng chuỗi `'0'` có một ký tự nên lại là đúng. Dữ liệu từ ô nhập là chuỗi, hãy chuyển sang số rồi mới so sánh.

**4. So sánh số với chuỗi bằng `===`.** `'18' === 18` là `false`. Đây là hành vi đúng của `===`, giải pháp là `Number('18') === 18`.

## Bài tập thực hành

**Bài 1.** Cho biến `nhietDo`. In ra `Lạnh` nếu dưới 18 độ, `Dễ chịu` nếu từ 18 đến dưới 30, `Nóng` nếu từ 30 trở lên. Thử với các giá trị 15, 25 và 33.

**Bài 2.** Một cửa hàng miễn phí giao hàng khi đơn từ 300000 đồng **hoặc** khách là thành viên VIP. Cho `tongDon` và `laVip`, in ra `Miễn phí giao hàng` hoặc `Phí giao hàng: 30000`.

Gợi ý: bài 1 dùng `if – else if – else`, bài 2 dùng `||` hoặc toán tử ba ngôi.

<details>
<summary>Xem lời giải</summary>

```js
// Bài 1: thử lần lượt từng nhiệt độ
for (const nhietDo of [15, 25, 33]) {
  if (nhietDo < 18) console.log(nhietDo, 'Lạnh');
  else if (nhietDo < 30) console.log(nhietDo, 'Dễ chịu');
  else console.log(nhietDo, 'Nóng');
}

// Bài 2
const tongDon = 250000;
const laVip = true;
console.log(tongDon >= 300000 || laVip ? 'Miễn phí giao hàng' : 'Phí giao hàng: 30000');
```

```text output
15 Lạnh
25 Dễ chịu
33 Nóng
Miễn phí giao hàng
```

Vòng lặp `for…of` ở bài 1 sẽ được học kỹ ở bài sau; ở đây nó chỉ giúp thử ba giá trị cùng lúc.

</details>

## Tóm tắt

- Điều kiện là biểu thức cho ra `true` hoặc `false`, thường tạo bằng `===`, `!==`, `>`, `<`, `>=`, `<=`.
- `if – else if – else` kiểm tra từ trên xuống, chạy nhánh đúng **đầu tiên**.
- `&&` cần tất cả đúng, `||` cần một vế đúng, `!` đảo ngược.
- Toán tử ba ngôi `a ? b : c` gọn cho lựa chọn hai giá trị.
- Luôn dùng `===`, cẩn thận với giá trị falsy và dữ liệu dạng chuỗi.

## Đọc thêm

- [Luồng điều khiển và xử lý lỗi – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
- [if...else – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else)
- [Falsy – MDN](https://developer.mozilla.org/en-US/docs/Glossary/Falsy)
