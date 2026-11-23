---
title: "Thẻ văn bản, liên kết, hình ảnh"
minutes: 15
preview: false
objectives:
  - "Trình bày văn bản bằng đoạn văn, tiêu đề, chữ nhấn mạnh và danh sách"
  - "Tạo liên kết (link) tới trang khác, tới khu vực trong trang và tới email"
  - "Chèn hình ảnh có văn bản thay thế (alt) đầy đủ, đúng đường dẫn"
  - "Phân biệt đường dẫn tuyệt đối và đường dẫn tương đối"
quiz:
  - question: "Thuộc tính alt của thẻ <img> dùng để làm gì?"
    options: ["Đặt kích thước ảnh", "Mô tả nội dung ảnh cho người không xem được ảnh", "Tạo hiệu ứng khi rê chuột", "Chọn định dạng ảnh"]
    answer: 1
    explain: "alt được trình đọc màn hình đọc lên và hiển thị khi ảnh không tải được. Ảnh trang trí thuần túy thì để alt=\"\"."
  - question: "Thẻ nào tạo danh sách có đánh số thứ tự?"
    options: ["<ul>", "<ol>", "<li>", "<dl>"]
    answer: 1
    explain: "<ol> (ordered list) đánh số, <ul> (unordered list) dùng dấu chấm; mỗi mục là một <li>."
  - question: "Trang hiện tại là /bai-viet/index.html. Liên kết href=\"anh/meo.jpg\" trỏ tới đâu?"
    options: ["/anh/meo.jpg", "/bai-viet/anh/meo.jpg", "https://anh/meo.jpg", "Không hợp lệ"]
    answer: 1
    explain: "Đường dẫn tương đối tính từ thư mục chứa trang hiện tại, tức /bai-viet/."
  - question: "Khi mở liên kết sang trang web khác trong tab mới (target=\"_blank\"), nên thêm thuộc tính nào?"
    options: ["rel=\"noopener\"", "alt=\"tab moi\"", "type=\"external\"", "lang=\"en\""]
    answer: 0
    explain: "rel=\"noopener\" ngăn trang được mở can thiệp vào trang của bạn qua window.opener."
  - question: "Nên dùng thẻ nào để nhấn mạnh một từ quan trọng về mặt ý nghĩa?"
    options: ["<b>", "<strong>", "<big>", "<h1>"]
    answer: 1
    explain: "<strong> mang nghĩa 'quan trọng', được trình đọc màn hình nhấn giọng; muốn chữ đậm thuần trang trí thì dùng CSS."
---

## Giải thích khái niệm

### Văn bản: đoạn văn, tiêu đề và nhấn mạnh

Nội dung web phần lớn là chữ. Hãy nghĩ về trang báo giấy: có tít lớn, tít phụ, các đoạn văn tách rời, vài chữ in đậm để người đọc lướt nhanh. HTML cung cấp đúng những công cụ đó:

- `<h1>` đến `<h6>`: tiêu đề các cấp, như mục lục sách.
- `<p>`: một đoạn văn (paragraph). Trình duyệt tự thêm khoảng cách giữa các đoạn.
- `<strong>`: nội dung **quan trọng**; `<em>`: nhấn giọng (emphasis), thường hiển thị in nghiêng.
- `<br>`: xuống dòng trong cùng một đoạn, ví dụ khi viết địa chỉ hoặc thơ.

Một điểm dễ bất ngờ: trình duyệt **gộp nhiều dấu cách và dấu xuống dòng** trong code thành một dấu cách. Muốn tách đoạn, bạn phải dùng `<p>`, không thể chỉ nhấn Enter nhiều lần.

### Danh sách

Có hai loại danh sách thường dùng. `<ul>` (unordered list) là danh sách không thứ tự, hiển thị dấu chấm tròn, hợp với "những thứ cần mang theo khi đi dã ngoại". `<ol>` (ordered list) là danh sách có thứ tự, tự đánh số 1, 2, 3, hợp với "các bước nấu ăn". Mỗi mục trong danh sách là một `<li>` (list item). Danh sách có thể lồng nhau: một `<li>` chứa cả một `<ul>` con.

