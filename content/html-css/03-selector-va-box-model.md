---
title: "Selector và box model"
minutes: 16
preview: false
objectives:
  - "Gắn file CSS vào trang và viết đúng cú pháp một quy tắc CSS"
  - "Chọn phần tử bằng selector theo thẻ, class, id, quan hệ cha con và trạng thái"
  - "Hiểu cách CSS quyết định quy tắc nào thắng (cascade và độ ưu tiên)"
  - "Nắm box model: content, padding, border, margin và box-sizing"
quiz:
  - question: "Selector nào chọn mọi phần tử có class=\"the\"?"
    options: ["#the", ".the", "the", "*the"]
    answer: 1
    explain: "Dấu chấm chọn theo class, dấu # chọn theo id, không có ký hiệu là chọn theo tên thẻ."
  - question: "Phần tử có width: 200px; padding: 20px; border: 5px. Không đặt box-sizing, chiều rộng hiển thị là bao nhiêu?"
    options: ["200px", "225px", "250px", "240px"]
    answer: 2
    explain: "Mặc định (content-box) width chỉ tính phần nội dung: 200 + 20×2 + 5×2 = 250px. Với border-box thì đúng 200px."
  - question: "Khoảng trống BÊN TRONG viền, giữa nội dung và viền, gọi là gì?"
    options: ["margin", "padding", "gap", "outline"]
    answer: 1
    explain: "padding là đệm bên trong viền; margin là khoảng cách bên ngoài viền tới phần tử khác."
  - question: "Hai quy tắc cùng chọn một thẻ <p class=\"note\">: p { color: blue } và .note { color: red }. Chữ có màu gì?"
    options: ["Xanh, vì viết trước", "Đỏ, vì selector class ưu tiên hơn selector thẻ", "Tím, trộn hai màu", "Màu mặc định đen"]
    answer: 1
    explain: "Độ ưu tiên (specificity) của class cao hơn của tên thẻ, nên .note thắng bất kể thứ tự."
---

## Giải thích khái niệm

### CSS: bộ quần áo cho trang HTML

Nếu HTML là cơ thể, thì **CSS** (Cascading Style Sheets – bảng định kiểu xếp tầng) là quần áo. Cùng một nội dung HTML, thay file CSS là trang web "thay đồ" hoàn toàn. Cách tốt nhất là để CSS trong một file riêng, ví dụ `style.css`, rồi gắn vào trang bằng thẻ đặt trong `<head>`:

```html
<link rel="stylesheet" href="style.css">
```

Một file CSS cho cả website giúp mọi trang có giao diện thống nhất, sửa một chỗ là đổi khắp nơi.

### Cú pháp một quy tắc

Mỗi **quy tắc** (rule) gồm một **selector** (bộ chọn: chọn những phần tử nào) và một khối **khai báo** (declaration) trong ngoặc nhọn. Mỗi khai báo là `thuộc-tính: giá-trị;`, kết thúc bằng dấu chấm phẩy.

```css
/* Chú thích CSS viết trong cặp dấu này */
h1 {
  color: #f05123;        /* màu chữ */
  font-size: 2rem;       /* cỡ chữ: 2 lần cỡ chữ gốc */
}
```

### Các loại selector thường dùng

Hãy nghĩ selector như cách gọi người trong lớp học: gọi "tất cả học sinh nam" (theo loại), gọi "nhóm trực nhật" (theo nhóm), hay gọi đúng "bạn có số báo danh 15" (theo mã riêng).

| Selector | Ví dụ | Chọn gì |
|---|---|---|
| Thẻ | `p` | mọi đoạn văn |
| Class | `.the-san-pham` | mọi phần tử có `class="the-san-pham"` |
| Id | `#dau-trang` | phần tử duy nhất có `id="dau-trang"` |
| Con cháu | `nav a` | liên kết nằm bên trong `nav` |
| Nhóm | `h1, h2` | cả `h1` lẫn `h2` |
| Trạng thái | `a:hover` | liên kết khi đang rê chuột |

