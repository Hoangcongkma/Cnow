---
title: "Biến và kiểu dữ liệu"
minutes: 15
preview: false
objectives:
  - "Hiểu biến (variable) là chiếc hộp có nhãn để lưu giá trị"
  - "Khai báo biến bằng let và const, biết khi nào dùng cái nào"
  - "Nhận biết các kiểu dữ liệu cơ bản: số, chuỗi, boolean, undefined, null"
  - "Dùng typeof để kiểm tra kiểu và chuyển đổi chuỗi sang số"
quiz:
  - question: "Nên dùng từ khóa nào cho một giá trị KHÔNG đổi trong suốt chương trình, ví dụ số ngày trong tuần?"
    options: ["let", "const", "var", "change"]
    answer: 1
    explain: "const khai báo biến không thể gán lại. Dùng const mặc định, chỉ dùng let khi thật sự cần thay đổi giá trị."
  - question: "typeof 42 trả về gì?"
    options: ["'integer'", "'number'", "'string'", "'digit'"]
    answer: 1
    explain: "JavaScript chỉ có một kiểu số chung là number cho cả số nguyên lẫn số thập phân."
  - question: "Kết quả của '10' + 5 là gì?"
    options: ["15", "'105'", "'15'", "Lỗi"]
    answer: 1
    explain: "Một vế là chuỗi nên + thực hiện nối chuỗi: '10' + 5 = '105'. Muốn cộng số, hãy chuyển '10' bằng Number('10') trước."
  - question: "Biến được khai báo bằng let nhưng chưa gán giá trị thì có giá trị gì?"
    options: ["0", "null", "undefined", "'' (chuỗi rỗng)"]
    answer: 2
    explain: "undefined nghĩa là 'chưa có giá trị'. null thì do lập trình viên chủ động gán để nói 'cố ý để trống'."
---

## Giải thích khái niệm

### Biến là chiếc hộp có dán nhãn

Khi dọn nhà, bạn bỏ đồ vào thùng và dán nhãn "Sách", "Bát đĩa" để sau này tìm lại. Trong lập trình, **biến** (variable) đóng vai trò chiếc thùng ấy: nó có một **tên** (nhãn) và chứa một **giá trị** (đồ bên trong). Chương trình có thể đọc giá trị qua tên biến, hoặc thay đồ mới vào thùng.

Nhờ biến, bạn không phải gõ lại một con số hay một câu chữ nhiều lần. Bạn chỉ cần đặt tên một lần, rồi dùng tên đó ở mọi nơi. Khi giá trị thay đổi, bạn chỉ sửa ở một chỗ.

### Khai báo biến: let và const

JavaScript có hai từ khóa hiện đại để tạo biến:

- `const` (viết tắt của constant – hằng số): giá trị **không được gán lại**. Ví dụ: số phút trong một giờ.
- `let`: giá trị **có thể thay đổi**. Ví dụ: số tiền trong ví, điểm số trong trò chơi.

Quy tắc của nhiều lập trình viên: **mặc định dùng `const`**, chỉ đổi sang `let` khi chắc chắn cần gán lại. Cách này giúp tránh vô tình ghi đè dữ liệu. Bạn có thể gặp từ khóa `var` trong code cũ; nó hoạt động hơi khác và dễ gây nhầm lẫn, nên bạn chưa cần dùng.

### Đặt tên biến sao cho dễ đọc

- Tên chỉ gồm chữ cái, chữ số, `_` hoặc `$`, **không bắt đầu bằng chữ số**.
- Phân biệt chữ hoa chữ thường: `tuoi` và `Tuoi` là hai biến khác nhau.
- Dùng kiểu **camelCase** (chữ đầu viết thường, mỗi từ sau viết hoa chữ cái đầu): `soLuongSanPham`, `tongTien`.
- Đặt tên nói lên ý nghĩa: `giaVe` dễ hiểu hơn nhiều so với `x`.

### Các kiểu dữ liệu cơ bản

Giá trị bên trong hộp có nhiều loại, gọi là **kiểu dữ liệu** (data type):

| Kiểu | Ví dụ | Dùng để |
|---|---|---|
| number (số) | `25`, `3.14`, `-7` | tính toán, đếm, đo |
| string (chuỗi) | `'Hà Nội'`, `"Cnow"` | lưu chữ, câu văn |
| boolean | `true`, `false` | trả lời câu hỏi có/không |
| undefined | `undefined` | biến chưa được gán giá trị |
| null | `null` | cố ý để trống |

### Điều gì xảy ra khi gán lại biến?

Khi bạn viết `let diem = 7;` rồi sau đó `diem = 9;`, chiếc hộp tên `diem` không bị đổi tên hay tạo thêm hộp mới. Máy chỉ **bỏ giá trị cũ ra và đặt giá trị mới vào**. Từ lúc đó, mọi nơi đọc `diem` đều nhận được 9. Giá trị 7 cũ không còn được giữ lại ở đâu cả, trừ khi bạn chủ động lưu nó vào một biến khác trước khi gán.

Một cách hay để luyện tư duy là **dò code bằng tay**: kẻ một bảng nhỏ, mỗi cột là một biến, mỗi dòng là một câu lệnh, rồi ghi giá trị của từng biến sau mỗi dòng. Lập trình viên giàu kinh nghiệm vẫn làm việc này trong đầu khi đọc code lạ. Nếu bảng của bạn khớp với kết quả `console.log` in ra, nghĩa là bạn đã thật sự hiểu chương trình chạy như thế nào, chứ không chỉ đoán.

