---
title: "Màu sắc và typography"
minutes: 16
preview: false
objectives:
  - "Xây dựng bảng màu gồm màu chính, màu trung tính và màu trạng thái"
  - "Kiểm tra độ tương phản màu theo chuẩn WCAG để chữ đọc được"
  - "Chọn phông chữ, thang cỡ chữ (type scale), độ dài dòng và khoảng cách dòng"
  - "Viết bảng màu và chữ thành biến CSS dùng thống nhất"
quiz:
  - question: "Theo WCAG mức AA, chữ cỡ thường cần độ tương phản tối thiểu bao nhiêu so với nền?"
    options: ["2:1", "3:1", "4.5:1", "10:1"]
    answer: 2
    explain: "Chữ thường cần ≥ 4.5:1; chữ lớn (từ khoảng 24px, hoặc 18.66px đậm) cần ≥ 3:1."
  - question: "Có nên chỉ dùng màu đỏ để báo một ô nhập bị lỗi không?"
    options: ["Có, đỏ là đủ", "Không; cần thêm chữ hoặc biểu tượng vì nhiều người khó phân biệt màu", "Có, nếu đỏ đậm", "Chỉ trên điện thoại"]
    answer: 1
    explain: "Không truyền đạt thông tin chỉ bằng màu; kèm thông báo chữ, biểu tượng hoặc viền đậm."
  - question: "Độ dài dòng dễ đọc nhất cho đoạn văn thường vào khoảng bao nhiêu ký tự?"
    options: ["10–20", "45–75", "120–150", "Càng dài càng tốt"]
    answer: 1
    explain: "Dòng quá dài khiến mắt khó tìm đầu dòng tiếp theo; quá ngắn làm nhịp đọc bị ngắt liên tục."
  - question: "Thang cỡ chữ (type scale) tỉ lệ 1.25 với cỡ gốc 16px thì cấp kế tiếp là bao nhiêu?"
    options: ["17px", "20px", "24px", "32px"]
    answer: 1
    explain: "16 × 1.25 = 20; cấp tiếp theo 20 × 1.25 = 25, rồi 31.25…"
---

## Giải thích khái niệm

### Màu sắc có nhiệm vụ, không chỉ để trang trí

Màu trong giao diện làm ba việc: tạo **nhận diện thương hiệu**, dẫn **sự chú ý** (nút chính, liên kết), và truyền đạt **trạng thái** (thành công, cảnh báo, lỗi). Một bảng màu gọn gàng thường gồm:

- **Màu chính** (primary): màu thương hiệu, dùng cho hành động chính và điểm nhấn. Dùng tiết kiệm.
- **Màu trung tính** (neutral): các sắc độ xám cho chữ, nền, viền. Đây là phần lớn diện tích giao diện.
- **Màu trạng thái**: xanh lá cho thành công, vàng cam cho cảnh báo, đỏ cho lỗi, xanh dương cho thông tin.

Quy tắc kinh nghiệm **60–30–10**: khoảng 60% diện tích màu nền trung tính, 30% màu phụ (thẻ, khối), 10% màu nhấn. Giống cách phối đồ: quần áo màu cơ bản, một món phụ kiện nổi bật.

### Tương phản: đọc được mới là đẹp

Chữ xám nhạt trên nền trắng trông "thanh lịch" trên màn hình đẹp trong phòng tối, nhưng gần như không đọc được ngoài nắng hay với người thị lực kém. Bộ hướng dẫn trợ năng **WCAG** (Web Content Accessibility Guidelines) đưa ra con số cụ thể. **Tỉ lệ tương phản** tính từ độ sáng tương đối của hai màu, từ 1:1 (giống hệt) đến 21:1 (đen trên trắng):

| Loại nội dung | Mức AA (tối thiểu) | Mức AAA |
|---|---|---|
| Chữ thường | 4.5:1 | 7:1 |
| Chữ lớn (≥ 24px, hoặc ≥ 18.66px đậm) | 3:1 | 4.5:1 |
| Thành phần giao diện (viền ô nhập, biểu tượng) | 3:1 | – |

Ngoài ra, **đừng truyền đạt thông tin chỉ bằng màu**. Khoảng 1 trong 12 nam giới có dạng khó phân biệt màu, phổ biến nhất là đỏ – xanh lá. Ô nhập lỗi nên có cả viền đỏ **và** dòng chữ giải thích; biểu đồ nên có nhãn, không chỉ có màu.

### Typography: nghệ thuật trình bày chữ

Phần lớn nội dung web là chữ, nên **typography** (nghệ thuật trình bày chữ) quyết định trang có dễ đọc hay không. Những yếu tố chính:

