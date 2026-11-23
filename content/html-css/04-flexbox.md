---
title: "Flexbox"
minutes: 16
preview: false
objectives:
  - "Hiểu flex container, flex item, trục chính và trục phụ"
  - "Căn chỉnh và phân bố phần tử bằng justify-content, align-items, gap"
  - "Đổi hướng và cho phép xuống dòng bằng flex-direction, flex-wrap"
  - "Dùng flex: 1 để phần tử co giãn lấp đầy chỗ trống"
quiz:
  - question: "Thuộc tính display: flex được đặt ở đâu?"
    options: ["Trên từng phần tử con muốn xếp", "Trên phần tử cha chứa các phần tử cần xếp", "Trên thẻ body", "Trên thẻ html"]
    answer: 1
    explain: "display: flex biến phần tử thành flex container; các con trực tiếp của nó trở thành flex item."
  - question: "Với flex-direction: row (mặc định), justify-content căn theo chiều nào?"
    options: ["Chiều dọc", "Chiều ngang (trục chính)", "Cả hai chiều", "Theo đường chéo"]
    answer: 1
    explain: "justify-content căn theo trục chính; với row thì trục chính nằm ngang. align-items căn theo trục phụ."
  - question: "Để ba thẻ luôn cách nhau 16px mà không cần margin, dùng gì?"
    options: ["space: 16px", "gap: 16px", "padding: 16px", "flex: 16px"]
    answer: 1
    explain: "gap đặt khoảng cách giữa các item, không tạo khoảng thừa ở hai đầu như margin."
  - question: "Khi đổi sang flex-direction: column, thuộc tính nào căn các phần tử theo chiều NGANG?"
    options: ["justify-content", "align-items", "flex-wrap", "order"]
    answer: 1
    explain: "Với column, trục chính là dọc nên justify-content căn dọc; trục phụ nằm ngang nên align-items căn ngang."
---

## Giải thích khái niệm

### Bài toán xếp đồ trên kệ

Trước khi có Flexbox, việc xếp vài chiếc hộp nằm ngang, cách đều nhau, căn giữa theo chiều dọc là một cơn đau đầu với người làm web. Flexbox (Flexible Box Layout – bố cục hộp linh hoạt) giải quyết đúng việc đó: **xếp các phần tử theo một hàng hoặc một cột**, rồi căn chỉnh, phân bố khoảng trống giữa chúng.

Hãy tưởng tượng một chiếc kệ sách. Bạn quyết định sách xếp từ trái sang phải hay từ trên xuống; dồn hết về một đầu, dàn đều ra, hay đặt ở giữa kệ; và những cuốn thấp hơn đứng sát đáy kệ hay căn giữa. Flexbox cho bạn đúng những "nút điều khiển" ấy.

### Container và item

Flexbox luôn có hai vai:

- **Flex container**: phần tử cha, nơi bạn đặt `display: flex`.
- **Flex item**: các phần tử **con trực tiếp** của container. Cháu chắt không bị ảnh hưởng.

Hầu hết thuộc tính căn chỉnh đặt trên container; một số ít thuộc tính như `flex` đặt trên từng item.

### Trục chính và trục phụ

Đây là khái niệm then chốt. Container có hai trục:

- **Trục chính** (main axis): hướng các item được xếp. Mặc định `flex-direction: row` là nằm ngang, từ trái sang phải.
- **Trục phụ** (cross axis): vuông góc với trục chính.

Hai thuộc tính căn chỉnh quan trọng nhất bám theo hai trục này:

- `justify-content`: phân bố item **dọc theo trục chính**. Giá trị hay dùng: `flex-start` (dồn về đầu), `center`, `flex-end`, `space-between` (hai đầu sát mép, còn lại chia đều), `space-around`, `space-evenly`.
- `align-items`: căn item **theo trục phụ**. Giá trị hay dùng: `stretch` (mặc định, kéo cao bằng nhau), `center`, `flex-start`, `flex-end`.

Khi bạn đổi `flex-direction: column`, trục chính quay thành chiều dọc, nên `justify-content` cũng chuyển sang căn dọc. Hãy luôn tự hỏi "trục chính của mình đang nằm theo chiều nào?" trước khi chọn thuộc tính.

### Khoảng cách, xuống dòng và co giãn

- `gap`: khoảng cách giữa các item, gọn hơn dùng margin vì không tạo khoảng thừa ở hai đầu.
- `flex-wrap: wrap`: cho phép item xuống hàng khi hết chỗ, thay vì bị ép nhỏ lại.
- `flex: 1` (đặt trên item): item **co giãn** để chia nhau phần chỗ trống còn lại. Hai item cùng `flex: 1` sẽ rộng bằng nhau; item `flex: 2` rộng gấp đôi item `flex: 1`.

## Code mẫu có chú thích

### Ví dụ 1: thanh điều hướng

Logo bên trái, menu bên phải, mọi thứ căn giữa theo chiều dọc:

```html
<header class="thanh-dieu-huong">
  <a class="logo" href="/">Cnow</a>
  <nav class="menu">
    <a href="/khoa-hoc">Khóa học</a>
    <a href="/blog">Blog</a>
    <a href="/dang-nhap">Đăng nhập</a>
  </nav>
</header>
```

