---
title: "Node.js hoạt động thế nào"
minutes: 16
preview: true
objectives:
  - "Hiểu Node.js là gì và vì sao nó phù hợp để viết server"
  - "Giải thích mô hình một luồng, bất đồng bộ (asynchronous) và vòng lặp sự kiện (event loop)"
  - "Đọc ghi file bằng fs/promises với async/await"
  - "Tạo một HTTP server tối giản bằng module http có sẵn"
quiz:
  - question: "Vì sao một server Node.js một luồng vẫn phục vụ được nhiều người cùng lúc?"
    options: ["Vì Node.js tự tạo một luồng mới cho mỗi người dùng", "Vì các thao tác chờ (đọc file, gọi CSDL, mạng) không chặn luồng chính; Node.js làm việc khác trong lúc chờ", "Vì Node.js chạy nhanh hơn mọi ngôn ngữ khác", "Vì trình duyệt xử lý giúp server"]
    answer: 1
    explain: "Node.js giao các việc I/O cho hệ điều hành/thư viện nền, còn luồng chính tiếp tục xử lý yêu cầu khác; khi kết quả có, callback được đưa vào hàng đợi."
  - question: "Đoạn console.log('A'); setTimeout(() => console.log('B'), 0); console.log('C'); in ra theo thứ tự nào?"
    options: ["A B C", "A C B", "B A C", "C B A"]
    answer: 1
    explain: "Callback của setTimeout chỉ chạy sau khi toàn bộ code đồng bộ hiện tại (A, C) chạy xong, kể cả khi thời gian chờ là 0."
  - question: "Điều gì xảy ra nếu một route chạy vòng lặp tính toán nặng 5 giây?"
    options: ["Chỉ người gọi route đó phải chờ", "Toàn bộ server bị đứng, mọi người dùng khác đều phải chờ", "Node.js tự chuyển việc đó sang luồng khác", "Không ảnh hưởng gì"]
    answer: 1
    explain: "Tính toán đồng bộ chiếm luồng chính nên vòng lặp sự kiện không xử lý được yêu cầu nào khác trong lúc đó."
  - question: "Khi dùng await với fs.promises.readFile, hàm chứa nó phải là gì?"
    options: ["Hàm mũi tên", "Hàm async", "Hàm có tên", "Hàm không có tham số"]
    answer: 1
    explain: "await chỉ dùng được trong hàm async (hoặc ở cấp cao nhất của ES module)."
---

## Giải thích khái niệm

### Node.js là gì?

**Node.js** là môi trường chạy JavaScript bên ngoài trình duyệt. Nó dùng **V8**, bộ máy (engine) JavaScript của Chrome, và bổ sung các khả năng mà trình duyệt không có: đọc ghi file, mở cổng mạng, chạy lệnh hệ thống. Nhờ đó, cùng một ngôn ngữ, bạn viết được cả giao diện lẫn phần **server** (máy chủ) xử lý dữ liệu, đăng nhập, thanh toán. Chính website Cnow cũng chạy trên Node.js.

### Bồi bàn một mình phục vụ cả nhà hàng

Hãy hình dung hai nhà hàng. Nhà hàng thứ nhất giao **mỗi bàn một bồi bàn**: bồi bàn nhận món, đứng chờ ở bếp cho tới khi món xong mới quay ra. Khách đông thì phải thuê thêm rất nhiều người, và phần lớn thời gian họ chỉ… đứng chờ.

Nhà hàng thứ hai chỉ có **một bồi bàn rất nhanh nhẹn**. Anh ta nhận món bàn 1, đưa phiếu vào bếp, **không đứng chờ** mà đi nhận món bàn 2, bàn 3. Khi bếp rung chuông báo món của bàn 1 xong, anh ta mang ra. Node.js hoạt động như nhà hàng thứ hai:

- **Một luồng chính** (single thread) chạy code JavaScript của bạn.
- Những việc **phải chờ** như đọc file, truy vấn cơ sở dữ liệu, gọi mạng (gọi chung là I/O – nhập/xuất) được giao cho "nhà bếp" là hệ điều hành và thư viện nền. Đây là cơ chế **bất đồng bộ, không chặn** (asynchronous, non-blocking).
- Khi việc chờ hoàn thành, một **callback** (hàm gọi lại) được xếp vào hàng đợi. **Vòng lặp sự kiện** (event loop) liên tục lấy việc trong hàng đợi ra chạy mỗi khi luồng chính rảnh.