- **Phông chữ** (typeface): giới hạn 1–2 họ phông cho cả website. Phông không chân (sans-serif) dễ đọc trên màn hình; phông có chân (serif) hợp tiêu đề hoặc bài đọc dài mang tính trang trọng. Với tiếng Việt, **bắt buộc** chọn phông hỗ trợ đầy đủ dấu, nếu không dấu sẽ bị lệch hoặc hiển thị bằng phông dự phòng. Phông hệ thống (`system-ui`) là lựa chọn an toàn, tải nhanh.
- **Cỡ chữ**: nội dung chính trên web thường từ 16px trở lên. Dùng đơn vị `rem` để tôn trọng cỡ chữ người dùng chọn.
- **Thang cỡ chữ** (type scale): thay vì chọn cỡ chữ ngẫu nhiên, nhân lên theo một tỉ lệ cố định, ví dụ 1.25. Các cấp tiêu đề sẽ hài hòa với nhau.
- **Khoảng cách dòng** (line-height): đoạn văn khoảng 1.5–1.7; tiêu đề lớn nên chặt hơn, 1.1–1.3.
- **Độ dài dòng**: khoảng 45–75 ký tự mỗi dòng là dễ đọc nhất. Trong CSS, `max-width: 65ch` (`ch` là độ rộng một ký tự) giới hạn độ dài dòng gọn gàng.
- **Độ đậm**: dùng 2–3 mức (thường 400 cho chữ thường, 600–700 cho tiêu đề, nhấn mạnh).

## Code mẫu có chú thích

Tính tỉ lệ tương phản theo công thức WCAG để kiểm tra bảng màu trước khi dùng:

```js
// Độ sáng tương đối của một màu hex theo WCAG 2.x
function doSang(hex) {
  const [r, g, b] = hex.match(/[0-9a-f]{2}/gi).map((x) => parseInt(x, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function tuongPhan(mau1, mau2) {
  const [sang, toi] = [doSang(mau1), doSang(mau2)].sort((a, b) => b - a);
  return (sang + 0.05) / (toi + 0.05);
}

const capCanKiem = [
  ['#1d2129', '#ffffff', 'Chữ chính trên nền trắng'],
  ['#9ca3af', '#ffffff', 'Chữ xám nhạt trên nền trắng'],
  ['#4b5563', '#ffffff', 'Chữ xám đậm trên nền trắng'],
  ['#ffffff', '#f05123', 'Chữ trắng trên nút cam sáng'],
  ['#ffffff', '#c2410c', 'Chữ trắng trên nút cam đậm'],
];
for (const [chu, nen, moTa] of capCanKiem) {
  const tl = tuongPhan(chu, nen);
  console.log(`${moTa}: ${tl.toFixed(2)}:1 ${tl >= 4.5 ? 'đạt AA' : tl >= 3 ? 'chỉ đạt cho chữ lớn' : 'KHÔNG đạt'}`);
}
```

```text output
Chữ chính trên nền trắng: 16.13:1 đạt AA
Chữ xám nhạt trên nền trắng: 2.54:1 KHÔNG đạt
Chữ xám đậm trên nền trắng: 7.56:1 đạt AA
Chữ trắng trên nút cam sáng: 3.56:1 chỉ đạt cho chữ lớn
Chữ trắng trên nút cam đậm: 5.18:1 đạt AA
```

Kết quả cho thấy một bài học thực tế: màu cam sáng bắt mắt nhưng chữ trắng trên nó chỉ đạt chuẩn khi chữ đủ lớn; với nút chữ thường, nên dùng sắc cam đậm hơn.

Tạo thang cỡ chữ tỉ lệ 1.25 từ cỡ gốc 16px:

```js
const coGoc = 16;
const tiLe = 1.25;
const ten = ['small', 'base', 'h4', 'h3', 'h2', 'h1'];
ten.forEach((t, i) => {
  const px = coGoc * tiLe ** (i - 1);         // small = một cấp nhỏ hơn base
  console.log(`${t.padEnd(5)} ${px.toFixed(2)}px = ${(px / 16).toFixed(3)}rem`);
});
```

```text output
small 12.80px = 0.800rem
base  16.00px = 1.000rem
h4    20.00px = 1.250rem
h3    25.00px = 1.563rem
h2    31.25px = 1.953rem
h1    39.06px = 2.441rem
```

Đưa kết quả vào CSS dưới dạng biến:

```css
:root {
  /* Màu */
  --mau-chinh: #c2410c;
  --mau-chu: #1d2129;
  --mau-chu-phu: #4b5563;
  --mau-nen: #ffffff;
  --mau-vien: #e5e7eb;
  --mau-thanh-cong: #15803d;
  --mau-loi: #b91c1c;

  /* Chữ */
  --phong: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --co-nho: 0.8rem;
  --co-goc: 1rem;
  --co-h3: 1.563rem;
  --co-h2: 1.953rem;
  --co-h1: 2.441rem;
}

body {
  font-family: var(--phong);
  font-size: var(--co-goc);
  line-height: 1.6;
  color: var(--mau-chu);
  background: var(--mau-nen);
}

h1, h2, h3 { line-height: 1.2; font-weight: 700; }
h1 { font-size: var(--co-h1); }
h2 { font-size: var(--co-h2); }

.bai-viet p { max-width: 65ch; }   /* độ dài dòng dễ đọc */

.o-loi {
  border: 2px solid var(--mau-loi); /* không chỉ dựa vào màu: kèm thông báo chữ bên dưới */
}
```