```css
.thanh-dieu-huong {
  display: flex;                    /* header thành flex container */
  justify-content: space-between;   /* logo sát trái, menu sát phải */
  align-items: center;              /* căn giữa theo chiều dọc */
  padding: 12px 24px;
  background: #111318;
}

.menu {
  display: flex;                    /* lồng flex: các liên kết xếp ngang */
  gap: 20px;                        /* cách đều 20px */
}

.logo, .menu a {
  color: #fff;
  text-decoration: none;
}
```

Container lồng container là chuyện bình thường: `header` xếp hai khối lớn, còn `nav` bên trong tự xếp các liên kết của nó.

### Ví dụ 2: hàng thẻ tự xuống dòng

```css
.danh-sach-the {
  display: flex;
  flex-wrap: wrap;       /* hết chỗ thì xuống hàng */
  gap: 16px;
}

.danh-sach-the > .the {
  flex: 1 1 220px;       /* co giãn, nhưng không nhỏ hơn khoảng 220px */
}
```

`flex: 1 1 220px` là cách viết tắt của ba giá trị: được phép giãn (1), được phép co (1), kích thước khởi điểm 220px. Kết quả: màn hình rộng thì nhiều thẻ một hàng, màn hình hẹp thì thẻ tự rơi xuống hàng dưới. Đây là nền tảng của bố cục co giãn mà bài Responsive sẽ phát triển thêm.

### Ví dụ 3: căn giữa tuyệt đối

Bài toán "căn một hộp vào chính giữa màn hình" từng nổi tiếng là khó, giờ chỉ cần ba dòng:

```css
.man-hinh-chao {
  display: flex;
  justify-content: center;   /* giữa theo chiều ngang */
  align-items: center;       /* giữa theo chiều dọc */
  min-height: 100vh;         /* cao ít nhất bằng chiều cao màn hình */
}
```

### Ví dụ 4: chân thẻ luôn nằm dưới đáy

Các thẻ sản phẩm có mô tả dài ngắn khác nhau, nhưng bạn muốn nút "Mua" luôn thẳng hàng ở đáy:

```css
.the {
  display: flex;
  flex-direction: column;    /* xếp các phần trong thẻ theo cột */
}

.the .nut-mua {
  margin-top: auto;          /* margin tự động đẩy nút xuống đáy thẻ */
}
```

Trong flex container, `margin-top: auto` "ăn" hết khoảng trống phía trên item, đẩy nó xuống cuối trục chính.

## Lỗi hay gặp

**1. Đặt `display: flex` lên phần tử con.** Muốn các thẻ `<a>` xếp ngang thì `display: flex` phải đặt trên **cha** của chúng (`nav`), không phải trên từng `<a>`.

**2. Nhầm trục khi dùng `column`.** Đổi `flex-direction: column` rồi dùng `justify-content: center` để căn ngang, kết quả là các item căn giữa theo chiều dọc. Với cột, căn ngang dùng `align-items`.

**3. `justify-content` không có tác dụng.** Thường vì container không còn chỗ trống: các item đã chiếm hết, hoặc đang có item `flex: 1`. Kiểm tra bằng DevTools: trình duyệt hiện biểu tượng "flex" cạnh phần tử, bấm vào để xem lớp phủ trực quan.

**4. Item bị ép bẹp thay vì xuống hàng.** Mặc định `flex-wrap: nowrap`, item co lại hết mức để nằm vừa một hàng. Thêm `flex-wrap: wrap` cho container.

## Bài tập thực hành

Dựng phần "chân trang" (footer) gồm ba cột: Giới thiệu, Liên kết, Liên hệ. Trên màn hình rộng ba cột nằm ngang, cách nhau 32px, cột Giới thiệu rộng gấp đôi hai cột còn lại. Khi màn hình hẹp, các cột tự xuống dòng. Dưới cùng là một dòng bản quyền căn giữa.

Gợi ý: dùng `flex-wrap: wrap`, `gap`, và giá trị `flex` khác nhau cho cột đầu (ví dụ `flex: 2 1 300px` so với `flex: 1 1 150px`).

<details>
<summary>Xem lời giải</summary>

```html
<footer class="chan-trang">
  <div class="cot cot-rong"><h3>Giới thiệu</h3><p>Cnow – học lập trình mỗi ngày.</p></div>
  <div class="cot"><h3>Liên kết</h3><p><a href="/khoa-hoc">Khóa học</a></p></div>
  <div class="cot"><h3>Liên hệ</h3><p>hello@example.com</p></div>
  <p class="ban-quyen">© 2026 Cnow</p>
</footer>
```

```css
.chan-trang {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  padding: 32px 24px;
}
.cot { flex: 1 1 150px; }
.cot-rong { flex: 2 1 300px; }
.ban-quyen {
  flex-basis: 100%;   /* chiếm trọn một hàng riêng */
  text-align: center;
  margin: 0;
}
```

</details>

## Tóm tắt

- `display: flex` đặt trên cha; con trực tiếp trở thành flex item.
- Trục chính theo `flex-direction` (mặc định ngang); `justify-content` căn theo trục chính, `align-items` theo trục phụ.
- `gap` tạo khoảng cách, `flex-wrap: wrap` cho xuống hàng, `flex: 1` cho item co giãn lấp chỗ trống.
- `margin: auto` trong flex đẩy item ra xa; căn giữa tuyệt đối chỉ cần `justify-content` + `align-items: center`.
- Flexbox hợp nhất với bố cục **một chiều** (một hàng hoặc một cột).

## Đọc thêm

- [Khái niệm cơ bản về Flexbox – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Basic_concepts_of_flexbox)
- [justify-content – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/justify-content)
