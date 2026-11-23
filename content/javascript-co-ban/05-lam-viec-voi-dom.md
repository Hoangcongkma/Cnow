---
title: "Làm việc với DOM"
minutes: 17
preview: false
objectives:
  - "Hiểu DOM (Document Object Model) là cây đối tượng biểu diễn trang HTML"
  - "Chọn phần tử bằng querySelector và querySelectorAll"
  - "Thay đổi nội dung, thuộc tính và class của phần tử một cách an toàn"
  - "Tạo, chèn và xóa phần tử để hiển thị dữ liệu từ mảng"
quiz:
  - question: "document.querySelector('.the') trả về gì khi trang có 3 phần tử class 'the'?"
    options: ["Cả 3 phần tử", "Phần tử đầu tiên", "Phần tử cuối cùng", "Số 3"]
    answer: 1
    explain: "querySelector trả về phần tử đầu tiên khớp (hoặc null); querySelectorAll trả về danh sách mọi phần tử."
  - question: "Để hiển thị tên người dùng nhập vào, nên dùng gì để tránh bị chèn mã độc?"
    options: ["innerHTML", "textContent", "document.write", "outerHTML"]
    answer: 1
    explain: "textContent luôn coi dữ liệu là chữ thuần; innerHTML diễn giải HTML nên có thể chạy mã độc (lỗ hổng XSS)."
  - question: "Cách nào thêm class 'an' vào phần tử mà không xóa các class đang có?"
    options: ["el.className = 'an'", "el.classList.add('an')", "el.class = 'an'", "el.style = 'an'"]
    answer: 1
    explain: "classList.add/remove/toggle chỉ tác động đúng class đó; gán className sẽ thay toàn bộ."
  - question: "Thuộc tính data-gia=\"150000\" trên thẻ HTML được đọc trong JavaScript thế nào?"
    options: ["el.data.gia", "el.dataset.gia", "el.getData('gia')", "el.gia"]
    answer: 1
    explain: "Các thuộc tính data-* nằm trong el.dataset; giá trị luôn là chuỗi."
---

## Giải thích khái niệm

### DOM: trang web dưới con mắt của JavaScript

Khi trình duyệt đọc file HTML, nó không giữ nguyên đoạn chữ đó mà dựng lên một **cây đối tượng** trong bộ nhớ, gọi là **DOM** (Document Object Model – mô hình đối tượng tài liệu). Mỗi thẻ trở thành một **nút** (node) trong cây: `<html>` là gốc, `<head>` và `<body>` là hai nhánh, các thẻ bên trong là nhánh con.

Hãy hình dung một cây gia phả: ông bà, cha mẹ, con cháu. JavaScript có thể leo lên cây, tìm một người cụ thể, đổi tên họ, thêm con mới hay xóa một nhánh. Mỗi thay đổi trên DOM được trình duyệt **vẽ lại ngay** lên màn hình. Đó chính là cách các trang web hiện đại cập nhật giao diện mà không cần tải lại.

Điểm vào của cây là đối tượng `document`, có sẵn trong mọi trang. Nhớ rằng DOM chỉ có trong trình duyệt; code bài này đặt trong `app.js` được nạp bằng `<script src="app.js" defer>`.

### Chọn phần tử

Hai phương thức bạn cần nhớ nhất, dùng đúng cú pháp **selector của CSS** đã học:

- `document.querySelector(selector)`: phần tử **đầu tiên** khớp, hoặc `null` nếu không có.
- `document.querySelectorAll(selector)`: **danh sách** (NodeList) mọi phần tử khớp, duyệt được bằng `for...of` hoặc `forEach`.

Phương thức cũ hơn như `getElementById` vẫn dùng được, nhưng `querySelector` linh hoạt hơn vì nhận mọi loại selector. Bạn cũng có thể gọi `querySelector` trên một phần tử để chỉ tìm **bên trong** nó.

### Thay đổi nội dung: textContent và innerHTML

- `el.textContent = '...'`: đặt nội dung **chữ thuần**. Mọi ký tự `<`, `>` hiển thị đúng như chữ.
- `el.innerHTML = '...'`: đặt nội dung **là HTML**, trình duyệt sẽ phân tích và tạo phần tử.

