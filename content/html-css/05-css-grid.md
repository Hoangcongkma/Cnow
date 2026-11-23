---
title: "CSS Grid"
minutes: 16
preview: false
objectives:
  - "Hiểu lưới (grid) gồm hàng, cột, ô và đường kẻ"
  - "Chia cột bằng grid-template-columns với đơn vị fr và hàm repeat()"
  - "Cho phần tử chiếm nhiều ô bằng grid-column / grid-row"
  - "Đặt tên vùng bố cục bằng grid-template-areas và tạo lưới tự co giãn với auto-fill, minmax()"
quiz:
  - question: "grid-template-columns: 1fr 2fr chia không gian thế nào?"
    options: ["Cột 1 rộng 1px, cột 2 rộng 2px", "Cột 2 rộng gấp đôi cột 1", "Hai cột bằng nhau", "Tạo 3 cột"]
    answer: 1
    explain: "fr là một phần của không gian còn trống; 1fr 2fr chia thành 3 phần, cột 2 nhận 2 phần."
  - question: "repeat(4, 1fr) tương đương với gì?"
    options: ["4fr", "1fr 1fr 1fr 1fr", "1fr 4fr", "4 hàng bằng nhau"]
    answer: 1
    explain: "repeat(số lần, giá trị) lặp lại giá trị; ở đây tạo 4 cột bằng nhau."
  - question: "Để một ô chiếm 2 cột, viết thế nào?"
    options: ["grid-column: span 2", "colspan: 2", "width: 2fr", "grid-row: 2"]
    answer: 0
    explain: "grid-column: span 2 cho phần tử trải qua 2 cột kể từ vị trí của nó."
  - question: "Khi nào nên chọn Grid thay vì Flexbox?"
    options: ["Khi chỉ xếp một hàng nút bấm", "Khi cần bố cục hai chiều (cả hàng lẫn cột) thẳng hàng", "Khi muốn chữ đậm hơn", "Không bao giờ"]
    answer: 1
    explain: "Grid mạnh với bố cục hai chiều; Flexbox mạnh với bố cục một chiều. Hai công cụ thường dùng kết hợp."
---

## Giải thích khái niệm

### Tờ giấy kẻ ô

Hồi nhỏ, bạn có thể đã vẽ trên giấy kẻ ô vuông: mỗi hình được đặt vào đúng ô, kéo dài qua vài ô nếu cần. **CSS Grid** (bố cục lưới) đem tờ giấy đó vào trang web. Bạn kẻ trước các hàng và cột, rồi đặt phần tử vào đúng vị trí trên lưới.

Flexbox ở bài trước rất giỏi xếp đồ trên **một** kệ (một hàng hoặc một cột). Grid giỏi khi bạn cần **hai chiều cùng lúc**: các cột thẳng hàng từ trên xuống, các hàng thẳng hàng từ trái sang. Bảng điều khiển, bộ sưu tập ảnh, bố cục tổng thể của trang (đầu trang, thanh bên, nội dung, chân trang) là đất diễn của Grid.

### Thuật ngữ cơ bản

- **Grid container**: phần tử đặt `display: grid`.
- **Grid item**: con trực tiếp của container.
- **Track**: một hàng hoặc một cột.
- **Cell (ô)**: giao của một hàng và một cột.
- **Grid line (đường kẻ)**: các đường phân cách, đánh số từ 1. Lưới 3 cột có 4 đường kẻ dọc.
- **Gap**: khoảng cách giữa các hàng, cột.

### Đơn vị fr và hàm repeat()

Đơn vị **fr** (fraction – phần) là ngôi sao của Grid: nó chia **phần không gian còn lại** theo tỉ lệ. `grid-template-columns: 1fr 1fr 1fr` tạo ba cột bằng nhau; `200px 1fr` tạo một cột cố định 200px và một cột chiếm phần còn lại.

`repeat(3, 1fr)` là cách viết gọn của `1fr 1fr 1fr`. Kết hợp với `minmax(min, max)` (kích thước trong khoảng từ min đến max) và từ khóa `auto-fill`, bạn có thể tạo lưới **tự quyết định số cột** theo độ rộng màn hình mà không cần media query.

### Đặt phần tử lên lưới

Theo mặc định, mỗi item lấp lần lượt từng ô, từ trái sang phải, từ trên xuống dưới. Muốn một item chiếm nhiều ô, dùng:

- `grid-column: span 2`: trải qua 2 cột.
- `grid-column: 1 / 3`: từ đường kẻ dọc số 1 đến số 3 (tức 2 cột đầu).
- `grid-column: 1 / -1`: từ đường đầu đến đường cuối, tức trải hết chiều ngang.
- `grid-row` tương tự cho hàng.

### Đặt tên vùng bố cục

`grid-template-areas` cho phép "vẽ" bố cục bằng chữ, đọc lên là hiểu ngay:

```css
.trang {
  display: grid;
  grid-template-columns: 220px 1fr;
  grid-template-areas:
    "dau  dau"
    "ben  noidung"
    "chan chan";
}
```

Mỗi chuỗi là một hàng, mỗi từ là một ô. Cùng tên lặp lại nghĩa là vùng đó trải qua nhiều ô. Sau đó, mỗi phần tử chỉ cần khai báo `grid-area: dau;` để vào đúng vùng.

## Code mẫu có chú thích

### Ví dụ 1: bố cục trang với vùng có tên

```html
<div class="trang">
  <header class="dau">Đầu trang</header>
  <aside class="ben">Thanh bên</aside>
  <main class="noidung">Nội dung chính</main>
  <footer class="chan">Chân trang</footer>
</div>
```

