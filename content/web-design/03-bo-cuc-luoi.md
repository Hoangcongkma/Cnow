---
title: "Bố cục lưới"
minutes: 15
preview: false
objectives:
  - "Hiểu lưới cột (column grid) gồm cột, khoảng cách cột (gutter) và lề (margin)"
  - "Dùng hệ thống khoảng cách theo bội số 8 để giao diện nhất quán"
  - "Áp dụng các kiểu đọc lướt chữ F và chữ Z khi sắp xếp nội dung"
  - "Chuyển lưới thiết kế thành CSS Grid 12 cột"
quiz:
  - question: "Gutter trong lưới cột là gì?"
    options: ["Chiều rộng mỗi cột", "Khoảng cách giữa các cột", "Lề ngoài cùng của trang", "Chiều cao của hàng"]
    answer: 1
    explain: "Gutter là khoảng trống giữa hai cột; margin là lề hai bên ngoài cùng của lưới."
  - question: "Vì sao lưới 12 cột rất phổ biến?"
    options: ["Vì 12 là số may mắn", "Vì 12 chia hết cho 2, 3, 4, 6 nên dễ tạo bố cục 2, 3, 4 hoặc 6 khối bằng nhau", "Vì màn hình rộng đúng 12 inch", "Vì trình duyệt bắt buộc"]
    answer: 1
    explain: "Nhiều ước số giúp một lưới đáp ứng rất nhiều kiểu chia bố cục."
  - question: "Hệ thống khoảng cách 8pt nghĩa là gì?"
    options: ["Mọi chữ cỡ 8pt", "Khoảng cách, kích thước dùng bội số của 8 (8, 16, 24, 32…)", "Lề đúng 8px", "Mỗi trang 8 phần"]
    answer: 1
    explain: "Giới hạn lựa chọn vào một thang cố định giúp giao diện đồng đều và việc quyết định nhanh hơn."
  - question: "Kiểu đọc lướt chữ F thường gặp ở trang nào?"
    options: ["Trang có nhiều chữ như kết quả tìm kiếm, bài viết", "Trang chỉ có một ảnh lớn", "Trang lỗi 404", "Trang đăng nhập"]
    answer: 0
    explain: "Với trang nhiều chữ, người dùng đọc vài dòng đầu rồi lướt dọc theo lề trái; đặt thông tin quan trọng ở đầu dòng và đầu đoạn."
---

## Giải thích khái niệm

### Lưới: khung xương vô hình của trang

Mở một tờ báo giấy, bạn sẽ thấy các bài viết, ảnh, quảng cáo được xếp thẳng hàng theo những cột vô hình. Đó là **lưới** (grid), công cụ lâu đời nhất của thiết kế dàn trang. Lưới giúp:

- **Căn lề nhất quán**: mọi phần tử bám vào cùng các đường kẻ, trang trông ngăn nắp.
- **Quyết định nhanh hơn**: thay vì băn khoăn "khối này rộng bao nhiêu?", bạn chỉ chọn "chiếm 4 cột hay 6 cột".
- **Làm việc nhóm dễ hơn**: người thiết kế và lập trình viên nói chung một ngôn ngữ.

### Ba thành phần của lưới cột

1. **Cột** (column): các dải dọc chứa nội dung. Phổ biến là 12 cột trên máy tính, 8 cột trên máy tính bảng, 4 cột trên điện thoại.
2. **Gutter**: khoảng cách giữa hai cột, thường 16–32px. Gutter giữ cho nội dung các cột không dính vào nhau.
3. **Margin**: lề hai bên ngoài cùng của lưới, giữ nội dung không chạm sát mép màn hình.

Lưới **12 cột** được ưa chuộng vì 12 chia hết cho 2, 3, 4 và 6: bạn dễ dàng có bố cục 2 khối (mỗi khối 6 cột), 3 khối (4 cột), 4 khối (3 cột), hoặc kiểu nội dung chính 8 cột và thanh bên 4 cột.

Lưới còn có **chiều rộng tối đa** cho nội dung (thường 1140–1280px). Trên màn hình rất rộng, lưới đứng giữa và hai bên là khoảng trống, tránh dòng chữ kéo dài quá mức.

