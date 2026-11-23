---
title: "Cấu trúc trang HTML"
minutes: 14
preview: true
objectives:
  - "Hiểu vai trò của HTML trong một trang web, phân biệt với CSS và JavaScript"
  - "Viết được khung chuẩn của một trang HTML5: doctype, html, head, body"
  - "Hiểu thẻ (tag), phần tử (element) và thuộc tính (attribute)"
  - "Dùng các thẻ ngữ nghĩa header, nav, main, footer để chia bố cục"
quiz:
  - question: "Trong bộ ba HTML, CSS, JavaScript, HTML đảm nhận việc gì?"
    options: ["Tạo hiệu ứng chuyển động", "Mô tả cấu trúc và nội dung của trang", "Tô màu và căn lề", "Lưu dữ liệu người dùng"]
    answer: 1
    explain: "HTML là bộ khung (cấu trúc, nội dung). CSS lo trang trí, JavaScript lo tương tác."
  - question: "Nội dung nào được hiển thị trực tiếp trên trang cho người xem?"
    options: ["Nội dung trong <head>", "Nội dung trong <body>", "Dòng <!DOCTYPE html>", "Thuộc tính lang"]
    answer: 1
    explain: "<head> chứa thông tin cho trình duyệt (tiêu đề tab, mã hóa ký tự…); thứ người xem thấy nằm trong <body>."
  - question: "Trong <a href=\"/lien-he\">Liên hệ</a>, phần href=\"/lien-he\" là gì?"
    options: ["Một thẻ", "Một thuộc tính", "Một phần tử con", "Một chú thích"]
    answer: 1
    explain: "Thuộc tính (attribute) viết trong thẻ mở, dạng tên=\"giá trị\", bổ sung thông tin cho phần tử."
  - question: "Thẻ nào nên bao phần nội dung chính, duy nhất của trang?"
    options: ["<div>", "<section>", "<main>", "<header>"]
    answer: 2
    explain: "Mỗi trang chỉ nên có một <main> bao nội dung chính, giúp trình đọc màn hình và công cụ tìm kiếm hiểu bố cục."
---

## Giải thích khái niệm

### Trang web giống một ngôi nhà

Hãy hình dung một ngôi nhà. Trước hết phải có **bộ khung**: móng, cột, tường, phòng khách, phòng ngủ. Sau đó mới **sơn tường, kê đồ trang trí**. Cuối cùng là **điện nước**: bấm công tắc thì đèn sáng, mở vòi thì nước chảy.

Trang web cũng có ba lớp như vậy:

- **HTML** (HyperText Markup Language – ngôn ngữ đánh dấu siêu văn bản) là bộ khung: tiêu đề, đoạn văn, hình ảnh, nút bấm.
- **CSS** là lớp sơn và trang trí: màu sắc, phông chữ, khoảng cách, bố cục.
- **JavaScript** là hệ thống điện nước: xử lý khi người dùng bấm nút, gửi form, mở menu.

Khóa học này tập trung vào hai lớp đầu. HTML không phải ngôn ngữ lập trình theo nghĩa có biến, vòng lặp; nó là ngôn ngữ **đánh dấu** (markup): bạn dùng các thẻ để nói với trình duyệt "đây là tiêu đề", "đây là một đoạn văn", "đây là một danh sách".

### Thẻ, phần tử và thuộc tính

Một **thẻ** (tag) được viết trong dấu ngoặc nhọn, ví dụ `<p>`. Hầu hết thẻ đi theo cặp: thẻ mở `<p>` và thẻ đóng `</p>` (có thêm dấu gạch chéo). Thẻ mở, nội dung ở giữa và thẻ đóng hợp lại thành một **phần tử** (element).

**Thuộc tính** (attribute) nằm trong thẻ mở, bổ sung thông tin cho phần tử, theo dạng `tên="giá trị"`. Ví dụ `lang="vi"` cho biết trang viết bằng tiếng Việt, `href="..."` cho biết liên kết trỏ đến đâu.

