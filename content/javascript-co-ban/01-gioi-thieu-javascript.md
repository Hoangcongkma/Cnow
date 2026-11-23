---
title: "Giới thiệu JavaScript"
minutes: 14
preview: true
objectives:
  - "Biết JavaScript chạy ở đâu: trình duyệt và Node.js, và mỗi nơi làm được gì"
  - "Nhúng JavaScript vào trang bằng file riêng với thuộc tính defer"
  - "Dùng tab Console của DevTools để thử code và đọc lỗi"
  - "Nắm các quy tắc viết code: câu lệnh, chú thích, chế độ nghiêm ngặt (strict mode)"
quiz:
  - question: "Cách nhúng JavaScript nào được khuyến nghị cho trang web?"
    options: ["Viết code trong thuộc tính onclick của từng thẻ", "Dùng file riêng: <script src=\"app.js\" defer></script>", "Chép code vào thẻ <style>", "Đặt code trong thẻ <title>"]
    answer: 1
    explain: "File riêng dễ bảo trì, được trình duyệt lưu đệm, và tương thích với chính sách bảo mật CSP chặn script nội tuyến."
  - question: "Thuộc tính defer trên thẻ <script> có tác dụng gì?"
    options: ["Không bao giờ chạy script", "Tải script song song và chỉ chạy sau khi HTML đã được đọc xong", "Chạy script hai lần", "Chỉ chạy trên điện thoại"]
    answer: 1
    explain: "Với defer, script không chặn việc hiển thị trang và chạy khi các phần tử HTML đã sẵn sàng."
  - question: "Điều nào sau đây Node.js làm được nhưng JavaScript trong trình duyệt KHÔNG làm được?"
    options: ["Tính toán số học", "Đọc và ghi file trên ổ cứng máy chủ", "In ra console", "Dùng biến và hàm"]
    answer: 1
    explain: "Vì lý do an toàn, trình duyệt không cho trang web tự đọc ghi file của bạn; Node.js chạy trên máy nên có quyền truy cập file."
  - question: "Thêm 'use strict' ở đầu file giúp gì?"
    options: ["Code chạy nhanh gấp đôi", "Biến một số lỗi âm thầm thành lỗi rõ ràng, ví dụ gán cho biến chưa khai báo", "Tự động sửa lỗi chính tả", "Tắt mọi thông báo lỗi"]
    answer: 1
    explain: "Chế độ nghiêm ngặt ngăn những thói quen dễ gây lỗi; file dùng module (import/export) tự động ở chế độ này."
---

## Giải thích khái niệm

### Ngôn ngữ của web, và hơn thế nữa

JavaScript ra đời để làm cho trang web "sống động": hiện menu khi bấm, kiểm tra form trước khi gửi, cập nhật giỏ hàng mà không tải lại trang. Ngày nay nó là ngôn ngữ duy nhất chạy **trực tiếp** trong mọi trình duyệt, nên bất cứ ai làm web đều cần biết.

Cái tên dễ gây hiểu lầm: JavaScript **không phải** phiên bản rút gọn của Java. Hai ngôn ngữ khác nhau hoàn toàn, chỉ giống nhau ở cái tên do lý do quảng bá thời đó. Tên chuẩn hóa chính thức của ngôn ngữ là **ECMAScript**; các phiên bản như ES2015 (còn gọi ES6) bổ sung những cú pháp hiện đại như `let`, `const`, hàm mũi tên mà bạn sẽ dùng thường xuyên.

### Hai môi trường chạy

Cùng một ngôn ngữ, nhưng mỗi nơi chạy cung cấp những "đồ nghề" khác nhau. Hãy nghĩ đến một người thợ: kỹ năng là một, nhưng làm trong xưởng gỗ thì có cưa, làm trong bếp thì có dao.

| | Trình duyệt | Node.js |
|---|---|---|
| Chạy ở | máy của người xem trang | máy chủ hoặc máy của bạn |
| Có sẵn | `document` (trang web), `window`, sự kiện chuột, bàn phím | đọc ghi file, mạng, tiến trình |
| Không có | đọc file tùy ý trên máy người dùng | `document`, giao diện trang |
| Dùng để | tương tác giao diện | viết server, công cụ dòng lệnh |

Phần cốt lõi của ngôn ngữ (biến, hàm, mảng, đối tượng, vòng lặp) giống nhau ở cả hai nơi. Khóa học này học phần cốt lõi bằng Node.js cho dễ thử, rồi hai bài cuối chuyển sang trình duyệt để làm việc với trang web.

### Nhúng JavaScript vào trang

Cách được khuyến nghị là viết code trong **file riêng** rồi nạp bằng thẻ `<script>`:

```html
<head>
  <script src="app.js" defer></script>
</head>
```

Thuộc tính `defer` báo trình duyệt: tải file này song song, nhưng **chờ đọc xong toàn bộ HTML rồi mới chạy**. Nhờ vậy code của bạn tìm thấy mọi phần tử trên trang, và trang không bị "đứng hình" trong lúc tải script.

Bạn có thể thấy code viết thẳng trong thẻ `<script>...</script>` hoặc trong thuộc tính như `onclick="..."`. Cách này tiện khi thử nhanh, nhưng khó bảo trì và bị chặn bởi **chính sách bảo mật nội dung** (Content Security Policy – CSP) mà nhiều website, kể cả Cnow, dùng để chống tấn công chèn mã. Hãy tập thói quen dùng file riêng ngay từ đầu.

### Console: phòng thí nghiệm của bạn

Mở DevTools (F12) và chọn tab **Console**. Đây là nơi bạn gõ thử một dòng JavaScript và thấy kết quả ngay, đồng thời là nơi trình duyệt báo lỗi của trang. Khi một tính năng "không chạy", việc đầu tiên luôn là mở Console xem có dòng chữ đỏ nào không. Trong Node.js, terminal đóng vai trò tương tự.