### Hệ thống khoảng cách theo bội số 8

Bên cạnh lưới cột, hầu hết hệ thống thiết kế hiện đại dùng **thang khoảng cách cố định**, phổ biến nhất là bội số của 8: 4 (nửa bước), 8, 16, 24, 32, 48, 64. Mọi padding, margin, chiều cao nút đều chọn trong thang này. Lý do:

- Giao diện trông **đồng đều**, không có những khoảng cách "lệch" 13px, 17px khó chịu.
- Số 8 chia hết thuận tiện cho các mật độ điểm ảnh khác nhau của màn hình.
- Người thiết kế và lập trình viên không phải đo từng pixel; chỉ cần "khoảng cách 3" hay `--khoang-3`.

Như bài Nguyên tắc thị giác đã nói, khoảng cách nhỏ dùng **trong** một nhóm, khoảng cách lớn dùng **giữa** các nhóm.

### Mắt người đọc trang như thế nào?

Nghiên cứu theo dõi ánh mắt cho thấy hai kiểu lướt phổ biến:

- **Kiểu chữ F**: với trang nhiều chữ (bài viết, kết quả tìm kiếm), người đọc quét ngang vài dòng đầu, rồi lướt dọc xuống theo lề trái, thỉnh thoảng quét ngang ngắn hơn. Hệ quả: tiêu đề và những từ đầu tiên của mỗi đoạn, mỗi mục danh sách cực kỳ quan trọng. Hãy đặt thông tin chính lên đầu.
- **Kiểu chữ Z**: với trang ít chữ, nhiều hình (trang giới thiệu, trang đích), mắt đi từ góc trên trái (logo) sang trên phải (menu, nút), chéo xuống dưới trái, rồi sang dưới phải. Vị trí cuối của chữ Z là nơi tốt để đặt nút hành động chính.

Lưới giúp bạn đặt các phần tử vào đúng những "điểm dừng mắt" đó một cách có chủ đích.

## Code mẫu có chú thích

Tính chiều rộng một cột từ kích thước lưới, giúp bạn hiểu con số trong bản thiết kế:

```js
// Chiều rộng 1 cột = (vùng nội dung - tổng gutter) / số cột
function cotRong({ manHinh, toiDa, margin, gutter, soCot }) {
  const noiDung = Math.min(manHinh - 2 * margin, toiDa);
  return (noiDung - gutter * (soCot - 1)) / soCot;
}

const cauHinh = [
  { ten: 'Điện thoại', manHinh: 375, toiDa: 1200, margin: 16, gutter: 16, soCot: 4 },
  { ten: 'Máy tính bảng', manHinh: 768, toiDa: 1200, margin: 32, gutter: 24, soCot: 8 },
  { ten: 'Máy tính', manHinh: 1440, toiDa: 1200, margin: 32, gutter: 24, soCot: 12 },
];
for (const c of cauHinh) {
  const w = cotRong(c);
  // Khối chiếm n cột = n cột + (n - 1) gutter
  const khoi4 = 4 * w + 3 * c.gutter;
  console.log(`${c.ten}: cột ${w.toFixed(1)}px, khối 4 cột ${khoi4.toFixed(1)}px`);
}
```

```text output
Điện thoại: cột 73.8px, khối 4 cột 343.0px
Máy tính bảng: cột 67.0px, khối 4 cột 340.0px
Máy tính: cột 78.0px, khối 4 cột 384.0px
```

Lưới 12 cột bằng CSS Grid, kèm thang khoảng cách 8:

```css
:root {
  --khoang-1: 8px;
  --khoang-2: 16px;
  --khoang-3: 24px;
  --khoang-4: 32px;
  --khoang-6: 48px;
  --rong-toi-da: 1200px;
}

.luoi {
  display: grid;
  grid-template-columns: repeat(4, 1fr);      /* điện thoại: 4 cột */
  gap: var(--khoang-2);
  max-width: var(--rong-toi-da);
  margin-inline: auto;
  padding-inline: var(--khoang-2);
}

@media (min-width: 768px) {
  .luoi { grid-template-columns: repeat(8, 1fr); gap: var(--khoang-3); padding-inline: var(--khoang-4); }
}
@media (min-width: 1024px) {
  .luoi { grid-template-columns: repeat(12, 1fr); }
}

/* Các khối chiếm số cột khác nhau; trên điện thoại mọi khối trải hết 4 cột */
.chiem-het { grid-column: 1 / -1; }
.noi-dung, .thanh-ben, .the { grid-column: 1 / -1; }

@media (min-width: 1024px) {
  .noi-dung { grid-column: span 8; }          /* nội dung chính 8/12 */
  .thanh-ben { grid-column: span 4; }         /* thanh bên 4/12 */
  .the { grid-column: span 4; }               /* 3 thẻ một hàng */
}

.phan { margin-block: var(--khoang-6); }       /* khoảng cách lớn giữa các phần */
.phan h2 { margin-bottom: var(--khoang-2); }   /* khoảng cách nhỏ trong cùng phần */
```

## Lỗi hay gặp

**1. Phá lưới vô cớ.** Một khối lệch vài pixel khỏi đường kẻ chung trông như lỗi chứ không như sáng tạo. Nếu phá lưới, hãy làm rõ ràng và có chủ đích (ví dụ ảnh tràn viền toàn màn hình).

**2. Khoảng cách tùy hứng.** 13px chỗ này, 18px chỗ kia khiến giao diện "rung". Mọi khoảng cách nên lấy từ thang cố định.

**3. Không đặt chiều rộng tối đa.** Trên màn hình 2560px, lưới giãn hết cỡ, dòng chữ dài vô tận và các thẻ bị kéo bè. Luôn có `max-width` cho vùng nội dung.

**4. Quá nhiều chữ ở cuối dòng và cuối đoạn.** Người dùng lướt kiểu chữ F hiếm khi đọc tới cuối dòng. Đừng chôn thông tin quan trọng ở cuối đoạn văn dài.

## Bài tập thực hành

Phác thảo (trên giấy hoặc bằng CSS) trang chủ cho một quán cà phê trên lưới 12 cột: phần đầu trang trải hết 12 cột; phần giới thiệu chia 7 cột chữ và 5 cột ảnh; ba thẻ món đồ uống mỗi thẻ 4 cột; chân trang chia 4–4–4. Trên điện thoại (4 cột) mọi khối xếp dọc. Dùng thang khoảng cách 8.

Gợi ý: đặt tên class theo vai trò (`.gioi-thieu-chu`, `.gioi-thieu-anh`) và chỉ khai báo `grid-column` trong media query cho màn hình lớn.

<details>
<summary>Xem lời giải mẫu</summary>

```css
.luoi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; max-width: 1200px; margin-inline: auto; padding-inline: 16px; }
.luoi > * { grid-column: 1 / -1; }                     /* điện thoại: mọi khối trải hết */

@media (min-width: 1024px) {
  .luoi { grid-template-columns: repeat(12, 1fr); gap: 24px; padding-inline: 32px; }
  .dau-trang { grid-column: 1 / -1; }
  .gioi-thieu-chu { grid-column: span 7; }
  .gioi-thieu-anh { grid-column: span 5; }
  .the-do-uong { grid-column: span 4; }
  .chan-cot { grid-column: span 4; }
}

.phan { margin-block: 48px; }
.the-do-uong { padding: 24px; display: grid; gap: 8px; }
```

</details>

## Tóm tắt

- Lưới cột gồm cột, gutter và margin; 12 cột phổ biến vì chia được thành 2, 3, 4, 6 phần.
- Đặt chiều rộng tối đa cho vùng nội dung; điện thoại thường 4 cột, máy tính bảng 8, máy tính 12.
- Dùng thang khoảng cách bội số 8; khoảng nhỏ trong nhóm, khoảng lớn giữa các nhóm.
- Người dùng lướt kiểu chữ F (trang nhiều chữ) và chữ Z (trang ít chữ): đặt thông tin chính ở điểm dừng mắt.
- Chuyển lưới thiết kế thành CSS Grid với `repeat(12, 1fr)` và `grid-column: span n`.

## Đọc thêm

- [Bố cục lưới với CSS Grid – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout)
- [Lưới (grids) trong bố cục – MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Grids)