**Class** là selector bạn sẽ dùng nhiều nhất: một phần tử có thể có nhiều class (`class="nut nut-lon"`), và một class dùng được cho nhiều phần tử. **Id** phải duy nhất trong trang, nên dành cho neo liên kết và JavaScript hơn là để trang trí.

### Xếp tầng và độ ưu tiên

Chữ "C" đầu tiên trong CSS là *cascading* – xếp tầng. Khi nhiều quy tắc cùng nhắm vào một phần tử và mâu thuẫn nhau, trình duyệt quyết định theo thứ tự:

1. **Độ ưu tiên** (specificity): id mạnh hơn class, class mạnh hơn tên thẻ. Selector càng cụ thể càng mạnh.
2. Nếu ngang nhau, quy tắc **viết sau** thắng.

Ngoài ra, một số thuộc tính như `color`, `font-family` được **kế thừa** (inherit) từ cha xuống con: đặt phông chữ cho `body` là cả trang dùng theo. Thuộc tính như `border`, `margin` thì không kế thừa.

Mẹo thực tế: dùng chủ yếu selector class, giữ độ ưu tiên thấp và đồng đều. Khi đó bạn chỉ cần nhớ "viết sau thắng", code dễ đoán hơn nhiều.

### Box model: mọi thứ đều là chiếc hộp

Trình duyệt coi mỗi phần tử là một chiếc hộp gồm bốn lớp, từ trong ra ngoài:

1. **Content** – nội dung (chữ, ảnh).
2. **Padding** – đệm bên trong, giữa nội dung và viền. Giống lớp xốp chống sốc trong hộp quà.
3. **Border** – viền hộp.
4. **Margin** – khoảng cách bên ngoài, đẩy các hộp khác ra xa. Giống khoảng trống giữa các hộp quà xếp trên kệ.

Theo mặc định, `width` chỉ tính phần **content**; padding và border được cộng thêm vào. Điều này rất dễ gây nhầm. Vì vậy hầu hết dự án đặt `box-sizing: border-box` cho mọi phần tử, để `width` tính luôn cả padding và border: bạn đặt 300px là hộp rộng đúng 300px.

Viết tắt bốn phía theo chiều kim đồng hồ: `padding: 10px 20px 10px 20px` là trên, phải, dưới, trái. Hai giá trị `padding: 10px 20px` nghĩa là trên dưới 10px, trái phải 20px.

## Code mẫu có chú thích

HTML của một thẻ sản phẩm:

```html
<article class="the">
  <h2 class="the-ten">Bánh mì bơ tỏi</h2>
  <p>Giòn rụm, thơm mùi bơ.</p>
  <a class="nut" href="#dat-hang">Đặt ngay</a>
</article>
```

CSS trang trí, áp dụng box model:

```css
/* Áp dụng border-box cho mọi phần tử để tính kích thước dễ hơn */
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  font-family: system-ui, sans-serif; /* kế thừa xuống mọi phần tử con */
  color: #1d2129;
  margin: 0;
}

.the {
  width: 300px;              /* rộng đúng 300px nhờ border-box */
  padding: 16px 20px;        /* trên dưới 16px, trái phải 20px */
  border: 1px solid #e5e7eb;
  border-radius: 12px;       /* bo góc */
  margin: 24px auto;         /* auto hai bên: căn giữa theo chiều ngang */
}

.the-ten {
  margin: 0 0 8px;           /* bỏ khoảng trống mặc định phía trên tiêu đề */
}

.nut {
  display: inline-block;     /* để padding trên dưới có tác dụng với thẻ a */
  padding: 8px 16px;
  background: #f05123;
  color: #fff;
  border-radius: 999px;
  text-decoration: none;     /* bỏ gạch chân của liên kết */
}

.nut:hover {
  background: #d63e12;       /* đậm hơn khi rê chuột */
}
```

