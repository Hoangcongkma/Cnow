---
title: "Responsive design"
minutes: 16
preview: false
objectives:
  - "Hiểu responsive design: một trang hiển thị tốt trên mọi kích thước màn hình"
  - "Khai báo thẻ meta viewport và dùng đơn vị tương đối (%, rem, vw)"
  - "Viết media query theo hướng mobile-first với min-width"
  - "Kiểm tra giao diện bằng chế độ thiết bị của DevTools"
quiz:
  - question: "Thiếu thẻ <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> thì điện thoại hiển thị trang thế nào?"
    options: ["Bình thường", "Thu nhỏ cả trang như màn hình máy tính, chữ rất bé", "Không hiển thị gì", "Tự chuyển sang chế độ tối"]
    answer: 1
    explain: "Không có viewport, trình duyệt di động giả định màn hình rộng khoảng 980px rồi thu nhỏ trang lại."
  - question: "Trong cách làm mobile-first, media query thường dùng điều kiện nào?"
    options: ["max-width", "min-width", "orientation: portrait", "print"]
    answer: 1
    explain: "Viết CSS cho màn hình nhỏ trước, rồi dùng @media (min-width: ...) để bổ sung khi màn hình rộng hơn."
  - question: "1rem bằng bao nhiêu?"
    options: ["1% chiều rộng màn hình", "Cỡ chữ của phần tử gốc html (thường 16px)", "Cỡ chữ của phần tử cha", "Luôn luôn 10px"]
    answer: 1
    explain: "rem tính theo cỡ chữ của phần tử gốc; em mới tính theo phần tử hiện tại/cha."
  - question: "Quy tắc nào giúp ảnh không bao giờ tràn ra ngoài khung chứa?"
    options: ["img { width: 1000px }", "img { max-width: 100%; height: auto }", "img { overflow: hidden }", "img { display: none }"]
    answer: 1
    explain: "max-width: 100% giới hạn ảnh không rộng hơn cha; height: auto giữ đúng tỉ lệ."
---

## Giải thích khái niệm

### Một trang, nhiều kích thước màn hình

Ngày nay, phần lớn người dùng truy cập web bằng điện thoại. Cùng một trang có thể được mở trên điện thoại rộng 360px, máy tính bảng 800px, laptop 1440px hay màn hình lớn 2560px. **Responsive design** (thiết kế đáp ứng) là cách làm để **một** trang web tự điều chỉnh bố cục cho vừa mọi màn hình, thay vì làm riêng một trang cho điện thoại.

Hãy nghĩ đến nước: đổ vào cốc thì có hình cốc, đổ vào bát thì có hình bát. Trang responsive cũng "chảy" theo hình dạng của màn hình. Ba trụ cột của nó là: **bố cục linh hoạt** (dùng đơn vị tương đối, Flexbox, Grid), **ảnh linh hoạt**, và **media query** để thay đổi bố cục tại những điểm cần thiết.

### Thẻ meta viewport: điều kiện bắt buộc

Nếu thiếu thẻ này trong `<head>`, trình duyệt trên điện thoại sẽ giả vờ màn hình rộng khoảng 980px rồi thu nhỏ cả trang lại, chữ bé tí phải phóng to mới đọc được:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

`width=device-width` nghĩa là "chiều rộng trang bằng chiều rộng thật của thiết bị", `initial-scale=1` là không phóng to thu nhỏ lúc đầu. Đây là dòng đầu tiên bạn kiểm tra khi trang trông lạ trên điện thoại.

### Đơn vị tương đối

Đơn vị `px` cố định không đổi theo màn hình. Các đơn vị tương đối giúp giao diện co giãn tự nhiên:

| Đơn vị | Tính theo | Dùng cho |
|---|---|---|
| `%` | kích thước phần tử cha | chiều rộng khối, cột |
| `rem` | cỡ chữ gốc của trang (thường 16px) | cỡ chữ, khoảng cách |
| `em` | cỡ chữ của chính phần tử | padding của nút theo cỡ chữ nút |
| `vw` / `vh` | 1% chiều rộng / chiều cao màn hình | phần hero cao bằng màn hình |

Dùng `rem` cho cỡ chữ còn có lợi cho trợ năng: người dùng chỉnh cỡ chữ mặc định của trình duyệt lớn hơn thì cả trang lớn theo. Hàm `clamp(min, ưu-tiên, max)` cho phép cỡ chữ co giãn theo màn hình nhưng không nhỏ quá hay to quá, ví dụ `font-size: clamp(1.75rem, 5vw, 3rem)`.

### Media query

**Media query** là "câu điều kiện" của CSS: chỉ áp dụng các quy tắc bên trong khi màn hình thỏa điều kiện.

```css
@media (min-width: 768px) {
  /* chỉ áp dụng khi màn hình rộng từ 768px trở lên */
}
```

Điểm chuyển bố cục gọi là **breakpoint**. Đừng chọn breakpoint theo tên thiết bị cụ thể ("iPhone", "iPad"), vì thiết bị thay đổi liên tục. Hãy kéo hẹp cửa sổ trình duyệt dần dần, thấy bố cục bắt đầu "vỡ" ở đâu thì đặt breakpoint ở đó.

### Mobile-first

**Mobile-first** nghĩa là viết CSS cho màn hình nhỏ **trước**, làm mặc định; sau đó dùng `min-width` để bổ sung cho màn hình lớn hơn. Lợi ích: CSS cho điện thoại gọn nhẹ (thường chỉ một cột, ít quy tắc), và mỗi media query chỉ việc **thêm** chứ không phải gỡ bỏ những gì đã viết. Cách ngược lại (desktop-first với `max-width`) vẫn dùng được, nhưng dễ dẫn đến nhiều quy tắc ghi đè chồng chéo.