Một số thẻ không có nội dung nên không cần thẻ đóng, gọi là **thẻ rỗng** (void element), ví dụ `<img>` (ảnh), `<br>` (xuống dòng), `<meta>`.

Các phần tử có thể **lồng** vào nhau như hộp trong hộp: phần tử nằm bên trong gọi là phần tử con, phần tử bao ngoài là phần tử cha. Quy tắc quan trọng: mở sau thì đóng trước, giống xếp đồ vào vali rồi lấy ra theo thứ tự ngược lại.

### Khung chuẩn của một trang HTML5

Mọi trang HTML hiện đại đều bắt đầu với cùng một khung:

- `<!DOCTYPE html>`: báo cho trình duyệt đây là tài liệu HTML5, để nó hiển thị theo chuẩn hiện đại.
- `<html lang="vi">`: phần tử gốc, bao toàn bộ trang.
- `<head>`: phần "hậu trường", chứa thông tin cho trình duyệt và công cụ tìm kiếm, **không hiển thị** trên trang.
- `<body>`: mọi thứ người xem nhìn thấy.

Trong `<head>` luôn nên có `<meta charset="utf-8">` để hiển thị đúng tiếng Việt có dấu, thẻ `<meta name="viewport" ...>` để trang hiển thị tốt trên điện thoại (học kỹ ở bài Responsive), và `<title>` là chữ hiện trên tab trình duyệt.

### Thẻ ngữ nghĩa: đặt tên đúng cho từng khu vực

Ngày trước, người ta dùng `<div>` (một chiếc hộp không có ý nghĩa riêng) cho mọi thứ. HTML5 bổ sung các **thẻ ngữ nghĩa** (semantic element) nói rõ vai trò của từng khu vực:

| Thẻ | Vai trò |
|---|---|
| `<header>` | phần đầu trang: logo, khẩu hiệu |
| `<nav>` | thanh điều hướng, menu |
| `<main>` | nội dung chính, mỗi trang chỉ một |
| `<section>` | một phần nội dung có chủ đề, thường có tiêu đề |
| `<article>` | nội dung độc lập: bài viết, thẻ sản phẩm |
| `<footer>` | chân trang: bản quyền, liên hệ |

Thẻ ngữ nghĩa không làm trang đẹp hơn, nhưng giúp **trình đọc màn hình** (dùng bởi người khiếm thị) và **công cụ tìm kiếm** hiểu trang của bạn, đồng thời giúp chính bạn đọc code dễ hơn.

## Code mẫu có chú thích

Tạo file `index.html` và mở bằng trình duyệt (kéo thả file vào cửa sổ trình duyệt):

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <!-- Chú thích HTML: trình duyệt bỏ qua, chỉ người đọc code thấy -->
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tiệm bánh Mây</title>
</head>
<body>
  <header>
    <h1>Tiệm bánh Mây</h1>
    <p>Bánh mì nướng mỗi sáng</p>
  </header>

  <nav>
    <a href="#menu">Thực đơn</a>
    <a href="#lien-he">Liên hệ</a>
  </nav>

  <main>
    <section id="menu">
      <h2>Thực đơn hôm nay</h2>
      <article>
        <h3>Bánh mì bơ tỏi</h3>
        <p>Giòn rụm, thơm mùi bơ, giá 15.000 đồng.</p>
      </article>
    </section>

    <section id="lien-he">
      <h2>Liên hệ</h2>
      <p>Số 12 đường Hoa Sữa, mở cửa 6:00 – 20:00.</p>
    </section>
  </main>

  <footer>
    <p>© 2026 Tiệm bánh Mây</p>
  </footer>
