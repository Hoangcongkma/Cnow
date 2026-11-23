---
title: "Vòng lặp"
minutes: 15
preview: false
objectives:
  - "Hiểu vì sao cần vòng lặp (loop) thay vì chép lệnh nhiều lần"
  - "Viết vòng lặp for với biến đếm và vòng lặp while với điều kiện"
  - "Duyệt từng phần tử của một danh sách bằng for...of"
  - "Dùng break, continue và tránh vòng lặp vô hạn"
quiz:
  - question: "Vòng lặp for (let i = 1; i <= 5; i++) chạy bao nhiêu lần?"
    options: ["4", "5", "6", "Vô hạn"]
    answer: 1
    explain: "i nhận các giá trị 1, 2, 3, 4, 5. Khi i = 6 thì điều kiện i <= 5 sai và vòng lặp dừng."
  - question: "Khi nào nên dùng while thay vì for?"
    options: ["Khi biết trước chính xác số lần lặp", "Khi chưa biết trước số lần lặp, chỉ biết điều kiện dừng", "Khi muốn chương trình chạy nhanh hơn", "Không bao giờ"]
    answer: 1
    explain: "for hợp với số lần lặp xác định; while hợp khi lặp 'cho đến khi' một điều kiện thay đổi."
  - question: "Lệnh nào thoát hẳn khỏi vòng lặp ngay lập tức?"
    options: ["continue", "stop", "break", "exit"]
    answer: 2
    explain: "break kết thúc vòng lặp; continue chỉ bỏ qua phần còn lại của lần lặp hiện tại."
  - question: "Điều gì gây ra vòng lặp vô hạn trong while (n > 0) { console.log(n) }?"
    options: ["Thiếu dấu chấm phẩy", "Biến n không bao giờ thay đổi nên điều kiện luôn đúng", "console.log chạy quá chậm", "Phải dùng for thay vì while"]
    answer: 1
    explain: "Bên trong vòng lặp phải có lệnh làm điều kiện tiến dần tới sai, ví dụ n--."
---

## Giải thích khái niệm

### Khi bạn phải làm một việc nhiều lần

Giả sử thầy giáo phạt bạn chép "Em sẽ làm bài tập về nhà" 100 lần. Viết tay thì mỏi, còn với máy tính, bạn chỉ cần nói: **lặp lại** câu này 100 lần. Đó là **vòng lặp** (loop): một khối lệnh được chạy đi chạy lại cho đến khi một điều kiện không còn đúng.

Vòng lặp xuất hiện ở khắp nơi: gửi email cho 1000 khách hàng, tính tổng tiền của tất cả món trong giỏ hàng, kiểm tra từng ô trong bàn cờ. Nếu chép tay câu lệnh, code vừa dài vừa khó sửa; khi số khách tăng từ 1000 lên 5000, bạn lại phải chép thêm. Với vòng lặp, bạn chỉ thay một con số.

### Vòng lặp for: lặp với biến đếm

Vòng lặp `for` hợp khi bạn **biết trước số lần lặp**. Nó gồm ba phần trong ngoặc, cách nhau bởi dấu chấm phẩy:

```
for (khởi tạo; điều kiện; bước nhảy) {
  // thân vòng lặp
}
```

1. **Khởi tạo**: chạy một lần lúc đầu, thường là `let i = 0`.
2. **Điều kiện**: kiểm tra **trước mỗi lần lặp**; còn đúng thì chạy thân vòng lặp, sai thì dừng.
3. **Bước nhảy**: chạy **sau mỗi lần lặp**, thường là `i++` (tăng `i` thêm 1).

Hình dung như leo cầu thang: bắt đầu ở bậc 0, mỗi lần bước lên một bậc, lên đến bậc cuối cùng thì dừng.

### Vòng lặp while: lặp cho đến khi…

`while` hợp khi bạn **chưa biết trước số lần lặp**, chỉ biết điều kiện dừng. Ví dụ: tiết kiệm mỗi tháng một khoản cho đến khi đủ tiền mua laptop. Bạn không biết mất mấy tháng, nhưng biết khi nào dừng.

```
while (điều kiện) {
  // thân vòng lặp – phải có lệnh làm điều kiện dần trở thành sai
}
```

### Vòng lặp for...of: đi qua từng phần tử

Khi có một danh sách (sẽ học kỹ hơn ở khóa JavaScript), `for...of` lấy lần lượt từng phần tử mà không cần biến đếm. Đây là cách viết dễ đọc nhất khi bạn chỉ cần "với mỗi món trong danh sách, làm gì đó".

### Chọn vòng lặp nào?

Ba loại vòng lặp trên đều có thể thay thế cho nhau, nhưng chọn đúng loại giúp người đọc hiểu ngay ý định của bạn:

- Cần lặp **đúng N lần** hoặc cần dùng chính con số đếm (in số thứ tự, bảng cửu chương): dùng `for` với biến đếm.
- Cần xử lý **từng món trong danh sách** mà không quan tâm vị trí: dùng `for...of`.
- Cần lặp **cho đến khi** một việc xảy ra (đủ tiền, người dùng gõ đúng mật khẩu, hết dữ liệu): dùng `while`.

Khi viết xong một vòng lặp, hãy tự trả lời ba câu hỏi: vòng lặp bắt đầu từ đâu, mỗi vòng thay đổi điều gì, và khi nào thì dừng. Nếu không trả lời được câu thứ ba, rất có thể bạn vừa tạo ra một vòng lặp vô hạn. Thói quen này đặc biệt hữu ích khi vòng lặp chứa nhiều câu lệnh, vì lúc đó lỗi rất dễ bị che lấp.

