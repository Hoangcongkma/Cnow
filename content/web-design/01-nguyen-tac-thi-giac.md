---
title: "Nguyên tắc thị giác"
minutes: 15
preview: true
objectives:
  - "Hiểu vì sao thiết kế tốt là thiết kế giúp người dùng hoàn thành việc dễ dàng"
  - "Áp dụng phân cấp thị giác (visual hierarchy) để dẫn mắt người xem"
  - "Vận dụng các nguyên tắc gần nhau, căn lề, lặp lại, tương phản và khoảng trắng"
  - "Nhận xét, góp ý một giao diện bằng các nguyên tắc trên thay vì cảm tính"
quiz:
  - question: "Phân cấp thị giác (visual hierarchy) giúp gì cho người xem?"
    options: ["Làm trang có nhiều màu hơn", "Biết nên nhìn gì trước, gì sau, cái gì quan trọng nhất", "Tăng số lượng nội dung", "Giảm dung lượng ảnh"]
    answer: 1
    explain: "Kích thước, độ đậm, màu, vị trí tạo thứ bậc để mắt đi theo đúng thứ tự bạn muốn."
  - question: "Theo nguyên tắc gần nhau (proximity), nhãn của một ô nhập nên đặt thế nào?"
    options: ["Cách xa ô nhập để thoáng", "Gần ô nhập của nó hơn so với các ô khác", "Ở cuối form", "Không cần nhãn"]
    answer: 1
    explain: "Các thứ đặt gần nhau được hiểu là có liên quan; nhãn lơ lửng giữa hai ô gây nhầm lẫn."
  - question: "Trang có năm nút đều to, đều đỏ, đều đậm. Vấn đề là gì?"
    options: ["Không có vấn đề", "Thiếu tương phản: khi mọi thứ đều nổi bật thì không gì nổi bật", "Quá ít màu", "Nút quá nhỏ"]
    answer: 1
    explain: "Tương phản chỉ hiệu quả khi có sự khác biệt; hãy chọn một hành động chính nổi bật nhất."
  - question: "Khoảng trắng (white space) trong thiết kế là gì?"
    options: ["Chỗ trống bị lãng phí, nên lấp đầy", "Khoảng trống quanh và giữa các phần tử, giúp nội dung dễ đọc và có nhịp", "Bắt buộc phải màu trắng", "Chỉ có ở lề trang"]
    answer: 1
    explain: "Khoảng trắng không nhất thiết màu trắng; nó là không gian thở giúp nhóm nội dung và tạo tập trung."
---

## Giải thích khái niệm

### Thiết kế là giải quyết vấn đề, không chỉ là trang trí

Nhiều người nghĩ thiết kế web là chọn màu đẹp, phông chữ lạ. Thực ra một giao diện tốt trước hết phải **giúp người dùng làm được việc** của họ nhanh và ít nhầm lẫn: tìm khóa học phù hợp, đăng ký, thanh toán. Cái đẹp là hệ quả của sự rõ ràng, nhất quán và có chủ đích.

Hãy nghĩ đến biển báo trong sân bay. Không ai cần biển báo "nghệ thuật"; người ta cần thấy ngay "Cửa ra máy bay số 12 →" khi đang vội. Giao diện web cũng vậy: người dùng không đọc kỹ từng chữ mà **lướt nhìn**, nắm ý chính trong vài giây đầu. Nhiệm vụ của người thiết kế là sắp xếp sao cho cái lướt nhìn đó đúng hướng.

### Phân cấp thị giác: dẫn mắt người xem

**Phân cấp thị giác** (visual hierarchy) là việc sắp xếp các phần tử để người xem biết **cái gì quan trọng nhất**, nên nhìn gì trước, gì sau. Những công cụ tạo thứ bậc:

- **Kích thước**: to hơn thì được chú ý trước. Tiêu đề lớn, mô tả nhỏ hơn.
- **Độ đậm và màu**: chữ đậm, màu nhấn nổi bật hơn chữ thường, màu xám.
- **Vị trí**: người đọc tiếng Việt quét từ trên xuống, từ trái sang phải; thứ ở phía trên bên trái thường được thấy trước.
- **Khoảng trắng xung quanh**: một phần tử có nhiều không gian bao quanh trông quan trọng hơn.

