---
title: "Cú pháp PHP"
minutes: 15
preview: true
objectives:
  - "Hiểu PHP chạy ở phía server và sinh ra HTML gửi cho trình duyệt"
  - "Cài môi trường và chạy file PHP bằng server tích hợp php -S"
  - "Viết biến, chuỗi, mảng, câu lệnh điều kiện, vòng lặp và hàm trong PHP"
  - "In dữ liệu ra HTML an toàn bằng htmlspecialchars"
quiz:
  - question: "Mã PHP được thực thi ở đâu?"
    options: ["Trong trình duyệt của người xem", "Trên server; trình duyệt chỉ nhận kết quả (thường là HTML)", "Trong cơ sở dữ liệu", "Trong CSS"]
    answer: 1
    explain: "Người xem không thấy mã PHP; họ chỉ thấy HTML do PHP sinh ra."
  - question: "Trong PHP, tên biến bắt đầu bằng ký tự nào?"
    options: ["@", "#", "$", "&"]
    answer: 2
    explain: "Mọi biến PHP bắt đầu bằng $, ví dụ $ten, $tongTien."
  - question: "Toán tử nào nối hai chuỗi trong PHP?"
    options: ["+", ".", "&", "concat"]
    answer: 1
    explain: "PHP dùng dấu chấm để nối chuỗi: 'Xin ' . 'chào'. Dấu + chỉ dùng cho phép cộng số."
  - question: "Vì sao cần htmlspecialchars() khi in dữ liệu người dùng nhập?"
    options: ["Để chữ đẹp hơn", "Để chuyển các ký tự < > & \" thành dạng an toàn, chống chèn mã độc (XSS)", "Để dịch sang tiếng Anh", "Để nén dữ liệu"]
    answer: 1
    explain: "Không escape, ai đó nhập <script> sẽ khiến trình duyệt của người khác chạy mã đó."
  - question: "\"Xin chào $ten\" và 'Xin chào $ten' khác nhau thế nào?"
    options: ["Giống hệt nhau", "Nháy kép thay biến bằng giá trị; nháy đơn giữ nguyên chữ $ten", "Nháy đơn thay biến, nháy kép thì không", "Cả hai đều lỗi"]
    answer: 1
    explain: "Chuỗi nháy kép hỗ trợ chèn biến (interpolation); nháy đơn hiểu mọi thứ theo nghĩa đen."
---

## Giải thích khái niệm

### PHP: đầu bếp trong bếp của nhà hàng

Khi bạn vào một nhà hàng, bạn gọi món và nhận đĩa thức ăn đã nấu xong; bạn không vào bếp xem đầu bếp làm gì. Trang web viết bằng **PHP** hoạt động như vậy. Trình duyệt gửi yêu cầu tới server; PHP chạy **trên server**, đọc cơ sở dữ liệu, tính toán, rồi **sinh ra HTML** và gửi về. Người xem chỉ nhận "đĩa thức ăn" HTML, không bao giờ thấy mã PHP.

PHP ra đời để làm web và đến nay vẫn chạy một phần rất lớn các website trên thế giới, trong đó có nhiều hệ quản trị nội dung phổ biến. Điểm mạnh của PHP là dễ triển khai: hầu hết dịch vụ hosting đều hỗ trợ sẵn, chỉ cần chép file `.php` lên là chạy.

So với Node.js ở khóa trước: Node.js tự là một server chạy liên tục; còn PHP truyền thống chạy theo mô hình **mỗi yêu cầu một lần**: có yêu cầu thì chạy file, trả kết quả xong là kết thúc, các biến biến mất. Vì vậy dữ liệu cần giữ lâu phải lưu vào CSDL, session hoặc cookie (các bài sau).

### Chuẩn bị môi trường

Bạn có hai lựa chọn phổ biến. Một là cài gói **XAMPP** (hoặc Laragon trên Windows), có sẵn Apache, PHP và MySQL. Hai là cài PHP riêng rồi dùng **server tích hợp** của PHP: mở terminal tại thư mục dự án và gõ `php -S localhost:8000`, sau đó vào `localhost:8000/ten-file.php` trên trình duyệt. Server tích hợp chỉ dùng để học và phát triển, không dùng cho website thật.