## Code mẫu có chú thích

In bảng cửu chương 7 bằng `for`:

```js
for (let i = 1; i <= 5; i++) {   // i chạy từ 1 đến 5
  console.log(`7 x ${i} = ${7 * i}`);
}
```

```text output
7 x 1 = 7
7 x 2 = 14
7 x 3 = 21
7 x 4 = 28
7 x 5 = 35
```

Tính tổng tiền giỏ hàng bằng `for...of`, kết hợp với biến cộng dồn:

```js
const giaCacMon = [45000, 30000, 25000, 60000]; // danh sách giá
let tong = 0;                                    // biến cộng dồn bắt đầu từ 0

for (const gia of giaCacMon) {
  tong = tong + gia;                             // mỗi vòng cộng thêm giá một món
}
console.log('Tổng giỏ hàng:', tong);
```

```text output
Tổng giỏ hàng: 160000
```

Tiết kiệm mua laptop bằng `while`: chưa biết mất bao nhiêu tháng.

```js
const giaLaptop = 15000000;
const tietKiemMoiThang = 2000000;
let tienDaCo = 0;
let soThang = 0;

while (tienDaCo < giaLaptop) {   // còn thiếu tiền thì tiếp tục
  tienDaCo += tietKiemMoiThang;  // += nghĩa là "cộng thêm vào chính nó"
  soThang++;
}
console.log(`Sau ${soThang} tháng bạn có ${tienDaCo} đồng`);
```

```text output
Sau 8 tháng bạn có 16000000 đồng
```

### break và continue

- `break`: thoát **hẳn** khỏi vòng lặp.
- `continue`: bỏ qua phần còn lại của **lần lặp hiện tại**, chuyển sang lần kế tiếp.

```js
// Tìm số đầu tiên chia hết cho 7 trong khoảng 50–100
for (let n = 50; n <= 100; n++) {
  if (n % 7 === 0) {          // % là phép chia lấy dư
    console.log('Tìm thấy:', n);
    break;                    // tìm được rồi, không cần lặp tiếp
  }
}

// In các số lẻ từ 1 đến 9
for (let n = 1; n <= 9; n++) {
  if (n % 2 === 0) continue;  // số chẵn thì bỏ qua
  console.log(n);
}
```

```text output
Tìm thấy: 56
1
3
5
7
9
```

## Lỗi hay gặp

**1. Vòng lặp vô hạn.** Quên thay đổi biến trong điều kiện khiến vòng lặp không bao giờ dừng, chương trình bị "treo". Ví dụ `while (n > 0) { console.log(n); }` mà không có `n--`. Nếu điều này xảy ra trong terminal, nhấn **Ctrl + C** để dừng chương trình.

**2. Lệch một (off-by-one).** Viết `i < 5` khi muốn chạy đến 5 sẽ thiếu một lần, viết `i <= 5` khi bắt đầu từ 0 sẽ thừa một lần. Hãy tự hỏi: giá trị đầu là gì, giá trị cuối là gì, và thử chạy với số nhỏ để kiểm tra.

**3. Khai báo biến cộng dồn bên trong vòng lặp.** Nếu đặt `let tong = 0` **bên trong** thân vòng lặp, mỗi vòng nó lại bị đặt về 0 và kết quả cuối chỉ là giá trị của món cuối cùng. Biến cộng dồn phải khai báo **trước** vòng lặp.

**4. Dùng `const` cho biến đếm của `for` cổ điển.** `for (const i = 0; i < 3; i++)` sẽ lỗi vì `i++` gán lại biến hằng:

```js error
for (const i = 0; i < 3; i++) { // TypeError: Assignment to constant variable.
  console.log(i);
}
```

Với `for` có biến đếm dùng `let`; với `for...of` thì dùng `const` được, vì mỗi vòng là một biến mới.

## Bài tập thực hành

**Bài 1.** In ra các số từ 10 đếm ngược về 1, rồi in `Chúc mừng năm mới!`.

**Bài 2.** Cho danh sách điểm `[7, 9, 4, 8, 5]`. Dùng vòng lặp để đếm có bao nhiêu điểm từ 5 trở lên và tính điểm trung bình.

Gợi ý: bài 1 cho biến đếm giảm dần bằng `i--`. Bài 2 cần hai biến: một biến đếm và một biến cộng dồn; số phần tử của danh sách là `diem.length`.

<details>
<summary>Xem lời giải</summary>

```js
// Bài 1
for (let i = 10; i >= 1; i--) {
  console.log(i);
}
console.log('Chúc mừng năm mới!');

// Bài 2
const diem = [7, 9, 4, 8, 5];
let soDat = 0;
let tong = 0;
for (const d of diem) {
  tong += d;
  if (d >= 5) soDat++;
}
console.log('Số bài đạt:', soDat);
console.log('Trung bình:', tong / diem.length);
```

```text output
10
9
8
7
6
5
4
3
2
1
Chúc mừng năm mới!
Số bài đạt: 4
Trung bình: 6.6
```

</details>

## Tóm tắt

- Vòng lặp giúp chạy một khối lệnh nhiều lần mà không chép code.
- `for (khởi tạo; điều kiện; bước nhảy)` hợp với số lần lặp biết trước.
- `while (điều kiện)` hợp khi lặp "cho đến khi"; luôn đảm bảo điều kiện sẽ trở thành sai.
- `for...of` duyệt từng phần tử của danh sách, dễ đọc nhất.
- `break` thoát vòng lặp, `continue` bỏ qua lần lặp hiện tại; Ctrl + C dừng chương trình bị treo.

## Đọc thêm

- [Vòng lặp và lặp – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration)
- [for...of – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of)
