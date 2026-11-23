---
title: "Hàm"
minutes: 15
preview: false
objectives:
  - "Hiểu hàm (function) là một 'công thức' được đặt tên để dùng lại nhiều lần"
  - "Khai báo hàm có tham số (parameter) và trả về kết quả bằng return"
  - "Phân biệt in ra màn hình (console.log) với trả về giá trị (return)"
  - "Chia một bài toán lớn thành nhiều hàm nhỏ, dễ đọc, dễ kiểm tra"
quiz:
  - question: "function binhPhuong(x) { return x * x } – binhPhuong(4) trả về gì?"
    options: ["8", "16", "'44'", "undefined"]
    answer: 1
    explain: "x nhận giá trị 4, hàm trả về 4 * 4 = 16."
  - question: "Một hàm không có câu lệnh return thì trả về gì?"
    options: ["0", "null", "undefined", "Chuỗi rỗng"]
    answer: 2
    explain: "Không có return (hoặc return trống) thì kết quả của lời gọi hàm là undefined."
  - question: "Trong function chao(ten) { ... }, 'ten' được gọi là gì?"
    options: ["Đối số (argument)", "Tham số (parameter)", "Biến toàn cục", "Giá trị trả về"]
    answer: 1
    explain: "ten là tham số – tên đặt chỗ trong định nghĩa hàm. Giá trị thật truyền vào khi gọi, như chao('An'), là đối số."
  - question: "Điều gì xảy ra với các câu lệnh viết SAU return trong cùng một hàm?"
    options: ["Vẫn chạy bình thường", "Không bao giờ được chạy", "Chạy trước return", "Gây lỗi cú pháp"]
    answer: 1
    explain: "return kết thúc hàm ngay lập tức và trả giá trị về nơi gọi; code phía sau bị bỏ qua."
---

## Giải thích khái niệm

### Hàm là công thức được đặt tên

Một quán cà phê có công thức pha "bạc xỉu": bao nhiêu cà phê, bao nhiêu sữa, khuấy bao lâu. Nhân viên không cần ghi lại từng bước mỗi lần khách gọi, chỉ cần nghe "một bạc xỉu" là biết làm gì. Có khách muốn **ít đường**, có khách muốn **size lớn**: công thức vẫn vậy, chỉ thay vài thông số.

**Hàm** (function) trong lập trình chính là công thức đó: một khối lệnh được đặt tên, có thể nhận **thông số đầu vào** và trả lại **kết quả**. Bạn viết hàm một lần, rồi **gọi** (call) nó ở bất cứ đâu, bao nhiêu lần cũng được. Thực ra bạn đã dùng hàm từ bài đầu tiên: `console.log` và `Number` đều là hàm có sẵn.

### Vì sao cần hàm?

- **Không lặp code**: một đoạn tính toán dùng ở mười chỗ thì chỉ viết một lần.
- **Dễ sửa**: công thức thay đổi thì chỉ sửa trong hàm.
- **Dễ đọc**: tên hàm như `tinhTienShip()` nói lên ý định, người đọc không cần xem chi tiết.
- **Dễ kiểm tra**: mỗi hàm nhỏ có thể thử riêng với vài giá trị đầu vào.

### Các thành phần của một hàm

```
function tenHam(thamSo1, thamSo2) {
  // thân hàm
  return ketQua;
}
```

- **Tên hàm**: nên là động từ, viết camelCase: `tinhTong`, `kiemTraMatKhau`.
- **Tham số** (parameter): những tên đặt chỗ cho dữ liệu đầu vào, liệt kê trong ngoặc tròn.
- **Đối số** (argument): giá trị thật bạn truyền vào khi gọi, ví dụ `tinhTong(3, 5)`.
- **`return`**: trả kết quả về nơi gọi hàm và **kết thúc hàm ngay lập tức**.

### In ra khác với trả về

Đây là điểm người mới hay nhầm nhất. `console.log` chỉ **hiển thị** giá trị cho người xem, còn `return` **đưa giá trị** trở lại cho chương trình dùng tiếp: gán vào biến, cộng với số khác, truyền cho hàm khác. Hàm tính toán tốt thường `return` kết quả và để phần còn lại của chương trình quyết định có in ra hay không.

## Code mẫu có chú thích

Hàm tính tiền có thông số giảm giá:

```js
// Hàm nhận giá và phần trăm giảm, trả về số tiền phải trả
function tinhTienSauGiam(gia, phanTramGiam) {
  const tienGiam = gia * phanTramGiam / 100;
  return gia - tienGiam;              // trả kết quả về nơi gọi
}

const a = tinhTienSauGiam(200000, 10); // gọi hàm, lưu kết quả vào biến
const b = tinhTienSauGiam(80000, 25);
console.log(a, b);
console.log('Tổng hai đơn:', a + b);   // kết quả trả về dùng được để tính tiếp
```

```text output
180000 60000
Tổng hai đơn: 240000
```

Tham số có **giá trị mặc định** được dùng khi người gọi không truyền đối số:

```js
function chao(ten = 'bạn') {
  return `Xin chào ${ten}!`;
}
console.log(chao('Lan'));
console.log(chao());       // không truyền → dùng giá trị mặc định
```

```text output
Xin chào Lan!
Xin chào bạn!
```

Chia bài toán thành nhiều hàm nhỏ: kiểm tra một năm có phải năm nhuận rồi đếm số ngày.