</body>
</html>
```

Vài điều cần để ý:

- Code được **thụt lề** (indent) theo cấp lồng nhau để dễ nhìn ra cha – con. Trình duyệt không quan tâm thụt lề, nhưng người đọc thì có.
- Thuộc tính `id="menu"` đặt tên cho một khu vực; liên kết `href="#menu"` nhảy tới khu vực đó trong cùng trang.
- Tiêu đề có sáu cấp từ `<h1>` đến `<h6>`. Mỗi trang nên có một `<h1>`, các cấp dùng theo thứ tự như mục lục của một cuốn sách.

### Công cụ nhà phát triển

Nhấn **F12** (hoặc chuột phải → "Kiểm tra") trên trình duyệt để mở công cụ nhà phát triển (DevTools). Tab **Elements** cho bạn xem cây phần tử của trang, rê chuột lên từng phần tử để thấy nó chiếm vùng nào. Đây là công cụ bạn sẽ dùng hằng ngày khi làm web.

## Lỗi hay gặp

**1. Đóng thẻ sai thứ tự.** Thẻ mở sau phải đóng trước. Đoạn dưới đây sai vì `<strong>` mở sau `<p>` nhưng lại đóng sau:

```html error
<p>Giá <strong>15.000 đồng</p></strong>
```

Viết đúng: `<p>Giá <strong>15.000 đồng</strong></p>`. Trình duyệt thường "đoán" và tự sửa giúp bạn, nhưng kết quả có thể khác ý muốn.

**2. Quên `<meta charset="utf-8">`.** Chữ tiếng Việt hiện thành ký tự lạ. Luôn đặt thẻ này ngay đầu `<head>`.

**3. Đặt nội dung hiển thị vào `<head>`.** Đoạn văn hay hình ảnh trong `<head>` sẽ không hiện ra đúng cách. Mọi thứ người dùng cần thấy phải nằm trong `<body>`.

**4. Dùng tiêu đề để làm chữ to.** Chọn `<h2>` chỉ vì muốn chữ to là sai mục đích; cỡ chữ là việc của CSS. Thẻ tiêu đề phải phản ánh cấu trúc nội dung.

## Bài tập thực hành

Tạo trang giới thiệu bản thân `gioi-thieu.html` gồm: phần đầu có tên bạn (tiêu đề cấp 1), thanh điều hướng có hai liên kết tới hai khu vực "Sở thích" và "Liên hệ", nội dung chính có hai khu vực đó, và chân trang ghi năm hiện tại.

Gợi ý: bắt đầu bằng khung chuẩn; mỗi khu vực là một `<section>` có `id` và một tiêu đề `<h2>`; kiểm tra lại bằng tab Elements xem các phần tử có lồng đúng không.

<details>
<summary>Xem lời giải</summary>

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Giới thiệu – Minh An</title>
</head>
<body>
  <header>
    <h1>Minh An</h1>
  </header>
  <nav>
    <a href="#so-thich">Sở thích</a>
    <a href="#lien-he">Liên hệ</a>
  </nav>
  <main>
    <section id="so-thich">
      <h2>Sở thích</h2>
      <p>Đọc sách, chạy bộ và học lập trình web.</p>
    </section>
    <section id="lien-he">
      <h2>Liên hệ</h2>
      <p>Email: minhan@example.com</p>
    </section>
  </main>
  <footer>
    <p>© 2026 Minh An</p>
  </footer>
</body>
</html>
```

</details>

## Tóm tắt

- HTML là bộ khung của trang web; CSS trang trí; JavaScript tạo tương tác.
- Phần tử = thẻ mở + nội dung + thẻ đóng; thuộc tính bổ sung thông tin trong thẻ mở.
- Khung chuẩn: `<!DOCTYPE html>`, `<html lang="vi">`, `<head>` (thông tin), `<body>` (hiển thị).
- Dùng thẻ ngữ nghĩa `header`, `nav`, `main`, `section`, `article`, `footer` để chia bố cục.
- Mở sau đóng trước; DevTools (F12) giúp xem cây phần tử.

## Đọc thêm

- [HTML: ngôn ngữ đánh dấu siêu văn bản – MDN](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [Cấu trúc tài liệu và website – MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Structuring_documents)