Một bài kiểm tra đơn giản: **nheo mắt** nhìn màn hình cho mọi thứ nhòe đi. Bạn vẫn thấy rõ tiêu đề và nút hành động chính chứ? Nếu mọi thứ nhòe như nhau, trang đang thiếu phân cấp.

### Năm nguyên tắc nền tảng

**1. Gần nhau (proximity).** Những thứ liên quan đặt gần nhau, thứ không liên quan tách xa. Mắt người tự nhóm các phần tử gần nhau thành một khối. Ví dụ: ảnh, tên và giá của một sản phẩm nằm sát nhau trong một thẻ; khoảng cách giữa hai thẻ phải lớn hơn rõ rệt khoảng cách bên trong thẻ.

**2. Căn lề (alignment).** Mọi phần tử nên căn theo một đường kẻ vô hình nào đó. Căn lề tạo cảm giác ngăn nắp, chuyên nghiệp; đặt lộn xộn mỗi thứ một kiểu tạo cảm giác cẩu thả dù từng phần tử đều đẹp. Với văn bản dài, căn trái dễ đọc hơn căn giữa.

**3. Lặp lại (repetition).** Dùng lại cùng kiểu nút, cùng màu nhấn, cùng khoảng cách, cùng cách trình bày thẻ ở khắp website. Lặp lại tạo **nhất quán**: người dùng học một lần, hiểu ở mọi nơi. Đây cũng là nền tảng của "hệ thống thiết kế" (design system) mà bài Prototype sẽ nhắc tới.

**4. Tương phản (contrast).** Khác biệt rõ rệt để nhấn mạnh: chữ tối trên nền sáng, nút chính màu đậm cạnh nút phụ dạng viền. Nguyên tắc quan trọng: **nếu mọi thứ đều nổi bật thì không gì nổi bật**. Mỗi màn hình nên có **một** hành động chính.

**5. Khoảng trắng (white space).** Khoảng trống quanh và giữa các phần tử, không nhất thiết là màu trắng. Khoảng trắng không phải chỗ lãng phí cần lấp đầy; nó giúp nội dung dễ đọc, tạo nhịp, và làm phần tử quan trọng nổi bật. Một trang nhồi nhét thông tin khiến người dùng mệt và bỏ đi.

### Định luật của mắt: Gestalt

Những nguyên tắc trên bắt nguồn một phần từ tâm lý học **Gestalt**: não người có xu hướng nhìn tổng thể và tự nhóm các phần tử theo sự gần nhau, giống nhau (cùng màu, cùng hình), cùng hướng chuyển động hay cùng nằm trong một khung. Hiểu điều này giúp bạn dự đoán người dùng sẽ "đọc" giao diện thế nào trước cả khi họ đọc chữ.

## Code mẫu có chú thích

Áp dụng các nguyên tắc vào một thẻ khóa học bằng CSS. Chú ý cách khoảng cách **bên trong** thẻ nhỏ hơn khoảng cách **giữa** các thẻ (gần nhau), mọi chữ căn cùng một lề trái (căn lề), và chỉ có một nút nổi bật (tương phản):

```css
:root {
  --khoang-nho: 8px;      /* khoảng cách trong nhóm */
  --khoang-vua: 16px;
  --khoang-lon: 32px;     /* khoảng cách giữa các nhóm */
  --mau-nhan: #c2410c;    /* một màu nhấn duy nhất cho hành động chính */
  --mau-chu: #1d2129;
  --mau-phu: #4b5563;
}

.danh-sach-the {
  display: grid;
  gap: var(--khoang-lon);          /* thẻ cách nhau xa → rõ là các nhóm riêng */
}

.the {
  padding: var(--khoang-vua);
  display: grid;
  gap: var(--khoang-nho);          /* nội dung trong thẻ sát nhau → một nhóm */
  text-align: left;                /* mọi thứ căn chung một lề */
}

.the-ten { font-size: 1.25rem; font-weight: 700; color: var(--mau-chu); } /* cấp 1 */
.the-mo-ta { font-size: 0.95rem; color: var(--mau-phu); }                 /* cấp 2 */
.the-gia { font-weight: 700; }

.nut-chinh {                        /* hành động chính: đặc, màu nhấn */
  background: var(--mau-nhan);
  color: #fff;
  border: 0;
  padding: 10px 20px;
  border-radius: 999px;
}

.nut-phu {                          /* hành động phụ: chỉ có viền, kém nổi bật hơn */
  background: transparent;
  color: var(--mau-nhan);
  border: 1px solid currentColor;
  padding: 10px 20px;
  border-radius: 999px;
}
```