Quy tắc an toàn cực kỳ quan trọng: **không bao giờ đưa dữ liệu do người dùng nhập vào `innerHTML`**. Nếu ai đó nhập `<img src=x onerror="...">` làm tên, trình duyệt sẽ tạo thẻ ảnh và chạy đoạn mã đó. Đây là lỗ hổng **XSS** (Cross-Site Scripting – chèn mã độc), một trong những lỗi bảo mật web phổ biến nhất. Với dữ liệu người dùng, luôn dùng `textContent`, hoặc tạo phần tử bằng `createElement` như phần dưới.

### Thuộc tính, class và style

- Thuộc tính chuẩn đọc ghi trực tiếp: `img.src`, `a.href`, `input.value`, `button.disabled`.
- Thuộc tính tùy ý: `setAttribute('aria-label', '...')`, `getAttribute(...)`.
- Dữ liệu riêng: thuộc tính `data-*` trong HTML, đọc qua `el.dataset`. Ví dụ `data-ma-sp="A1"` thành `el.dataset.maSp`.
- **Class**: `el.classList.add('x')`, `remove('x')`, `toggle('x')`, `contains('x')`.

Thay vì đổi từng thuộc tính `style` bằng JavaScript, cách tốt hơn là định nghĩa sẵn class trong CSS (ví dụ `.an { display: none; }`) rồi chỉ **bật tắt class**. Giao diện vẫn nằm trong CSS, JavaScript chỉ đổi trạng thái.

### Tạo và xóa phần tử

- `document.createElement('li')` tạo phần tử mới (chưa nằm trên trang).
- `cha.append(con)` gắn vào cuối; `cha.prepend(con)` gắn vào đầu.
- `el.remove()` xóa phần tử khỏi trang.
- `cha.replaceChildren()` xóa sạch con, hoặc thay bằng các con mới.

Một mẫu rất hay dùng: có một mảng dữ liệu, viết hàm **render** xóa nội dung cũ và vẽ lại toàn bộ danh sách từ mảng. Dữ liệu thay đổi thì gọi lại hàm render.

### Dữ liệu là nguồn, giao diện là bản vẽ

Khi trang bắt đầu có nhiều tương tác, một sai lầm phổ biến là coi DOM là nơi **lưu** dữ liệu: muốn biết giỏ hàng có gì thì đọc chữ trên các thẻ `<li>`, muốn tính tổng thì cắt chuỗi giá tiền ra để cộng. Cách làm này nhanh chóng trở nên rối và dễ sai.

Hãy làm ngược lại: giữ dữ liệu trong **biến JavaScript** (mảng, đối tượng) làm **nguồn duy nhất**, còn DOM chỉ là **bản vẽ** của dữ liệu đó. Mọi thay đổi đều sửa dữ liệu trước, rồi gọi `render()` để vẽ lại. Đây cũng chính là ý tưởng nền tảng của các thư viện giao diện như React hay Vue mà bạn có thể học sau này, nên tập thói quen ngay từ bây giờ sẽ giúp bạn rất nhiều.

## Code mẫu có chú thích

HTML của ví dụ:

```html
<h1 class="tieu-de">Cửa hàng</h1>
<p class="trang-thai" hidden>Đang tải...</p>
<ul class="danh-sach"></ul>
<p>Tổng: <b class="tong"></b></p>
```

`app.js` hiển thị danh sách sản phẩm từ một mảng:

```js dom
'use strict';

const sanPham = [
  { ma: 'A1', ten: 'Áo thun <cotton>', gia: 150000 }, // dấu < > sẽ hiển thị đúng nhờ textContent
  { ma: 'B2', ten: 'Mũ lưỡi trai', gia: 90000 },
];

const ds = document.querySelector('.danh-sach');
const tong = document.querySelector('.tong');
const dinhDang = (so) => so.toLocaleString('vi-VN') + ' đ';

function render() {
  ds.replaceChildren();                       // xóa nội dung cũ
  for (const sp of sanPham) {
    const li = document.createElement('li');
    li.dataset.ma = sp.ma;                    // lưu mã để dùng sau (ví dụ khi bấm xóa)
    li.textContent = `${sp.ten} – ${dinhDang(sp.gia)}`;
    if (sp.gia < 100000) li.classList.add('gia-tot');
    ds.append(li);
  }
  tong.textContent = dinhDang(sanPham.reduce((t, sp) => t + sp.gia, 0));
}

render();
document.querySelector('.tieu-de').textContent = `Cửa hàng (${sanPham.length} sản phẩm)`;
console.log(ds.children.length, 'mục đã hiển thị;', tong.textContent);
```