```js
// Năm nhuận: chia hết cho 4 nhưng không chia hết cho 100, hoặc chia hết cho 400
function laNamNhuan(nam) {
  return (nam % 4 === 0 && nam % 100 !== 0) || nam % 400 === 0;
}

function soNgayTrongNam(nam) {
  return laNamNhuan(nam) ? 366 : 365; // hàm này gọi lại hàm phía trên
}

for (const nam of [2024, 2025, 1900, 2000]) {
  console.log(nam, soNgayTrongNam(nam));
}
```

```text output
2024 366
2025 365
1900 365
2000 366
```

Mỗi hàm chỉ làm **một việc**, có tên rõ nghĩa, nên đọc vòng lặp cuối gần như đọc tiếng Việt: "với mỗi năm, in ra số ngày trong năm".

### Phạm vi biến: biến trong hàm ở lại trong hàm

Biến khai báo **bên trong** hàm chỉ tồn tại trong hàm đó, gọi là phạm vi cục bộ (local scope). Bên ngoài hàm không nhìn thấy nó. Điều này giống như giấy nháp của người đầu bếp: dùng trong lúc nấu, nấu xong thì bỏ, khách không cần biết. Nhờ vậy, hai hàm khác nhau có thể cùng dùng tên biến `tong` mà không giẫm chân lên nhau.

```js
function tinhTong(a, b) {
  const tong = a + b;   // tong chỉ sống bên trong hàm này
  return tong;
}
console.log(tinhTong(4, 6));
console.log(typeof tong); // bên ngoài không có biến tong
```

```text output
10
undefined
```

Ngược lại, hàm **đọc được** biến khai báo bên ngoài nó. Tuy vậy, hàm tốt nên nhận dữ liệu qua tham số và trả kết quả bằng `return`, hạn chế đọc hoặc sửa biến bên ngoài. Hàm như vậy dễ đoán, dễ thử và dễ dùng lại.

### Hàm mũi tên

JavaScript còn có cách viết ngắn gọn gọi là **hàm mũi tên** (arrow function). Hai hàm sau tương đương:

```js
function nhanDoi(x) { return x * 2; }
const nhanDoiMuiTen = (x) => x * 2; // thân một biểu thức thì tự return
console.log(nhanDoi(21), nhanDoiMuiTen(21));
```

```text output
42 42
```

Bạn sẽ gặp hàm mũi tên rất nhiều ở các khóa sau; lúc mới học, cách viết với `function` thường dễ đọc hơn.

## Lỗi hay gặp

**1. Quên `return`.** Hàm tính đúng nhưng quên trả kết quả, nơi gọi nhận về `undefined`:

```js
function cong(a, b) {
  a + b;               // tính xong nhưng không trả về
}
console.log(cong(2, 3));
```

```text output
undefined
```

**2. Quên dấu ngoặc khi gọi hàm.** Viết `chao` thay vì `chao()` không chạy hàm, mà chỉ nhắc tới chính cái hàm. Muốn chạy phải có ngoặc tròn, kể cả khi không có đối số.

**3. Gọi một thứ không phải hàm.** Nếu đặt nhầm tên biến trùng tên hàm, hoặc gõ sai, bạn sẽ gặp lỗi:

```js error
const tinhTong = 10;
tinhTong(1, 2); // TypeError: tinhTong is not a function
```

**4. Viết code sau `return` và mong nó chạy.** Mọi câu lệnh sau `return` trong cùng hàm đều bị bỏ qua. Nếu cần in thông báo, hãy đặt trước `return`.

## Bài tập thực hành

**Bài 1.** Viết hàm `doiDoCsangF(doC)` đổi độ C sang độ F theo công thức `F = C × 9 / 5 + 32`. Thử với 0, 37 và 100.

**Bài 2.** Viết hàm `xepLoai(diem)` trả về `'Giỏi'` nếu điểm từ 8, `'Khá'` nếu từ 6.5, còn lại `'Trung bình'`. Sau đó dùng vòng lặp in xếp loại cho danh sách `[9, 7, 5.5]`.

Gợi ý: hàm ở bài 2 nên `return` ngay khi tìm được kết quả, không cần `else` sau mỗi `return`.

<details>
<summary>Xem lời giải</summary>

```js
// Bài 1
function doiDoCsangF(doC) {
  return doC * 9 / 5 + 32;
}
console.log(doiDoCsangF(0), doiDoCsangF(37), doiDoCsangF(100));

// Bài 2
function xepLoai(diem) {
  if (diem >= 8) return 'Giỏi';
  if (diem >= 6.5) return 'Khá';
  return 'Trung bình';
}
for (const d of [9, 7, 5.5]) {
  console.log(d, xepLoai(d));
}
```

```text output
32 98.6 212
9 Giỏi
7 Khá
5.5 Trung bình
```

</details>

## Tóm tắt

- Hàm là khối lệnh có tên, nhận tham số, trả kết quả bằng `return`, dùng lại được nhiều lần.
- Tham số là tên đặt chỗ trong định nghĩa; đối số là giá trị thật khi gọi.
- `return` trả giá trị và kết thúc hàm; `console.log` chỉ hiển thị.
- Tham số có thể có giá trị mặc định; hàm mũi tên là cách viết ngắn.
- Chia bài toán lớn thành nhiều hàm nhỏ, mỗi hàm làm một việc và có tên rõ nghĩa.

## Đọc thêm

- [Hàm – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [return – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/return)
- [Hàm mũi tên – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