## Code mẫu có chú thích

Một trang danh sách khóa học: điện thoại 1 cột, máy tính bảng 2 cột, máy tính 3 cột kèm thanh bên.

```html
<div class="bo-cuc">
  <aside class="thanh-ben">Bộ lọc</aside>
  <main class="luoi-khoa-hoc">
    <article class="the">HTML cơ bản</article>
    <article class="the">CSS nâng cao</article>
    <article class="the">JavaScript</article>
  </main>
</div>
```

```css
/* ----- Mặc định: điện thoại (mobile-first) ----- */
html { font-size: 100%; }              /* tôn trọng cỡ chữ người dùng chọn */
img { max-width: 100%; height: auto; } /* ảnh không bao giờ tràn khung */

.bo-cuc {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.luoi-khoa-hoc {
  display: grid;
  grid-template-columns: 1fr;          /* một cột */
  gap: 1rem;
}

h1 { font-size: clamp(1.75rem, 5vw, 3rem); }

/* ----- Máy tính bảng ----- */
@media (min-width: 640px) {
  .luoi-khoa-hoc { grid-template-columns: repeat(2, 1fr); }
}

/* ----- Máy tính: thêm thanh bên ----- */
@media (min-width: 1024px) {
  .bo-cuc {
    grid-template-columns: 240px 1fr;
    max-width: 1200px;                 /* không giãn vô hạn trên màn hình rất rộng */
    margin: 0 auto;
  }
  .luoi-khoa-hoc { grid-template-columns: repeat(3, 1fr); }
}
```

Để ý: trên điện thoại, `.thanh-ben` tự nằm phía trên lưới khóa học vì `.bo-cuc` chỉ có một cột. Không cần quy tắc ẩn hiện nào.

### Bảng rộng và menu trên điện thoại

Bảng dữ liệu nhiều cột thường không vừa màn hình hẹp. Cách đơn giản và an toàn là bọc bảng trong một khối cho phép **cuộn ngang** riêng, thay vì để cả trang bị cuộn:

```css
.bang-cuon {
  overflow-x: auto;   /* bảng rộng thì cuộn ngang trong khung này */
}
```

Với thanh menu nhiều mục, cách phổ biến trên điện thoại là thu gọn thành nút "☰" (menu hamburger) bấm để mở; phần bấm mở cần một chút JavaScript và sẽ được học ở khóa JavaScript.

### Kiểm tra bằng DevTools

Mở DevTools, bấm biểu tượng điện thoại/máy tính bảng (**Toggle device toolbar**, phím tắt Ctrl + Shift + M). Bạn có thể chọn kích thước có sẵn hoặc kéo thả để thay đổi độ rộng, quan sát bố cục đổi ở các breakpoint. Dù vậy, hãy thử trên điện thoại thật khi có thể, vì cảm giác chạm và cỡ chữ thực tế khác với giả lập.

## Lỗi hay gặp

**1. Quên thẻ meta viewport.** Media query viết đúng mà điện thoại vẫn hiển thị như máy tính thu nhỏ: gần như chắc chắn thiếu thẻ viewport.

**2. Đặt chiều rộng cố định bằng px.** `width: 1200px` cho một khối khiến trang có thanh cuộn ngang trên điện thoại. Dùng `max-width: 1200px` kết hợp `width: 100%` (mặc định của khối) để khối co lại khi màn hình hẹp.

**3. Thứ tự media query sai.** Với mobile-first, các khối `@media (min-width: ...)` phải xếp **từ nhỏ đến lớn**. Nếu đặt 1024px trước 640px, quy tắc 640px viết sau sẽ ghi đè lên quy tắc của màn hình lớn.

**4. Viết sai cú pháp media query.** Điều kiện phải nằm trong ngoặc tròn và có đơn vị: `@media (min-width: 768px)`. Viết `@media min-width: 768px` hoặc quên đóng ngoặc nhọn khiến cả khối bị bỏ qua:

```css error
@media (min-width: 768px) {
  .luoi { grid-template-columns: 1fr 1fr; }
```

## Bài tập thực hành

Lấy trang "gói cước" ở bài Selector và box model (hoặc tự làm 3 thẻ mới) và làm cho nó responsive: điện thoại 1 cột, từ 600px là 2 cột, từ 960px là 3 cột. Tiêu đề trang dùng `clamp()` để co giãn. Toàn bộ nội dung không rộng quá 1100px và được căn giữa.

Gợi ý: dùng Grid cho khu vực chứa thẻ; bỏ `width` cố định của từng thẻ để thẻ co giãn theo cột.

<details>
<summary>Xem lời giải</summary>

```css
* { box-sizing: border-box; }
.trang {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1rem;
}
h1 { font-size: clamp(1.6rem, 4vw, 2.6rem); }
.cac-goi {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 600px) {
  .cac-goi { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 960px) {
  .cac-goi { grid-template-columns: repeat(3, 1fr); }
}
.goi { padding: 1.25rem; border: 2px solid #e5e7eb; border-radius: 14px; }
```

</details>

## Tóm tắt

- Responsive design: một trang tự thích ứng với mọi màn hình nhờ bố cục linh hoạt, ảnh linh hoạt và media query.
- Luôn có `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- Ưu tiên đơn vị tương đối: `%`, `rem`, `vw`, `clamp()`; ảnh dùng `max-width: 100%`.
- Mobile-first: CSS mặc định cho điện thoại, bổ sung bằng `@media (min-width: …)` xếp từ nhỏ đến lớn.
- Chọn breakpoint theo nội dung, kiểm tra bằng chế độ thiết bị của DevTools và điện thoại thật.

## Đọc thêm

- [Responsive design – MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- [Sử dụng media query – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries)
- [Thẻ meta viewport – MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport)
