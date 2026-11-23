---
title: "Thiết kế responsive"
minutes: 16
preview: false
objectives:
  - "Tư duy thiết kế mobile-first: ưu tiên nội dung quan trọng cho màn hình nhỏ"
  - "Thiết kế vùng chạm (touch target) đủ lớn và mẫu điều hướng phù hợp điện thoại"
  - "Dùng ảnh đáp ứng với srcset, sizes và thẻ picture"
  - "Tạo cỡ chữ linh hoạt (fluid typography) bằng clamp()"
quiz:
  - question: "Vùng chạm (touch target) của nút trên điện thoại nên có kích thước tối thiểu khoảng bao nhiêu?"
    options: ["16 × 16px", "24 × 24px", "44 × 44px đến 48 × 48px", "100 × 100px"]
    answer: 2
    explain: "Ngón tay lớn hơn con trỏ chuột rất nhiều; vùng chạm 44–48px giúp bấm chính xác, kèm khoảng cách giữa các nút."
  - question: "Thiết kế mobile-first bắt đầu từ đâu?"
    options: ["Từ bản máy tính rồi cắt bớt", "Từ màn hình nhỏ: xác định nội dung và hành động quan trọng nhất trước", "Từ màn hình TV", "Từ logo"]
    answer: 1
    explain: "Không gian hẹp buộc bạn ưu tiên; màn hình lớn hơn là nơi bổ sung, không phải ngược lại."
  - question: "Thuộc tính srcset của thẻ img dùng để làm gì?"
    options: ["Thêm hiệu ứng", "Cung cấp nhiều kích thước ảnh để trình duyệt chọn ảnh phù hợp màn hình", "Đặt chú thích", "Làm ảnh động"]
    answer: 1
    explain: "Điện thoại tải ảnh nhỏ hơn, tiết kiệm dữ liệu; màn hình lớn hoặc mật độ điểm ảnh cao nhận ảnh nét hơn."
  - question: "Rê chuột (hover) để mở menu con có vấn đề gì trên điện thoại?"
    options: ["Không vấn đề", "Màn hình cảm ứng không có trạng thái rê chuột ổn định nên menu khó hoặc không mở được", "Làm trang chậm", "Tốn pin"]
    answer: 1
    explain: "Thiết kế tương tác phải dùng được bằng chạm và bàn phím, không chỉ phụ thuộc vào hover."
---

## Giải thích khái niệm

### Responsive là chuyện thiết kế, không chỉ là CSS

Ở khóa HTML, CSS bạn đã học cách dùng media query và đơn vị tương đối. Bài này nhìn từ góc độ **thiết kế**: trên mỗi kích thước màn hình, người dùng cần gì, thao tác ra sao, và giao diện nên thay đổi thế nào cho phù hợp. Một trang chỉ "co nhỏ lại" cho vừa điện thoại chưa phải là responsive tốt; trang responsive tốt **sắp xếp lại** nội dung theo hoàn cảnh sử dụng.

### Mobile-first: bắt đầu từ chiếc vali nhỏ

Hãy tưởng tượng bạn đi du lịch với một chiếc vali xách tay nhỏ. Bạn buộc phải chọn những thứ **thật sự cần**. Nếu sau đó được đổi sang vali lớn, bạn thêm đồ vào dễ dàng. Làm ngược lại, nhồi đồ từ vali lớn sang vali nhỏ, thì đau đầu hơn nhiều.

Thiết kế **mobile-first** cũng vậy. Bắt đầu từ màn hình điện thoại, bạn trả lời: người dùng đến trang này để làm gì? Nội dung nào quan trọng nhất? Hành động chính là gì? Màn hình lớn hơn là nơi bổ sung thông tin phụ, thêm cột, mở rộng không gian, chứ không phải nơi duy nhất trang trông "đầy đủ".

### Thiết kế cho ngón tay

Trên điện thoại, người dùng thao tác bằng **ngón tay**, thường là ngón cái khi cầm một tay. Vài nguyên tắc:

- **Vùng chạm đủ lớn**: tối thiểu khoảng 44 × 44px đến 48 × 48px, kể cả khi biểu tượng nhỏ hơn (dùng padding mở rộng vùng bấm).
- **Khoảng cách giữa các vùng chạm**: ít nhất 8px để tránh bấm nhầm nút bên cạnh.
- **Vùng dễ với tới**: nửa dưới màn hình dễ chạm bằng ngón cái hơn góc trên. Nhiều ứng dụng đặt thanh điều hướng chính ở đáy màn hình vì lý do này.
- **Không dựa vào hover**: màn hình cảm ứng không có trạng thái rê chuột ổn định. Menu con mở bằng hover, chú thích chỉ hiện khi rê chuột đều khó dùng trên điện thoại.