```css
.trang {
  display: grid;
  grid-template-columns: 220px 1fr;      /* thanh bên cố định, nội dung co giãn */
  grid-template-rows: auto 1fr auto;     /* đầu, chân cao theo nội dung; giữa lấp phần còn lại */
  grid-template-areas:
    "dau  dau"
    "ben  noidung"
    "chan chan";
  gap: 16px;
  min-height: 100vh;
}

.dau     { grid-area: dau; }
.ben     { grid-area: ben; }
.noidung { grid-area: noidung; }
.chan    { grid-area: chan; }
```

Muốn đổi bố cục trên điện thoại thành một cột? Chỉ cần viết lại `grid-template-columns` và `grid-template-areas` trong media query (bài sau), HTML giữ nguyên.

### Ví dụ 2: bộ sưu tập ảnh tự co giãn

```css
.bo-suu-tap {
  display: grid;
  /* Mỗi cột rộng ít nhất 180px; vừa bao nhiêu cột thì tạo bấy nhiêu, chia đều phần dư */
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.bo-suu-tap img {
  width: 100%;
  aspect-ratio: 1;        /* ô vuông */
  object-fit: cover;      /* cắt ảnh cho vừa ô mà không méo */
  border-radius: 8px;
}

.bo-suu-tap .anh-noi-bat {
  grid-column: span 2;    /* ảnh nổi bật chiếm 2 cột */
  grid-row: span 2;       /* và 2 hàng */
}
```

Chỉ với một dòng `grid-template-columns`, lưới hiện 5–6 cột trên màn hình máy tính, 2 cột trên điện thoại, không cần thêm quy tắc nào.

### Grid hay Flexbox?

Không phải chọn một bỏ một. Cách làm phổ biến: **Grid cho khung lớn** của trang hoặc của một khu vực, **Flexbox cho các thành phần nhỏ** bên trong như thanh menu, hàng nút, nội dung một thẻ. Câu hỏi để chọn: "Mình có cần các thứ thẳng hàng theo cả hai chiều không?" Có thì Grid, không thì Flexbox thường đơn giản hơn.

## Lỗi hay gặp

**1. Đặt thuộc tính item lên container và ngược lại.** `grid-template-columns` thuộc về container; `grid-column`, `grid-area` thuộc về item. Đặt nhầm chỗ thì không có tác dụng gì.

**2. Tên vùng không tạo thành hình chữ nhật.** Trong `grid-template-areas`, mỗi vùng phải là một hình chữ nhật liền khối. Chuỗi như `"a b" "b a"` là không hợp lệ và trình duyệt bỏ qua cả khai báo.

**3. Số ô trong mỗi chuỗi không bằng nhau.** Mỗi hàng trong `grid-template-areas` phải có cùng số từ, bằng số cột. Dùng dấu `.` cho ô trống: `"dau ."`.

**4. Nhầm `auto-fill` và `auto-fit`.** Với ít phần tử, `auto-fill` giữ lại các cột trống, còn `auto-fit` co các cột trống lại để phần tử giãn ra lấp đầy. Nếu thấy thẻ bị kéo quá rộng hoặc thừa khoảng trống bên phải, hãy thử đổi giữa hai từ khóa này.

DevTools có lớp phủ Grid: bấm biểu tượng "grid" cạnh phần tử trong tab Elements để thấy đường kẻ và số thứ tự đường kẻ ngay trên trang.

## Bài tập thực hành

Dựng một "bảng điều khiển" (dashboard) 4 cột bằng nhau, khoảng cách 16px, gồm 6 ô: ô "Doanh thu" chiếm 2 cột, ô "Biểu đồ" chiếm 2 cột và 2 hàng, còn lại mỗi ô 1 cột. Thêm một dòng tiêu đề trải hết chiều ngang ở trên cùng.

Gợi ý: tiêu đề dùng `grid-column: 1 / -1`; các ô dùng `span`.

<details>
<summary>Xem lời giải</summary>

```html
<section class="bang">
  <h2 class="tieu-de">Tổng quan tháng 11</h2>
  <div class="o rong">Doanh thu</div>
  <div class="o lon">Biểu đồ</div>
  <div class="o">Đơn hàng</div>
  <div class="o">Học viên</div>
  <div class="o">Đánh giá</div>
  <div class="o">Khóa học</div>
</section>
```

```css
.bang {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.tieu-de { grid-column: 1 / -1; margin: 0; }
.o { padding: 16px; border-radius: 12px; background: #f7f8fa; }
.rong { grid-column: span 2; }
.lon { grid-column: span 2; grid-row: span 2; }
```

</details>

## Tóm tắt

- Grid là bố cục **hai chiều**: kẻ hàng, cột trước, rồi đặt item vào ô.
- `grid-template-columns` với `fr`, `repeat()`, `minmax()`; `gap` cho khoảng cách.
- Item chiếm nhiều ô bằng `grid-column` / `grid-row` với `span` hoặc số đường kẻ; `1 / -1` là trải hết.
- `grid-template-areas` vẽ bố cục bằng tên vùng, dễ đọc và dễ đổi trên màn hình khác.
- `repeat(auto-fill, minmax(180px, 1fr))` tạo lưới tự co giãn; Grid cho khung lớn, Flexbox cho chi tiết.

## Đọc thêm

- [Khái niệm cơ bản về Grid – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout)
- [grid-template-areas – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-areas)
- [minmax() – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/minmax)