### Cú pháp cơ bản

- Mã PHP nằm giữa `<?php` và `?>`. Trong file chỉ có PHP, nên bỏ thẻ đóng `?>` ở cuối để tránh vô tình gửi khoảng trắng thừa.
- Mỗi câu lệnh kết thúc bằng dấu chấm phẩy `;`.
- **Biến** bắt đầu bằng `$`: `$ten = 'An';`. PHP tự xác định kiểu dữ liệu.
- **Nối chuỗi** dùng dấu chấm `.`; chuỗi **nháy kép** cho phép chèn biến trực tiếp: `"Xin chào $ten"`.
- `echo` in ra nội dung. Trong HTML có cách viết tắt `<?= $bien ?>` tương đương `<?php echo $bien; ?>`.
- Chú thích: `//` một dòng, `/* ... */` nhiều dòng.

### Mảng

Mảng PHP rất linh hoạt, dùng được cho cả hai việc mà JavaScript tách thành mảng và đối tượng:

- **Mảng chỉ số**: `$mon = ['Phở', 'Bún chả', 'Cơm tấm'];` truy cập `$mon[0]`.
- **Mảng kết hợp** (associative array), khóa là chuỗi: `$sv = ['ten' => 'An', 'diem' => 8];` truy cập `$sv['ten']`.
- `count($mang)` đếm số phần tử; `$mang[] = 'mới';` thêm vào cuối.

### Điều kiện, vòng lặp, hàm

Cấu trúc gần giống JavaScript: `if / elseif / else`, `for`, `while`, và đặc biệt `foreach` để duyệt mảng: `foreach ($sv as $khoa => $giaTri)`. So sánh nên dùng `===` (cả giá trị và kiểu) như trong JavaScript. Hàm khai báo bằng `function`; từ PHP 7 có thể khai báo **kiểu** cho tham số và giá trị trả về, ví dụ `function tong(int $a, int $b): int`, giúp phát hiện lỗi sớm.

## Code mẫu có chú thích

File `chao.php`:

```php
<?php
declare(strict_types=1);            // kiểm tra kiểu nghiêm ngặt cho tham số hàm

$ten = 'Minh An';
$namSinh = 2004;
$tuoi = (int) date('Y') - $namSinh; // date('Y') trả về năm hiện tại dạng chuỗi

echo 'Xin chào ' . $ten . '!';      // nối chuỗi bằng dấu chấm
echo "<br>Bạn $tuoi tuổi.";         // nháy kép: chèn biến trực tiếp

// Mảng kết hợp và foreach
$diem = ['HTML' => 8.5, 'CSS' => 7, 'PHP' => 9];
foreach ($diem as $mon => $d) {
    echo "<br>$mon: $d";
}

// Hàm có khai báo kiểu
function trungBinh(array $ds): float
{
    return count($ds) ? array_sum($ds) / count($ds) : 0.0;
}
echo '<br>Trung bình: ' . round(trungBinh($diem), 2);
```

Chạy `php -S localhost:8000` rồi mở `localhost:8000/chao.php`. Trình duyệt nhận được HTML gồm các dòng chào, tuổi, điểm từng môn và điểm trung bình 8.17. Thử chuột phải → "Xem nguồn trang": bạn sẽ chỉ thấy HTML, không còn dấu vết của mã PHP.

### Trộn PHP với HTML

Cách dùng PHP phổ biến nhất là chèn vào giữa HTML để hiển thị dữ liệu. Cú pháp thay thế `foreach (...):` … `endforeach;` giúp đọc dễ hơn khi lẫn nhiều thẻ HTML:

```php
<?php
$khoaHoc = [
    ['ten' => 'HTML, CSS', 'gia' => 0],
    ['ten' => 'PHP & MySQL', 'gia' => 19.99],
    ['ten' => 'Thiết kế <web>', 'gia' => 29.99], // có ký tự < > để thấy tác dụng của escape
];
function e(string $s): string
{
    // Hàm rút gọn: escape mọi dữ liệu trước khi in ra HTML
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}
?>
<ul>
  <?php foreach ($khoaHoc as $k): ?>
    <li>
      <?= e($k['ten']) ?> –
      <?= $k['gia'] == 0 ? 'Miễn phí' : '$' . number_format($k['gia'], 2) ?>
    </li>
  <?php endforeach; ?>
</ul>
```

Nhờ `htmlspecialchars`, chữ `Thiết kế <web>` hiển thị đúng nguyên văn thay vì bị trình duyệt hiểu thành một thẻ HTML lạ.

## Lỗi hay gặp

**1. Quên dấu chấm phẩy.** PHP báo `Parse error: syntax error, unexpected ...` kèm số dòng; lỗi thường nằm ở **dòng ngay trước** dòng được báo:

```php error
<?php
$ten = 'An'
echo $ten;
```

**2. Dùng `+` để nối chuỗi.** `'Tổng: ' + 5` không nối chuỗi như JavaScript mà cố cộng số, gây cảnh báo hoặc lỗi. Dùng dấu chấm.

**3. In dữ liệu người dùng không escape.** `echo $_GET['ten'];` là lỗ hổng XSS kinh điển. Luôn dùng `htmlspecialchars` (hoặc hàm `e()` như ví dụ) khi in dữ liệu ra HTML.

**4. Độ dài chuỗi tiếng Việt.** `strlen('Việt')` đếm **byte** chứ không đếm ký tự, nên ra 6 thay vì 4 vì chữ có dấu chiếm nhiều byte trong UTF-8. Dùng `mb_strlen($s)` và các hàm `mb_*` cho chuỗi tiếng Việt.

**5. Mở file .php trực tiếp bằng trình duyệt.** Kéo thả `chao.php` vào trình duyệt sẽ chỉ thấy mã nguồn hoặc tải file về, vì không có server nào chạy PHP. Phải truy cập qua `localhost` của server PHP.

## Bài tập thực hành

Tạo `bang-cuu-chuong.php` hiển thị bảng HTML (`<table>`) cửu chương từ 2 đến 5, mỗi cột một bảng, mỗi dòng dạng `2 × 3 = 6`. Tiêu đề trang lấy từ một biến `$tieuDe`, in ra bằng hàm escape.

Gợi ý: hai vòng `for` lồng nhau; vòng ngoài chạy số nhân (1–10) theo dòng, vòng trong chạy bảng (2–5) theo cột.

<details>
<summary>Xem lời giải</summary>

```php
<?php
$tieuDe = 'Bảng cửu chương 2 – 5';
function e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}
?>
<h1><?= e($tieuDe) ?></h1>
<table>
  <?php for ($i = 1; $i <= 10; $i++): ?>
    <tr>
      <?php for ($bang = 2; $bang <= 5; $bang++): ?>
        <td><?= "$bang × $i = " . ($bang * $i) ?></td>
      <?php endfor; ?>
    </tr>
  <?php endfor; ?>
</table>
```

</details>

## Tóm tắt

- PHP chạy trên server, sinh HTML gửi về trình duyệt; mỗi yêu cầu chạy một lần.
- Học và thử bằng XAMPP/Laragon hoặc `php -S localhost:8000`.
- Biến có `$`, câu lệnh kết thúc bằng `;`, nối chuỗi bằng `.`, nháy kép chèn được biến.
- Mảng chỉ số và mảng kết hợp, duyệt bằng `foreach`; hàm có thể khai báo kiểu.
- Luôn escape dữ liệu bằng `htmlspecialchars` khi in ra HTML; chuỗi tiếng Việt dùng hàm `mb_*`.

## Đọc thêm

- [Cú pháp cơ bản – php.net](https://www.php.net/manual/en/language.basic-syntax.php)
- [Mảng – php.net](https://www.php.net/manual/en/language.types.array.php)
- [htmlspecialchars – php.net](https://www.php.net/manual/en/function.htmlspecialchars.php)
