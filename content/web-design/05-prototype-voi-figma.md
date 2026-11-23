---
title: "Prototype với Figma"
minutes: 16
preview: false
objectives:
  - "Nắm quy trình từ ý tưởng đến giao diện: luồng người dùng, wireframe, mockup, prototype"
  - "Hiểu các khái niệm chính của Figma: frame, component, variant, auto layout, style/variable"
  - "Tạo prototype có tương tác và tổ chức kiểm thử với người dùng"
  - "Bàn giao thiết kế cho lập trình viên bằng design token và biến CSS"
quiz:
  - question: "Wireframe khác mockup ở điểm nào?"
    options: ["Wireframe có đầy đủ màu và ảnh thật", "Wireframe là bản phác thảo bố cục đơn giản (thường đen trắng); mockup là bản hoàn chỉnh về hình ảnh", "Mockup là bản phác trên giấy", "Hai từ hoàn toàn giống nhau"]
    answer: 1
    explain: "Wireframe tập trung vào cấu trúc và nội dung; mockup thêm màu, chữ, hình ảnh như sản phẩm thật."
  - question: "Auto layout trong Figma tương đương gần nhất với gì trong CSS?"
    options: ["position: absolute", "Flexbox", "float", "z-index"]
    answer: 1
    explain: "Auto layout xếp các phần tử theo hàng hoặc cột với khoảng cách và padding, giống display: flex với gap và padding."
  - question: "Component trong Figma giúp gì?"
    options: ["Tạo ảnh động", "Định nghĩa một thành phần (như nút) một lần, dùng lại nhiều nơi; sửa bản gốc thì mọi bản sao cập nhật", "Xuất file PDF", "Đặt mật khẩu cho file"]
    answer: 1
    explain: "Component và các instance của nó giữ giao diện nhất quán, giống như hàm/thành phần tái sử dụng trong code."
  - question: "Khi kiểm thử prototype với người dùng, bạn nên làm gì?"
    options: ["Giải thích từng nút trước khi họ bấm", "Giao nhiệm vụ cụ thể, quan sát và ghi lại chỗ họ gặp khó, hạn chế gợi ý", "Chỉ hỏi họ có thích màu không", "Tự làm thay người dùng"]
    answer: 1
    explain: "Mục tiêu là phát hiện chỗ khó hiểu; nếu bạn gợi ý, bạn che mất chính vấn đề cần tìm."
---

## Giải thích khái niệm

### Vì sao không nhảy thẳng vào code?

Xây nhà không ai đổ móng ngay khi vừa có ý tưởng; kiến trúc sư phác thảo, vẽ mặt bằng, dựng mô hình, chủ nhà xem và góp ý, rồi mới thi công. Sửa một nét vẽ rẻ hơn rất nhiều so với đập một bức tường. Giao diện web cũng vậy: thay đổi trên bản thiết kế mất vài phút, thay đổi trên sản phẩm đã lập trình có thể mất vài ngày.

**Prototype** (bản mẫu) là phiên bản có thể bấm thử của giao diện, đủ thật để người dùng trải nghiệm luồng chính, nhưng chưa cần lập trình gì. **Figma** là công cụ thiết kế giao diện phổ biến, chạy ngay trên trình duyệt, cho nhiều người cùng làm việc trên một file; bản miễn phí đủ để bạn học và làm dự án cá nhân.

### Quy trình từ ý tưởng đến giao diện

1. **Hiểu người dùng và mục tiêu**: ai sẽ dùng, họ cần làm gì, khó khăn hiện tại là gì.
2. **Luồng người dùng** (user flow): các bước để hoàn thành một việc, ví dụ "tìm khóa học → xem chi tiết → đăng ký → thanh toán → vào học".
3. **Wireframe**: bản phác bố cục đơn giản, thường chỉ khung xám và chữ, tập trung vào **cái gì nằm ở đâu**. Có thể vẽ trên giấy.
4. **Mockup**: bản hoàn chỉnh về hình ảnh với màu, chữ, ảnh thật, áp dụng các nguyên tắc ở những bài trước.
5. **Prototype**: nối các màn hình mockup bằng tương tác để bấm thử.
6. **Kiểm thử với người dùng**, sửa, lặp lại.
7. **Bàn giao** (handoff) cho lập trình viên.

Không phải dự án nào cũng cần đủ bảy bước, nhưng thứ tự "phác đơn giản trước, chi tiết sau" luôn đúng: đừng tốn công tô màu cho một bố cục còn chưa chắc chắn.

### Khái niệm chính trong Figma