### Quy tắc viết code

- Mỗi **câu lệnh** (statement) thường nằm trên một dòng và kết thúc bằng dấu chấm phẩy `;`. JavaScript có cơ chế tự thêm dấu chấm phẩy, nhưng viết đầy đủ giúp tránh vài trường hợp hiểu nhầm hiếm gặp.
- **Chú thích**: `// một dòng` hoặc `/* nhiều dòng */`. Hãy chú thích **vì sao** làm thế, còn **làm gì** thì code tự nói.
- JavaScript **phân biệt chữ hoa chữ thường**: `tong` và `Tong` là hai tên khác nhau.
- **Chế độ nghiêm ngặt** (strict mode): thêm dòng `'use strict';` ở đầu file. Một số lỗi vốn bị bỏ qua âm thầm sẽ được báo rõ ràng.

## Code mẫu có chú thích

Chạy thử trong Node.js để thấy phần cốt lõi của ngôn ngữ:

```js
'use strict';

const ngonNgu = 'JavaScript';
const namRaDoi = 1995;
const namNay = 2026;

// Template string: chèn biểu thức vào chuỗi bằng ${...}
console.log(`${ngonNgu} đã ${namNay - namRaDoi} tuổi.`);

// console có nhiều hàm hữu ích ngoài log
console.table([
  { moiTruong: 'Trình duyệt', coDocument: true },
  { moiTruong: 'Node.js', coDocument: false },
]);

// Kiểm tra đang chạy ở đâu: trong Node.js không có biến document
console.log('Có document không?', typeof document !== 'undefined');
```

Lệnh `console.table` in mảng các đối tượng thành bảng, rất tiện khi xem dữ liệu.

Còn đây là code chạy trong trình duyệt, đặt trong `app.js` được nạp bằng `defer`. Nó đọc và thay đổi trang web qua đối tượng `document`:

```js dom
'use strict';

// Đổi tiêu đề trên tab trình duyệt
document.title = 'Xin chào từ JavaScript';

// Tìm phần tử <h1> đầu tiên trên trang và đổi nội dung chữ của nó
const tieuDe = document.querySelector('h1');
tieuDe.textContent = 'Trang này đã được JavaScript cập nhật';

console.log('Đã cập nhật:', tieuDe.textContent);
```

Bạn sẽ học kỹ `querySelector` và `textContent` trong bài "Làm việc với DOM".

## Lỗi hay gặp

**1. Script chạy trước khi HTML sẵn sàng.** Đặt `<script src="app.js">` trong `<head>` mà **không có** `defer` thì lúc code chạy, phần `<body>` chưa được đọc, `document.querySelector('h1')` trả về `null` và dòng tiếp theo báo lỗi `Cannot set properties of null`. Thêm `defer` (hoặc đặt thẻ script cuối `<body>`).

**2. Gán cho biến chưa khai báo.** Không có strict mode, gõ nhầm tên biến khi gán sẽ âm thầm tạo ra một biến toàn cục mới, gây lỗi khó tìm. Có strict mode thì lỗi hiện ra ngay:

```js error
'use strict';
let soLuong = 1;
soLuogn = 2; // gõ nhầm tên → ReferenceError: soLuogn is not defined
```

**3. Dùng code trình duyệt trong Node.js.** Chạy `node app.js` với file có `document.querySelector` sẽ báo `ReferenceError: document is not defined`. Code thao tác trang web phải chạy trong trình duyệt.

**4. Sai đường dẫn file script.** Script không chạy mà Console báo lỗi 404: kiểm tra `src` giống như kiểm tra đường dẫn ảnh ở khóa HTML.

## Bài tập thực hành

**Bài 1 (Node.js).** Viết chương trình có strict mode, khai báo tên bạn và năm sinh, in ra câu: `Xin chào <tên>, năm 2030 bạn sẽ <tuổi> tuổi.`

**Bài 2 (trình duyệt).** Tạo `index.html` có một `<h1>` và một `<p class="loi-chao">`, nạp `app.js` bằng `defer`. Trong `app.js`, đổi chữ của đoạn `.loi-chao` thành lời chào kèm năm hiện tại lấy bằng `new Date().getFullYear()`.

Gợi ý: kiểm tra Console nếu không thấy thay đổi; chắc chắn rằng có `defer`.

<details>
<summary>Xem lời giải</summary>

```js
// Bài 1
'use strict';
const ten = 'Lan';
const namSinh = 2005;
console.log(`Xin chào ${ten}, năm 2030 bạn sẽ ${2030 - namSinh} tuổi.`);
```

```text output
Xin chào Lan, năm 2030 bạn sẽ 25 tuổi.
```

```js dom
// Bài 2 – app.js (trang nạp bằng <script src="app.js" defer></script>)
'use strict';
const loiChao = document.querySelector('.loi-chao');
loiChao.textContent = `Chào mừng bạn đến với năm ${new Date().getFullYear()}!`;
```

</details>

## Tóm tắt

- JavaScript là ngôn ngữ chạy trong mọi trình duyệt và trên máy chủ nhờ Node.js; phần cốt lõi giống nhau.
- Trình duyệt có `document` để thao tác trang; Node.js có quyền đọc ghi file, mạng.
- Nhúng bằng file riêng `<script src="app.js" defer>`; tránh code nội tuyến.
- Console (DevTools hoặc terminal) là nơi thử code và đọc lỗi đầu tiên.
- Dùng `'use strict'`, phân biệt chữ hoa thường, chú thích lý do.

## Đọc thêm

- [JavaScript là gì? – MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/What_is_JavaScript)
- [Thẻ script – MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script)
- [Strict mode – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode)