## Lỗi hay gặp

**1. Chữ xám nhạt "cho đẹp".** Như phép tính trên, `#9ca3af` trên nền trắng chỉ đạt 2.54:1. Dùng các sắc xám đậm hơn cho chữ, giữ xám nhạt cho viền, nền.

**2. Quá nhiều phông và cỡ chữ.** Ba họ phông, chín cỡ chữ khác nhau làm trang lộn xộn. Dùng một thang cỡ chữ và tối đa hai họ phông.

**3. Phông không hỗ trợ tiếng Việt.** Dấu bị lệch, chữ "ư", "ơ" hiển thị bằng phông khác. Luôn thử phông với một câu tiếng Việt đầy đủ dấu, ví dụ "Thường xuyên luyện tập để giỏi hơn mỗi ngày".

**4. Dòng chữ chạy hết màn hình rộng.** Trên màn hình 1920px, một dòng có thể dài 200 ký tự. Giới hạn bằng `max-width` theo `ch`.

**5. Màu trạng thái lệch ý nghĩa.** Dùng đỏ cho nút "Lưu" khiến người dùng tưởng là hành động nguy hiểm. Giữ ý nghĩa quen thuộc của màu trạng thái.

## Bài tập thực hành

Thiết kế bảng màu và chữ cho một website "Thư viện sách cũ": chọn một màu chính, bốn sắc trung tính, ba màu trạng thái; kiểm tra bằng hàm `tuongPhan` để mọi cặp chữ/nền dùng cho chữ thường đều đạt từ 4.5:1. Chọn phông và thang cỡ chữ, viết thành biến CSS.

Gợi ý: thử nhiều sắc độ của màu chính; nếu chữ trắng trên màu chính không đạt, hãy làm màu chính tối hơn hoặc dùng chữ tối trên nền màu chính.

<details>
<summary>Xem lời giải mẫu</summary>

```js
function doSang(hex) {
  const [r, g, b] = hex.match(/[0-9a-f]{2}/gi).map((x) => parseInt(x, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const tuongPhan = (a, b) => { const [s, t] = [doSang(a), doSang(b)].sort((x, y) => y - x); return (s + 0.05) / (t + 0.05); };

const bangMau = { chinh: '#7c2d12', chu: '#292524', chuPhu: '#57534e', nen: '#faf7f2' };
for (const [ten, mau] of [['chữ trên nền', bangMau.chu], ['chữ phụ trên nền', bangMau.chuPhu], ['màu chính trên nền', bangMau.chinh]]) {
  console.log(ten, tuongPhan(mau, bangMau.nen).toFixed(2), tuongPhan(mau, bangMau.nen) >= 4.5 ? 'đạt' : 'chưa đạt');
}
console.log('chữ trắng trên nút', tuongPhan('#ffffff', bangMau.chinh).toFixed(2));
```

```text output
chữ trên nền 14.19 đạt
chữ phụ trên nền 7.14 đạt
màu chính trên nền 8.77 đạt
chữ trắng trên nút 9.37
```

```css
:root {
  --mau-chinh: #7c2d12;      /* nâu đỏ gợi màu bìa sách cũ */
  --mau-chu: #292524;
  --mau-chu-phu: #57534e;
  --mau-nen: #faf7f2;        /* nền giấy ngà */
  --mau-vien: #e7e5e4;
  --phong-tieu-de: Georgia, "Times New Roman", serif;
  --phong-noi-dung: system-ui, sans-serif;
}
```

</details>

## Tóm tắt

- Bảng màu gồm màu chính (dùng tiết kiệm), màu trung tính (chiếm phần lớn), màu trạng thái; quy tắc 60–30–10.
- Kiểm tra tương phản theo WCAG: chữ thường ≥ 4.5:1, chữ lớn ≥ 3:1; không truyền thông tin chỉ bằng màu.
- Typography: 1–2 họ phông hỗ trợ tiếng Việt, cỡ chữ ≥ 16px, thang cỡ chữ theo tỉ lệ, `line-height` 1.5–1.7, dòng 45–75 ký tự.
- Viết màu và chữ thành biến CSS để dùng thống nhất.
- Đo bằng số liệu (tỉ lệ tương phản, thang cỡ chữ) thay vì cảm giác.

## Đọc thêm

- [Tương phản màu – MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Perceivable/Color_contrast)
- [Định dạng văn bản cơ bản – MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Text_styling/Fundamentals)
- [Đơn vị và giá trị CSS – MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Values_and_units)