- **Frame**: khung chứa, thường là một màn hình (chọn sẵn kích thước điện thoại, máy tính) hoặc một khối bên trong. Frame có thể lồng nhau như thẻ `<div>`.
- **Auto layout**: cho frame tự xếp các phần tử con theo hàng hoặc cột, có khoảng cách và padding, tự co giãn theo nội dung. Đây gần như chính là **Flexbox** của CSS, nên thiết kế bằng auto layout giúp lập trình viên chuyển sang code rất tự nhiên.
- **Component**: một thành phần định nghĩa một lần (nút, thẻ khóa học, thanh điều hướng), dùng lại ở nhiều nơi dưới dạng **instance**. Sửa component gốc, mọi instance cập nhật theo, giống như sửa một hàm dùng chung.
- **Variant**: các phiên bản của cùng một component, ví dụ nút chính/phụ, trạng thái thường/hover/vô hiệu hóa, cỡ lớn/nhỏ.
- **Style và variable**: lưu màu, kiểu chữ, khoảng cách thành giá trị có tên (`mau/chinh`, `khoang/3`), dùng thống nhất cho cả file. Đây là nền móng của **design token** ở phần bàn giao.
- **Prototype**: nối một phần tử với màn hình khác ("khi bấm nút Đăng ký → chuyển tới màn hình Thanh toán"), chọn hiệu ứng chuyển cảnh, rồi bấm Present để chạy thử như ứng dụng thật, kể cả trên điện thoại.

### Kiểm thử với người dùng

Chỉ cần **3–5 người** dùng thử là đã phát hiện phần lớn vấn đề nghiêm trọng của một giao diện. Cách làm đơn giản:

- Giao **nhiệm vụ cụ thể**: "Hãy tìm một khóa học JavaScript miễn phí và đăng ký", không hỏi "Bạn thấy trang thế nào?".
- Đề nghị họ **nói to suy nghĩ** khi thao tác.
- **Quan sát, ghi chép, đừng gợi ý**. Nếu bạn phải giải thích, đó chính là chỗ giao diện cần sửa.
- Tổng hợp những chỗ nhiều người cùng vấp, ưu tiên sửa trước.

### Bàn giao: từ thiết kế sang code

Bàn giao tốt không phải gửi một file ảnh rồi để lập trình viên "đo bằng mắt". Những gì cần thống nhất:

- **Design token**: màu, cỡ chữ, khoảng cách, bo góc có tên, được chuyển thẳng thành biến CSS. Thiết kế và code dùng **cùng một bộ tên**.
- **Trạng thái của component**: hover, focus (cho bàn phím), vô hiệu hóa, lỗi, đang tải, danh sách rỗng.
- **Hành vi responsive**: mỗi khối thay đổi thế nào ở các kích thước màn hình.
- **Nội dung thật**: tên dài, ảnh thiếu, giá nhiều chữ số; thiết kế chỉ với dữ liệu "đẹp" thường vỡ khi gặp dữ liệu thật.

Chế độ dành cho lập trình viên của Figma cho phép xem kích thước, khoảng cách và mã CSS gợi ý của từng phần tử, nhưng mã đó chỉ nên dùng để tham khảo; cấu trúc CSS tốt vẫn do lập trình viên quyết định.

## Code mẫu có chú thích

Design token xuất từ công cụ thiết kế thường ở dạng JSON. Đoạn sau chuyển chúng thành biến CSS, để thiết kế và code luôn dùng cùng một nguồn giá trị:

```js
const tokens = {
  mau: { chinh: '#c2410c', chu: '#1d2129', nen: '#ffffff', vien: '#e5e7eb' },
  khoang: { 1: '8px', 2: '16px', 3: '24px', 4: '32px' },
  bo: { nho: '8px', vua: '12px', tron: '999px' },
};

// Duyệt lồng nhau: { mau: { chinh } } → --mau-chinh
function sangBienCss(obj, tienTo = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' ? sangBienCss(v, `${tienTo}${k}-`) : [`  --${tienTo}${k}: ${v};`]);
}

console.log(`:root {\n${sangBienCss(tokens).join('\n')}\n}`);
```

```text output
:root {
  --mau-chinh: #c2410c;
  --mau-chu: #1d2129;
  --mau-nen: #ffffff;
  --mau-vien: #e5e7eb;
  --khoang-1: 8px;
  --khoang-2: 16px;
  --khoang-3: 24px;
  --khoang-4: 32px;
  --bo-nho: 8px;
  --bo-vua: 12px;
  --bo-tron: 999px;
}
```

Một component "nút" với các variant trong Figma tương ứng với CSS như sau. Auto layout ngang, padding 12 × 20, khoảng cách 8 giữa biểu tượng và chữ chính là `display: inline-flex`, `padding`, `gap`:

```css
.nut {
  display: inline-flex;           /* auto layout ngang */
  align-items: center;
  gap: var(--khoang-1);           /* khoảng cách giữa biểu tượng và chữ */
  padding: 12px 20px;             /* padding của auto layout */
  border-radius: var(--bo-tron);
  font-weight: 700;
  border: 1px solid transparent;
  cursor: pointer;
}

/* Variant: kiểu */
.nut--chinh { background: var(--mau-chinh); color: #fff; }
.nut--phu { background: transparent; color: var(--mau-chinh); border-color: currentColor; }

/* Variant: trạng thái */
.nut:focus-visible { outline: 3px solid var(--mau-chinh); outline-offset: 2px; } /* cho người dùng bàn phím */
.nut:disabled { opacity: 0.5; cursor: not-allowed; }
```

## Lỗi hay gặp

**1. Làm mockup đẹp ngay từ đầu.** Tốn hàng giờ chọn màu cho một bố cục mà buổi kiểm thử đầu tiên cho thấy cần đổi hoàn toàn. Phác wireframe trước.

**2. Không dùng component.** Mỗi màn hình tự vẽ lại nút "Đăng ký" với kích thước hơi khác nhau. Đến khi cần đổi màu nút, bạn phải sửa ở 40 chỗ. Tạo component ngay khi một thành phần xuất hiện lần thứ hai.

**3. Đặt vị trí tự do thay vì auto layout.** Thiết kế kéo thả tự do trông ổn với dữ liệu mẫu nhưng vỡ ngay khi chữ dài hơn; lập trình viên cũng khó chuyển sang CSS. Dùng auto layout cho mọi khối có cấu trúc lặp lại.

**4. Chỉ thiết kế trạng thái "hoàn hảo".** Không có trạng thái lỗi, rỗng, đang tải, focus bàn phím. Lập trình viên sẽ phải tự đoán, và giao diện thật thiếu nhất quán.

**5. Kiểm thử bằng cách hỏi ý kiến.** "Bạn thấy đẹp không?" cho câu trả lời lịch sự vô ích. Hãy giao nhiệm vụ và quan sát.

## Bài tập thực hành

Thiết kế luồng "đăng ký khóa học miễn phí" cho Cnow gồm 3 màn hình điện thoại: danh sách khóa học, chi tiết khóa học, thông báo đăng ký thành công. Yêu cầu: dùng auto layout cho mọi khối; tạo component "thẻ khóa học" và "nút" (có variant chính/phụ, thường/vô hiệu hóa); nối thành prototype bấm được; nhờ 3 người bạn thử với nhiệm vụ "Đăng ký một khóa học HTML miễn phí" và ghi lại ba chỗ họ chần chừ lâu nhất.

Gợi ý: bắt đầu bằng wireframe trên giấy cho cả 3 màn hình trong 10 phút, rồi mới mở Figma.

<details>
<summary>Xem bài mẫu</summary>

**Luồng:** Danh sách (lọc "Miễn phí") → bấm thẻ "HTML, CSS" → Chi tiết (nội dung, số bài, nút "Đăng ký học miễn phí") → bấm nút → Thành công (thông báo + nút "Vào học ngay").

**Component:**
- `Nút` – variant `Kiểu: Chính | Phụ`, `Trạng thái: Thường | Vô hiệu hóa`; auto layout ngang, padding 12/20, gap 8, bo góc tròn.
- `Thẻ khóa học` – auto layout dọc, padding 16, gap 8: ảnh bìa, tên, mô tả hai dòng, hàng "trình độ – số bài", giá.

**Ghi chép kiểm thử (ví dụ):**

| Người | Chỗ chần chừ | Nguyên nhân dự đoán | Đề xuất sửa |
|---|---|---|---|
| 1 | Không thấy bộ lọc "Miễn phí" | Bộ lọc nằm dưới ảnh lớn đầu trang | Đưa bộ lọc lên ngay dưới tiêu đề |
| 2 | Bấm vào giá thay vì thẻ | Chỉ có tên khóa học bấm được | Cho cả thẻ bấm được |
| 3 | Lo ngại bị tính tiền | Nút chỉ ghi "Đăng ký" | Đổi thành "Đăng ký học miễn phí" |

</details>

## Tóm tắt

- Thiết kế trước khi code giúp sửa sai rẻ hơn; prototype là bản mẫu bấm thử được.
- Quy trình: hiểu người dùng → luồng → wireframe → mockup → prototype → kiểm thử → bàn giao.
- Figma: frame, auto layout (≈ Flexbox), component/instance, variant, style/variable, prototype.
- Kiểm thử với 3–5 người bằng nhiệm vụ cụ thể, quan sát và không gợi ý.
- Bàn giao bằng design token chuyển thành biến CSS, đủ các trạng thái và hành vi responsive.

## Đọc thêm

- [Biến CSS (custom properties) – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Flexbox – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Basic_concepts_of_flexbox)
- [:focus-visible – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible)
