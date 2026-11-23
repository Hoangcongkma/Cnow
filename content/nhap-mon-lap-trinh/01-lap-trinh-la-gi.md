---
title: "Lập trình là gì?"
minutes: 12
preview: true
objectives:
  - "Hiểu chương trình máy tính là một dãy chỉ dẫn được thực hiện theo thứ tự"
  - "Phân biệt ngôn ngữ lập trình, mã nguồn (source code) và trình chạy (runtime)"
  - "Cài Node.js và chạy được chương trình JavaScript đầu tiên trong terminal"
  - "Biết cách đọc thông báo lỗi thay vì sợ nó"
quiz:
  - question: "Chương trình máy tính giống nhất với thứ nào dưới đây?"
    options: ["Một bức tranh", "Một công thức nấu ăn gồm các bước theo thứ tự", "Một bài hát", "Một cuốn từ điển"]
    answer: 1
    explain: "Chương trình là dãy chỉ dẫn rõ ràng được thực hiện lần lượt, giống các bước trong công thức nấu ăn."
  - question: "Lệnh nào in dòng chữ Xin chào ra màn hình trong JavaScript?"
    options: ["print('Xin chào')", "echo 'Xin chào'", "console.log('Xin chào')", "say('Xin chào')"]
    answer: 2
    explain: "Trong JavaScript (cả trình duyệt lẫn Node.js), console.log() in giá trị ra cửa sổ console/terminal."
  - question: "Bạn lưu code trong file chao.js. Lệnh nào chạy file đó bằng Node.js?"
    options: ["run chao.js", "node chao.js", "js chao.js", "open chao.js"]
    answer: 1
    explain: "Cú pháp là node <tên-file>. Node.js đọc mã nguồn trong file và thực hiện từng câu lệnh."
  - question: "Khi gặp thông báo lỗi, việc nên làm đầu tiên là gì?"
    options: ["Xóa hết code và viết lại", "Đọc kỹ dòng thông báo, xem tên lỗi và số dòng bị lỗi", "Tắt máy rồi bật lại", "Bỏ qua và chạy tiếp"]
    answer: 1
    explain: "Thông báo lỗi cho biết loại lỗi và vị trí (tên file:số dòng). Đọc nó là cách nhanh nhất để sửa."
---

## Giải thích khái niệm

### Chương trình là một công thức nấu ăn

Hãy tưởng tượng bạn nhờ một người bạn rất chăm chỉ nhưng **không biết suy đoán** nấu giúp một nồi mì. Nếu bạn chỉ nói "nấu mì đi", người đó sẽ đứng im. Bạn phải nói thật cụ thể: đun sôi 500 ml nước, cho vắt mì vào, chờ ba phút, cho gói gia vị, tắt bếp. Người bạn ấy làm **đúng từng bước, theo đúng thứ tự**, không thêm không bớt.

Máy tính chính là người bạn đó. Nó tính toán cực nhanh nhưng không tự hiểu ý bạn. **Lập trình** (programming) là công việc viết ra những chỉ dẫn rõ ràng như vậy để máy tính làm theo. Tập hợp các chỉ dẫn đó gọi là **chương trình** (program).

### Ngôn ngữ lập trình và mã nguồn

Máy tính chỉ thực sự hiểu các con số nhị phân. Viết trực tiếp bằng số 0 và 1 thì quá vất vả, nên con người tạo ra **ngôn ngữ lập trình** (programming language): một dạng tiếng Anh rút gọn, có quy tắc chặt chẽ, để người viết dễ đọc còn máy dễ dịch. Phần chữ bạn gõ ra gọi là **mã nguồn** (source code), thường được lưu trong file văn bản như `chao.js`.

Có rất nhiều ngôn ngữ: JavaScript, Python, PHP, C, Java… Chúng giống các thứ tiếng khác nhau nhưng cùng diễn đạt những ý tưởng chung: lưu dữ liệu, so sánh, lặp lại, chia nhỏ công việc. Trong khóa này, bạn dùng **JavaScript** vì nó chạy được ngay trong trình duyệt và cả trên máy tính của bạn.

### Trình chạy: ai đọc mã nguồn của bạn?

Mã nguồn chỉ là chữ. Cần có một chương trình khác đọc và thực hiện nó, gọi là **trình chạy** (runtime). Với JavaScript có hai trình chạy phổ biến:

- **Trình duyệt** (Chrome, Firefox, Edge…): chạy JavaScript trong trang web.
- **Node.js**: chạy JavaScript ngay trong cửa sổ dòng lệnh (terminal), không cần trang web.

Khóa học này dùng Node.js để bạn tập trung vào tư duy lập trình, chưa phải lo về giao diện.

### Chuẩn bị công cụ

1. Tải Node.js bản **LTS** (bản hỗ trợ lâu dài) từ trang chính thức nodejs.org và cài như phần mềm bình thường.
2. Cài một trình soạn thảo code, ví dụ Visual Studio Code.
3. Mở terminal (trên Windows có thể dùng PowerShell) và gõ `node -v`. Nếu thấy một dòng như `v20.11.0` là bạn đã sẵn sàng.