### Mẫu điều hướng trên màn hình nhỏ

- **Menu thu gọn** (nút ☰): gọn, quen thuộc, nhưng giấu các mục đi; chỉ nên dùng khi có nhiều mục.
- **Thanh tab dưới đáy**: 3–5 mục quan trọng nhất luôn hiện, dễ chạm.
- **Ưu tiên hiển thị**: giữ 2–3 mục quan trọng nhất trên thanh, các mục còn lại vào menu "Thêm".

Dù chọn mẫu nào, hãy dùng thẻ `<button>` cho nút mở menu, có nhãn cho trình đọc màn hình, và mở được bằng bàn phím.

### Ảnh đáp ứng

Một ảnh rộng 2400px rất đẹp trên màn hình lớn, nhưng điện thoại phải tải vài MB chỉ để hiển thị ở 375px. Thẻ `<img>` có hai thuộc tính giải quyết việc này:

- `srcset`: liệt kê nhiều phiên bản ảnh với chiều rộng thật của chúng.
- `sizes`: cho trình duyệt biết ảnh sẽ hiển thị rộng bao nhiêu ở từng kích thước màn hình.

Trình duyệt tự chọn ảnh phù hợp nhất. Khi cần **cắt ảnh khác nhau** cho từng màn hình (ảnh ngang trên máy tính, ảnh dọc cận cảnh trên điện thoại), dùng thẻ `<picture>` với các `<source media="...">`. Kỹ thuật này gọi là chỉ đạo nghệ thuật (art direction).

### Chữ linh hoạt với clamp()

Thay vì đổi cỡ chữ đột ngột ở từng breakpoint, hàm `clamp(min, ưu-tiên, max)` cho cỡ chữ **tăng dần mượt mà** theo chiều rộng màn hình, nhưng không nhỏ hơn mức tối thiểu hay lớn hơn mức tối đa. Giá trị ưu tiên thường dạng `a rem + b vw`, tính từ cỡ chữ mong muốn ở màn hình nhỏ nhất và lớn nhất.

## Code mẫu có chú thích

Tính giá trị `clamp()` cho tiêu đề muốn nhỏ nhất 28px ở màn hình 360px và lớn nhất 48px ở màn hình 1280px:

```js
// Nội suy tuyến tính: cỡ chữ = a + b × (chiều rộng màn hình)
function taoClamp(coMin, coMax, manMin, manMax, goc = 16) {
  const b = (coMax - coMin) / (manMax - manMin);  // tăng bao nhiêu px cho mỗi px màn hình
  const a = coMin - b * manMin;                   // phần cố định (px)
  const r = (px) => +(px / goc).toFixed(3);       // đổi sang rem
  return `clamp(${r(coMin)}rem, ${r(a)}rem + ${+(b * 100).toFixed(3)}vw, ${r(coMax)}rem)`;
}

console.log('h1:', taoClamp(28, 48, 360, 1280));
console.log('đoạn văn:', taoClamp(16, 18, 360, 1280));
```

```text output
h1: clamp(1.75rem, 1.261rem + 2.174vw, 3rem)
đoạn văn: clamp(1rem, 0.951rem + 0.217vw, 1.125rem)
```

Dùng kết quả trong CSS, kèm vùng chạm đủ lớn cho nút và liên kết trong menu:

```css
h1 { font-size: clamp(1.75rem, 1.261rem + 2.174vw, 3rem); line-height: 1.15; }
body { font-size: clamp(1rem, 0.951rem + 0.217vw, 1.125rem); }

.menu a,
.nut-bieu-tuong {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;          /* vùng chạm tối thiểu */
  min-height: 48px;
  padding: 0 12px;
}

.menu { display: flex; gap: 8px; }  /* khoảng cách giữa các vùng chạm */

/* Thiết bị có chuột mới dùng hiệu ứng hover */
@media (hover: hover) {
  .menu a:hover { background: #f3f4f6; }
}
```

Truy vấn `@media (hover: hover)` chỉ áp dụng hiệu ứng rê chuột cho thiết bị thực sự có con trỏ, tránh hiệu ứng "dính" trên màn hình cảm ứng.

Ảnh đáp ứng với `srcset`, `sizes` và `<picture>`:

```html
<!-- Trình duyệt chọn ảnh phù hợp: ảnh hiển thị rộng 100% màn hình trên điện thoại, 50% từ 768px -->
<img
  src="anh/quan-ca-phe-800.jpg"
  srcset="anh/quan-ca-phe-400.jpg 400w, anh/quan-ca-phe-800.jpg 800w, anh/quan-ca-phe-1600.jpg 1600w"
  sizes="(min-width: 768px) 50vw, 100vw"
  alt="Góc quán cà phê với ánh nắng buổi sáng"
  width="800" height="533" loading="lazy">

<!-- Art direction: ảnh dọc cận cảnh trên điện thoại, ảnh ngang toàn cảnh trên màn hình lớn -->
<picture>
  <source media="(min-width: 768px)" srcset="anh/hero-ngang.jpg">
  <img src="anh/hero-doc.jpg" alt="Ly cà phê sữa đá trên bàn gỗ" width="600" height="800">
</picture>
```

## Lỗi hay gặp

**1. Thu nhỏ thay vì sắp xếp lại.** Bảng 6 cột co lại trên điện thoại thành 6 cột chữ bé tí. Hãy nghĩ lại cách trình bày: chuyển thành danh sách thẻ, hoặc chỉ hiện cột quan trọng kèm nút "Xem chi tiết".

**2. Nút quá nhỏ, quá sát nhau.** Biểu tượng 20px cách nhau 4px khiến người dùng bấm nhầm liên tục. Mở rộng vùng chạm bằng padding.

**3. Ẩn nội dung quan trọng trên điện thoại.** Giấu giá, thông tin liên hệ hay nút mua ở bản di động vì "chật" là bỏ rơi phần lớn người dùng. Rút gọn cách trình bày, đừng cắt nội dung cốt lõi.

**4. Gửi ảnh khổng lồ cho điện thoại.** Không có `srcset`, trang tải chậm và tốn dữ liệu di động. Chuẩn bị vài kích thước ảnh và để trình duyệt chọn.

**5. Chỉ thử bằng cách kéo hẹp cửa sổ.** Giả lập không thể hiện cảm giác cầm máy, ánh sáng ngoài trời hay độ chính xác của ngón tay. Thử trên điện thoại thật, bằng một tay.

## Bài tập thực hành

Lấy thiết kế trang quán cà phê ở bài Bố cục lưới và lập "kế hoạch responsive" cho ba kích thước (360px, 768px, 1280px): mỗi kích thước liệt kê thứ tự nội dung từ trên xuống, cách điều hướng, ảnh dùng phiên bản nào, cỡ chữ tiêu đề. Sau đó tính giá trị `clamp()` cho tiêu đề (24px ở 360px, 44px ở 1280px) bằng hàm `taoClamp`.

Gợi ý: trên điện thoại, đưa "Giờ mở cửa" và nút "Chỉ đường" lên gần đầu trang vì đó là thứ người đang di chuyển cần nhất.

<details>
<summary>Xem lời giải mẫu</summary>

| | 360px | 768px | 1280px |
|---|---|---|---|
| Thứ tự | Logo + nút ☰ → ảnh dọc → giờ mở cửa + "Chỉ đường" → đồ uống nổi bật (danh sách) → giới thiệu ngắn | Logo + 4 mục menu → ảnh ngang → giới thiệu 2 cột → đồ uống 2 thẻ/hàng | Logo + menu đầy đủ → ảnh ngang lớn → giới thiệu 7/5 cột → đồ uống 3 thẻ/hàng |
| Điều hướng | Nút ☰ mở menu | Thanh ngang | Thanh ngang |
| Ảnh | hero-doc.jpg, bản 400w | hero-ngang.jpg, bản 800w | hero-ngang.jpg, bản 1600w |

```js
function taoClamp(coMin, coMax, manMin, manMax, goc = 16) {
  const b = (coMax - coMin) / (manMax - manMin);
  const a = coMin - b * manMin;
  const r = (px) => +(px / goc).toFixed(3);
  return `clamp(${r(coMin)}rem, ${r(a)}rem + ${+(b * 100).toFixed(3)}vw, ${r(coMax)}rem)`;
}
console.log(taoClamp(24, 44, 360, 1280));
```

```text output
clamp(1.5rem, 1.011rem + 2.174vw, 2.75rem)
```

</details>

## Tóm tắt

- Responsive tốt là sắp xếp lại nội dung theo hoàn cảnh sử dụng, không chỉ thu nhỏ.
- Mobile-first: bắt đầu từ màn hình nhỏ để xác định nội dung và hành động quan trọng nhất.
- Thiết kế cho ngón tay: vùng chạm 44–48px, có khoảng cách, không dựa vào hover; chọn mẫu điều hướng phù hợp.
- Ảnh đáp ứng với `srcset`, `sizes`; `<picture>` khi cần cắt ảnh khác nhau.
- Cỡ chữ linh hoạt bằng `clamp()`; thử trên điện thoại thật.

## Đọc thêm

- [Ảnh đáp ứng – MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)
- [clamp() – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/clamp)
- [Media feature hover – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover)