Mở DevTools, chọn phần tử `.the`, kéo xuống cuối tab **Styles** (hoặc tab **Computed**) để thấy sơ đồ box model với số đo từng lớp. Đây là cách nhanh nhất để hiểu vì sao một hộp to hay nhỏ hơn bạn nghĩ.

## Lỗi hay gặp

**1. Quên dấu chấm phẩy hoặc ngoặc.** Thiếu `;` giữa hai khai báo khiến cả hai bị trình duyệt bỏ qua; thiếu `}` có thể làm hỏng các quy tắc phía sau:

```css error
.the {
  color: red
  padding: 10px;
```

**2. Quên dấu chấm trước tên class.** Viết `the { ... }` thì trình duyệt tìm thẻ tên `<the>`, không tồn tại. Class trong CSS luôn có dấu chấm, còn trong HTML thì không: `class="the"`.

**3. Hộp to hơn dự kiến.** Đặt `width: 100%` kèm `padding` mà không có `border-box` sẽ làm phần tử tràn ra ngoài cha. Thêm quy tắc `box-sizing: border-box` ở đầu file.

**4. Quy tắc "không ăn".** Thường do một selector khác có độ ưu tiên cao hơn. Trong DevTools, khai báo bị gạch ngang là đã bị quy tắc khác ghi đè; di chuột vào để biết quy tắc nào thắng. Tránh dùng `!important` để "chữa cháy", vì nó làm việc ghi đè về sau càng khó.

## Bài tập thực hành

Tạo trang có ba thẻ "gói cước" (Cơ bản, Tiêu chuẩn, Cao cấp). Mỗi thẻ có tên gói, giá và một nút "Chọn gói". Yêu cầu: mọi thẻ rộng 260px tính cả padding, có viền và bo góc; thẻ "Tiêu chuẩn" có thêm class `noi-bat` với viền màu cam đậm hơn; nút đổi màu khi rê chuột.

Gợi ý: phần tử có hai class `class="goi noi-bat"`; quy tắc `.noi-bat` viết sau `.goi` để ghi đè màu viền.

<details>
<summary>Xem lời giải</summary>

```html
<article class="goi"><h2>Cơ bản</h2><p>49.000đ/tháng</p><a class="nut" href="#">Chọn gói</a></article>
<article class="goi noi-bat"><h2>Tiêu chuẩn</h2><p>99.000đ/tháng</p><a class="nut" href="#">Chọn gói</a></article>
<article class="goi"><h2>Cao cấp</h2><p>199.000đ/tháng</p><a class="nut" href="#">Chọn gói</a></article>
```

```css
* { box-sizing: border-box; }
.goi {
  display: inline-block;
  width: 260px;
  padding: 20px;
  margin: 8px;
  border: 2px solid #e5e7eb;
  border-radius: 14px;
  vertical-align: top;
}
.noi-bat { border-color: #f05123; }
.nut { display: inline-block; padding: 8px 16px; background: #1d2129; color: #fff; border-radius: 8px; text-decoration: none; }
.nut:hover { background: #f05123; }
```

</details>

## Tóm tắt

- Gắn CSS bằng `<link rel="stylesheet" href="style.css">` trong `<head>`.
- Quy tắc = selector + `{ thuộc-tính: giá-trị; }`. Selector theo thẻ, `.class`, `#id`, quan hệ, `:hover`.
- Khi mâu thuẫn: độ ưu tiên cao hơn thắng, ngang nhau thì viết sau thắng; một số thuộc tính được kế thừa.
- Box model: content → padding → border → margin. Dùng `box-sizing: border-box`.
- DevTools cho xem quy tắc nào đang áp dụng và số đo từng lớp của hộp.

## Đọc thêm

- [Selector CSS – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors)
- [Giới thiệu box model – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_box_model/Introduction_to_the_CSS_box_model)
- [Độ ưu tiên (specificity) – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity)