Vì server web phần lớn thời gian là **chờ** (chờ CSDL, chờ mạng), mô hình này phục vụ được rất nhiều kết nối với ít tài nguyên.

### Điểm yếu: đừng bắt bồi bàn nấu ăn

Nếu bồi bàn duy nhất ấy tự vào bếp **nấu một món mất 10 phút**, cả nhà hàng đứng im. Trong Node.js cũng vậy: một đoạn **tính toán đồng bộ nặng** (vòng lặp hàng tỉ lần, nén ảnh lớn, mã hóa phức tạp chạy đồng bộ) sẽ chặn vòng lặp sự kiện, mọi người dùng khác phải chờ. Quy tắc: không chạy việc nặng đồng bộ trong route; dùng phiên bản bất đồng bộ của thư viện, hoặc chuyển sang tiến trình/luồng riêng (worker).

### Promise và async/await

Callback lồng nhiều tầng rất khó đọc. JavaScript hiện đại dùng **Promise** (lời hứa): một đối tượng đại diện cho kết quả **sẽ có trong tương lai**. Từ khóa `await` đặt trước một Promise sẽ "tạm dừng" hàm hiện tại cho tới khi có kết quả, trong lúc đó vòng lặp sự kiện vẫn chạy việc khác. Hàm có dùng `await` phải được khai báo `async`. Lỗi của Promise được bắt bằng `try...catch` quen thuộc.

Hầu hết module có sẵn của Node.js đều có phiên bản Promise, ví dụ `fs/promises` cho thao tác file.

## Code mẫu có chú thích

Thứ tự chạy trong vòng lặp sự kiện:

```js
console.log('1. Code đồng bộ chạy trước');

setTimeout(() => console.log('5. setTimeout: hàng đợi timer'), 0);
Promise.resolve().then(() => console.log('4. Promise: hàng đợi microtask'));
process.nextTick(() => console.log('3. process.nextTick: chạy ngay sau code đồng bộ'));

console.log('2. Vẫn là code đồng bộ');
```

```text output
1. Code đồng bộ chạy trước
2. Vẫn là code đồng bộ
3. process.nextTick: chạy ngay sau code đồng bộ
4. Promise: hàng đợi microtask
5. setTimeout: hàng đợi timer
```

Dù `setTimeout` đặt 0 mili giây, callback của nó vẫn chờ toàn bộ code đồng bộ và các microtask (Promise) chạy xong. Bạn không cần thuộc lòng mọi hàng đợi, chỉ cần nhớ: **code đồng bộ luôn chạy hết trước, callback bất đồng bộ chạy sau**.

Đọc ghi file bất đồng bộ với `async/await`:

```js
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

async function main() {
  // Ghi vào thư mục tạm của hệ điều hành để ví dụ chạy được ở mọi máy
  const file = path.join(os.tmpdir(), 'cnow-ghi-chu.txt');
  await fs.writeFile(file, 'Dòng 1: học Node.js\nDòng 2: học Express\n', 'utf8');

  const noiDung = await fs.readFile(file, 'utf8');   // chờ đọc xong, không chặn luồng chính
  const dong = noiDung.trim().split('\n');
  console.log(`Có ${dong.length} dòng`);
  console.log(dong[1]);

  try {
    await fs.readFile(path.join(os.tmpdir(), 'khong-ton-tai-123.txt'), 'utf8');
  } catch (err) {
    console.log('Lỗi bắt được:', err.code);           // ENOENT: không tìm thấy file
  }
  await fs.unlink(file);                              // dọn dẹp
}

main();
```

```text output
Có 2 dòng
Dòng 2: học Express
Lỗi bắt được: ENOENT
```

Một HTTP server tối giản chỉ bằng module có sẵn `http`:

```js server
const http = require('http');

const server = http.createServer((req, res) => {
  // Hàm này chạy cho MỖI yêu cầu gửi tới server
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Xin chào từ Node.js!');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Không tìm thấy trang');
  }
});

const PORT = process.env.PORT || 3000;   // đọc cổng từ biến môi trường, mặc định 3000
server.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));
```