Biến CSS (`--khoang-vua`, `--mau-nhan`) giúp **lặp lại** đúng các giá trị ở mọi nơi; đổi một chỗ là cả trang đổi theo.

## Lỗi hay gặp

**1. Khoảng cách đều tăm tắp ở mọi nơi.** Nếu khoảng cách giữa tiêu đề và đoạn văn bằng khoảng cách giữa hai mục khác nhau, người xem không biết cái gì đi với cái gì. Khoảng cách phải phản ánh quan hệ.

**2. Quá nhiều điểm nhấn.** Năm màu nhấn, ba cỡ chữ đậm, mọi nút đều đỏ: mắt người xem không biết bắt đầu từ đâu. Chọn một hành động chính cho mỗi màn hình.

**3. Căn giữa mọi thứ.** Căn giữa hợp với tiêu đề ngắn, khẩu hiệu. Đoạn văn dài, danh sách, form căn giữa khiến mắt phải tìm điểm bắt đầu của mỗi dòng, rất mệt.

**4. Thiếu nhất quán.** Nút "Mua" ở trang này bo tròn màu cam, ở trang khác vuông màu xanh. Người dùng phải học lại giao diện ở mỗi trang và dễ nghi ngờ mình bấm nhầm.

**5. Thiết kế theo sở thích cá nhân.** "Mình thích màu tím" không phải lý do. Hãy giải thích quyết định bằng nguyên tắc và mục tiêu của người dùng; khi góp ý cho người khác cũng vậy.

## Bài tập thực hành

Chọn trang chủ của một website bạn hay dùng (tin tức, mua sắm, học tập). Chụp màn hình và trả lời:

1. Nheo mắt nhìn: ba thứ bạn thấy đầu tiên là gì? Có đúng là thứ quan trọng nhất không?
2. Tìm một ví dụ tốt và một ví dụ chưa tốt cho mỗi nguyên tắc: gần nhau, căn lề, lặp lại, tương phản, khoảng trắng.
3. Hành động chính của trang là gì? Nó có nổi bật hơn mọi thứ khác không?
4. Đề xuất ba thay đổi cụ thể, mỗi thay đổi gắn với một nguyên tắc.

Gợi ý: viết góp ý theo mẫu "Vấn đề – Nguyên tắc – Đề xuất", tránh nhận xét chung chung như "trông chưa đẹp".

<details>
<summary>Xem bài mẫu</summary>

Ví dụ nhận xét trang danh sách khóa học của một website học trực tuyến:

- **Vấn đề:** tên khóa học, giá và nút "Đăng ký" có cùng cỡ chữ và độ đậm. **Nguyên tắc:** phân cấp thị giác, tương phản. **Đề xuất:** tăng cỡ chữ tên khóa học, giảm độ đậm của mô tả, chỉ nút "Đăng ký" dùng màu nhấn.
- **Vấn đề:** khoảng cách giữa các thẻ chỉ 8px, bằng khoảng cách bên trong thẻ, nhìn như một khối liền. **Nguyên tắc:** gần nhau. **Đề xuất:** tăng khoảng cách giữa các thẻ lên 24–32px.
- **Vấn đề:** trang có ba kiểu nút khác nhau cho cùng một hành động "Xem chi tiết". **Nguyên tắc:** lặp lại. **Đề xuất:** thống nhất một kiểu nút phụ cho mọi hành động "Xem chi tiết".

</details>

## Tóm tắt

- Thiết kế tốt giúp người dùng hoàn thành việc nhanh, ít nhầm; cái đẹp đến từ sự rõ ràng và nhất quán.
- Phân cấp thị giác bằng kích thước, độ đậm, màu, vị trí, khoảng trắng; kiểm tra bằng cách nheo mắt.
- Năm nguyên tắc: gần nhau, căn lề, lặp lại, tương phản, khoảng trắng.
- Mỗi màn hình nên có một hành động chính nổi bật nhất.
- Góp ý theo mẫu Vấn đề – Nguyên tắc – Đề xuất, không theo cảm tính.

## Đọc thêm

- [Biến CSS (custom properties) – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Khoảng cách và căn chỉnh với box alignment – MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_box_alignment)
