---
title: "Hàm và phạm vi"
minutes: 16
preview: false
objectives:
  - "Phân biệt khai báo hàm (function declaration), biểu thức hàm và hàm mũi tên"
  - "Hiểu phạm vi khối (block scope) của let/const và vì sao tránh var"
  - "Hiểu closure: hàm 'nhớ' biến ở nơi nó được tạo"
  - "Viết hàm thuần (pure function) với tham số mặc định và tham số còn lại (rest)"
quiz:
  - question: "Biến khai báo bằng let bên trong khối if { } có dùng được ở ngoài khối đó không?"
    options: ["Có, ở mọi nơi trong file", "Không, chỉ trong khối { } đó", "Chỉ trong hàm chứa nó", "Chỉ khi khai báo trước"]
    answer: 1
    explain: "let và const có phạm vi khối: chỉ tồn tại giữa cặp ngoặc nhọn nơi khai báo."
  - question: "Closure là gì?"
    options: ["Một hàm tự gọi chính nó", "Hàm ghi nhớ và truy cập được biến của phạm vi nơi nó được tạo, kể cả khi phạm vi đó đã chạy xong", "Hàm không có tên", "Cách đóng trình duyệt"]
    answer: 1
    explain: "Nhờ closure, hàm bên trong giữ được biến của hàm bao ngoài, ví dụ bộ đếm riêng tư."
  - question: "function tong(...so) { } – so là gì khi gọi tong(1, 2, 3)?"
    options: ["Số 1", "Mảng [1, 2, 3]", "Số 6", "undefined"]
    answer: 1
    explain: "Tham số còn lại (rest parameter) gom mọi đối số còn lại thành một mảng."
  - question: "Hàm nào là hàm thuần (pure function)?"
    options: ["Hàm cộng hai tham số và trả về kết quả", "Hàm thay đổi một biến toàn cục", "Hàm in ra console và trả về số ngẫu nhiên", "Hàm sửa trực tiếp mảng truyền vào"]
    answer: 0
    explain: "Hàm thuần: cùng đầu vào luôn cho cùng đầu ra và không tác động ra bên ngoài (không sửa biến ngoài, không in, không gọi mạng)."
---

## Giải thích khái niệm

### Ba cách tạo hàm

Ở khóa Nhập môn, bạn đã viết hàm bằng từ khóa `function`. JavaScript có ba cách viết thường gặp:

```js
// 1. Khai báo hàm (function declaration)
function nhan(a, b) { return a * b; }

// 2. Biểu thức hàm (function expression): hàm được gán vào biến
const chia = function (a, b) { return a / b; };

// 3. Hàm mũi tên (arrow function)
const cong = (a, b) => a + b;

console.log(nhan(3, 4), chia(10, 4), cong(2, 5));
```

```text output
12 2.5 7
```

Khác biệt đáng nhớ nhất: khai báo hàm (cách 1) được **kéo lên đầu** phạm vi (hoisting), nên có thể gọi trước dòng khai báo. Cách 2 và 3 là biến `const`, phải khai báo trước rồi mới dùng. Hàm mũi tên ngắn gọn, thường dùng cho các hàm nhỏ truyền vào hàm khác (callback). Nó còn khác ở cách xử lý từ khóa `this`, một chủ đề nâng cao bạn sẽ gặp khi làm việc với đối tượng.

### Hàm là giá trị

Trong JavaScript, hàm là một **giá trị** như số hay chuỗi: gán được vào biến, truyền được vào hàm khác, trả về được từ hàm khác. Hàm nhận hoặc trả về hàm gọi là **hàm bậc cao** (higher-order function). Bạn đã thấy ví dụ: `setTimeout(hamNaoDo, 1000)` nhận một hàm để gọi sau 1 giây; `mang.map(x => x * 2)` nhận một hàm để áp dụng cho từng phần tử.

### Phạm vi: biến sống ở đâu?