Duyệt nhiều phần tử và bật tắt class:

```js dom
// Ẩn mọi đoạn có class "goi-y" bằng cách thêm class "an" (định nghĩa trong CSS: .an { display: none; })
for (const p of document.querySelectorAll('.goi-y')) {
  p.classList.add('an');
}

// Đánh dấu liên kết đang ở trang hiện tại, kèm thuộc tính trợ năng
const lienKet = document.querySelector('nav a.trang-chu');
lienKet.classList.toggle('dang-chon', true);
lienKet.setAttribute('aria-current', 'page');
console.log(lienKet.getAttribute('aria-current'));
```

## Lỗi hay gặp

**1. Phần tử là `null`.** `document.querySelector('.danhsach')` (thiếu gạch nối) trả về `null`, dòng sau báo `Cannot read properties of null`. Kiểm tra lại selector trong tab Elements, và chắc chắn script có `defer`.

**2. Dùng `innerHTML` với dữ liệu người dùng.** Như đã giải thích, đây là cửa ngõ của XSS. So sánh:

```js dom
const tenNguoiDung = '<img src=x onerror="alert(1)">';
const o = document.querySelector('.loi-chao');
o.textContent = `Xin chào ${tenNguoiDung}`;   // an toàn: hiển thị nguyên văn
// o.innerHTML = `Xin chào ${tenNguoiDung}`;  // NGUY HIỂM: trình duyệt sẽ chạy onerror
console.log(o.textContent);
```

**3. Gọi phương thức mảng trên NodeList.** `querySelectorAll` trả về NodeList: có `forEach` nhưng **không có** `map`, `filter`. Chuyển sang mảng bằng `[...danhSach]` hoặc `Array.from(danhSach)` trước.

**4. Gán `className` làm mất class cũ.** `el.className = 'an'` xóa mọi class khác của phần tử. Dùng `classList.add`.

## Bài tập thực hành

Trang có `<ul class="viec">` rỗng và `<p class="dem"></p>`. Cho mảng `const viec = [{ ten: 'Học DOM', xong: true }, { ten: 'Làm bài tập', xong: false }]`. Viết hàm `render()` hiển thị mỗi việc thành một `<li>`, việc đã xong có class `xong`, và đoạn `.dem` ghi `Đã xong 1/2 việc`. Sau đó thêm một việc mới vào mảng và gọi lại `render()`.

Gợi ý: đếm việc xong bằng `filter(v => v.xong).length`.

<details>
<summary>Xem lời giải</summary>

```js dom
const viec = [{ ten: 'Học DOM', xong: true }, { ten: 'Làm bài tập', xong: false }];
const ul = document.querySelector('.viec');
const dem = document.querySelector('.dem');

function render() {
  ul.replaceChildren();
  for (const v of viec) {
    const li = document.createElement('li');
    li.textContent = v.ten;
    li.classList.toggle('xong', v.xong);
    ul.append(li);
  }
  dem.textContent = `Đã xong ${viec.filter((v) => v.xong).length}/${viec.length} việc`;
}

render();
viec.push({ ten: 'Ôn tập', xong: false });
render();
console.log(dem.textContent);
```

</details>

## Tóm tắt

- DOM là cây đối tượng của trang; thay đổi DOM thì trình duyệt vẽ lại ngay.
- `querySelector` lấy phần tử đầu tiên, `querySelectorAll` lấy tất cả (NodeList).
- Dùng `textContent` cho dữ liệu người dùng; `innerHTML` với dữ liệu không tin cậy gây XSS.
- `classList`, `dataset`, `setAttribute` để đổi trạng thái; giao diện để trong CSS.
- `createElement`, `append`, `remove`, `replaceChildren` cùng hàm `render()` để hiển thị dữ liệu từ mảng.

## Đọc thêm

- [Giới thiệu DOM – MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction)
- [querySelector – MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector)
- [textContent – MDN](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)