Thực tế, thanh menu của hầu hết trang web cũng được viết bằng danh sách `<ul>` các liên kết, sau đó dùng CSS để xếp ngang.

### Liên kết: sợi chỉ nối các trang

Chữ "H" trong HTML là *hypertext* – siêu văn bản, tức văn bản có thể bấm để nhảy đi nơi khác. Thẻ `<a>` (anchor) với thuộc tính `href` tạo ra liên kết. Có bốn kiểu `href` hay dùng:

1. **Tuyệt đối** (absolute URL): đầy đủ giao thức và tên miền, như `https://developer.mozilla.org/`. Dùng khi trỏ ra trang web khác.
2. **Tương đối** (relative URL): tính từ vị trí trang hiện tại, như `lien-he.html` hay `../index.html` (hai dấu chấm là "lên thư mục cha"). Dùng cho các trang trong cùng website.
3. **Neo trong trang**: `#ten-id`, nhảy tới phần tử có `id` tương ứng.
4. **Email và điện thoại**: `mailto:ban@example.com`, `tel:0901234567`.

Khi muốn mở trang trong tab mới, thêm `target="_blank"` kèm `rel="noopener"`. Đừng lạm dụng tab mới: người dùng thường thích tự quyết định.

Chữ trong liên kết nên **mô tả nơi đến**. "Xem bảng giá khóa học" tốt hơn nhiều so với "Bấm vào đây", nhất là với người dùng trình đọc màn hình, vốn hay nghe lướt danh sách các liên kết.

### Hình ảnh

Thẻ `<img>` là thẻ rỗng, cần hai thuộc tính chính:

- `src`: đường dẫn tới file ảnh (tương đối hoặc tuyệt đối).
- `alt`: **văn bản thay thế** mô tả ảnh. Trình đọc màn hình đọc nó cho người khiếm thị; ảnh không tải được thì chữ này hiện ra. Ảnh chỉ để trang trí thì vẫn viết `alt=""` để trình đọc bỏ qua.

Nên khai báo thêm `width` và `height` (đơn vị pixel) theo tỉ lệ thật của ảnh, giúp trình duyệt giữ chỗ trước, tránh trang bị "nhảy" khi ảnh tải xong. Với ảnh nằm xa phía dưới, `loading="lazy"` giúp trình duyệt chỉ tải khi người dùng cuộn gần tới.

Khi ảnh có chú thích, bọc nó trong `<figure>` cùng `<figcaption>`.

## Code mẫu có chú thích

Một trang công thức nấu ăn nhỏ, dùng đủ các thẻ trong bài:

```html
<article>
  <h1>Trứng chiên hành</h1>
  <p>Món ăn <strong>dưới 10 phút</strong>, hợp cho bữa sáng <em>vội vàng</em>.</p>

  <figure>
    <!-- Đường dẫn tương đối: thư mục anh nằm cạnh file HTML này -->
    <img src="anh/trung-chien.jpg" alt="Đĩa trứng chiên vàng rắc hành lá" width="640" height="427" loading="lazy">
    <figcaption>Trứng chiên hành – ảnh minh họa</figcaption>
  </figure>

  <h2>Nguyên liệu</h2>
  <ul>
    <li>2 quả trứng gà</li>
    <li>1 nhánh hành lá</li>
    <li>Nước mắm, tiêu</li>
  </ul>

  <h2>Cách làm</h2>
  <ol>
    <li>Đập trứng, cho hành và gia vị, đánh đều.</li>
    <li>Làm nóng chảo với chút dầu.</li>
    <li>Đổ trứng vào, chiên vàng hai mặt.</li>
  </ol>

  <p>
    Tìm hiểu thêm về thẻ ảnh tại
    <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img" target="_blank" rel="noopener">tài liệu MDN về thẻ img</a>.
    Góp ý công thức: <a href="mailto:bep@example.com">bep@example.com</a>.
  </p>
  <p><a href="#">Lên đầu trang</a></p>
</article>
```

Quan sát kết quả: danh sách `<ol>` tự đánh số, `<ul>` có dấu chấm, liên kết email mở ứng dụng thư khi bấm.

### Cấu trúc thư mục và đường dẫn

Giả sử website của bạn có cấu trúc:

```text
du-an/
├── index.html
├── lien-he.html
├── anh/
│   └── logo.png
└── bai-viet/
    └── trung-chien.html
```

Trong `index.html`, ảnh logo là `anh/logo.png`. Nhưng trong `bai-viet/trung-chien.html`, phải viết `../anh/logo.png` (lên một cấp rồi vào thư mục `anh`). Muốn từ bài viết quay về trang chủ: `../index.html`. Một lựa chọn khác là đường dẫn bắt đầu bằng `/` như `/anh/logo.png`, tính từ gốc website, nhưng nó chỉ hoạt động khi trang được chạy qua máy chủ web, không hoạt động khi mở file trực tiếp.

## Lỗi hay gặp

**1. Ảnh không hiện vì sai đường dẫn.** Nguyên nhân phổ biến nhất: sai tên thư mục, sai chữ hoa chữ thường (`Logo.PNG` khác `logo.png` trên máy chủ Linux), hoặc quên `../`. Mở DevTools, tab **Network** hoặc **Console** sẽ thấy lỗi 404 kèm đường dẫn trình duyệt đã thử.

**2. Bỏ trống hoặc viết `alt` vô nghĩa.** `alt="anh1"` hay `alt="image"` không giúp gì cho người dùng trình đọc màn hình. Hãy mô tả điều ảnh truyền tải.

**3. Đặt `<li>` ngoài danh sách.** `<li>` chỉ được nằm trực tiếp trong `<ul>` hoặc `<ol>`:

```html error
<ul>
  <li>Trứng
</ul>
<li>Hành lá</li>
```

**4. Liên kết thiếu giao thức.** Viết `href="www.example.com"` khiến trình duyệt hiểu là đường dẫn tương đối, dẫn tới `.../www.example.com`. Liên kết ra ngoài phải có `https://`.

## Bài tập thực hành

Tạo trang "Top 3 cuốn sách mình thích" gồm: tiêu đề cấp 1; một đoạn giới thiệu có một cụm từ được nhấn mạnh; danh sách có thứ tự ba cuốn sách, mỗi mục có tên sách in đậm; một ảnh bìa (có thể dùng ảnh bất kỳ trong máy) kèm chú thích; cuối trang là liên kết email để bạn bè gợi ý thêm sách.

Gợi ý: đặt ảnh trong thư mục `anh` cạnh file HTML; nhớ viết `alt` mô tả bìa sách.

<details>
<summary>Xem lời giải</summary>

```html
<main>
  <h1>Top 3 cuốn sách mình thích</h1>
  <p>Đây là những cuốn sách đã <em>thay đổi cách mình nhìn</em> về việc học.</p>
  <ol>
    <li><strong>Cuốn sách A</strong> – bài học về sự kiên nhẫn.</li>
    <li><strong>Cuốn sách B</strong> – cách sắp xếp thời gian.</li>
    <li><strong>Cuốn sách C</strong> – câu chuyện truyền cảm hứng.</li>
  </ol>
  <figure>
    <img src="anh/bia-sach-a.jpg" alt="Bìa cuốn sách A màu xanh có hình ngọn núi" width="300" height="450">
    <figcaption>Bìa cuốn sách mình thích nhất</figcaption>
  </figure>
  <p>Bạn có gợi ý? Gửi mình tại <a href="mailto:minhan@example.com">minhan@example.com</a>.</p>
</main>
```

</details>

## Tóm tắt

- Văn bản: `<h1>`–`<h6>`, `<p>`, `<strong>`, `<em>`, `<br>`; nhiều dấu cách trong code được gộp thành một.
- Danh sách: `<ul>` không thứ tự, `<ol>` có thứ tự, mỗi mục là `<li>`.
- Liên kết `<a href>`: tuyệt đối cho trang ngoài, tương đối cho trang trong website, `#id` trong trang, `mailto:`.
- Ảnh `<img src alt width height>`; `alt` luôn có ý nghĩa; `loading="lazy"` cho ảnh ở xa.
- Lỗi ảnh và liên kết hầu hết do đường dẫn: kiểm tra bằng DevTools.

## Đọc thêm

- [Thẻ a – MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a)
- [Thẻ img – MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)
- [Danh sách ul – MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ul)