Chạy `node server.js` rồi mở trình duyệt vào địa chỉ đã in. Nhấn Ctrl + C để tắt server. Viết server bằng `http` thuần khá vất vả khi ứng dụng lớn dần: phải tự tách URL, tự đọc dữ liệu gửi lên. Từ bài "Express routing", bạn sẽ dùng **Express** để làm việc này gọn hơn.

### process: thông tin về tiến trình

Đối tượng toàn cục `process` cho biết thông tin về chương trình đang chạy: `process.env` chứa **biến môi trường** (environment variable) như cổng, chuỗi kết nối CSDL, khóa bí mật; `process.argv` chứa các tham số dòng lệnh. Quy tắc quan trọng: **không viết mật khẩu, khóa bí mật thẳng vào code**; đọc chúng từ biến môi trường (thường qua file `.env` không được đưa lên Git).

## Lỗi hay gặp

**1. Quên `await`.** Gọi `fs.readFile(...)` (bản Promise) mà không `await` thì bạn nhận về một Promise đang chờ, không phải nội dung file:

```js
const fs = require('fs/promises');
async function sai() {
  const noiDung = fs.readFile(__filename, 'utf8'); // thiếu await
  console.log(typeof noiDung, noiDung instanceof Promise);
}
sai();
```

```text output
object true
```

**2. Dùng `await` ngoài hàm `async`.** Trong file CommonJS (dùng `require`), `await` ở cấp cao nhất là lỗi cú pháp. Bọc code trong một hàm `async function main() {}` rồi gọi `main()`.

**3. Cổng đã bị dùng.** Lỗi `EADDRINUSE` nghĩa là một chương trình khác (có khi chính server cũ của bạn chưa tắt) đang giữ cổng đó. Tắt chương trình cũ hoặc đổi biến `PORT`.

**4. Không bắt lỗi của Promise.** Một Promise bị từ chối mà không ai `catch` sẽ làm Node.js in cảnh báo và có thể dừng chương trình. Luôn bọc `await` trong `try...catch` ở những chỗ có thể lỗi (file không tồn tại, mất kết nối CSDL).

## Bài tập thực hành

**Bài 1.** Viết chương trình tạo file `diem.txt` trong thư mục tạm chứa các dòng `An,8`, `Binh,6`, `Chi,9`; sau đó đọc lại file và in ra điểm trung bình, cuối cùng xóa file.

**Bài 2.** Sửa server `http` ở trên: thêm đường dẫn `/gio` trả về giờ hiện tại của server dạng văn bản.

Gợi ý bài 1: `split('\n')` để lấy từng dòng, `split(',')` để tách tên và điểm, nhớ `Number()` trước khi cộng.

<details>
<summary>Xem lời giải</summary>

```js
// Bài 1
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

async function main() {
  const file = path.join(os.tmpdir(), 'cnow-diem.txt');
  await fs.writeFile(file, 'An,8\nBinh,6\nChi,9\n');
  const dong = (await fs.readFile(file, 'utf8')).trim().split('\n');
  const diem = dong.map((d) => Number(d.split(',')[1]));
  console.log('Trung bình:', diem.reduce((t, x) => t + x, 0) / diem.length);
  await fs.unlink(file);
}
main();
```

```text output
Trung bình: 7.666666666666667
```

```js server
// Bài 2
const http = require('http');
http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (req.url === '/gio') return res.end(new Date().toLocaleTimeString('vi-VN'));
  if (req.url === '/') return res.end('Xin chào! Thử vào /gio');
  res.statusCode = 404;
  res.end('Không tìm thấy');
}).listen(process.env.PORT || 3000);
```

</details>

## Tóm tắt

- Node.js chạy JavaScript ngoài trình duyệt, có thêm khả năng file, mạng, tiến trình.
- Một luồng chính + I/O bất đồng bộ + vòng lặp sự kiện: phục vụ nhiều kết nối với ít tài nguyên.
- Không chạy tính toán nặng đồng bộ trong server, vì nó chặn mọi người dùng.
- Dùng Promise với `async/await`, bắt lỗi bằng `try...catch`; module `fs/promises` cho file.
- Đọc cấu hình, bí mật từ `process.env`, không viết thẳng vào code.

## Đọc thêm

- [Giới thiệu Node.js – nodejs.org](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
- [Vòng lặp sự kiện, timer và nextTick – nodejs.org](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Module fs – nodejs.org](https://nodejs.org/api/fs.html)