## Code mẫu có chú thích

Tạo file `chao.js` với nội dung sau:

```js
// Dòng bắt đầu bằng // là chú thích (comment): máy bỏ qua, chỉ để người đọc hiểu.
console.log('Xin chào, Cnow!'); // in một dòng chữ ra màn hình
console.log('Hôm nay mình bắt đầu học lập trình.');
console.log(2 + 3); // máy tính phép cộng rồi mới in kết quả
```

Mở terminal tại thư mục chứa file và chạy `node chao.js`. Kết quả:

```text output
Xin chào, Cnow!
Hôm nay mình bắt đầu học lập trình.
5
```

Để ý ba điều. Thứ nhất, các lệnh chạy **từ trên xuống dưới**, đúng thứ tự bạn viết. Thứ hai, chữ phải đặt trong dấu nháy `'...'`, còn phép tính thì không. Thứ ba, `2 + 3` được tính thành `5` trước khi in.

Ví dụ thứ hai mô phỏng "công thức nấu mì" ở trên:

```js
// Mỗi bước là một câu lệnh, máy làm lần lượt
console.log('Bước 1: Đun sôi 500 ml nước');
console.log('Bước 2: Cho vắt mì vào nồi');
console.log('Bước 3: Chờ ' + 3 + ' phút'); // dấu + nối chữ với số
console.log('Bước 4: Cho gia vị, tắt bếp');
```

```text output
Bước 1: Đun sôi 500 ml nước
Bước 2: Cho vắt mì vào nồi
Bước 3: Chờ 3 phút
Bước 4: Cho gia vị, tắt bếp
```

Khi dấu `+` đứng giữa một chuỗi chữ và một con số, JavaScript **nối** chúng thành chuỗi mới thay vì cộng.

## Lỗi hay gặp

Lỗi là chuyện bình thường, kể cả với lập trình viên nhiều năm kinh nghiệm. Quan trọng là đọc được nó.

**1. Gõ sai tên lệnh.** Máy không đoán được ý bạn:

```js error
console.lg('Xin chào'); // thiếu chữ "o" trong log
```

Node.js báo `TypeError: console.lg is not a function`, nghĩa là "console.lg không phải là một hàm". Thông báo luôn kèm tên file và số dòng, ví dụ `chao.js:1`, giúp bạn biết cần sửa ở đâu.

**2. Quên đóng dấu nháy.** Viết `console.log('Xin chào);` sẽ gây lỗi cú pháp (SyntaxError) vì máy không biết chuỗi chữ kết thúc ở đâu. Cặp dấu nháy, cặp ngoặc tròn luôn phải **có mở có đóng**.

**3. Chạy sai thư mục.** Lỗi `Cannot find module '...chao.js'` thường không phải do code mà do terminal đang đứng ở thư mục khác. Dùng lệnh `cd` để di chuyển đến đúng thư mục chứa file rồi chạy lại.

**4. Dùng dấu nháy "thông minh".** Khi chép code từ phần mềm soạn văn bản, dấu `'` có thể bị đổi thành dấu nháy cong. Hãy luôn gõ code trong trình soạn thảo code.

## Bài tập thực hành

**Bài 1.** Viết chương trình `gioi-thieu.js` in ra ba dòng: tên của bạn, thành phố bạn sống và lý do bạn học lập trình.

**Bài 2.** In ra kết quả của phép tính "một năm có bao nhiêu giờ" (365 ngày, mỗi ngày 24 giờ) theo dạng: `Một năm có 8760 giờ`.

Gợi ý: phép nhân dùng dấu `*`. Hãy để máy tự tính, đừng tính nhẩm rồi gõ số vào.

<details>
<summary>Xem lời giải</summary>

```js
// Bài 1
console.log('Tên: Minh An');
console.log('Thành phố: Đà Nẵng');
console.log('Mình học lập trình để tự làm một trang web bán hàng.');

// Bài 2: dùng dấu ngoặc để phép nhân được tính trước rồi mới nối chuỗi
console.log('Một năm có ' + (365 * 24) + ' giờ');
```

```text output
Tên: Minh An
Thành phố: Đà Nẵng
Mình học lập trình để tự làm một trang web bán hàng.
Một năm có 8760 giờ
```

</details>

## Tóm tắt

- Chương trình là dãy chỉ dẫn rõ ràng, máy thực hiện **lần lượt từ trên xuống**.
- Ngôn ngữ lập trình giúp con người viết chỉ dẫn dễ đọc; phần chữ đó là mã nguồn.
- Node.js là trình chạy JavaScript trong terminal: `node ten-file.js`.
- `console.log()` in giá trị ra màn hình, rất hữu ích để kiểm tra chương trình.
- Thông báo lỗi là bạn đồng hành: đọc tên lỗi và số dòng trước khi sửa.

## Đọc thêm

- [Giới thiệu JavaScript – MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction)
- [Giới thiệu Node.js – nodejs.org](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