Kiểu dữ liệu quyết định bạn làm được gì với giá trị: số thì cộng trừ nhân chia, chuỗi thì nối và cắt, boolean thì dùng để ra quyết định (bài sau). Toán tử `typeof` cho biết kiểu của một giá trị.

## Code mẫu có chú thích

```js
const tenKhoaHoc = 'Nhập môn lập trình'; // chuỗi: đặt trong dấu nháy
const soBaiHoc = 5;                        // số: không có dấu nháy
let daHocXong = false;                     // boolean: chỉ true hoặc false
let ghiChu;                                // chưa gán → undefined

console.log(tenKhoaHoc, 'có', soBaiHoc, 'bài');
console.log(typeof tenKhoaHoc, typeof soBaiHoc, typeof daHocXong, typeof ghiChu);

daHocXong = true; // let cho phép gán lại
console.log('Đã học xong?', daHocXong);
```

```text output
Nhập môn lập trình có 5 bài
string number boolean undefined
Đã học xong? true
```

Khi truyền nhiều giá trị cho `console.log`, cách nhau bởi dấu phẩy, chúng được in trên cùng một dòng, cách nhau một khoảng trắng.

Ví dụ thứ hai: tính tiền một đơn hàng nhỏ bằng biến.

```js
const giaMotLy = 25000;  // giá một ly trà sữa (đồng)
let soLy = 3;
let tongTien = giaMotLy * soLy;
console.log('Tổng tiền:', tongTien);

soLy = soLy + 1;         // khách gọi thêm 1 ly
tongTien = giaMotLy * soLy;
console.log('Sau khi gọi thêm:', tongTien);

// Template string (chuỗi mẫu) dùng dấu ` và ${...} để chèn giá trị vào câu
console.log(`Bạn đã gọi ${soLy} ly, cần trả ${tongTien} đồng.`);
```

```text output
Tổng tiền: 75000
Sau khi gọi thêm: 100000
Bạn đã gọi 4 ly, cần trả 100000 đồng.
```

### Chuyển chuỗi thành số

Dữ liệu người dùng nhập vào (từ ô nhập, từ file) thường là **chuỗi**, kể cả khi trông như số. Muốn tính toán, hãy chuyển nó sang số bằng `Number()`:

```js
const nhapVao = '12';               // giả sử người dùng gõ 12
console.log(nhapVao + 3);           // nối chuỗi
console.log(Number(nhapVao) + 3);   // cộng số
console.log(Number('mười hai'));    // không chuyển được → NaN
```

```text output
123
15
NaN
```

`NaN` (Not a Number – "không phải là số") xuất hiện khi phép chuyển đổi hoặc phép tính không cho ra số hợp lệ.

## Lỗi hay gặp

**1. Gán lại biến `const`.** Máy sẽ dừng chương trình ngay:

```js error
const soNgayTrongTuan = 7;
soNgayTrongTuan = 8; // TypeError: Assignment to constant variable.
```

Nếu giá trị thực sự cần thay đổi, hãy khai báo bằng `let`.

**2. Dùng biến trước khi khai báo hoặc gõ sai tên.** Viết `console.log(tongtien)` trong khi biến tên là `tongTien` sẽ gây lỗi `ReferenceError: tongtien is not defined`. Hãy kiểm tra chữ hoa chữ thường.

**3. Cộng nhầm chuỗi với số.** `'10' + 5` cho ra `'105'` chứ không phải `15`. Khi thấy kết quả "dính liền" bất thường, hãy kiểm tra `typeof` của từng giá trị.

**4. Khai báo lại cùng một tên.** Viết `let x = 1;` rồi lại `let x = 2;` trong cùng một phạm vi sẽ gây lỗi cú pháp. Lần thứ hai chỉ cần `x = 2;`.

## Bài tập thực hành

**Bài 1.** Khai báo các biến lưu: tên một món ăn, giá (số), và việc món đó có cay hay không (boolean). In ra một câu bằng template string, ví dụ: `Bún bò giá 45000 đồng, cay: true`.

**Bài 2.** Một sinh viên có điểm giữa kỳ dạng chuỗi `'7.5'` và điểm cuối kỳ `8`. Tính điểm trung bình (cộng hai điểm rồi chia 2) và in ra `Điểm trung bình: 7.75`.

Gợi ý bài 2: nhớ chuyển chuỗi sang số trước khi cộng, và dùng ngoặc tròn để phép cộng được thực hiện trước phép chia.

<details>
<summary>Xem lời giải</summary>

```js
// Bài 1
const tenMon = 'Bún bò';
const gia = 45000;
const cay = true;
console.log(`${tenMon} giá ${gia} đồng, cay: ${cay}`);

// Bài 2
const giuaKy = '7.5';
const cuoiKy = 8;
const trungBinh = (Number(giuaKy) + cuoiKy) / 2;
console.log('Điểm trung bình:', trungBinh);
```

```text output
Bún bò giá 45000 đồng, cay: true
Điểm trung bình: 7.75
```

</details>

## Tóm tắt

- Biến là chiếc hộp có tên để lưu giá trị; dùng `const` cho giá trị cố định, `let` cho giá trị thay đổi.
- Đặt tên biến theo camelCase, có ý nghĩa, không bắt đầu bằng chữ số.
- Kiểu cơ bản: number, string, boolean, undefined, null. `typeof` cho biết kiểu.
- Dấu `+` với chuỗi là **nối**, với hai số là **cộng**. Dùng `Number()` để chuyển chuỗi thành số.
- Template string `` `...${bien}...` `` giúp ghép câu gọn gàng.

## Đọc thêm

- [Ngữ pháp và kiểu dữ liệu – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types)
- [const – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const)
- [typeof – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)