**Phạm vi** (scope) quyết định một biến được nhìn thấy ở đâu. Hãy nghĩ đến các phòng trong một tòa nhà có kính một chiều: người trong phòng nhìn ra hành lang được, người ngoài hành lang không nhìn vào phòng được.

- **Phạm vi toàn cục**: biến khai báo ngoài mọi hàm, mọi khối.
- **Phạm vi hàm**: biến khai báo trong hàm chỉ dùng trong hàm đó.
- **Phạm vi khối** (block scope): `let` và `const` chỉ sống trong cặp `{ }` gần nhất, ví dụ thân `if`, thân vòng lặp.

Từ khóa cũ `var` **không** có phạm vi khối, chỉ có phạm vi hàm, và còn được "kéo lên" với giá trị `undefined`. Điều này gây ra nhiều lỗi khó hiểu, nên code hiện đại chỉ dùng `let` và `const`.

Khi tìm một biến, JavaScript tìm ở phạm vi hiện tại trước, không thấy thì ra phạm vi bao ngoài, cứ thế cho tới phạm vi toàn cục. Chuỗi tìm kiếm này gọi là **chuỗi phạm vi** (scope chain).

### Closure: hàm có trí nhớ

**Closure** là khả năng một hàm **ghi nhớ** các biến ở nơi nó được tạo ra, kể cả khi nơi đó đã chạy xong. Hình dung một chiếc ba lô: khi một hàm được tạo bên trong hàm khác, nó mang theo ba lô chứa các biến xung quanh. Đi đâu nó cũng mở ba lô ra dùng được.

Closure cho phép tạo **dữ liệu riêng tư**: biến chỉ được thay đổi thông qua các hàm bạn cho phép, bên ngoài không chạm vào trực tiếp được.

### Hàm thuần

Một **hàm thuần** (pure function) thỏa hai điều: cùng đầu vào thì luôn cho cùng đầu ra, và không gây **tác dụng phụ** (side effect) như sửa biến bên ngoài, sửa tham số, in ra màn hình hay gọi mạng. Hàm thuần dễ kiểm thử và dễ tái sử dụng. Không phải hàm nào cũng thuần được (chương trình cuối cùng vẫn phải in ra hay lưu dữ liệu), nhưng hãy cố gắng để phần **tính toán** là thuần, còn tác dụng phụ gom ở một vài chỗ.

## Code mẫu có chú thích

Phạm vi khối:

```js
const thongBao = 'toàn cục';

if (true) {
  const thongBao = 'trong khối';   // biến mới, che biến bên ngoài
  let chiTrongKhoi = 42;
  console.log(thongBao, chiTrongKhoi);
}

console.log(thongBao);               // biến toàn cục không bị ảnh hưởng
console.log(typeof chiTrongKhoi);    // ngoài khối không còn biến này
```

```text output
trong khối 42
toàn cục
undefined
```

Closure tạo bộ đếm riêng tư:

```js
function taoBoDem(batDau = 0) {
  let dem = batDau;                // biến riêng, bên ngoài không truy cập trực tiếp
  return {
    tang: () => ++dem,
    giam: () => --dem,
    giaTri: () => dem,
  };
}

const boDemA = taoBoDem();
const boDemB = taoBoDem(10);       // mỗi lần gọi tạo một "ba lô" mới
boDemA.tang(); boDemA.tang();
boDemB.giam();
console.log(boDemA.giaTri(), boDemB.giaTri());
console.log(boDemA.dem);           // không đụng được vào biến riêng
```

```text output
2 9
undefined
```

Tham số còn lại, giá trị mặc định và hàm bậc cao:

```js
// ...so gom mọi đối số thành mảng
function tong(...so) {
  return so.reduce((t, x) => t + x, 0);
}
console.log(tong(), tong(1, 2, 3), tong(10, 20));

// Hàm trả về hàm: tạo các hàm tính thuế với mức khác nhau
const taoHamThue = (phanTram) => (gia) => Math.round(gia * (1 + phanTram / 100));
const thueVat = taoHamThue(10);
console.log(thueVat(100000));

// Hàm thuần: không sửa mảng gốc, trả về mảng mới
const giamGia = (dsGia, phanTram) => dsGia.map((g) => g - (g * phanTram) / 100);
const gia = [100000, 50000];
console.log(giamGia(gia, 20), gia);
```

```text output
0 6 30
110000
[ 80000, 40000 ] [ 100000, 50000 ]
```

## Lỗi hay gặp

**1. Gọi biểu thức hàm trước khi khai báo.** Chỉ khai báo `function` mới được kéo lên; hàm gán vào `const` thì không:

```js error
chao(); // ReferenceError: Cannot access 'chao' before initialization
const chao = () => console.log('Xin chào');
```

**2. Dùng `var` trong vòng lặp với hàm gọi sau.** Với `var`, mọi vòng lặp dùng chung một biến, nên các hàm `setTimeout` đều thấy giá trị cuối cùng:

```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log('var:', i), 0);
for (let j = 0; j < 3; j++) setTimeout(() => console.log('let:', j), 0);
```

```text output
var: 3
var: 3
var: 3
let: 0
let: 1
let: 2
```

Với `let`, mỗi vòng lặp có một biến `j` riêng. Đây là lý do nữa để bỏ hẳn `var`.

**3. Hàm mũi tên có ngoặc nhọn nhưng quên `return`.** `(x) => { x * 2 }` trả về `undefined`. Có ngoặc nhọn thì phải viết `return`; muốn trả về ngắn gọn thì bỏ ngoặc nhọn: `(x) => x * 2`.

**4. Hàm vô tình sửa dữ liệu bên ngoài.** Hàm nhận mảng rồi gọi `push`, `sort` trên chính mảng đó sẽ thay đổi mảng của người gọi. Hãy tạo bản sao (`[...mang]`) hoặc dùng các phương thức trả về mảng mới.

## Bài tập thực hành

**Bài 1.** Viết hàm `taoGioHang()` dùng closure, trả về đối tượng có các hàm `them(gia)`, `tongTien()` và `soMon()`. Danh sách món phải là dữ liệu riêng tư.

**Bài 2.** Viết hàm `lonNhat(...so)` trả về số lớn nhất trong các đối số, và trả về `null` nếu không có đối số nào.

Gợi ý bài 2: `Math.max(...so)` trả về `-Infinity` khi mảng rỗng, nên cần kiểm tra `so.length` trước.

<details>
<summary>Xem lời giải</summary>

```js
// Bài 1
function taoGioHang() {
  const mon = []; // riêng tư nhờ closure
  return {
    them: (gia) => { mon.push(gia); },
    tongTien: () => mon.reduce((t, g) => t + g, 0),
    soMon: () => mon.length,
  };
}
const gio = taoGioHang();
gio.them(30000); gio.them(45000);
console.log(gio.soMon(), gio.tongTien());

// Bài 2
const lonNhat = (...so) => (so.length ? Math.max(...so) : null);
console.log(lonNhat(3, 9, 4), lonNhat());
```

```text output
2 75000
9 null
```

</details>

## Tóm tắt

- Ba cách viết hàm: khai báo (được kéo lên), biểu thức hàm, hàm mũi tên (ngắn gọn, hợp làm callback).
- Hàm là giá trị: truyền vào, trả về được; đó là hàm bậc cao.
- `let`/`const` có phạm vi khối; tránh `var`. Biến được tìm từ trong ra ngoài theo chuỗi phạm vi.
- Closure giúp hàm ghi nhớ biến nơi nó được tạo, dùng để tạo dữ liệu riêng tư.
- Ưu tiên hàm thuần; dùng tham số mặc định và tham số còn lại `...` cho linh hoạt.

## Đọc thêm

- [Hàm – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [Closure – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)
- [Rest parameters – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters)
